import type { PresupuestoEstado } from '../types';

const META: Record<PresupuestoEstado, { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente', cls: 'bg-warning-soft text-warning' },
  APROBADO: { label: 'Aprobado', cls: 'bg-success-soft text-success' },
  RECHAZADO: { label: 'Rechazado', cls: 'bg-danger-soft text-danger-fg' },
};

export const PresupuestoBadge = ({ estado }: { estado: PresupuestoEstado }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${META[estado].cls}`}>
    {META[estado].label}
  </span>
);
