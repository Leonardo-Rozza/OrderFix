import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ClienteFormModal } from '../components/ClienteFormModal';
import { ClienteFichaModal } from '../components/ClienteFichaModal';
import { EquipoFormModal } from '../components/EquipoFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { SortSelect } from '../components/SortSelect';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { btnPrimary } from '../components/ui';
import { iniciales, formatDate } from '../utils/format';
import { useListParams, type UseListParamsOptions } from '../hooks/useListParams';
import { usePageBounds } from '../hooks/usePageBounds';
import { useClientesQuery } from '../api/queries/clientes.queries';
import { useDeleteClienteMutation } from '../api/mutations/clientes.mutations';
import { useAuth } from '../store/auth.store';
import type { Cliente } from '../types';

const CLIENTE_SORT_OPTIONS = [
  { value: 'nombre,asc', label: 'Nombre A-Z' },
  { value: 'nombre,desc', label: 'Nombre Z-A' },
  { value: 'apellido,asc', label: 'Apellido A-Z' },
  { value: 'id,desc', label: 'Más recientes' },
];

const CLIENTE_LIST_PARAMS = {
  size: 20,
  defaultSort: 'nombre,asc',
  allowedSorts: CLIENTE_SORT_OPTIONS.map(({ value }) => value),
} satisfies UseListParamsOptions;

export const ClientesPage = () => {
  const { q, onSearch, page, setPage, debouncedQ, size, sort, setSort } = useListParams(CLIENTE_LIST_PARAMS);
  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useClientesQuery({ q: debouncedQ, page, size, sort });
  const { isAdmin } = useAuth();
  const deleteMutation = useDeleteClienteMutation();

  const [ficha, setFicha] = useState<Cliente | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [equipoFor, setEquipoFor] = useState<Cliente | null>(null);
  const [toDelete, setToDelete] = useState<Cliente | null>(null);

  const clientes = data?.content ?? [];
  const refreshing = isFetching && isPlaceholderData;
  usePageBounds(page, setPage, data?.page, !isPlaceholderData);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: Cliente) => {
    setFicha(null);
    setEditing(c);
    setFormOpen(true);
  };
  const requestDeleteFromFicha = () => {
    if (!ficha) return;
    // La confirmación reemplaza a la ficha: dos aria-modal apilados compiten
    // por Escape, el foco y el bloqueo de scroll.
    setToDelete(ficha);
    setFicha(null);
  };
  const cancelDelete = () => {
    setFicha(toDelete);
    setToDelete(null);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteMutation.mutateAsync(toDelete.id);
    setToDelete(null);
    setFicha(null);
  };

  return (
    <DashboardLayout title="Clientes">
      <div className="ofx-in mx-auto max-w-[1100px] space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] max-w-[360px] flex-1">
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
            </svg>
            <input
              type="search"
              aria-label="Buscar clientes"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar cliente por nombre, apellido o teléfono…"
              className="min-h-11 w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-base text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)] sm:min-h-0 sm:text-[13.5px]"
            />
          </div>
          <SortSelect
            value={sort}
            onChange={setSort}
            options={CLIENTE_SORT_OPTIONS}
          />
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={openNew}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo cliente
          </button>
        </div>

        {refreshing && (
          <div role="status" className="px-1 text-[12.5px] font-semibold text-text-3">
            Actualizando resultados…
          </div>
        )}

        <div aria-busy={refreshing} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
            <div className="min-w-0 flex-[1.6]">Cliente</div>
            <div className="hidden min-w-0 flex-[1.4] sm:block">Contacto</div>
            <div className="w-[70px] text-center">Equipos</div>
            <div className="hidden w-[70px] text-center sm:block">Repar.</div>
            <div className="w-[90px] text-right">Última</div>
          </div>

          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <div className="ofx-skel h-9 w-9 rounded-full" />
                <div className="ofx-skel h-4 flex-1 rounded" />
              </div>
            ))
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} message="No pudimos cargar los clientes." />
          ) : clientes.length === 0 ? (
            <EmptyState
              title="Sin clientes"
              hint={debouncedQ ? 'Probá con otra búsqueda.' : 'Cargá tu primer cliente para empezar.'}
            />
          ) : (
            clientes.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={refreshing ? -1 : 0}
                aria-disabled={refreshing || undefined}
                aria-label={`Ver ficha de ${c.nombre} ${c.apellido ?? ''}`.trim()}
                onClick={() => {
                  if (!refreshing) setFicha(c);
                }}
                onKeyDown={(ev) => {
                  if (refreshing) return;
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    setFicha(c);
                  }
                }}
                className={`flex items-center gap-3 border-b border-border px-4 py-3 transition last:border-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] ${
                  refreshing ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-surface-2'
                }`}
              >
                <div className="flex min-w-0 flex-[1.6] items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-extrabold text-primary-soft-fg">
                    {iniciales(c.nombre, c.apellido)}
                  </div>
                  <div className="truncate text-[14px] font-bold">
                    {c.nombre} {c.apellido}
                  </div>
                </div>
                <div className="hidden min-w-0 flex-[1.4] sm:block">
                  <div className="truncate font-mono text-[13px] text-text-2">{c.telefono}</div>
                  <div className="truncate text-[12px] text-text-3">{c.email || '—'}</div>
                </div>
                <div className="w-[70px] text-center font-mono text-[14px] font-extrabold">{c.equiposCount ?? 0}</div>
                <div className="hidden w-[70px] text-center font-mono text-[13px] font-bold text-text-2 sm:block">{c.reparacionesCount ?? 0}</div>
                <div className="w-[90px] text-right font-mono text-[12.5px] text-text-3">{formatDate(c.ultimaVisita)}</div>
              </div>
            ))
          )}
        </div>

        <Pagination meta={data?.page} onChange={setPage} disabled={refreshing} />
      </div>

      <ClienteFichaModal
        isOpen={!!ficha}
        cliente={ficha}
        onClose={() => setFicha(null)}
        onEdit={() => ficha && openEdit(ficha)}
        onDelete={requestDeleteFromFicha}
        canDelete={isAdmin}
        onNuevoEquipo={() => {
          if (ficha) {
            setEquipoFor(ficha);
            setFicha(null);
          }
        }}
      />

      <ClienteFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <EquipoFormModal
        isOpen={!!equipoFor}
        onClose={() => setEquipoFor(null)}
        editing={null}
        defaultCliente={equipoFor}
      />

      <ConfirmDialog
        isOpen={!!toDelete}
        title="Eliminar cliente"
        message={`¿Seguro que querés eliminar a ${toDelete?.nombre} ${toDelete?.apellido}? Esta acción no se puede deshacer.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />
    </DashboardLayout>
  );
};
