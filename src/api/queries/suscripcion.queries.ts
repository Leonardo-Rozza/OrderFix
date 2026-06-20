import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Suscripcion } from '../../types';

export const SUSCRIPCION_KEY = ['suscripcion'] as const;

// Estado de la suscripción del taller (plan, consumo del mes, límite)
export const fetchSuscripcion = async (): Promise<Suscripcion> => {
  const { data } = await apiClient.get<Suscripcion>('/suscripcion');
  return data;
};

export const useSuscripcionQuery = () => {
  return useQuery({
    queryKey: SUSCRIPCION_KEY,
    queryFn: fetchSuscripcion,
  });
};

/**
 * Flags de funciones del plan. Por defecto "habilitado" (true) salvo que el
 * backend lo marque explícitamente en false → así no parpadea para PRO.
 */
export const useFunciones = () => {
  const { data } = useSuscripcionQuery();
  const f = data?.funciones;
  return {
    inventario: f?.inventario !== false,
    cobros: f?.cobros !== false,
    empleadosMultiples: f?.empleadosMultiples !== false,
  };
};
