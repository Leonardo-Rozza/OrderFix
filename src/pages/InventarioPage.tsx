import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ArticuloFormModal } from '../components/ArticuloFormModal';
import { AjusteStockModal } from '../components/AjusteStockModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FeatureLocked } from '../components/FeatureLocked';
import { Pagination } from '../components/Pagination';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { btnPrimary } from '../components/ui';
import { formatMoney } from '../utils/format';
import { useListParams } from '../hooks/useListParams';
import { usePageBounds } from '../hooks/usePageBounds';
import { useInventarioQuery } from '../api/queries/inventario.queries';
import { useFunciones } from '../api/queries/suscripcion.queries';
import { useDeleteArticuloMutation } from '../api/mutations/inventario.mutations';
import { useAuth } from '../store/auth.store';
import type { Articulo } from '../types';

export const InventarioPage = () => {
  const { inventario } = useFunciones();
  const { q, onSearch, page, setPage, debouncedQ, size } = useListParams();
  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useInventarioQuery({ q: debouncedQ, page, size }, inventario);
  const { isAdmin } = useAuth();
  const deleteMutation = useDeleteArticuloMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Articulo | null>(null);
  const [ajuste, setAjuste] = useState<Articulo | null>(null);
  const [toDelete, setToDelete] = useState<Articulo | null>(null);

  const articulos = data?.content ?? [];
  const refreshing = isFetching && isPlaceholderData;
  usePageBounds(page, setPage, data?.page, !isPlaceholderData);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteMutation.mutateAsync(toDelete.id);
    setToDelete(null);
  };

  if (!inventario) {
    return (
      <DashboardLayout title="Inventario">
        <FeatureLocked
          titulo="Inventario es una función PRO"
          detalle="El control de stock (artículos, ajustes y aviso de stock bajo) está disponible en el plan PRO."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Inventario">
      <div className="ofx-in mx-auto max-w-[1000px] space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] max-w-[360px] flex-1">
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
            </svg>
            <input
              type="search"
              aria-label="Buscar inventario"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU…"
              className="min-h-11 w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-base text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)] sm:min-h-0 sm:text-[13.5px]"
            />
          </div>
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={openNew}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo artículo
          </button>
        </div>

        {refreshing && (
          <div role="status" className="px-1 text-[12.5px] font-semibold text-text-3">
            Actualizando resultados…
          </div>
        )}

        <div aria-busy={refreshing} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
            <div className="min-w-0 flex-[1.6]">Artículo</div>
            <div className="hidden w-[110px] text-right sm:block">Precio</div>
            <div className="w-[70px] text-center sm:w-[90px]">Stock</div>
            <div className="hidden w-[96px] sm:block" />
          </div>

          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <div className="ofx-skel h-4 flex-1 rounded" />
              </div>
            ))
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} message="No pudimos cargar el inventario." />
          ) : articulos.length === 0 ? (
            <EmptyState
              title="Sin artículos"
              hint={debouncedQ ? 'Probá con otra búsqueda.' : 'Cargá tu primer artículo de inventario.'}
            />
          ) : (
            articulos.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 transition last:border-0 hover:bg-surface-2 sm:flex-nowrap">
                <div className="min-w-0 flex-[1.6]">
                  <div className="truncate text-[14px] font-bold">{a.nombre}</div>
                  {a.sku && <div className="truncate font-mono text-[12px] text-text-3">{a.sku}</div>}
                </div>
                <div className="hidden w-[110px] text-right font-mono text-[13.5px] font-bold sm:block">{formatMoney(a.precio)}</div>
                <div className="w-[70px] text-center sm:w-[90px]">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 font-mono text-[12.5px] font-extrabold ${
                      a.stockBajo ? 'bg-warning-soft text-warning' : 'bg-surface-3 text-text-2'
                    }`}
                    title={a.stockBajo ? `Stock bajo (mínimo ${a.stockMinimo})` : undefined}
                  >
                    {a.stock}
                  </span>
                </div>
                <div className="flex w-full justify-end gap-2 sm:w-[96px] sm:gap-1">
                  <button
                    type="button"
                    aria-label="Ajustar stock" title="Ajustar stock"
                    onClick={() => setAjuste(a)}
                    disabled={refreshing}
                    className="grid h-11 w-11 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-wait disabled:opacity-60 sm:h-8 sm:w-8"
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Editar" title="Editar"
                    onClick={() => {
                      setEditing(a);
                      setFormOpen(true);
                    }}
                    disabled={refreshing}
                    className="grid h-11 w-11 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-wait disabled:opacity-60 sm:h-8 sm:w-8"
                  >
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      aria-label="Eliminar" title="Eliminar"
                      onClick={() => setToDelete(a)}
                      disabled={refreshing}
                      className="grid h-11 w-11 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-wait disabled:opacity-60 sm:h-8 sm:w-8"
                    >
                      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination meta={data?.page} onChange={setPage} disabled={refreshing} />
      </div>

      <ArticuloFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      {ajuste && <AjusteStockModal onClose={() => setAjuste(null)} articulo={ajuste} />}
      <ConfirmDialog
        isOpen={!!toDelete}
        title="Eliminar artículo"
        message={`¿Seguro que querés eliminar "${toDelete?.nombre}"?`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </DashboardLayout>
  );
};
