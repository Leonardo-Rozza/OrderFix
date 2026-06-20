import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EstadoBadge } from '../components/EstadoBadge';
import { btnPrimary } from '../components/ui';
import { formatMoney } from '../utils/format';
import { useReparacionesEnriquecidas } from '../hooks/useEnriched';
import type { ReparacionEnriquecida } from '../hooks/useEnriched';
import { useClientesQuery } from '../api/queries/clientes.queries';
import { useAuth } from '../store/auth.store';
import { computeDashboardMetrics } from './dashboard.metrics';

const equipoLabel = (r: ReparacionEnriquecida) =>
  r.equipo ? `${r.equipo.marca} ${r.equipo.modelo}` : `Equipo #${r.equipoId}`;
const clienteLabel = (r: ReparacionEnriquecida) =>
  r.equipo?.cliente ? `${r.equipo.cliente.nombre} ${r.equipo.cliente.apellido}` : 'Sin cliente';

interface KpiProps {
  label: string;
  value: string;
  hint: string;
  iconD: string;
  iconBg: string;
  iconFg: string;
}

const Kpi = ({ label, value, hint, iconD, iconBg, iconFg }: KpiProps) => (
  <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-sm">
    <div className="flex items-center justify-between">
      <div className="text-[13px] font-bold text-text-2">{label}</div>
      <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px]" style={{ background: iconBg, color: iconFg }}>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={iconD} />
        </svg>
      </span>
    </div>
    <div className="mt-2.5 text-[30px] font-extrabold tracking-tight">{value}</div>
    <div className="mt-0.5 text-[12.5px] text-text-3">{hint}</div>
  </div>
);

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { email } = useAuth();
  const { data: reparaciones, isLoading } = useReparacionesEnriquecidas();
  const { data: clientes = [] } = useClientesQuery();

  const m = useMemo(() => computeDashboardMetrics(reparaciones), [reparaciones]);

  const nombre = email ? email.split('@')[0] : 'taller';

  return (
    <DashboardLayout title="Inicio">
      <div className="ofx-in mx-auto max-w-[1180px] space-y-4">
        {/* Encabezado */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight">Hola, {nombre} 👋</h1>
            <p className="mt-0.5 text-[14px] text-text-2">Esto es lo que pasa hoy en el taller.</p>
          </div>
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={() => navigate('/reparaciones?nuevo=1')}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva reparación
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Reparaciones activas"
            value={String(m.activas)}
            hint="En taller ahora"
            iconBg="var(--st-proceso-bg)"
            iconFg="var(--st-proceso)"
            iconD="M14.7 6.3a4 4 0 0 0-5.66 5.66L3 18l3 3 6.04-6.04a4 4 0 0 0 5.66-5.66l-2.83 2.83-2.83-2.83 2.83-2.83z"
          />
          <Kpi
            label="Equipos sin retirar"
            value={String(m.sinRetirar)}
            hint="Listos para entregar"
            iconBg="var(--st-completado-bg)"
            iconFg="var(--st-completado)"
            iconD="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.2l2.4 2.4 4.6-5"
          />
          <Kpi
            label="Ingresos estimados"
            value={formatMoney(m.ingresosMes)}
            hint="Reparaciones cerradas"
            iconBg="var(--primary-soft)"
            iconFg="var(--primary)"
            iconD="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
          />
          <Kpi
            label="Clientes"
            value={String(clientes.length)}
            hint="Cartera total"
            iconBg="var(--st-ingresado-bg)"
            iconFg="var(--st-ingresado)"
            iconD="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          />
        </div>

        {/* Recientes + por estado */}
        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[1.6fr_1fr]">
          {/* Ingresos recientes */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-[18px] py-4">
              <div className="text-[15px] font-extrabold">Ingresos recientes</div>
              <button type="button" onClick={() => navigate('/reparaciones')} className="text-[13px] font-bold text-primary hover:underline">
                Ver tablero →
              </button>
            </div>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-border px-[18px] py-3 last:border-0">
                  <div className="ofx-skel h-9 w-9 rounded-[10px]" />
                  <div className="ofx-skel h-4 flex-1 rounded" />
                </div>
              ))
            ) : m.recientes.length === 0 ? (
              <div className="px-[18px] py-12 text-center">
                <div className="text-[14px] font-extrabold">Todavía no hay reparaciones</div>
                <div className="mt-1 text-[13px] text-text-3">Cargá la primera para verla acá.</div>
              </div>
            ) : (
              m.recientes.map((r) => (
                <div
                  key={r.id}
                  onClick={() => navigate(`/reparaciones/${r.id}`)}
                  className="flex cursor-pointer items-center gap-3 border-b border-border px-[18px] py-3 transition last:border-0 hover:bg-surface-2"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-3 text-text-2">
                    <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="2" width="12" height="20" rx="2.5" />
                      <path d="M11 18h2" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">
                      {equipoLabel(r)} <span className="font-semibold text-text-2">· {clienteLabel(r)}</span>
                    </div>
                    <div className="truncate text-[12.5px] text-text-3">{r.descripcionProblema}</div>
                  </div>
                  <div className="hidden sm:block">
                    <EstadoBadge estado={r.estado} />
                  </div>
                  <div className="w-[84px] text-right font-mono text-[13.5px] font-bold">
                    {formatMoney(r.precioFinal ?? r.precioEstimado)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reparaciones por estado */}
          <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-sm">
            <div className="mb-3.5 text-[15px] font-extrabold">Reparaciones por estado</div>
            {m.stats.map((s) => (
              <div key={s.meta.key} className="mb-3.5 last:mb-0">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="inline-flex items-center gap-2 font-bold">
                    <span className="h-2.5 w-2.5 rounded" style={{ background: s.meta.cssVar }} />
                    {s.meta.label}
                  </span>
                  <span className="font-mono font-extrabold">{s.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.meta.cssVar }} />
                </div>
              </div>
            ))}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <div>
                <div className="text-[12.5px] font-semibold text-text-2">Ingresos estimados</div>
                <div className="font-mono text-[24px] font-extrabold tracking-tight">{formatMoney(m.ingresosMes)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
