import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { RepuestoFormModal } from '../components/RepuestoFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { btnPrimary } from '../components/ui';
import { formatMoney } from '../utils/format';
import { useListParams } from '../hooks/useListParams';
import { usePageBounds } from '../hooks/usePageBounds';
import { useRepuestosQuery } from '../api/queries/repuestos.queries';
import { useDeleteRepuestoMutation } from '../api/mutations/repuestos.mutations';
import { useAuth } from '../store/auth.store';
import type { Repuesto } from '../types';

export const RepuestosPage = () => {
  const { q, onSearch, page, setPage, debouncedQ, size } = useListParams();
  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useRepuestosQuery({ q: debouncedQ, page, size });
  const { isAdmin } = useAuth();
  const deleteMutation = useDeleteRepuestoMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Repuesto | null>(null);
  const [toDelete, setToDelete] = useState<Repuesto | null>(null);

  const repuestos = data?.content ?? [];
  const refreshing = isFetching && isPlaceholderData;
  usePageBounds(page, setPage, data?.page, !isPlaceholderData);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: Repuesto) => {
    setEditing(r);
    setFormOpen(true);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteMutation.mutateAsync(toDelete.id);
    setToDelete(null);
  };

  return (
    <DashboardLayout title="Repuestos">
      <div className="ofx-in mx-auto max-w-[1000px] space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 flex-1 sm:min-w-[180px] sm:max-w-[360px]">
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
            </svg>
            <input
              type="search"
              aria-label="Buscar repuestos"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar repuesto por nombre…"
              className="min-h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-base text-text outline-none transition placeholder:text-text-3 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:min-h-0 sm:text-[13.5px]"
            />
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:ml-auto sm:w-auto`} onClick={openNew}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo repuesto
          </button>
        </div>

        {refreshing && (
          <div role="status" className="px-1 text-[12.5px] font-semibold text-text-3">
            Actualizando resultados…
          </div>
        )}

        {/* Tabla */}
        <div aria-busy={refreshing} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="hidden items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3 sm:flex">
            <div className="min-w-0 flex-[1.6]">Repuesto</div>
            <div className="hidden w-[130px] sm:block">Reparación</div>
            <div className="w-[110px] text-right">Precio</div>
            <div className="w-[72px]" />
          </div>

          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <div className="ofx-skel h-4 flex-1 rounded" />
              </div>
            ))
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} message="No pudimos cargar los repuestos." />
          ) : repuestos.length === 0 ? (
            <EmptyState
              title="Sin repuestos"
              hint={debouncedQ ? 'Probá con otra búsqueda.' : 'Cargá repuestos o agregalos desde una reparación.'}
            />
          ) : (
            repuestos.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-3 transition last:border-0 hover:bg-surface-2 sm:flex-nowrap sm:gap-3 sm:px-4">
                <div className="min-w-0 basis-full sm:basis-auto sm:flex-[1.6]">
                  <div className="break-words text-[14px] font-bold sm:truncate">{r.nombre}</div>
                  {r.descripcion && <div className="break-words text-[12.5px] text-text-3 sm:truncate">{r.descripcion}</div>}
                  <div className="mt-1 truncate text-[12.5px] text-text-2 sm:hidden">
                    {r.reparacionId ? (r.reparacionEquipo ?? `Orden #${r.reparacionId}`) : 'Sin asociar'}
                  </div>
                </div>
                <div className="hidden w-[130px] truncate text-[13px] text-text-2 sm:block">
                  {r.reparacionId ? (r.reparacionEquipo ?? `Orden #${r.reparacionId}`) : 'Sin asociar'}
                </div>
                <div className="min-w-0 flex-1 font-mono text-[13.5px] font-bold sm:w-[110px] sm:flex-none sm:text-right">{formatMoney(r.precio)}</div>
                <div className="flex shrink-0 justify-end gap-1.5 sm:w-[72px] sm:gap-1">
                  <button
                    type="button"
                    aria-label="Editar" title="Editar"
                    onClick={() => openEdit(r)}
                    disabled={refreshing}
                    className="grid h-11 w-11 touch-manipulation place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-wait disabled:opacity-60 sm:h-8 sm:w-8"
                  >
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      aria-label="Eliminar" title="Eliminar"
                      onClick={() => setToDelete(r)}
                      disabled={refreshing}
                      className="grid h-11 w-11 touch-manipulation place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-wait disabled:opacity-60 sm:h-8 sm:w-8"
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

      <RepuestoFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />

      <ConfirmDialog
        isOpen={!!toDelete}
        title="Eliminar repuesto"
        message={`¿Seguro que querés eliminar "${toDelete?.nombre}"? Esta acción no se puede deshacer.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </DashboardLayout>
  );
};
