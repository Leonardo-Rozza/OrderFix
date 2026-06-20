import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Suscripcion } from '../../types';

// Estado de la suscripción del taller (plan, consumo del mes, límite)
const fetchSuscripcion = async (): Promise<Suscripcion> => {
  const { data } = await apiClient.get<Suscripcion>('/suscripcion');
  return data;
};

export const useSuscripcionQuery = () => {
  return useQuery({
    queryKey: ['suscripcion'],
    queryFn: fetchSuscripcion,
  });
};
