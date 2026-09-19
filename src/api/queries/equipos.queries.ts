import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../axios';
import {
  requirePageMeta,
  toQueryParams,
  type Page,
} from '../pagination';
import { queryKeys, type EquiposQueryParams } from '../queryKeys';
import type { Equipo, TipoEquipo } from '../../types';
import { tipoEquipoLabel } from '../../config/equipos';
import type { AsyncComboboxSource } from '../../components/AsyncCombobox';

const EQUIPOS_OPTIONS_SORT = 'id,desc';

const equipoSublabel = (equipo: Equipo): string | undefined => {
  const cliente = `${equipo.clienteNombre ?? ''} ${equipo.clienteApellido ?? ''}`.trim();
  return [tipoEquipoLabel(equipo.tipo), cliente || undefined, equipo.imei ? `Serie / IMEI ${equipo.imei}` : undefined]
    .filter(Boolean)
    .join(' · ') || undefined;
};

/** Fuente remota del selector de equipos existentes. */
export const equiposOptionsSource = {
  queryKey: ({ query, size }) => queryKeys.equipos.optionSearch({
    q: query.trim(),
    size,
    sort: EQUIPOS_OPTIONS_SORT,
  }),
  loadPage: async ({ query, page, size, signal }) => {
    const { data } = await apiClient.get<Page<Equipo>>('/equipos', {
      params: toQueryParams({
        q: query,
        page,
        size,
        sort: EQUIPOS_OPTIONS_SORT,
      }),
      signal,
      errorMode: 'inline',
    });

    return {
      options: data.content.map((equipo) => ({
        value: equipo.id,
        label: `${equipo.marca} ${equipo.modelo}`.trim(),
        sublabel: equipoSublabel(equipo),
        meta: { tipo: equipo.tipo ?? 'OTRO' },
      })),
      page: requirePageMeta(data),
    };
  },
} satisfies AsyncComboboxSource<number, { tipo: TipoEquipo }>;

// Listado paginado + búsqueda (server-side)
const fetchEquipos = async (params: EquiposQueryParams): Promise<Page<Equipo>> => {
  const { data } = await apiClient.get<Page<Equipo>>('/equipos', {
    params: { ...toQueryParams(params), ...(params.tipo ? { tipo: params.tipo } : {}) },
  });
  return data;
};

export const useEquiposQuery = (params: EquiposQueryParams) => {
  return useQuery({
    queryKey: queryKeys.equipos.list(params),
    queryFn: () => fetchEquipos(params),
    placeholderData: keepPreviousData,
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
