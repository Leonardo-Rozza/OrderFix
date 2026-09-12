import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './axios';
import { AccountExportError, downloadAccountExport, getAccountExportStatus, getCurrentAccountExport,
  reauthenticateExport, requestAccountExport, saveExportDownload } from './accountExport';

const id = '10000000-0000-4000-8000-000000000001';
const proof = 'a'.repeat(43);
const status = { id, estado: 'READY', expiresAt: '2042-01-01T00:00:00Z', reused: false };
const signal = () => new AbortController().signal;

describe('accountExport — contrato y datos transitorios', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('descarta campos fuera del contrato del estado actual', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 200, data: {
      habilitada: true, exportacion: { ...status, reauthToken: 'no debe conservarse' }, password: 'tampoco',
    } });
    expect(await getCurrentAccountExport(signal())).toEqual({ habilitada: true, exportacion: status });
  });
  it.each([
    { ...status, estado: 'DESCONOCIDO' }, { ...status, expiresAt: 'mañana' },
    { ...status, id: '20000000-0000-4000-8000-000000000002' },
  ])('falla cerrado ante estado inesperado o pertenencia a otro ID: $estado', async (data) => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 200, data });
    await expect(getAccountExportStatus(id, signal())).rejects.toBeInstanceOf(AccountExportError);
  });
  it('reautentica por POST, contraseña en body y propósito explícito', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 200, data: {
      reauthToken: proof, proposito: 'EXPORTAR', expiresAt: '2042-01-01T00:00:00Z',
    } });
    expect(await reauthenticateExport('contraseña-prueba', 'EXPORTAR', signal())).toBe(proof);
    expect(post).toHaveBeenCalledWith('/cuenta/reauthenticaciones', {
      passwordActual: 'contraseña-prueba', proposito: 'EXPORTAR',
    }, expect.objectContaining({ errorMode: 'inline', sessionValidation: 'profile' }));
  });
  it.each([
    { reauthToken: proof, proposito: 'EXPORTAR', expiresAt: '2020-01-01T00:00:00Z' },
    { reauthToken: proof, proposito: 'DESCARGAR_EXPORTACION', expiresAt: '2042-01-01T00:00:00Z' },
    { reauthToken: 'token-inválido', proposito: 'EXPORTAR', expiresAt: '2042-01-01T00:00:00Z' },
  ])('rechaza prueba vencida, rota o de otro propósito', async (data) => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 200, data });
    await expect(reauthenticateExport('prueba', 'EXPORTAR', signal())).rejects.toBeInstanceOf(AccountExportError);
  });
  it('solicita una vez con idempotencia y prueba en headers, sin querystring', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 202, data: { ...status, estado: 'QUEUED' } });
    expect(await requestAccountExport(id, proof, signal())).toMatchObject({ estado: 'QUEUED' });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/exportaciones', undefined, expect.objectContaining({
      headers: { 'Idempotency-Key': id, 'X-Reauth-Token': proof }, sessionValidation: 'profile',
    }));
  });
  it.each([
    { id, url: `/exportaciones/${id}/archivo`, mime: 'application/zip', ext: 'zip' },
    { id: null, url: '/export/excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
  ])('descarga $ext por POST con prueba y produce un blob transitorio', async (item) => {
    const blob = new Blob(['PK sintético'], { type: item.mime });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 200, data: blob, headers: {
      'content-disposition': `attachment; filename="copia.${item.ext}"`,
    } });
    const result = await downloadAccountExport(item.id, proof, signal());
    expect(result).toEqual({ blob, filename: `copia.${item.ext}` });
    expect(post).toHaveBeenCalledWith(item.url, undefined, expect.objectContaining({
      responseType: 'blob', headers: { 'X-Reauth-Token': proof }, sessionValidation: 'profile',
    }));
  });
  it('no descarga JSON recibido como éxito', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 200, data: new Blob(['{}'], { type: 'application/json' }), headers: {} });
    await expect(downloadAccountExport(id, proof, signal())).rejects.toBeInstanceOf(AccountExportError);
  });
  it('normaliza error y espera sin conservar Axios, cuerpo, contraseña o proof', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue({ isAxiosError: true, config: {
      data: JSON.stringify({ passwordActual: 'clave-secreta' }), headers: { 'X-Reauth-Token': proof },
    }, response: { status: 429, data: { code: 'EXPORTACION_LIMITE', message: `detalle ${proof}` }, headers: { 'retry-after': '45' } } });
    const error = await requestAccountExport(id, proof, signal()).catch((failure: unknown) => failure);
    expect(error).toMatchObject({ status: 429, code: 'EXPORTACION_LIMITE', response: { headers: { 'retry-after': '45' } } });
    expect(JSON.stringify(error)).not.toMatch(/clave-secreta|config|aaaaa/);
  });
  it('cancela antes de enviar y descarta una respuesta tardía', async () => {
    const controller = new AbortController(); controller.abort();
    const post = vi.spyOn(apiClient, 'post');
    await expect(requestAccountExport(id, proof, controller.signal)).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
    const next = new AbortController();
    post.mockImplementation(async () => { next.abort(); return { status: 202, data: status }; });
    await expect(requestAccountExport(id, proof, next.signal)).rejects.toThrow();
  });
  it('revoca URL y quita el enlace incluso si el navegador rechaza el clic', () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:efimero') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('falló'); });
    expect(() => saveExportDownload({ blob: new Blob(['PK']), filename: 'copia.zip' })).toThrow();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:efimero');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
