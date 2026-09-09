import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './axios';
import {
  getPhotoRequirements, getPrivatePhoto, deletePrivatePhoto, preparePhotoAttempt, photoRetryAfterSeconds,
  uploadPhotoAttempt, type PhotoRequirements, type PhotoIntent,
} from './repairPhotos';
vi.mock('./axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const id = '00000000-0000-4000-8000-000000000001';
const requirementId = '00000000-0000-4000-8000-000000000002';
const documentId = '00000000-0000-4000-8000-000000000003';
const sha = 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb';
const path = '/reparaciones/9/cargas-foto';
const signal = () => new AbortController().signal;
const snapshot: PhotoRequirements = {
  locale: 'es-AR', requiredSetRevision: `sha256:${'a'.repeat(64)}`,
  limites: { maxBytes: 8_000_000, mimeTypes: ['image/jpeg', 'image/png'] },
  requisitos: [{ id: requirementId, contexto: 'ATESTACION_FOTOS', tipoActo: 'DECLARACION', afirmacion: 'Declaro autorización',
    afirmacionSha256: 'b'.repeat(64), requerido: true, documentos: [{ id: documentId, tipo: 'ATESTACION_DATOS_CLIENTE',
      version: '1', titulo: 'Fotografías', contenidoMarkdown: 'Texto completo', sha256: 'c'.repeat(64),
      vigenteDesde: '2026-09-09T00:00:00Z', estado: 'VIGENTE', locale: 'es-AR' }] }],
};
const makeAttempt = () => {
  const file = new File(['a'], 'foto.jpg', { type: 'image/jpeg' });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => new Uint8Array([97]).buffer });
  return preparePhotoAttempt({ file, momento: 'INGRESO' }, snapshot, new Set([requirementId]));
};
const intent = (estado: PhotoIntent['estado'] = 'AUTORIZADA'): PhotoIntent => ({
  id, estado, expiresAt: '2026-09-09T01:00:00Z',
  upload: estado === 'AUTORIZADA' ? { method: 'PUT', url: `/api${path}/${id}/contenido` } : null,
});
const photo = { id, momento: 'INGRESO', mimeType: 'image/jpeg', bytes: 1, sha256: sha, createdAt: '2026-09-09T00:01:00Z' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('crypto', { subtle: webcrypto.subtle, randomUUID: () => id });
});
afterEach(() => vi.unstubAllGlobals());

