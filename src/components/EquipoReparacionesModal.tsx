import { useNavigate } from 'react-router';
import { Modal } from './Modal';
import { Loader } from './Loader';
import { ErrorState } from './ErrorState';
import { EstadoBadge } from './EstadoBadge';
import { formatMoney, formatDate } from '../utils/format';
import { ordenLabel } from '../utils/reparacion';
import { useReparacionesPorEquipoQuery } from '../api/queries/reparaciones.queries';
import type { Equipo } from '../types';

interface Props {
  equipo: Equipo | null;
  onClose: () => void;
}

/** Lista las reparaciones de un equipo (se monta cuando hay equipo). */
export const EquipoReparacionesModal = ({ equipo, onClose }: Props) => {
  const navigate = useNavigate();
  const {
    data: reparacionesData,
    isPending,
    isError,
    isSuccess,
    refetch,
  } = useReparacionesPorEquipoQuery(equipo?.id);

  if (!equipo) return null;

  const reparaciones = reparacionesData ?? [];

  return (
    <Modal isOpen onClose={onClose} title={`Reparaciones · ${equipo.marca} ${equipo.modelo}`} size="md">
      <div aria-busy={isPending}>
        {isPending ? (
          <div role="status" aria-live="polite" className="flex min-h-28 flex-col items-center justify-center gap-3 text-[13px] text-text-3">
            <Loader size="sm" />
            <span>Cargando reparaciones…</span>
          </div>
        ) : isError ? (
          <div role="alert" className="rounded-xl border border-border">
            <ErrorState
              message="No pudimos cargar las reparaciones del equipo."
              onRetry={() => void refetch()}
            />
          </div>
        ) : isSuccess && reparaciones.length === 0 ? (
          <div className="py-8 text-center text-[13.5px] text-text-3">Este equipo no tiene reparaciones.</div>
        ) : isSuccess ? (
          <div className="space-y-2">
            {reparaciones.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/reparaciones/${r.id}`);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:border-border-strong hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold">{r.descripcionProblema}</div>
                  <div className="text-[12px] text-text-3">
                    {ordenLabel(r)} · {formatDate(r.fechaIngreso)}
                  </div>
                </div>
                <EstadoBadge estado={r.estado} />
                <span className="w-[80px] text-right font-mono text-[13px] font-bold">{formatMoney(r.precioFinal ?? r.precioEstimado)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
