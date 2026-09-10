import { createHash, webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, publicClient } from './axios';
import { getAccountLegalHistory, getHistoricalLegalDocument, type HistoricalLegalDocumentReference } from './accountLegal';

vi.mock('./axios', () => ({ apiClient: { get: vi.fn() }, publicClient: { get: vi.fn() } }));
const id = '00000000-0000-4000-8000-000000000001';
const requirementId = '00000000-0000-4000-8000-000000000002';
const documentId = '00000000-0000-4000-8000-000000000003';
const markdown = '# Condiciones históricas\n\nTexto completo de la versión presentada.\n';
const sha256 = createHash('sha256').update(markdown, 'utf8').digest('hex');
const reference: HistoricalLegalDocumentReference = {
  documentoVersionId: documentId, tipo: 'TERMINOS_SERVICIO', version: '2026.1', titulo: 'Términos históricos', sha256,
};
const history = () => ({
  content: [{ id, requisitoVersionId: requirementId, contexto: 'REGISTRO', tipoActo: 'ACEPTACION',
    afirmacion: 'Acepto las condiciones presentadas.', afirmacionSha256: 'b'.repeat(64), documentos: [{ ...reference }],
    aceptadoEn: '2026-09-09T12:34:56.123456Z' }],
  page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
});
const historicalDocument = () => ({
  id: documentId, tipo: reference.tipo, version: reference.version, titulo: reference.titulo, sha256,
  contenidoMarkdown: markdown, vigenteDesde: '2026-08-23T00:00:00Z', estado: 'REEMPLAZADA', locale: 'es-AR',
});
const signal = () => new AbortController().signal;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('crypto', { subtle: webcrypto.subtle });
});
afterEach(() => vi.unstubAllGlobals());

describe('accountLegal — contratos de lectura propia e histórica', () => {
  it('consulta sólo la página propia con señal y sin selector de actor, taller ni contexto', async () => {
    const data = history();
    const requestSignal = signal();
    vi.mocked(apiClient.get).mockResolvedValue({ data });
    expect(await getAccountLegalHistory(0, requestSignal)).toEqual(data);
    expect(apiClient.get).toHaveBeenCalledExactlyOnceWith('/aceptaciones-legales', {
      params: { page: 0, size: 20 }, signal: requestSignal, timeout: 20_000, errorMode: 'inline', sessionValidation: 'profile',
    });
    expect(publicClient.get).not.toHaveBeenCalled();
  });

  it.each([404, 503])('conserva el error HTTP %s; no lo convierte en historial vacío', async (status) => {
    const failure = { response: { status } };
    vi.mocked(apiClient.get).mockRejectedValue(failure);
    await expect(getAccountLegalHistory(0, signal())).rejects.toBe(failure);
    expect(apiClient.get).toHaveBeenCalledOnce();
  });

  it('admite un historial vacío sólo con paginación vacía coherente', async () => {
    const data = { content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } };
    vi.mocked(apiClient.get).mockResolvedValue({ data });
    expect(await getAccountLegalHistory(0, signal())).toEqual(data);
  });

  it.each(['page', 'count', 'duplicate', 'act', 'date', 'reference'] as const)('rechaza historial divergente: %s', async (kind) => {
    const data = history();
    if (kind === 'page') data.page.number = 1;
    if (kind === 'count') data.page.totalElements = 2;
    if (kind === 'duplicate') { data.content.push(data.content[0]); data.page.totalElements = 2; }
    if (kind === 'act') data.content[0].tipoActo = 'PAGO';
    if (kind === 'date') data.content[0].aceptadoEn = 'ayer';
    if (kind === 'reference') data.content[0].documentos[0].documentoVersionId = '../otra-version';
    vi.mocked(apiClient.get).mockResolvedValue({ data });
    await expect(getAccountLegalHistory(0, signal())).rejects.toThrow('verificar el historial');
  });

  it.each([-1, 0.5, 2_147_483_648])('rechaza una página inválida %s antes de HTTP', async (page) => {
    await expect(getAccountLegalHistory(page, signal())).rejects.toThrow('página');
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it.each(['VIGENTE', 'REEMPLAZADA', 'RETIRADA'])('lee y acredita por ID exacto una versión %s', async (estado) => {
    const data = { ...historicalDocument(), estado };
    const requestSignal = signal();
    vi.mocked(publicClient.get).mockResolvedValue({ data });
    expect(await getHistoricalLegalDocument(reference, requestSignal)).toEqual(data);
    expect(publicClient.get).toHaveBeenCalledExactlyOnceWith(`/public/documentos-legales/${documentId}`, {
      signal: requestSignal, timeout: 20_000,
    });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it.each(['id', 'tipo', 'version', 'titulo', 'sha256', 'contenidoMarkdown', 'estado', 'locale'] as const)(
    'rechaza documento divergente en %s sin sustituir la referencia histórica', async (field) => {
      const data = historicalDocument();
      const differences: Record<typeof field, string> = {
        id: requirementId, tipo: 'POLITICA_PRIVACIDAD', version: '2026.2', titulo: 'Términos actuales',
        sha256: 'c'.repeat(64), contenidoMarkdown: 'Contenido reemplazado', estado: 'BORRADOR', locale: 'en-US',
      };
      Object.assign(data, { [field]: differences[field] });
      vi.mocked(publicClient.get).mockResolvedValue({ data });
      await expect(getHistoricalLegalDocument(reference, signal())).rejects.toThrow();
      expect(publicClient.get).toHaveBeenCalledOnce();
      expect(reference.documentoVersionId).toBe(documentId);
    },
  );

  it('no consulta una referencia que pueda salir de la ruta canónica', async () => {
    await expect(getHistoricalLegalDocument({ ...reference, documentoVersionId: '//otro.example' }, signal())).rejects.toThrow('referencia');
    expect(publicClient.get).not.toHaveBeenCalled();
  });

  it('descarta una respuesta recibida después de abortar', async () => {
    const request = new AbortController();
    vi.mocked(apiClient.get).mockImplementation(async () => { request.abort(); return { data: history() }; });
    await expect(getAccountLegalHistory(0, request.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(localStorage.length).toBe(0);
  });
});
