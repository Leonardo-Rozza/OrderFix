import { useQuery } from '@tanstack/react-query';
import type { DatosCobro } from '../../types';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';

export const fetchDatosCobro = async (signal?: AbortSignal): Promise<DatosCobro> => {
  const { data } = await apiClient.get<DatosCobro>('/taller/datos-cobro', {
    signal,
    errorMode: 'inline',
  });
  return data;
};

export const fetchQrCobro = async (signal?: AbortSignal): Promise<Blob> => {
  const { data } = await apiClient.get<Blob>('/taller/datos-cobro/qr', {
    signal,
    responseType: 'blob',
    errorMode: 'inline',
  });
  return data;
};

export const useDatosCobroQuery = (enabled = true) => useQuery({
  queryKey: queryKeys.datosCobro.detail,
  queryFn: ({ signal }) => fetchDatosCobro(signal),
  enabled,
});

export const useQrCobroQuery = (
  qrVersion: string | null | undefined,
  enabled = true,
) => useQuery({
  queryKey: queryKeys.datosCobro.qr(qrVersion),
  queryFn: ({ signal }) => fetchQrCobro(signal),
  enabled: enabled && !!qrVersion,
  staleTime: Number.POSITIVE_INFINITY,
});
