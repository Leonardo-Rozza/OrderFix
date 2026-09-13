import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../axios';
import { getWorkshopClosure, reauthenticateWorkshopClosure, submitWorkshopClosure, WorkshopClosureError } from './workshopClosure.service';

vi.mock('../axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const id = '12345678-1234-4234-8234-123456789abc';
const other = '98765432-1234-4234-8234-123456789abc';
const token = 'a'.repeat(43);
const identity = { proposito: 'CERRAR' as const, operacionId: id, cierreReferencia: id };
const receipt = { operacionId: id, referencia: id, proposito: 'CERRAR', estadoResultante: 'RESTRINGIDO',
  confirmadoEn: '2026-09-12T12:00:00Z', reversibleHasta: '2026-09-19T12:00:00Z', registradaEn: '2026-09-12T12:00:01Z', reutilizada: false };
const status = { estado: 'ABIERTO', tallerNombre: 'Taller Centro', observadoEn: '2026-09-12T12:00:00Z',
  referencia: null, confirmadoEn: null, reversibleHasta: null, puedeSolicitar: true, puedeRestaurar: false, ultimaOperacion: null };

beforeEach(() => vi.resetAllMocks());

describe('workshopClosure — contrato propio y resultados saneados', () => {
  it('lee sólo el estado actual con timeout, señal y manejo de sesión propio', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: status });
    const signal = new AbortController().signal;
    await expect(getWorkshopClosure(signal)).resolves.toEqual(status);
    expect(apiClient.get).toHaveBeenCalledExactlyOnceWith('/cuenta/cierre', {
      signal, timeout: 20_000, errorMode: 'inline', sessionValidation: 'closure',
    });
  });

  it.each([
    { ...status, estado: 'ELIMINADO' }, { ...status, puedeRestaurar: true },
    { ...status, referencia: id }, { ...status, observadoEn: 'ayer' },
    { ...status, estado: 'RESTRINGIDO', puedeSolicitar: false },
    { ...status, ultimaOperacion: { ...receipt, estadoResultante: 'ABIERTO' } },
  ])('rechaza formas contradictorias antes de ofrecer acciones', async (data) => {
    vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data });
    await expect(getWorkshopClosure(new AbortController().signal)).rejects.toBeInstanceOf(WorkshopClosureError);
  });

  it('admite fechas con offset y capacidad remota aunque el reloj del navegador discrepe', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: { ...status, estado: 'RESTRINGIDO', referencia: id,
      confirmadoEn: '2020-01-01T12:00:00-03:00', reversibleHasta: '2020-01-08T12:00:00-03:00', puedeSolicitar: false, puedeRestaurar: true } });
    await expect(getWorkshopClosure(new AbortController().signal)).resolves.toMatchObject({ puedeRestaurar: true });
  });

  it('no consulta una señal abortada ni entrega una respuesta recibida después de abortar', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(getWorkshopClosure(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(apiClient.get).not.toHaveBeenCalled();
    const active = new AbortController();
    vi.mocked(apiClient.get).mockImplementation(async () => { active.abort(); return { status: 200, data: status }; });
    await expect(getWorkshopClosure(active.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('emite proof ligado a operación/referencia y descarta contraseña del body al finalizar', async () => {
    let sent: unknown;
    vi.mocked(apiClient.post).mockImplementation(async (_url, body) => {
      sent = structuredClone(body); return { status: 200, data: { token, expiresAt: '2020-01-01T00:00:00Z' } };
    });
    await expect(reauthenticateWorkshopClosure({ ...identity, passwordActual: ' contraseña exacta ' })).resolves.toBe(token);
    expect(sent).toEqual({ ...identity, passwordActual: ' contraseña exacta ' });
    expect(apiClient.post).toHaveBeenCalledOnce();
    expect(vi.mocked(apiClient.post).mock.calls[0][0]).toBe('/cuenta/cierre/reauthenticaciones');
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({ passwordActual: '' });
    expect(JSON.stringify(localStorage)).not.toContain('contraseña');
    expect(JSON.stringify(sessionStorage)).not.toContain(token);
  });

  it.each(['', ' ', 'x'.repeat(101)])('no emite proof con una contraseña inválida', async (passwordActual) => {
    await expect(reauthenticateWorkshopClosure({ ...identity, passwordActual })).rejects.toMatchObject({ status: 400 });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it.each([{ ...identity, operacionId: other }, { ...identity, cierreReferencia: id.toUpperCase() }])('exige UUID canónico y referencia igual a operación para cierre', async (input) => {
    await expect(reauthenticateWorkshopClosure({ ...input, passwordActual: 'válida' })).rejects.toMatchObject({ status: 400 });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('envía una única operación exacta con proof en header y acredita identidad de su recibo', async () => {
    let sent: unknown; let sentHeaders: unknown;
    vi.mocked(apiClient.post).mockImplementation(async (_url, body, config) => {
      sent = structuredClone(body); sentHeaders = structuredClone(config?.headers);
      return { status: 200, data: { ...receipt, secretoInesperado: 'omitido' } };
    });
    await expect(submitWorkshopClosure({ ...identity, confirmacion: 'CERRAR MI TALLER' }, token)).resolves.toEqual(receipt);
    expect(sent).toEqual({ ...identity, confirmacion: 'CERRAR MI TALLER' });
    expect(sentHeaders).toEqual({ 'X-Reauth-Token': token });
    expect(vi.mocked(apiClient.post).mock.calls[0][0]).toBe('/cuenta/cierre/operaciones');
    expect(vi.mocked(apiClient.post).mock.calls[0][2]?.headers).toEqual({ 'X-Reauth-Token': '' });
  });

  it.each([{ ...receipt, operacionId: other }, { ...receipt, referencia: other }, { ...receipt, proposito: 'RESTAURAR' }])('un recibo ajeno o contradictorio queda incierto', async (data) => {
    vi.mocked(apiClient.post).mockResolvedValue({ status: 200, data });
    await expect(submitWorkshopClosure({ ...identity, confirmacion: 'CERRAR MI TALLER' }, token)).rejects.toMatchObject({ status: undefined });
    expect(apiClient.post).toHaveBeenCalledOnce();
  });

  it('restaurar conserva referencia de cierre y usa operación propia', async () => {
    const restoring = { proposito: 'RESTAURAR' as const, operacionId: other, cierreReferencia: id, confirmacion: 'RESTAURAR MI TALLER' };
    vi.mocked(apiClient.post).mockResolvedValue({ status: 200, data: { ...receipt, proposito: 'RESTAURAR', estadoResultante: 'ABIERTO', operacionId: other } });
    await expect(submitWorkshopClosure(restoring, token)).resolves.toMatchObject({ operacionId: other, referencia: id });
  });

  it.each(['cerrar mi taller', ' CERRAR MI TALLER', 'RESTAURAR MI TALLER'])('rechaza frases que no coinciden exactamente', async (confirmacion) => {
    await expect(submitWorkshopClosure({ ...identity, confirmacion }, token)).rejects.toMatchObject({ status: 400 });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it.each([401, 403, 409, 429, 503])('no reintenta un HTTP %s ni retiene causas/config con secretos', async (httpStatus) => {
    const error = new AxiosError('passwordActual=secreto no debe salir', undefined, undefined, undefined, {
      status: httpStatus, statusText: 'Error', headers: { 'retry-after': '2' },
      data: { code: 'CIERRE_NO_DISPONIBLE', message: 'contenido ajeno secreto' }, config: { headers: new AxiosHeaders() },
    });
    vi.mocked(apiClient.post).mockRejectedValue(error);
    const failure = await submitWorkshopClosure({ ...identity, confirmacion: 'CERRAR MI TALLER' }, token).catch((caught: unknown) => caught);
    expect(failure).toBeInstanceOf(WorkshopClosureError);
    expect(failure).toMatchObject({ status: httpStatus, code: 'CIERRE_NO_DISPONIBLE', response: { headers: httpStatus === 429 ? { 'retry-after': '2' } : {} } });
    expect(String(failure)).not.toContain('secreto');
    expect(JSON.stringify(failure)).not.toContain('secreto');
    expect(failure).not.toHaveProperty('cause');
    expect(failure).not.toHaveProperty('config');
    expect(apiClient.post).toHaveBeenCalledOnce();
  });
});
