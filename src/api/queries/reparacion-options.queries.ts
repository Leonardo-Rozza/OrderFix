import { apiClient } from '../axios';
import { requirePageMeta, toQueryParams, type Page } from '../pagination';
import { queryKeys } from '../queryKeys';
import { ESTADOS_CERRADOS, getEstadoMeta } from '../../config/estados';
import type { Reparacion } from '../../types';
import { clienteLabel, equipoLabel, ordenLabel } from '../../utils/reparacion';
import type { AsyncComboboxSource } from '../../components/AsyncCombobox';

const REPARACIONES_OPTIONS_SORT = 'id,desc';
const PROBLEMA_MAX_LENGTH = 72;

const resumirProblema = (value: string): string => {
  const normalizado = value.trim().replace(/\s+/g, ' ');
  if (normalizado.length <= PROBLEMA_MAX_LENGTH) return normalizado;
  return `${normalizado.slice(0, PROBLEMA_MAX_LENGTH - 1).trimEnd()}…`;
};

/**
 * Fuente segura para asociar repuestos a órdenes. Usa exclusivamente el
 * listado denormalizado: el detalle por ID queda reservado para la ficha que
 * maneja credenciales efímeras.
 */
export const reparacionesOptionsSource = {
  queryKey: ({ query, size }) => queryKeys.reparaciones.optionSearch({
    q: query.trim(),
    size,
    sort: REPARACIONES_OPTIONS_SORT,
  }),
  loadPage: async ({ query, page, size, signal }) => {
    const { data } = await apiClient.get<Page<Reparacion>>('/reparaciones', {
      params: toQueryParams({
        q: query,
        page,
        size,
        sort: REPARACIONES_OPTIONS_SORT,
      }),
      signal,
      errorMode: 'inline',
    });

    return {
      options: data.content
        .filter((reparacion) => !ESTADOS_CERRADOS.includes(reparacion.estado))
        .map((reparacion) => ({
          value: reparacion.id,
          label: `${ordenLabel(reparacion)} · ${equipoLabel(reparacion)}`,
          sublabel: [
            clienteLabel(reparacion),
            resumirProblema(reparacion.descripcionProblema),
            getEstadoMeta(reparacion.estado).label,
          ].filter(Boolean).join(' · '),
        })),
      // Es deliberadamente la metadata de la página sin filtrar. Así una
      // página compuesta por cerradas no oculta que todavía quedan resultados.
      page: requirePageMeta(data),
    };
  },
  maxAutomaticPages: 1,
} satisfies AsyncComboboxSource;
