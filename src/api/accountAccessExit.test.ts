import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './axios';
import { deactivateOwnAccess } from './accountAccessExit';

vi.mock('./axios', () => ({ apiClient: { post: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

describe('accountAccessExit — baja del principal actual', () => {
  it('envía sólo contraseña exacta y confirmación al endpoint propio, con espera limitada y validación por perfil', async () => {
    const signal = new AbortController().signal;
    const password = '  contraseña personal  ';
    vi.mocked(apiClient.post).mockResolvedValue({ status: 204 });
    await expect(deactivateOwnAccess(password, signal)).resolves.toBeUndefined();
    expect(apiClient.post).toHaveBeenCalledExactlyOnceWith('/cuenta/baja-acceso', {
      passwordActual: password, confirmado: true,
    }, { signal, timeout: 20_000, errorMode: 'inline', sessionValidation: 'profile' });
    expect(JSON.stringify(localStorage)).not.toContain(password);
    expect(JSON.stringify(sessionStorage)).not.toContain(password);
  });

  it.each(['', '   ', 'x'.repeat(101)])('rechaza una contraseña vacía o fuera de límite antes de HTTP', async (password) => {
    await expect(deactivateOwnAccess(password, new AbortController().signal)).rejects.toThrow('Contraseña actual inválida');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('admite el límite de 100 caracteres sin recortarlo', async () => {
    const password = 'x'.repeat(100);
    vi.mocked(apiClient.post).mockResolvedValue({ status: 204 });
    await expect(deactivateOwnAccess(password, new AbortController().signal)).resolves.toBeUndefined();
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toEqual({ passwordActual: password, confirmado: true });
  });

  it.each([200, 201, 202])('un HTTP %s no acredita una baja completada', async (status) => {
    vi.mocked(apiClient.post).mockResolvedValue({ status });
    await expect(deactivateOwnAccess('contraseña', new AbortController().signal)).rejects.toThrow('No pudimos confirmar');
    expect(apiClient.post).toHaveBeenCalledOnce();
  });

  it.each([400, 401, 403, 429, 503])('preserva el error HTTP %s y no reintenta por su cuenta', async (status) => {
    const error = { response: { status } };
    vi.mocked(apiClient.post).mockRejectedValue(error);
    await expect(deactivateOwnAccess('contraseña', new AbortController().signal)).rejects.toBe(error);
    expect(apiClient.post).toHaveBeenCalledOnce();
  });

  it('un 204 recibido después de abortar no se publica como éxito', async () => {
    const controller = new AbortController();
    vi.mocked(apiClient.post).mockImplementation(async () => {
      controller.abort();
      return { status: 204 };
    });
    await expect(deactivateOwnAccess('contraseña', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
