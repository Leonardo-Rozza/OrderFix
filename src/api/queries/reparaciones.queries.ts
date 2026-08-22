import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { FETCH_ALL_PARAMS, toQueryParams, unwrapList, type Page, type ListParams } from '../pagination';
import { queryKeys } from '../queryKeys';
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
    queryKey: queryKeys.reparaciones.list(params),
    queryFn: () => fetchReparaciones(params),
    enabled,
    placeholderData: keepPreviousData,
  });
};

// Opciones globales para asociar recursos (por ejemplo, un repuesto) a una orden.
const fetchReparacionesOptions = async (): Promise<Reparacion[]> => {
  const { data } = await apiClient.get<Page<Reparacion> | Reparacion[]>('/reparaciones', {
    params: { ...FETCH_ALL_PARAMS, sort: 'id,desc' },
  });
  return unwrapList(data);
};

export const useReparacionesOptions = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.reparaciones.options,
    queryFn: fetchReparacionesOptions,
    enabled,
  });
};

// Reparaciones de un equipo (sub-listado: array simple)
const fetchReparacionesPorEquipo = async (equipoId: number): Promise<Reparacion[]> => {
  const { data } = await apiClient.get<Reparacion[]>(`/reparaciones/equipo/${equipoId}`);
  return data;
};

export const useReparacionesPorEquipoQuery = (equipoId: number | undefined) => {
  return useQuery({
    queryKey: queryKeys.reparaciones.byEquipo(equipoId),
    queryFn: () => fetchReparacionesPorEquipo(equipoId as number),
    enabled: !!equipoId,
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
