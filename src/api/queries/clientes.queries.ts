import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { unwrapList, toQueryParams, type Page, type ListParams } from '../pagination';
import { queryKeys } from '../queryKeys';
import type { Cliente } from '../../types';

// Listado paginado + búsqueda (server-side)
const fetchClientes = async (params: ListParams): Promise<Page<Cliente>> => {
  const { data } = await apiClient.get<Page<Cliente>>('/clientes', { params: toQueryParams(params) });
  return data;
};

export const useClientesQuery = (params: ListParams) => {
  return useQuery({
    queryKey: queryKeys.clientes.list(params),
    queryFn: () => fetchClientes(params),
    placeholderData: keepPreviousData,
  });
};

// Opciones para selects (ej: elegir cliente en un equipo) — lista acotada
const fetchClientesOptions = async (): Promise<Cliente[]> => {
  const { data } = await apiClient.get<Page<Cliente> | Cliente[]>('/clientes', { params: { size: 200, sort: 'nombre,asc' } });
  return unwrapList(data);
};

export const useClientesOptions = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.clientes.options,
    queryFn: fetchClientesOptions,
    enabled,
  });
};

// Cliente por ID
const fetchClienteById = async (id: number): Promise<Cliente> => {
  const { data } = await apiClient.get<Cliente>(`/clientes/${id}`);
  return data;
};

export const useClienteQuery = (id: number) => {
  return useQuery({
    queryKey: queryKeys.clientes.detail(id),
    queryFn: () => fetchClienteById(id),
    enabled: !!id,
  });
};
