import type { PageMeta } from '../api/pagination';
import type { Reparacion } from '../types';

export interface ReparacionesBoardPage {
  content: Reparacion[];
  page: PageMeta;
}

export interface ReparacionesBoardProjection {
  items: Reparacion[];
  total: number;
  visible: number;
  remaining: number;
  nextBatchSize: number;
}

/**
 * Une las páginas de una zona sin permitir tarjetas duplicadas. Un dato más
 * reciente actualiza el contenido del mismo ID, pero no altera su posición en
 * el orden paginado original.
 */
export const projectReparacionesBoardPages = (
  pages: readonly ReparacionesBoardPage[] | undefined,
  pageSize: number,
): ReparacionesBoardProjection => {
  const byId = new Map<number, Reparacion>();

  pages?.forEach(({ content }) => {
    content.forEach((reparacion) => byId.set(reparacion.id, reparacion));
  });

  const items = Array.from(byId.values());
  const total = pages?.at(-1)?.page.totalElements ?? 0;
  const visible = items.length;
  const remaining = Math.max(total - visible, 0);

  return {
    items,
    total,
    visible,
    remaining,
    nextBatchSize: Math.min(pageSize, remaining),
  };
};
