import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../axios';
import {
  requirePageMeta,
  toQueryParams,
  type Page,
  type PageMeta,
  type ListParams,
} from '../pagination';
import { queryKeys } from '../queryKeys';
import type {
  EstadoReparacion,
  Reparacion,
  ReparacionCredenciales,
  ReparacionDetalle,
} from '../../types';

export interface ReparacionesParams extends ListParams {
  estado?: EstadoReparacion;
}

export interface ReparacionesBoardParams {
  estado: EstadoReparacion;
  q: string;
  size?: number;
  sort?: string;
}

export type ReparacionesBoardPage = Page<Reparacion> & { page: PageMeta };

const REPARACIONES_BOARD_PAGE_SIZE = 20;
const REPARACIONES_BOARD_SORT = 'id,desc';

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

const fetchReparacionesBoardPage = async ({
  estado,
  q,
  page,
  size,
  sort,
  signal,
}: {
  estado: EstadoReparacion;
  q: string;
  page: number;
  size: number;
  sort: string;
  signal: AbortSignal;
}): Promise<ReparacionesBoardPage> => {
  const { data } = await apiClient.get<Page<Reparacion>>('/reparaciones', {
    params: {
      ...toQueryParams({ q, page, size, sort }),
      estado,
    },
    signal,
    errorMode: 'inline',
  });

  return {
    ...data,
    page: requirePageMeta(data),
  };
};

/** Consulta incremental aislada de los listados tradicionales de reparaciones. */
export const useReparacionesBoardInfiniteQuery = ({
  estado,
  q,
  size = REPARACIONES_BOARD_PAGE_SIZE,
  sort = REPARACIONES_BOARD_SORT,
}: ReparacionesBoardParams) => {
  const normalizedQ = q.trim();

  return useInfiniteQuery({
    queryKey: queryKeys.reparaciones.board(estado, {
      q: normalizedQ,
      size,
      sort,
    }),
    queryFn: ({ pageParam, signal }) => fetchReparacionesBoardPage({
      estado,
      q: normalizedQ,
      page: pageParam,
      size,
      sort,
      signal,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (
      lastPage.page.number + 1 < lastPage.page.totalPages
        ? lastPage.page.number + 1
        : undefined
    ),
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

const credencialesVacias = (): ReparacionCredenciales => ({
  patronDesbloqueo: null,
  pinDesbloqueo: null,
});

type CredencialesListener = (id: number, value: ReparacionCredenciales) => void;
const credencialesListeners = new Set<CredencialesListener>();

const publicarCredenciales = (id: number, value: ReparacionCredenciales) => {
  // Canal síncrono sin almacenamiento: al terminar este loop el módulo no
  // conserva ninguna referencia al secreto.
  credencialesListeners.forEach((listener) => listener(id, value));
};

/**
 * Separa el único response sensible del contrato. El objeto `reparacion` es el
 * único que puede entrar a React Query; las credenciales quedan a cargo de la
 * ficha que hizo el GET.
 */
export const separarReparacionDetalle = (
  detalle: ReparacionDetalle,
): { reparacion: Reparacion; credenciales: ReparacionCredenciales } => {
  const {
    patronDesbloqueo,
    pinDesbloqueo,
    ...reparacion
  } = detalle;

  return {
    reparacion,
    // Defensa adicional: aunque un backend viejo los devolviera, una orden ya
    // entregada nunca conserva secretos en la UI.
    credenciales: detalle.estado === 'ENTREGADO'
      ? credencialesVacias()
      : {
          patronDesbloqueo: patronDesbloqueo ?? null,
          pinDesbloqueo: pinDesbloqueo ?? null,
        },
  };
};

// Reparación por ID (denormalizada: trae equipo + cliente). Publica los secretos
// por un canal efímero sin retenerlos; el return ya está sanitizado.
const fetchReparacionById = async (
  id: number,
  signal?: AbortSignal,
): Promise<Reparacion> => {
  const { data } = await apiClient.get<ReparacionDetalle>(`/reparaciones/${id}`, { signal });
  const { reparacion, credenciales } = separarReparacionDetalle(data);
  publicarCredenciales(id, credenciales);
  return reparacion;
};

/**
 * Detalle seguro: React Query cachea `Reparacion`; PIN/patrón viven solamente
 * en el estado efímero de esta instancia y desaparecen al desmontarla.
 */
export const useReparacionQuery = (id: number | undefined) => {
  const credencialesRef = useRef<{
    id: number | undefined;
    credenciales: ReparacionCredenciales;
  }>({ id, credenciales: credencialesVacias() });
  const [estadoLocal, setEstadoLocal] = useState<{
    id: number | undefined;
    credenciales: ReparacionCredenciales;
  }>(() => ({ id, credenciales: credencialesVacias() }));

  useLayoutEffect(() => {
    credencialesRef.current = { id, credenciales: credencialesVacias() };
    const listener: CredencialesListener = (responseId, value) => {
      if (responseId !== id) return;
      credencialesRef.current = { id: responseId, credenciales: value };
      setEstadoLocal({ id: responseId, credenciales: value });
    };
    credencialesListeners.add(listener);
    return () => {
      credencialesListeners.delete(listener);
      credencialesRef.current = { id: undefined, credenciales: credencialesVacias() };
    };
  }, [id]);

  const query = useQuery({
    queryKey: queryKeys.reparaciones.detail(id),
    queryFn: ({ signal }) => fetchReparacionById(id as number, signal),
    enabled: !!id,
    // La cache contiene sólo Reparacion. Cada nueva ficha debe repetir el GET
    // para reconstruir sus credenciales locales aunque el dato seguro esté fresh.
    refetchOnMount: 'always',
  });

  const limpiarCredenciales = useCallback(() => {
    const vacias = credencialesVacias();
    credencialesRef.current = { id, credenciales: vacias };
    setEstadoLocal({ id, credenciales: vacias });
  }, [id]);

  const refetchQuery = query.refetch;
  const refetchCredenciales = useCallback(async (): Promise<ReparacionCredenciales> => {
    const result = await refetchQuery();
    if (result.error) throw result.error;
    return credencialesRef.current.id === id
      ? credencialesRef.current.credenciales
      : credencialesVacias();
  }, [id, refetchQuery]);

  const credenciales = estadoLocal.id === id
    ? estadoLocal.credenciales
    : credencialesVacias();

  return {
    ...query,
    credenciales,
    limpiarCredenciales,
    refetchCredenciales,
  };
};
