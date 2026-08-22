import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { unwrapList, toQueryParams, type Page, type ListParams } from '../pagination';
import { queryKeys } from '../queryKeys';
import type { Equipo } from '../../types';

// Listado paginado + búsqueda (server-side)
const fetchEquipos = async (params: ListParams): Promise<Page<Equipo>> => {
  const { data } = await apiClient.get<Page<Equipo>>('/equipos', { params: toQueryParams(params) });
  return data;
};

export const useEquiposQuery = (params: ListParams) => {
  return useQuery({
    queryKey: queryKeys.equipos.list(params),
    queryFn: () => fetchEquipos(params),
    placeholderData: keepPreviousData,
  });
};

// Opciones para selects (ej: elegir equipo en una reparación) — lista acotada
const fetchEquiposOptions = async (): Promise<Equipo[]> => {
  const { data } = await apiClient.get<Page<Equipo> | Equipo[]>('/equipos', { params: { size: 200 } });
  return unwrapList(data);
};

export const useEquiposOptions = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.equipos.options,
    queryFn: fetchEquiposOptions,
    enabled,
  });
};

// Equipos de un cliente (sub-listado: array simple)
const fetchEquiposPorCliente = async (clienteId: number): Promise<Equipo[]> => {
  const { data } = await apiClient.get<Equipo[]>(`/equipos/cliente/${clienteId}`);
  return data;
};

export const useEquiposPorClienteQuery = (clienteId: number | undefined) => {
  return useQuery({
    queryKey: queryKeys.equipos.byCliente(clienteId),
    queryFn: () => fetchEquiposPorCliente(clienteId as number),
    enabled: !!clienteId,
  });
};

// Equipo por ID
const fetchEquipoById = async (id: number): Promise<Equipo> => {
  const { data } = await apiClient.get<Equipo>(`/equipos/${id}`);
  return data;
};

export const useEquipoQuery = (id: number) => {
  return useQuery({
    queryKey: queryKeys.equipos.detail(id),
    queryFn: () => fetchEquipoById(id),
    enabled: !!id,
  });
};
