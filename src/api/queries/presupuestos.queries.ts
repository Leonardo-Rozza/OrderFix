import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import type { Presupuesto } from '../../types';

// Presupuestos de una reparación (más nuevo primero) — sub-listado: array simple
const fetchPresupuestos = async (reparacionId: number): Promise<Presupuesto[]> => {
  const { data } = await apiClient.get<Presupuesto[]>(`/reparaciones/${reparacionId}/presupuestos`);
  return data;
};

export const usePresupuestosQuery = (reparacionId: number | undefined) => {
  return useQuery({
    queryKey: queryKeys.presupuestos.byReparacion(reparacionId),
    queryFn: () => fetchPresupuestos(reparacionId as number),
    enabled: !!reparacionId,
  });
};
