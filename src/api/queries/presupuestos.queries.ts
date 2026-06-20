import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Presupuesto } from '../../types';

// Presupuestos de una reparación (más nuevo primero) — sub-listado: array simple
const fetchPresupuestos = async (reparacionId: number): Promise<Presupuesto[]> => {
  const { data } = await apiClient.get<Presupuesto[]>(`/reparaciones/${reparacionId}/presupuestos`);
  return data;
};

export const usePresupuestosQuery = (reparacionId: number | undefined) => {
  return useQuery({
    queryKey: ['presupuestos', reparacionId],
    queryFn: () => fetchPresupuestos(reparacionId as number),
    enabled: !!reparacionId,
  });
};
