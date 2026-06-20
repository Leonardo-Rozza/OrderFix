import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { unwrapList, toQueryParams, type Page, type ListParams } from '../pagination';
import type { Articulo } from '../../types';

// Listado de inventario paginado + búsqueda (server-side)
const fetchInventario = async (params: ListParams): Promise<Page<Articulo>> => {
  const { data } = await apiClient.get<Page<Articulo>>('/inventario', { params: toQueryParams(params) });
  return data;
};

export const useInventarioQuery = (params: ListParams, enabled = true) => {
  return useQuery({
    queryKey: ['inventario', params],
    queryFn: () => fetchInventario(params),
    enabled,
    placeholderData: keepPreviousData,
  });
};

// Opciones para selects (ej: elegir artículo al cargar un repuesto) — lista acotada
const fetchArticulosOptions = async (): Promise<Articulo[]> => {
  const { data } = await apiClient.get<Page<Articulo> | Articulo[]>('/inventario', { params: { size: 200 } });
  return unwrapList(data);
};

export const useArticulosOptions = (enabled = true) => {
  return useQuery({
    queryKey: ['inventario', 'options'],
    queryFn: fetchArticulosOptions,
    enabled,
  });
};
