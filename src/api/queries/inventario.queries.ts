import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../axios';
import {
  requirePageMeta,
  toQueryParams,
  type Page,
  type ListParams,
} from '../pagination';
import { queryKeys } from '../queryKeys';
import type { Articulo } from '../../types';
import type { AsyncComboboxSource } from '../../components/AsyncCombobox';
import { formatMoney } from '../../utils/format';

export type ArticuloOptionMeta = Pick<Articulo, 'nombre' | 'precio' | 'stock'>;

const articuloSublabel = (articulo: Articulo): string => [
  articulo.sku ? `SKU ${articulo.sku}` : undefined,
  `Stock ${articulo.stock}`,
  formatMoney(articulo.precio),
].filter(Boolean).join(' · ');

/** Fuente remota de inventario con metadata mínima para autocompletar repuestos. */
export const inventarioOptionsSource = {
  queryKey: ({ query, size }) => queryKeys.inventario.optionSearch({
    q: query.trim(),
    size,
  }),
  loadPage: async ({ query, page, size, signal }) => {
    const { data } = await apiClient.get<Page<Articulo>>('/inventario', {
      // El contrato de inventario no garantiza `sort`; no se envía uno.
      params: toQueryParams({ q: query, page, size }),
      signal,
      errorMode: 'inline',
    });

    return {
      options: data.content.map((articulo) => ({
        value: articulo.id,
        label: articulo.nombre,
        sublabel: articuloSublabel(articulo),
        meta: {
          nombre: articulo.nombre,
          precio: articulo.precio,
          stock: articulo.stock,
        },
      })),
      page: requirePageMeta(data),
    };
  },
} satisfies AsyncComboboxSource<number, ArticuloOptionMeta>;

// Listado de inventario paginado + búsqueda (server-side)
const fetchInventario = async (params: ListParams): Promise<Page<Articulo>> => {
  const { data } = await apiClient.get<Page<Articulo>>('/inventario', { params: toQueryParams(params) });
  return data;
};

export const useInventarioQuery = (params: ListParams, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.inventario.list(params),
    queryFn: () => fetchInventario(params),
    enabled,
    placeholderData: keepPreviousData,
  });
};
