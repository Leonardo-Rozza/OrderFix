import { useEffect } from 'react';

interface PageBoundsMeta {
  totalPages: number;
}

/**
 * Corrige una página que dejó de existir, por ejemplo después de borrar el
 * último registro de la última página. No actúa mientras se muestran datos
 * placeholder porque esa metadata todavía pertenece al criterio anterior.
 */
export const usePageBounds = (
  page: number,
  onChange: (page: number) => void,
  meta: PageBoundsMeta | undefined,
  settled = true,
) => {
  useEffect(() => {
    if (!settled || !meta) return;

    const lastPage = Math.max(meta.totalPages - 1, 0);
    if (page > lastPage) onChange(lastPage);
  }, [meta, onChange, page, settled]);
};
