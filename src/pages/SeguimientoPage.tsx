import { useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { Logo } from '../components/Logo';
import { Loader } from '../components/Loader';
import { EstadoBadge } from '../components/EstadoBadge';
import { PresupuestoBadge } from '../components/PresupuestoBadge';
import { PASOS_SEGUIMIENTO, PASO_SEGUIMIENTO } from '../config/estados';
import { calidadLabel } from '../config/presupuestos';
import { formatMoney, formatDate } from '../utils/format';
import { useSeguimientoQuery } from '../api/queries/seguimiento.queries';
import { useResponderPresupuestoMutation } from '../api/mutations/presupuestos.mutations';
import { btnPrimary, btnGhost } from '../components/ui';
import { useRetryAfter } from '../hooks/useRetryAfter';
import { getHttpStatus } from '../utils/retryAfter';

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
  const { data, error, isLoading, isError, isFetching, refetch } = useSeguimientoQuery(codigo);
  const responder = useResponderPresupuestoMutation(codigo ?? '');
  const { isCoolingDown, secondsRemaining, startRetryAfter } = useRetryAfter();

  useEffect(() => {
    startRetryAfter(error);
  }, [error, startRetryAfter]);

  const responderPresupuesto = async (accion: 'aprobar' | 'rechazar') => {
    try {
      await responder.mutateAsync({ accion });
    } catch (mutationError) {
      startRetryAfter(mutationError);
    }
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="grid place-items-center py-20">
          <Loader size="lg" />
        </div>
      </Shell>
    );
  }

  if (isError || !data) {
    const status = getHttpStatus(error);

    if (status === 429) {
      return (
        <Shell>
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
            <div className="text-[18px] font-extrabold">Demasiadas consultas</div>
            <p className="mt-2 text-[14px] text-text-2">
              Por seguridad, esperá antes de volver a consultar este seguimiento.
            </p>
            <button
              type="button"
              className={`${btnPrimary} mt-5 w-full sm:w-auto`}
              disabled={isCoolingDown || isFetching}
              onClick={() => void refetch()}
            >
              {isCoolingDown
                ? `Reintentá en ${secondsRemaining} s`
                : isFetching
                  ? 'Consultando…'
                  : 'Volver a consultar'}
            </button>
          </div>
        </Shell>
      );
    }

    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="text-[18px] font-extrabold">
            {status === 404 ? 'Código no encontrado' : 'No pudimos consultar el seguimiento'}
          </div>
          <p className="mt-2 text-[14px] text-text-2">
            {status === 404
              ? 'Revisá el enlace que te pasó el taller. Si el problema sigue, contactalos directamente.'
              : 'Intentá de nuevo en unos minutos. Si el problema sigue, contactá al taller directamente.'}
          </p>
          {status !== 404 && (
            <button type="button" className={`${btnPrimary} mt-5 w-full sm:w-auto`} disabled={isFetching} onClick={() => void refetch()}>
              {isFetching ? 'Consultando…' : 'Volver a intentar'}
            </button>
          )}
        </div>
      </Shell>
    );
  }

  // Los 12 estados internos colapsan en 5 hitos para el cliente; el badge de
  // arriba ya muestra el estado exacto. Si el flujo se cortó (cancelada /
  // abandonada), la línea de progreso no aplica y se oculta.
  const currentIndex = PASO_SEGUIMIENTO[data.estado] ?? 0;
  const flujoCortado = data.estado === 'CANCELADO' || data.estado === 'ABANDONADO';

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
        {!flujoCortado && (
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-4 text-[13px] font-extrabold uppercase tracking-wide text-text-3">Estado de la reparación</div>
            <ol className="space-y-3">
              {PASOS_SEGUIMIENTO.map((label, i) => {
                const done = i < currentIndex;
                const active = i === currentIndex;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold"
                      style={{
                        background: done || active ? 'var(--primary)' : 'var(--surface-3)',
                        color: done || active ? 'var(--primary-fg)' : 'var(--text-3)',
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={`text-[14px] ${active ? 'font-extrabold' : done ? 'font-semibold text-text-2' : 'text-text-3'}`}>
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

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
          </dl>
        </div>

        {/* Presupuesto */}
        {data.presupuesto && (
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-extrabold uppercase tracking-wide text-text-3">Presupuesto</span>
              <PresupuestoBadge estado={data.presupuesto.estado} />
            </div>
            <div className="space-y-1.5">
              {data.presupuesto.items.map((it, i) => (
                <div key={i} className="flex justify-between gap-3 text-[14px]">
                  <span className="min-w-0 text-text-2">
                    {it.cantidad}× {it.descripcion}
                    {calidadLabel(it.calidad) && (
                      <span className="ml-1.5 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-bold text-text-3">
                        {calidadLabel(it.calidad)}
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-semibold">{formatMoney(it.cantidad * it.precioUnitario)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[15px] font-extrabold">Total</span>
              <span className="font-mono text-[18px] font-extrabold text-primary">{formatMoney(data.presupuesto.total)}</span>
            </div>
            {data.presupuesto.observaciones && (
              <p className="mt-2 text-[13px] text-text-3">{data.presupuesto.observaciones}</p>
            )}
            {data.presupuesto.estado === 'PENDIENTE' && data.presupuesto.validoHasta && (
              <p className="mt-2 text-[12.5px] text-text-3">Válido hasta el {formatDate(data.presupuesto.validoHasta)}</p>
            )}
            {data.presupuesto.estado === 'VENCIDO' && (
              <p className="mt-2 text-[12.5px] text-text-3">
                Este presupuesto venció. Contactá al taller para pedir uno actualizado.
              </p>
            )}

            {data.presupuesto.estado === 'PENDIENTE' && (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className={`${btnPrimary} flex-1`}
                  disabled={responder.isPending || isCoolingDown}
                  onClick={() => void responderPresupuesto('aprobar')}
                >
                  Aprobar presupuesto
                </button>
                <button
                  type="button"
                  className={`${btnGhost} flex-1`}
                  disabled={responder.isPending || isCoolingDown}
                  onClick={() => void responderPresupuesto('rechazar')}
                >
                  Rechazar
                </button>
              </div>
            )}
            {data.presupuesto.estado === 'PENDIENTE' && isCoolingDown && (
              <p role="status" aria-live="polite" className="mt-3 text-center text-[12.5px] font-semibold text-warning">
                Demasiadas solicitudes. Reintentá en {secondsRemaining} s.
              </p>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
};
