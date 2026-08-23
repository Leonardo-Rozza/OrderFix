import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import {
  fetchDatosCobro,
  fetchQrCobro,
  useQrCobroQuery,
} from './datosCobro.queries';

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('datos de cobro queries', () => {
  afterEach(() => vi.restoreAllMocks());

  it('consulta metadatos inline y el QR como blob autenticado en requests separados', async () => {
    const controller = new AbortController();
    const datos = {
      alias: 'mitaller.mp',
      titular: 'Mi Taller',
      entidad: 'Mercado Pago',
      mostrarEnResumen: true,
      qrDisponible: true,
      qrVersion: 'sha-1',
    };
    const blob = new Blob(['png'], { type: 'image/png' });
    const get = vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: datos })
      .mockResolvedValueOnce({ data: blob });

    await expect(fetchDatosCobro(controller.signal)).resolves.toEqual(datos);
    await expect(fetchQrCobro(controller.signal)).resolves.toBe(blob);

    expect(get).toHaveBeenNthCalledWith(1, '/taller/datos-cobro', {
      signal: controller.signal,
      errorMode: 'inline',
    });
    expect(get).toHaveBeenNthCalledWith(2, '/taller/datos-cobro/qr', {
      signal: controller.signal,
      responseType: 'blob',
      errorMode: 'inline',
    });
  });

  it('liga la caché del blob a qrVersion y no descarga sin versión', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: new Blob(['png'], { type: 'image/png' }),
    });
    const initialProps: { version: string | null } = { version: null };
    const { result, rerender } = renderHook(
      ({ version }: { version: string | null }) => useQrCobroQuery(version),
      { wrapper: createWrapper(), initialProps },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(get).not.toHaveBeenCalled();

    rerender({ version: 'sha-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledTimes(1);

    rerender({ version: 'sha-2' });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(queryKeys.datosCobro.qr('sha-2')).toEqual(['datos-cobro', 'qr', 'sha-2']);
  });
});
