import type { RefObject } from 'react';
import { Modal } from './Modal';
import { Loader } from './Loader';
import { ErrorState } from './ErrorState';
import { btnGhost, btnPrimary, btnDanger } from './ui';
import { iniciales, formatDate, whatsappLink } from '../utils/format';
import { useEquiposPorClienteQuery } from '../api/queries/equipos.queries';
import type { Cliente } from '../types';
import { tipoEquipoLabel } from '../config/equipos';

interface Props {
  isOpen: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNuevoEquipo: () => void;
  canDelete?: boolean;
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="flex-1 rounded-xl border border-border bg-surface-2 p-3 text-center">
    <div className="font-mono text-[22px] font-extrabold leading-none">{value}</div>
    <div className="mt-1.5 text-[11.5px] text-text-3">{label}</div>
  </div>
);

const deviceIcon = (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M11 18h2" />
  </svg>
);

/** Ficha de un cliente: stats + sus equipos + acciones. */
export const ClienteFichaModal = ({ isOpen, cliente, onClose, onEdit, onDelete, onNuevoEquipo, canDelete = true, restoreFocusRef }: Props) => {
  const {
    data: equiposData,
    isPending: equiposPending,
    isError: equiposError,
    isSuccess: equiposSuccess,
    refetch: refetchEquipos,
  } = useEquiposPorClienteQuery(isOpen ? cliente?.id : undefined);

  if (!cliente) return null;

  const equipos = equiposData ?? [];
  const nombre = `${cliente.nombre} ${cliente.apellido}`;
  const contacto = [cliente.telefono, cliente.email].filter(Boolean).join(' · ');
  const equiposCount = cliente.equiposCount != null
    ? String(cliente.equiposCount)
    : equiposSuccess
      ? String(equipos.length)
      : '—';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ficha de cliente" size="md" restoreFocusRef={restoreFocusRef}>
      <div className="space-y-5">
        <div className="flex items-center gap-3.5">
          <div className="grid shrink-0 place-items-center rounded-full bg-primary-soft text-[18px] font-extrabold text-primary-soft-fg" style={{ width: 52, height: 52 }}>
            {iniciales(cliente.nombre, cliente.apellido)}
          </div>
          <div className="min-w-0">
            <div className="text-[18px] font-extrabold">{nombre}</div>
            <div className="truncate text-[13px] text-text-2">{contacto || 'Sin contacto cargado'}</div>
            {cliente.direccion && <div className="truncate text-[12.5px] text-text-3">{cliente.direccion}</div>}
          </div>
        </div>

        <div className="flex gap-2.5">
          <Stat value={equiposCount} label="Equipos" />
          <Stat value={cliente.reparacionesCount != null ? String(cliente.reparacionesCount) : '—'} label="Reparaciones" />
          <Stat value={formatDate(cliente.ultimaVisita)} label="Última visita" />
        </div>

        <div aria-busy={equiposPending}>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">Equipos del cliente</span>
            <button
              type="button"
              onClick={onNuevoEquipo}
              disabled={!equiposSuccess}
              className="text-[12.5px] font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
            >
              + Agregar equipo
            </button>
          </div>
          {equiposPending ? (
            <div role="status" aria-live="polite" className="flex min-h-20 items-center justify-center gap-2.5 rounded-xl border border-border text-[12.5px] text-text-3">
              <Loader size="sm" />
              <span>Cargando equipos…</span>
            </div>
          ) : equiposError ? (
            <div role="alert" className="rounded-xl border border-border">
              <ErrorState
                message="No pudimos cargar los equipos del cliente."
                onRetry={() => void refetchEquipos()}
              />
            </div>
          ) : equiposSuccess && equipos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-5 text-center text-[12.5px] text-text-3">
              Este cliente todavía no tiene equipos.
            </div>
          ) : equiposSuccess ? (
            <div className="space-y-2">
              {equipos.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-text-2">{deviceIcon}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold">
                      {e.marca} {e.modelo}
                    </div>
                    <div className="text-[12px] text-text-2">{tipoEquipoLabel(e.tipo)}</div>
                    <div className="break-words font-mono text-[12px] text-text-3">{e.imei ? `Serie / IMEI ${e.imei}` : 'Sin serie / IMEI'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-between">
          {canDelete ? (
            <button type="button" className={btnDanger} onClick={onDelete}>
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {cliente.telefono && (
              <a
                href={whatsappLink(cliente.telefono, `Hola ${cliente.nombre}, te escribimos de OrdenFix.`)}
                target="_blank"
                rel="noreferrer"
                className={btnGhost}
              >
                WhatsApp
              </a>
            )}
            <button type="button" className={btnPrimary} onClick={onEdit}>
              Editar datos
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
