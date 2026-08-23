import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import type { CajaResumen, CobrosReparacion, ResumenDigital } from '../../types';

// Cobros + resumen de una reparación
const fetchCobros = async (reparacionId: number): Promise<CobrosReparacion> => {
  const { data } = await apiClient.get<CobrosReparacion>(`/reparaciones/${reparacionId}/cobros`);
  return data;
};

export const useCobrosQuery = (reparacionId: number | undefined) => {
  return useQuery({
    queryKey: queryKeys.cobros.byReparacion(reparacionId),
    queryFn: () => fetchCobros(reparacionId as number),
    enabled: !!reparacionId,
  });
};

// Resumen operativo autenticado. La key histórica evita duplicar la caché.
export const fetchResumenDigital = async (
  reparacionId: number,
  signal?: AbortSignal,
): Promise<ResumenDigital> => {
  const { data } = await apiClient.get<ResumenDigital>(
    `/reparaciones/${reparacionId}/resumen-digital`,
    { signal, errorMode: 'inline' },
  );
  return data;
};

export const useResumenDigitalQuery = (reparacionId: number | undefined) => {
  return useQuery({
    queryKey: queryKeys.resumenes.byReparacion(reparacionId),
    queryFn: ({ signal }) => fetchResumenDigital(reparacionId as number, signal),
    enabled: !!reparacionId,
  });
};

/** @deprecated El alias comparte hook, endpoint canónico y caché. */
export const useReciboQuery = useResumenDigitalQuery;

// Caja por período (sin params = hoy)
const fetchCaja = async (rango: { desde?: string; hasta?: string }): Promise<CajaResumen> => {
  const { data } = await apiClient.get<CajaResumen>('/caja', { params: rango });
  return data;
};

export const useCajaQuery = (rango: { desde?: string; hasta?: string }, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.caja.range(rango),
    queryFn: () => fetchCaja(rango),
    enabled,
  });
};
