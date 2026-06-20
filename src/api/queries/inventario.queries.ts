import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { unwrapList, FETCH_ALL_PARAMS, type Page } from '../pagination';
import type { Articulo } from '../../types';

// Catálogo de artículos (paginado)
const fetchInventario = async (): Promise<Articulo[]> => {
  const { data } = await apiClient.get<Articulo[] | Page<Articulo>>('/inventario', { params: FETCH_ALL_PARAMS });
  return unwrapList(data);
};

export const useInventarioQuery = (enabled = true) => {
  return useQuery({
    queryKey: ['inventario'],
    queryFn: fetchInventario,
    enabled,
  });
};
