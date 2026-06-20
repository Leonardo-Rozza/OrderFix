import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { unwrapList, FETCH_ALL_PARAMS, type Page } from '../pagination';
import type { Equipo } from '../../types';

// Obtener todos los equipos (la respuesta puede venir paginada)
const fetchEquipos = async (): Promise<Equipo[]> => {
  const { data } = await apiClient.get<Equipo[] | Page<Equipo>>('/equipos', { params: FETCH_ALL_PARAMS });
  return unwrapList(data);
};

// Hook para obtener equipos
export const useEquiposQuery = () => {
  return useQuery({
    queryKey: ['equipos'],
    queryFn: fetchEquipos,
  });
};

// Obtener un equipo por ID
const fetchEquipoById = async (id: number): Promise<Equipo> => {
  const { data } = await apiClient.get<Equipo>(`/equipos/${id}`);
  return data;
};

// Hook para obtener un equipo por ID
export const useEquipoQuery = (id: number) => {
  return useQuery({
    queryKey: ['equipo', id],
    queryFn: () => fetchEquipoById(id),
    enabled: !!id,
  });
};
