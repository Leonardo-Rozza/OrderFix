import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { unwrapList, FETCH_ALL_PARAMS, type Page } from '../pagination';
import type { Reparacion } from '../../types';

// Obtener todas las reparaciones (la respuesta puede venir paginada)
const fetchReparaciones = async (): Promise<Reparacion[]> => {
  const { data } = await apiClient.get<Reparacion[] | Page<Reparacion>>('/reparaciones', { params: FETCH_ALL_PARAMS });
  return unwrapList(data);
};

// Hook para obtener reparaciones
export const useReparacionesQuery = () => {
  return useQuery({
    queryKey: ['reparaciones'],
    queryFn: fetchReparaciones,
  });
};

// Obtener una reparación por ID
const fetchReparacionById = async (id: number): Promise<Reparacion> => {
  const { data } = await apiClient.get<Reparacion>(`/reparaciones/${id}`);
  return data;
};

// Hook para obtener una reparación por ID
export const useReparacionQuery = (id: number) => {
  return useQuery({
    queryKey: ['reparacion', id],
    queryFn: () => fetchReparacionById(id),
    enabled: !!id,
  });
};
