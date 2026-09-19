import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { ESTADOS_ORDEN } from '../../config/estados';
import type { EstadoReparacion, Reparacion } from '../../types';
import { apiClient } from '../axios';
import { requirePageMeta, toQueryParams, type Page } from '../pagination';
import { queryKeys } from '../queryKeys';

interface StateCountsParams {
  q: string;
  enabled?: boolean;
}

export interface ReparacionesStateCountsResult {
  counts: Partial<Record<EstadoReparacion, number>> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

const fetchStateCount = async (
  estado: EstadoReparacion,
  q: string,
  signal: AbortSignal,
): Promise<number> => {
  const { data } = await apiClient.get<Page<Reparacion>>('/reparaciones', {
    params: { ...toQueryParams({ q, page: 0, size: 1, sort: 'id,desc' }), estado },
    signal,
    errorMode: 'inline',
  });
  const { totalElements } = requirePageMeta(data);
  if (!Number.isSafeInteger(totalElements) || totalElements < 0) {
    throw new Error('La respuesta paginada no incluye un total válido.');
  }
  // Esta caché conserva únicamente el total remoto, nunca una página de órdenes.
  return totalElements;
};

const combineCounts = (queries: UseQueryResult<number>[]): ReparacionesStateCountsResult => {
  const isError = queries.some((query) => query.isError);
  const complete = queries.length === ESTADOS_ORDEN.length
    && queries.every((query) => query.data !== undefined);
  const counts = complete && !isError
    ? Object.fromEntries(
      ESTADOS_ORDEN.map((estado, index) => [estado, queries[index].data]),
    ) as Partial<Record<EstadoReparacion, number>>
    : undefined;

  return {
    counts,
    isLoading: queries.length > 0 && !complete && !isError,
    isFetching: queries.some((query) => query.isFetching),
    isError,
    refetch: async () => {
      await Promise.all(queries.map((query) => query.refetch()));
    },
  };
};

/** Totales de los 12 estados para la búsqueda; el dashboard cubre q vacío. */
export const useReparacionesStateCountsQuery = ({
  q,
  enabled = true,
}: StateCountsParams): ReparacionesStateCountsResult => {
  const normalizedQ = q.trim();
  return useQueries({
    queries: enabled && normalizedQ !== ''
      ? ESTADOS_ORDEN.map((estado) => ({
        queryKey: queryKeys.reparaciones.stateCount(estado, normalizedQ),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchStateCount(estado, normalizedQ, signal),
      }))
      : [],
    combine: combineCounts,
  });
};
