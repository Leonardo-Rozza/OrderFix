import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ArticuloFormModal } from '../components/ArticuloFormModal';
import { AjusteStockModal } from '../components/AjusteStockModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FeatureLocked } from '../components/FeatureLocked';
import { Pagination } from '../components/Pagination';
import { btnPrimary } from '../components/ui';
import { formatMoney } from '../utils/format';
import { useListParams } from '../hooks/useListParams';
import { useInventarioQuery } from '../api/queries/inventario.queries';
import { useFunciones } from '../api/queries/suscripcion.queries';
import { useDeleteArticuloMutation } from '../api/mutations/inventario.mutations';
import { useAuth } from '../store/auth.store';
import type { Articulo } from '../types';

export const InventarioPage = () => {
  const { inventario } = useFunciones();
  const { q, onSearch, page, setPage, debouncedQ, size } = useListParams();
  const { data, isLoading } = useInventarioQuery({ q: debouncedQ, page, size }, inventario);
  const { isAdmin } = useAuth();
  const deleteMutation = useDeleteArticuloMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Articulo | null>(null);
  const [ajuste, setAjuste] = useState<Articulo | null>(null);
  const [toDelete, setToDelete] = useState<Articulo | null>(null);

  const articulos = data?.content ?? [];

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
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-2.5">
              <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
            </svg>
            <input
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU…"
              className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-[13.5px] text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]"
            />
          </div>
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={openNew}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo artículo
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
            <div className="min-w-0 flex-[1.6]">Artículo</div>
            <div className="hidden w-[110px] text-right sm:block">Precio</div>
            <div className="w-[90px] text-center">Stock</div>
            <div className="w-[96px]" />
          </div>

          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <div className="ofx-skel h-4 flex-1 rounded" />
              </div>
            ))
          ) : articulos.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-[15px] font-extrabold">Sin artículos</div>
              <div className="mt-1 text-[13px] text-text-3">
                {debouncedQ ? 'Probá con otra búsqueda.' : 'Cargá tu primer artículo de inventario.'}
              </div>
            </div>
          ) : (
            articulos.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-border px-4 py-3 transition last:border-0 hover:bg-surface-2">
                <div className="min-w-0 flex-[1.6]">
                  <div className="truncate text-[14px] font-bold">{a.nombre}</div>
                  {a.sku && <div className="truncate font-mono text-[12px] text-text-3">{a.sku}</div>}
                </div>
                <div className="hidden w-[110px] text-right font-mono text-[13.5px] font-bold sm:block">{formatMoney(a.precio)}</div>
                <div className="w-[90px] text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 font-mono text-[12.5px] font-extrabold ${
                      a.stockBajo ? 'bg-warning-soft text-warning' : 'bg-surface-3 text-text-2'
                    }`}
                    title={a.stockBajo ? `Stock bajo (mínimo ${a.stockMinimo})` : undefined}
                  >
                    {a.stock}
                  </span>
                </div>
                <div className="flex w-[96px] justify-end gap-1">
                  <button
                    type="button"
                    title="Ajustar stock"
                    onClick={() => setAjuste(a)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary"
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => {
                      setEditing(a);
                      setFormOpen(true);
                    }}
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
                      onClick={() => setToDelete(a)}
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
