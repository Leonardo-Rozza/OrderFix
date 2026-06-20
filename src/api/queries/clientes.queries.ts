import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { unwrapList, FETCH_ALL_PARAMS, type Page } from '../pagination';
import type { Cliente } from '../../types';

// Obtener todos los clientes (la respuesta puede venir paginada)
const fetchClientes = async (): Promise<Cliente[]> => {
  const { data } = await apiClient.get<Cliente[] | Page<Cliente>>('/clientes', { params: FETCH_ALL_PARAMS });
  return unwrapList(data);
};

// Hook para obtener clientes
export const useClientesQuery = () => {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: fetchClientes,
  });
};

// Obtener un cliente por ID
const fetchClienteById = async (id: number): Promise<Cliente> => {
  const { data } = await apiClient.get<Cliente>(`/clientes/${id}`);
  return data;
};

// Hook para obtener un cliente por ID
export const useClienteQuery = (id: number) => {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: () => fetchClienteById(id),
    enabled: !!id,
  });
};
