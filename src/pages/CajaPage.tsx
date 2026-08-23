import { DashboardLayout } from '../layouts/DashboardLayout';
import { FeatureLocked } from '../components/FeatureLocked';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { formatMoney, formatDate } from '../utils/format';
import { METODOS, metodoLabel } from '../config/cobros';
import { useCajaQuery } from '../api/queries/cobros.queries';
import { useFunciones } from '../api/queries/suscripcion.queries';
import { useUrlSearchParams } from '../hooks/useUrlSearchParams';
import { composeSearchParamsNormalizers, normalizeIsoDateParam } from '../lib/urlSearchParams';
import { DatosCobroCard } from '../components/DatosCobroCard';

const normalizeCajaSearchParams = composeSearchParamsNormalizers(
  (params) => { normalizeIsoDateParam(params, 'desde'); },
  (params) => { normalizeIsoDateParam(params, 'hasta'); },
);

export const CajaPage = () => {
  const { cobros: cobrosHabilitado } = useFunciones();
  const { searchParams, updateSearchParams } = useUrlSearchParams(normalizeCajaSearchParams);
  const desde = searchParams.get('desde') ?? '';
  const hasta = searchParams.get('hasta') ?? '';
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  const { data, isLoading, isError, refetch } = useCajaQuery(
    { desde: desde || undefined, hasta: hasta || undefined },
    cobrosHabilitado && !rangoInvalido,
  );

  if (!cobrosHabilitado) {
    return (
      <DashboardLayout title="Caja">
        <FeatureLocked
          titulo="Caja es una función PRO"
          detalle="Los cobros, la caja por período y el recibo imprimible están disponibles en el plan PRO."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Caja">
      <div className="ofx-in mx-auto max-w-[900px] space-y-4">
        <DatosCobroCard />

        {/* Filtro de período */}
        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 sm:w-auto">
            <label className="mb-1 block text-[12px] font-bold text-text-2" htmlFor="desde">Desde</label>
            <input
              id="desde"
              type="date"
              value={desde}
              max={hasta || undefined}
              aria-invalid={rangoInvalido || undefined}
              aria-describedby={rangoInvalido ? 'rango-caja-error' : undefined}
              onChange={(e) => {
                const value = e.target.value;
                updateSearchParams((next) => {
                  if (value) next.set('desde', value);
                  else next.delete('desde');
                });
              }}
              className="min-h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface px-3 py-2 text-base text-text outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:min-h-0 sm:w-auto sm:text-[13.5px]"
            />
          </div>
          <div className="min-w-0 sm:w-auto">
            <label className="mb-1 block text-[12px] font-bold text-text-2" htmlFor="hasta">Hasta</label>
            <input
              id="hasta"
              type="date"
              value={hasta}
              min={desde || undefined}
              aria-invalid={rangoInvalido || undefined}
              aria-describedby={rangoInvalido ? 'rango-caja-error' : undefined}
              onChange={(e) => {
                const value = e.target.value;
                updateSearchParams((next) => {
                  if (value) next.set('hasta', value);
                  else next.delete('hasta');
                });
              }}
              className="min-h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface px-3 py-2 text-base text-text outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:min-h-0 sm:w-auto sm:text-[13.5px]"
            />
          </div>
          {(desde || hasta) && (
            <button
              type="button"
              onClick={() => {
                updateSearchParams((next) => {
                  next.delete('desde');
                  next.delete('hasta');
                });
              }}
              className="min-h-11 w-full touch-manipulation rounded-lg border border-border-strong bg-surface px-4 py-2 text-[13px] font-bold text-text-2 transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:ml-auto sm:min-h-0 sm:w-auto sm:border-0 sm:bg-transparent sm:px-0 sm:text-text-3 sm:hover:bg-transparent sm:hover:text-text"
            >
              Hoy
            </button>
          )}
        </div>

        {rangoInvalido ? (
          <p
            id="rango-caja-error"
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] font-semibold text-danger-fg"
          >
            La fecha “Desde” no puede ser posterior a “Hasta”. Corregí el rango para consultar la caja.
          </p>
        ) : (
          <>
            {/* Resumen */}
            <section aria-label="Resumen de caja" aria-busy={isLoading}>
              {isLoading ? (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2" aria-label="Cargando resumen de caja">
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-hidden="true">
                    <div className="ofx-skel h-4 w-24 rounded" />
                    <div className="ofx-skel mt-2 h-9 w-40 rounded" />
                    <div className="ofx-skel mt-2 h-3.5 w-52 max-w-full rounded" />
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-hidden="true">
                    <div className="ofx-skel mb-3 h-4 w-20 rounded" />
                    <div className="space-y-2.5">
                      {METODOS.map((metodo) => (
                        <div key={metodo.key} className="flex justify-between">
                          <div className="ofx-skel h-4 w-20 rounded" />
                          <div className="ofx-skel h-4 w-16 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : isError || !data ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                  <ErrorState onRetry={() => void refetch()} message="No pudimos cargar el resumen de caja." />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                    <div className="text-[13px] font-bold text-text-2">Total cobrado</div>
                    <div className="mt-1 font-mono text-[30px] font-extrabold tracking-tight text-success">{formatMoney(data.totalCobrado)}</div>
                    <div className="mt-1 text-[12.5px] text-text-3">
                      {data.cantidad} cobro{data.cantidad === 1 ? '' : 's'} · {formatDate(data.desde)}
                      {data.hasta !== data.desde ? ` → ${formatDate(data.hasta)}` : ''}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                    <div className="mb-2 text-[13px] font-bold text-text-2">Por método</div>
                    <div className="space-y-1.5">
                      {METODOS.map((metodo) => (
                        <div key={metodo.key} className="flex justify-between text-[13.5px]">
                          <span className="text-text-2">{metodo.label}</span>
                          <span className="font-mono font-bold">{formatMoney(data.porMetodo[metodo.key] ?? 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Lista de cobros */}
            <section
              aria-label="Movimientos de caja"
              aria-busy={isLoading}
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
                <div className="flex-1">Cobro</div>
                <div className="hidden w-[120px] sm:block">Método</div>
                <div className="w-[110px] text-right">Monto</div>
              </div>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0" aria-hidden="true">
                    <div className="ofx-skel h-4 flex-1 rounded" />
                  </div>
                ))
              ) : isError || !data ? (
                <ErrorState onRetry={() => void refetch()} message="No pudimos cargar los movimientos de caja." />
              ) : data.cobros.length === 0 ? (
                <EmptyState title="Sin cobros en el período" hint="Probá con otro rango de fechas." />
              ) : (
                data.cobros.map((cobro) => (
                  <div key={cobro.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold">Orden #{cobro.reparacionId}</div>
                      <div className="min-w-0 break-words text-[12px] text-text-3">
                        {formatDate(cobro.fecha)}
                        <span className="sm:hidden"> · {metodoLabel(cobro.metodo)}</span>
                      </div>
                      {cobro.referencia && (
                        <div className="mt-1 min-w-0 break-all text-[12px] font-semibold text-text-2">
                          Referencia: <span className="font-mono">{cobro.referencia}</span>
                        </div>
                      )}
                      {cobro.observaciones && (
                        <div className="mt-1 min-w-0 break-words text-[12px] text-text-3">
                          Observación: {cobro.observaciones}
                        </div>
                      )}
                    </div>
                    <div className="hidden w-[120px] text-[13px] text-text-2 sm:block">{metodoLabel(cobro.metodo)}</div>
                    <div className="w-[110px] text-right font-mono text-[13.5px] font-bold">{formatMoney(cobro.monto)}</div>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
