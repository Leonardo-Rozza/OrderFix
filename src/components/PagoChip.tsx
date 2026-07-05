import type { EstadoPago } from '../types';
import { formatMoney } from '../utils/format';

interface PagoChipProps {
  estadoPago?: EstadoPago | null;
  saldo?: number | null;
}

/**
 * Chip de la dimensión de pago, independiente del estado de la reparación.
 * Solo tiene sentido con cobros habilitados (PRO): gatearlo en el llamador.
 * No muestra nada si todavía no hay precio (saldo 0 sin cobros).
 */
export const PagoChip = ({ estadoPago, saldo }: PagoChipProps) => {
  if (!estadoPago) return null;

  if (estadoPago === 'PAGADO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-extrabold text-success">
        <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Pagado
      </span>
    );
  }

  if ((saldo ?? 0) <= 0) return null;

  return (
    <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-extrabold text-warning">
      Falta {formatMoney(saldo)}
    </span>
  );
};
