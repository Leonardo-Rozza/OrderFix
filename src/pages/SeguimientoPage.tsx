import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { Logo } from '../components/Logo';
import { EstadoBadge } from '../components/EstadoBadge';
import { ESTADOS, ESTADOS_ORDEN } from '../config/estados';
import { formatMoney, formatDate } from '../utils/format';
import { useSeguimientoQuery } from '../api/queries/seguimiento.queries';

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-bg text-text">
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[640px] items-center px-5">
        <Logo size={32} />
      </div>
    </header>
    <main className="mx-auto max-w-[640px] px-5 py-8">{children}</main>
    <footer className="pb-8 text-center text-[12px] text-text-3">Seguimiento de tu equipo · OrdenFix</footer>
  </div>
);

export const SeguimientoPage = () => {
  const { codigo } = useParams();
  const { data, isLoading, isError } = useSeguimientoQuery(codigo);

  if (isLoading) {
    return (
      <Shell>
        <div className="grid place-items-center py-20">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-surface-3 border-t-primary" />
        </div>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="text-[18px] font-extrabold">Código no encontrado</div>
          <p className="mt-2 text-[14px] text-text-2">
            Revisá el enlace que te pasó el taller. Si el problema sigue, contactalos directamente.
          </p>
        </div>
      </Shell>
    );
  }

  const currentIndex = ESTADOS_ORDEN.indexOf(data.estado);

  return (
    <Shell>
      <div className="ofx-in space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="text-[12.5px] font-semibold text-text-3">{data.taller}</div>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight">
            {data.marca} {data.modelo}
          </h1>
          <div className="mt-3">
            <EstadoBadge estado={data.estado} size="md" />
          </div>
          <div className="mt-2 font-mono text-[12px] text-text-3">Código {data.codigo}</div>
        </div>

        {/* Progreso */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-4 text-[13px] font-extrabold uppercase tracking-wide text-text-3">Estado de la reparación</div>
          <ol className="space-y-3">
            {ESTADOS_ORDEN.map((key, i) => {
              const meta = ESTADOS[key];
              const done = i < currentIndex;
              const active = i === currentIndex;
              return (
                <li key={key} className="flex items-center gap-3">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold"
                    style={{
                      background: done || active ? meta.cssVar : 'var(--surface-3)',
                      color: done || active ? '#fff' : 'var(--text-3)',
                    }}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span className={`text-[14px] ${active ? 'font-extrabold' : done ? 'font-semibold text-text-2' : 'text-text-3'}`}>
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Datos */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <dl className="space-y-3 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-text-2">Ingresado</dt>
              <dd className="font-semibold">{formatDate(data.fechaIngreso)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-2">Entrega estimada</dt>
              <dd className="font-semibold">{formatDate(data.fechaEstimadaEntrega)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-2">Presupuesto</dt>
              <dd className="font-mono font-extrabold text-primary">{formatMoney(data.presupuesto)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Shell>
  );
};
