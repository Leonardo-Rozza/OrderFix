import type { EstadoPago } from '../types';
import { formatMoney } from '../utils/format';

interface PagoChipProps {
  estadoPago?: EstadoPago | null;
  saldo?: number | null;
  excedente?: number | null;
  requiereRevision?: boolean;
}

/**
 * Chip de la dimensión de pago, independiente del estado de la reparación.
 * El backend la informa en todos los planes; el entitlement de cobros solo
 * controla las acciones de registrar/anular movimientos.
 * No muestra nada si todavía no hay precio (saldo 0 sin cobros).
 */
export const PagoChip = ({ estadoPago, saldo, excedente, requiereRevision }: PagoChipProps) => {
  const excedenteVisible = Math.max(excedente ?? 0, 0);

  // Una inconsistencia histórica tiene prioridad aunque el estado derivado sea PAGADO.
  if (requiereRevision || excedenteVisible > 0) {
    return (
      <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-center text-[11px] font-extrabold leading-tight text-danger-fg">
        <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
        Excedente a revisar{excedenteVisible > 0 ? ` ${formatMoney(excedenteVisible)}` : ''}
      </span>
    );
  }

  if (!estadoPago) return null;

  if (estadoPago === 'PAGADO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-extrabold text-success">
        <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Pagado
      </span>
    );
  }

  if ((saldo ?? 0) <= 0) return null;

  return (
    <span className="inline-flex max-w-full flex-wrap items-center justify-center rounded-full bg-warning-soft px-2 py-0.5 text-center text-[11px] font-extrabold leading-tight text-warning">
      Pendiente de cobro {formatMoney(saldo)}
    </span>
  );
};
