import type { PresupuestoEstado } from '../types';

const META: Record<PresupuestoEstado, { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente', cls: 'bg-warning-soft text-warning' },
  APROBADO: { label: 'Aprobado', cls: 'bg-success-soft text-success' },
  RECHAZADO: { label: 'Rechazado', cls: 'bg-danger-soft text-danger-fg' },
  VENCIDO: { label: 'Vencido', cls: 'bg-surface-3 text-text-2' },
};

export const PresupuestoBadge = ({ estado }: { estado: PresupuestoEstado }) => {
  // Fallback neutro por si el backend agrega un estado que este front no conoce.
  const meta = META[estado] ?? { label: estado, cls: 'bg-surface-3 text-text-2' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${meta.cls}`}>
      {meta.label}
    </span>
  );
};