describe('repairPhotos — contrato y reintentos', () => {
  it('prepara hash real y snapshot exacto sólo en memoria, sin llamadas HTTP', async () => {
    const attempt = await makeAttempt();
    expect(attempt.payload).toEqual({ nombre: 'foto.jpg', mimeType: 'image/jpeg', bytes: 1, sha256: sha, momento: 'INGRESO',
      requiredSetRevision: snapshot.requiredSetRevision, aceptacionesLegales: [{ requisitoVersionId: requirementId,
        tipoActo: 'DECLARACION', afirmacionSha256: 'b'.repeat(64), documentos: [{ documentoVersionId: documentId, sha256: 'c'.repeat(64) }], confirmado: true }],
      atestacion: { tipo: 'AUTORIZACION_DATOS_CLIENTE', alcances: ['FOTOS'], confirmada: true } });
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });
  it('no prepara una aceptación obligatoria sin confirmación', async () => {
    await expect(preparePhotoAttempt({ file: new File(['a'], 'a.jpg', { type: 'image/jpeg' }), momento: 'INGRESO' }, snapshot, new Set())).rejects.toThrow();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('repite el mismo POST y clave si se perdió la respuesta de creación', async () => {
    const attempt = await makeAttempt();
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: intent() }).mockResolvedValueOnce({ data: photo });
    vi.mocked(apiClient.put).mockResolvedValue({ data: intent('SUBIDA') });
    await expect(uploadPhotoAttempt(9, attempt, signal())).rejects.toThrow('network');
    expect(await uploadPhotoAttempt(9, attempt, signal())).toEqual(photo);
    expect(vi.mocked(apiClient.post).mock.calls[0].slice(0, 2)).toEqual(vi.mocked(apiClient.post).mock.calls[1].slice(0, 2));
    expect(vi.mocked(apiClient.post).mock.calls[0][2]?.headers).toEqual({ 'Idempotency-Key': id });
    expect(vi.mocked(apiClient.post).mock.calls[1][2]?.headers).toEqual({ 'Idempotency-Key': id });
    expect(apiClient.put).toHaveBeenCalledWith(`${path}/${id}/contenido`, attempt.file,
      expect.objectContaining({ headers: { 'Content-Type': 'image/jpeg' } }));
  });
  it('consulta estado tras respuesta PUT perdida y no retransmite un archivo SUBIDA', async () => {
    const attempt = await makeAttempt();
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: intent() }).mockResolvedValueOnce({ data: photo });
    vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('network'));
    await expect(uploadPhotoAttempt(9, attempt, signal())).rejects.toThrow();
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: intent('SUBIDA') });
    await uploadPhotoAttempt(9, attempt, signal());
    expect(apiClient.get).toHaveBeenCalledWith(`${path}/${id}`, expect.anything());
    expect(apiClient.put).toHaveBeenCalledOnce();
  });
  it('finalización incierta se repite sobre ASOCIADA y una foto completada no hace más HTTP', async () => {
    const attempt = await makeAttempt();
    attempt.intent = intent('SUBIDA');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: intent('SUBIDA') }).mockResolvedValueOnce({ data: intent('ASOCIADA') });
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: photo });
    await expect(uploadPhotoAttempt(9, attempt, signal())).rejects.toThrow();
    await uploadPhotoAttempt(9, attempt, signal());
    await uploadPhotoAttempt(9, attempt, signal());
    expect(apiClient.post).toHaveBeenCalledTimes(2);
    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(apiClient.put).not.toHaveBeenCalled();
  });
  it.each(['https://outside.test/content', '//outside.test/content', '/api/reparaciones/99/cargas-foto/x/contenido'])('rechaza un destino no canónico: %s', async (url) => {
    const attempt = await makeAttempt();
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ...intent(), upload: { method: 'PUT', url } } });
    await expect(uploadPhotoAttempt(9, attempt, signal())).rejects.toThrow('no está disponible');
    expect(apiClient.put).not.toHaveBeenCalled();
  });
  it.each(['EXPIRADA', 'FALLIDA', 'LIMPIEZA_PENDIENTE', 'ELIMINADA', 'CREADA'] as const)('no carga ni finaliza un estado %s', async (estado) => {
    const attempt = await makeAttempt();
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: intent(estado) });
    await expect(uploadPhotoAttempt(9, attempt, signal())).rejects.toThrow();
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledOnce();
  });
  it('rechaza un snapshot sin FOTOS y una respuesta final con manifiesto distinto', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { ...snapshot, requisitos: [] } });
    await expect(getPhotoRequirements(9, signal())).rejects.toThrow();
    const attempt = await makeAttempt();
    attempt.intent = intent('SUBIDA');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: intent('SUBIDA') });
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ...photo, sha256: 'd'.repeat(64) } });
    await expect(uploadPhotoAttempt(9, attempt, signal())).rejects.toThrow();
    expect(attempt.completed).toBeUndefined();
  });
  it('respeta Retry-After numérico o ausente sin interpretar mensajes del servidor', () => {
    expect(photoRetryAfterSeconds({ response: { headers: { 'retry-after': '3' } } })).toBe(3);
    expect(photoRetryAfterSeconds({ response: { headers: { get: () => '2' } } })).toBe(2);
    expect(photoRetryAfterSeconds({ response: { headers: {} } })).toBe(1);
  });
  it('lee un Blob y borra sólo por ID desde el cliente autenticado', async () => {
    const blob = new Blob(['image'], { type: 'image/png' });
    vi.mocked(apiClient.get).mockResolvedValue({ data: blob });
    expect(await getPrivatePhoto(9, id, signal())).toBe(blob);
    expect(apiClient.get).toHaveBeenCalledWith(`/reparaciones/9/fotos/${id}/contenido`, expect.objectContaining({ responseType: 'blob' }));
    await deletePrivatePhoto(9, id, signal());
    expect(apiClient.delete).toHaveBeenCalledWith(`/reparaciones/9/fotos/${id}`, expect.anything());
  });
});
