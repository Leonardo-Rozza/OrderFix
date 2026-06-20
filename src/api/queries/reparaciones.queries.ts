import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { toQueryParams, type Page, type ListParams } from '../pagination';
import type { EstadoReparacion, Reparacion } from '../../types';

export interface ReparacionesParams extends ListParams {
  estado?: EstadoReparacion;
}

// Listado paginado + búsqueda + filtro por estado (server-side)
const fetchReparaciones = async (params: ReparacionesParams): Promise<Page<Reparacion>> => {
  const { data } = await apiClient.get<Page<Reparacion>>('/reparaciones', {
    params: { ...toQueryParams(params), estado: params.estado },
  });
  return data;
};

export const useReparacionesQuery = (params: ReparacionesParams, enabled = true) => {
  return useQuery({
    queryKey: ['reparaciones', params],
    queryFn: () => fetchReparaciones(params),
    enabled,
    placeholderData: keepPreviousData,
  });
};

// Reparación por ID (denormalizada: trae equipo + cliente)
const fetchReparacionById = async (id: number): Promise<Reparacion> => {
  const { data } = await apiClient.get<Reparacion>(`/reparaciones/${id}`);
  return data;
};

export const useReparacionQuery = (id: number | undefined) => {
  return useQuery({
    queryKey: ['reparacion', id],
    queryFn: () => fetchReparacionById(id as number),
    enabled: !!id,
  });
};
