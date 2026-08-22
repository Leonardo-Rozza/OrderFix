import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../axios';
import {
  requirePageMeta,
  toQueryParams,
  type Page,
  type ListParams,
} from '../pagination';
import { queryKeys } from '../queryKeys';
import type { Cliente } from '../../types';
import type { AsyncComboboxSource } from '../../components/AsyncCombobox';

const CLIENTES_OPTIONS_SORT = 'nombre,asc';

/** Fuente remota del selector; cada página se transforma antes de entrar al cache. */
export const clientesOptionsSource = {
  queryKey: ({ query, size }) => queryKeys.clientes.optionSearch({
    q: query.trim(),
    size,
    sort: CLIENTES_OPTIONS_SORT,
  }),
  loadPage: async ({ query, page, size, signal }) => {
    const { data } = await apiClient.get<Page<Cliente>>('/clientes', {
      params: toQueryParams({
        q: query,
        page,
        size,
        sort: CLIENTES_OPTIONS_SORT,
      }),
      signal,
      errorMode: 'inline',
    });

    return {
      options: data.content.map((cliente) => ({
        value: cliente.id,
        label: `${cliente.nombre} ${cliente.apellido}`.trim(),
        sublabel: cliente.telefono || undefined,
      })),
      page: requirePageMeta(data),
    };
  },
} satisfies AsyncComboboxSource;

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
