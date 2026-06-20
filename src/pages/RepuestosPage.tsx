import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { RepuestoFormModal } from '../components/RepuestoFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { btnPrimary } from '../components/ui';
import { formatMoney } from '../utils/format';
import { useListParams } from '../hooks/useListParams';
import { useRepuestosQuery } from '../api/queries/repuestos.queries';
import { useDeleteRepuestoMutation } from '../api/mutations/repuestos.mutations';
import { useAuth } from '../store/auth.store';
import type { Repuesto } from '../types';

export const RepuestosPage = () => {
  const { q, onSearch, page, setPage, debouncedQ, size } = useListParams();
  const { data, isLoading } = useRepuestosQuery({ q: debouncedQ, page, size });
  const { isAdmin } = useAuth();
  const deleteMutation = useDeleteRepuestoMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Repuesto | null>(null);
  const [toDelete, setToDelete] = useState<Repuesto | null>(null);

  const repuestos = data?.content ?? [];

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
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] max-w-[360px] flex-1">
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-2.5">
              <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
            </svg>
            <input
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar repuesto por nombre…"
              className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-[13.5px] text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]"
            />
          </div>
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={openNew}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo repuesto
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
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
          ) : repuestos.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-[15px] font-extrabold">Sin repuestos</div>
              <div className="mt-1 text-[13px] text-text-3">
                {debouncedQ ? 'Probá con otra búsqueda.' : 'Cargá repuestos o agregalos desde una reparación.'}
              </div>
            </div>
          ) : (
            repuestos.map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-border px-4 py-3 transition last:border-0 hover:bg-surface-2">
                <div className="min-w-0 flex-[1.6]">
                  <div className="truncate text-[14px] font-bold">{r.nombre}</div>
                  {r.descripcion && <div className="truncate text-[12.5px] text-text-3">{r.descripcion}</div>}
                </div>
                <div className="hidden w-[130px] truncate text-[13px] text-text-2 sm:block">
                  {r.reparacionId ? (r.reparacionEquipo ?? `Orden #${r.reparacionId}`) : 'Sin asociar'}
                </div>
                <div className="w-[110px] text-right font-mono text-[13.5px] font-bold">{formatMoney(r.precio)}</div>
                <div className="flex w-[72px] justify-end gap-1">
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => openEdit(r)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary"
                  >
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => setToDelete(r)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-danger hover:text-danger"
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

        <Pagination meta={data?.page} onChange={setPage} />
      </div>

      <RepuestoFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

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
