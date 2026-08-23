import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { AxiosRequestConfig } from 'axios';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DatosCobro } from '../../types';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import {
  actualizarDatosCobro,
  eliminarQrCobro,
  subirQrCobro,
  useSubirQrCobroMutation,
} from './datosCobro.mutations';

const datos: DatosCobro = {
  alias: 'mitaller.mp',
  titular: 'Mi Taller',
  entidad: 'Mercado Pago',
  mostrarEnResumen: true,
  qrDisponible: true,
  qrVersion: 'sha-nueva',
};

describe('datos de cobro mutations', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reemplaza los metadatos completos y devuelve el DTO autoritativo', async () => {
    const body = {
      alias: 'mitaller.mp',
      titular: null,
      entidad: 'Mercado Pago',
      mostrarEnResumen: false,
    };
    const put = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({ data: datos });

    await expect(actualizarDatosCobro(body)).resolves.toBe(datos);
    expect(put).toHaveBeenCalledWith('/taller/datos-cobro', body, { errorMode: 'inline' });
  });

  it('envía una única parte multipart file sin fijar Content-Type y reporta progreso', async () => {
    const file = new File(['qr'], 'qr.png', { type: 'image/png' });
    const onProgress = vi.fn();
    let sentBody: FormData | undefined;
    let sentConfig: AxiosRequestConfig | undefined;
    vi.spyOn(apiClient, 'put').mockImplementationOnce(async (_url, body, config) => {
      sentBody = body as FormData;
      sentConfig = config;
      config?.onUploadProgress?.({ loaded: 5, total: 10, bytes: 5 } as never);
      return { data: datos };
    });

    await expect(subirQrCobro({ file, onProgress })).resolves.toBe(datos);

    expect(sentBody?.get('file')).toBe(file);
    expect([...sentBody!.keys()]).toEqual(['file']);
    expect(sentConfig?.headers).toMatchObject({ 'Content-Type': false });
    expect(sentConfig?.headers?.['Content-Type']).not.toBe('multipart/form-data');
    expect(sentConfig?.errorMode).toBe('inline');
    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it('elimina con DELETE y reconcilia configuración, blob versionado y resúmenes', async () => {
    const deleted = { ...datos, qrDisponible: false, qrVersion: null };
    vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({ data: deleted });
    await expect(eliminarQrCobro()).resolves.toEqual(deleted);
    expect(apiClient.delete).toHaveBeenCalledWith('/taller/datos-cobro/qr', { errorMode: 'inline' });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const cancel = vi.spyOn(client, 'cancelQueries');
    const remove = vi.spyOn(client, 'removeQueries');
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    vi.spyOn(apiClient, 'put').mockResolvedValueOnce({ data: datos });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSubirQrCobroMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        file: new File(['qr'], 'qr.png', { type: 'image/png' }),
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(queryKeys.datosCobro.detail)).toEqual(datos);
    expect(cancel).toHaveBeenCalledWith({ queryKey: queryKeys.datosCobro.qrAll });
    expect(remove).toHaveBeenCalledWith({ queryKey: queryKeys.datosCobro.qrAll });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.recibos.all });
  });
});
