import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EquipoFormModal } from '../components/EquipoFormModal';
import { EquipoReparacionesModal } from '../components/EquipoReparacionesModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { SortSelect } from '../components/SortSelect';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { btnPrimary } from '../components/ui';
import { iniciales } from '../utils/format';
import { useListParams } from '../hooks/useListParams';
import { useEquiposQuery } from '../api/queries/equipos.queries';
import { useClientesOptions } from '../api/queries/clientes.queries';
import { useDeleteEquipoMutation } from '../api/mutations/equipos.mutations';
import { useAuth } from '../store/auth.store';
import type { Equipo } from '../types';

const clienteLabel = (e: Equipo) =>
  e.clienteNombre ? `${e.clienteNombre} ${e.clienteApellido ?? ''}`.trim() : 'Sin cliente';

const deviceIcon = (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M11 18h2" />
  </svg>
);

export const EquiposPage = () => {
  const { q, onSearch, page, setPage, debouncedQ, size, sort, setSort } = useListParams(20, 'id,desc');
  const { data, isLoading, isError, refetch } = useEquiposQuery({ q: debouncedQ, page, size, sort });
  const { data: clientes = [] } = useClientesOptions();
  const { isAdmin } = useAuth();
  const deleteMutation = useDeleteEquipoMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Equipo | null>(null);
  const [toDelete, setToDelete] = useState<Equipo | null>(null);
  const [verReparaciones, setVerReparaciones] = useState<Equipo | null>(null);

  const equipos = data?.content ?? [];

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: Equipo) => {
    setEditing(e);
    setFormOpen(true);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteMutation.mutateAsync(toDelete.id);
    setToDelete(null);
  };

  return (
    <DashboardLayout title="Equipos">
      <div className="ofx-in mx-auto max-w-[1100px] space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] max-w-[360px] flex-1">
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-2.5">
              <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
            </svg>
            <input
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar por modelo, IMEI o cliente…"
              className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-[13.5px] text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]"
            />
          </div>
          <SortSelect
            value={sort}
            onChange={setSort}
            options={[
              { value: 'id,desc', label: 'Más recientes' },
              { value: 'marca,asc', label: 'Marca A-Z' },
              { value: 'modelo,asc', label: 'Modelo A-Z' },
            ]}
          />
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={openNew}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo equipo
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="ofx-skel h-[150px] rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-border bg-surface">
            <ErrorState onRetry={() => refetch()} message="No pudimos cargar los equipos." />
          </div>
        ) : equipos.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface">
            <EmptyState
              title="Sin equipos"
              hint={debouncedQ ? 'Probá con otra búsqueda.' : 'Registrá el primer equipo de un cliente.'}
            />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {equipos.map((e) => (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver reparaciones de ${e.marca} ${e.modelo}`}
                onClick={() => setVerReparaciones(e)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    setVerReparaciones(e);
                  }
                }}
                className="group flex cursor-pointer flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-border-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-surface-3 text-text-2">{deviceIcon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-extrabold">
                      {e.marca} {e.modelo}
                    </div>
                    <div className="text-[12px] text-text-3">{e.color || 'Sin color'}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label="Editar" title="Editar"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        openEdit(e);
                      }}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary"
                    >
                      <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </svg>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        aria-label="Eliminar" title="Eliminar"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setToDelete(e);
                        }}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-danger hover:text-danger"
                      >
                        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 font-mono text-[12px] text-text-3">{e.imei ? `IMEI ${e.imei}` : 'Sin IMEI'}</div>

                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-extrabold text-primary-soft-fg">
                    {iniciales(e.clienteNombre, e.clienteApellido)}
                  </div>
                  <span className="truncate text-[13px] font-semibold text-text-2">{clienteLabel(e)}</span>
                  {!!e.reparacionesCount && (
                    <span className="ml-auto shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-text-3">
                      {e.reparacionesCount} rep.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination meta={data?.page} onChange={setPage} />
      </div>

      <EquipoFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} editing={editing} clientes={clientes} />
      {verReparaciones && <EquipoReparacionesModal equipo={verReparaciones} onClose={() => setVerReparaciones(null)} />}

      <ConfirmDialog
        isOpen={!!toDelete}
        title="Eliminar equipo"
        message={`¿Seguro que querés eliminar ${toDelete?.marca} ${toDelete?.modelo}? Esta acción no se puede deshacer.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </DashboardLayout>
  );
};
