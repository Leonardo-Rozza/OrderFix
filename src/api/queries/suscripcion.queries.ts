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
