import { useId, useState } from 'react';
import { Link } from 'react-router';
import { ESTADOS_LIST, FASES, getEstadoMeta } from '../config/estados';
import type { DashboardStats } from '../types';
import { ErrorState } from './ErrorState';

interface Props {
  counts: DashboardStats['reparacionesPorEstado'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export const DashboardRepairSummary = ({ counts, total, isLoading, isError, onRetry }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const detailsId = useId();

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={isLoading}
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
    >
      <h2 id={headingId} className="px-[18px] pt-[18px] text-[15px] font-extrabold">
        Reparaciones por estado
      </h2>
      {isLoading ? (
        <div role="status" aria-label="Cargando reparaciones por estado" className="grid grid-cols-2 gap-2 p-[18px] sm:grid-cols-3 lg:grid-cols-2">
          {FASES.map((fase) => (
            <div key={fase.key} aria-hidden="true" className="space-y-2 rounded-xl bg-surface-2 p-3">
              <div className="ofx-skel h-4 w-20 max-w-full rounded" />
              <div className="ofx-skel h-6 w-10 rounded" />
            </div>
          ))}
        </div>
      ) : isError || !counts || total === undefined ? (
        <ErrorState onRetry={onRetry} message="No pudimos cargar la distribución por estado." />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 px-[18px] pb-3 pt-3.5 sm:grid-cols-3 lg:grid-cols-2">
            {FASES.map((fase) => (
              <div key={fase.key} className="min-w-0 rounded-xl bg-surface-2 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-[12px] font-semibold text-text-2">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: getEstadoMeta(fase.estados[0]).cssVar }} />
                  {fase.label}
                </dt>
                <dd className="mt-1 font-mono text-[20px] font-extrabold leading-6 tracking-tight [overflow-wrap:anywhere]">
                  {fase.estados.reduce((sum, estado) => sum + (counts[estado] ?? 0), 0)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mx-[18px] flex items-center justify-between gap-3 border-t border-border py-3">
            <span className="text-[12.5px] font-semibold text-text-2">Total reparaciones</span>
            <span className="min-w-0 font-mono text-[20px] font-extrabold tracking-tight [overflow-wrap:anywhere]">{total}</span>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
            className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-border px-3 py-3 text-[13px] font-bold text-primary transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
          >
            {expanded ? 'Ver menos' : 'Ver todos los estados'}
            <svg aria-hidden="true" viewBox="0 0 20 20" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} className={expanded ? 'rotate-180' : ''}>
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </button>
          <div id={detailsId} hidden={!expanded}>
            {expanded && (
              <div className="border-t border-border px-2 py-2">
                {ESTADOS_LIST.map((meta) => (
                  <Link
                    key={meta.key}
                    to={`/reparaciones?vista=list&estado=${meta.key}`}
                    className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
                  >
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.cssVar }} />
                    <span className="min-w-0 flex-1 font-semibold">{meta.label}</span>
                    <span className="font-mono font-bold">{counts[meta.key] ?? 0}</span>
                    <svg aria-hidden="true" viewBox="0 0 20 20" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} className="shrink-0 text-text-3">
                      <path d="m8 5 5 5-5 5" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};
