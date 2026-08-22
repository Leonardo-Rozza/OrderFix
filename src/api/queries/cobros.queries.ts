import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import type { CajaResumen, CobrosReparacion, Recibo } from '../../types';

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

// Recibo imprimible
const fetchRecibo = async (reparacionId: number): Promise<Recibo> => {
  const { data } = await apiClient.get<Recibo>(`/reparaciones/${reparacionId}/recibo`);
  return data;
};

export const useReciboQuery = (reparacionId: number | undefined) => {
  return useQuery({
    queryKey: queryKeys.recibos.byReparacion(reparacionId),
    queryFn: () => fetchRecibo(reparacionId as number),
    enabled: !!reparacionId,
  });
};

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
