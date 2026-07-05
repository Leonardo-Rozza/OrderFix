import { useNavigate } from 'react-router';
import { Modal } from './Modal';
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
  const { data: reparaciones = [], isLoading } = useReparacionesPorEquipoQuery(equipo?.id);

  if (!equipo) return null;

  return (
    <Modal isOpen onClose={onClose} title={`Reparaciones · ${equipo.marca} ${equipo.modelo}`} size="md">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ofx-skel h-12 rounded-xl" />
          ))}
        </div>
      ) : reparaciones.length === 0 ? (
        <div className="py-8 text-center text-[13.5px] text-text-3">Este equipo no tiene reparaciones.</div>
      ) : (
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
      )}
    </Modal>
  );
};
