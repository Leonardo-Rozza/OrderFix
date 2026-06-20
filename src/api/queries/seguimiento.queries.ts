import { useQuery } from '@tanstack/react-query';
import { publicClient } from '../axios';
import type { Seguimiento } from '../../types';

// Seguimiento público (sin token) por código
const fetchSeguimiento = async (codigo: string): Promise<Seguimiento> => {
  const { data } = await publicClient.get<Seguimiento>(`/seguimiento/${codigo}`);
  return data;
};

export const useSeguimientoQuery = (codigo: string | undefined) => {
  return useQuery({
    queryKey: ['seguimiento', codigo],
    queryFn: () => fetchSeguimiento(codigo as string),
    enabled: !!codigo,
    retry: false,
  });
};
