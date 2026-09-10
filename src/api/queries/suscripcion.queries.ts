import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import type { Suscripcion } from '../../types';

export const SUSCRIPCION_KEY = queryKeys.suscripcion.all;

// Estado de la suscripción del taller (plan, consumo del mes, límite)
export const fetchSuscripcion = async (): Promise<Suscripcion> => {
  const { data } = await apiClient.get<Suscripcion>('/suscripcion');
  return data;
};

export const useSuscripcionQuery = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.suscripcion.all,
    queryFn: fetchSuscripcion,
    enabled,
  });
};

/**
 * Capacidades efectivas informadas por el backend.
 *
 * Fallan cerradas: mientras el contrato está pendiente, falló o llegó sin el
 * mapa `funciones`, ningún consumidor debe llamar endpoints restringidos.
 */
export const useFunciones = (enabled = true) => {
  const query = useSuscripcionQuery(enabled);
  const funciones = query.data?.funciones;
  const contratoValido = query.isSuccess && funciones != null;

  return {
    inventario: contratoValido && funciones.inventario === true,
    cobros: contratoValido && funciones.cobros === true,
    empleadosMultiples: contratoValido && funciones.empleadosMultiples === true,
    isLoading: query.isPending,
    isError: query.isError || (query.isSuccess && funciones == null),
    refetch: query.refetch,
  };
};
