import { ESTADOS } from '../config/estados';
import type { EstadoReparacion } from '../types';

interface EstadoBadgeProps {
  estado: EstadoReparacion;
  size?: 'sm' | 'md';
}

/** Pill de estado con color e ícono según el estado de la reparación. */
export const EstadoBadge = ({ estado, size = 'sm' }: EstadoBadgeProps) => {
  const meta = ESTADOS[estado];
  const pad = size === 'md' ? 'px-3 py-1.5 text-[12.5px]' : 'px-2.5 py-1 text-[11.5px]';
  const ic = size === 'md' ? 14 : 13;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-extrabold ${pad} ${meta.textClass} ${meta.bgClass}`}>
      <svg viewBox="0 0 24 24" width={ic} height={ic} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d={meta.iconD} />
      </svg>
      {meta.label}
    </span>
  );
};
