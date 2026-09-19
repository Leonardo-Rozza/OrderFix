import { startTransition, useState } from 'react';
import { useLocation } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DateInput } from '../components/DateInput';
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
import { dateInputError } from '../utils/dateInput';

const normalizeCajaSearchParams = composeSearchParamsNormalizers(
  (params) => { normalizeIsoDateParam(params, 'desde'); },
  (params) => { normalizeIsoDateParam(params, 'hasta'); },
);

export const CajaPage = () => {
  const { cobros: cobrosHabilitado } = useFunciones();
  const { searchParams, updateSearchParams } = useUrlSearchParams(normalizeCajaSearchParams);
  const location = useLocation();
  const desde = searchParams.get('desde') ?? '';
  const hasta = searchParams.get('hasta') ?? '';
  const [drafts, setDrafts] = useState({ locationKey: location.key, desde, hasta });
  // Una navegación externa, incluso volver a una URL ya visitada, restaura el
  // rango confirmado y descarta los borradores de la entrada anterior.
  const currentDrafts = drafts.locationKey === location.key
    ? drafts
    : { locationKey: location.key, desde, hasta };
  if (drafts.locationKey !== location.key) setDrafts(currentDrafts);
  const fechasInvalidas = Boolean(dateInputError(currentDrafts.desde) || dateInputError(currentDrafts.hasta));
  const rangoInvalido = !fechasInvalidas && Boolean(
    currentDrafts.desde && currentDrafts.hasta && currentDrafts.desde > currentDrafts.hasta,
  );
  const filtroInvalido = fechasInvalidas || rangoInvalido;
  const { data, isLoading, isError, refetch } = useCajaQuery(
    {
      desde: (filtroInvalido ? desde : currentDrafts.desde) || undefined,
      hasta: (filtroInvalido ? hasta : currentDrafts.hasta) || undefined,
    },
    cobrosHabilitado && !filtroInvalido,
  );

  const changeDate = (field: 'desde' | 'hasta', value: string) => {
    const nextDrafts = { ...currentDrafts, [field]: value };
    setDrafts(nextDrafts);
    if (dateInputError(nextDrafts.desde) || dateInputError(nextDrafts.hasta)) return;
    if (nextDrafts.desde && nextDrafts.hasta && nextDrafts.desde > nextDrafts.hasta) return;
    updateSearchParams((next) => {
      for (const key of ['desde', 'hasta'] as const) {
        if (nextDrafts[key]) next.set(key, nextDrafts[key]);
        else next.delete(key);
      }
    });
  };

  if (!cobrosHabilitado) {
    return (
      <DashboardLayout title="Cobros">
        <FeatureLocked
          titulo="Cobros es una función PRO"
          detalle="El registro manual de cobros por período, los datos para cobrar y el resumen digital de cada orden están disponibles en el plan PRO."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Cobros">
      <div className="ofx-in mx-auto max-w-[900px] space-y-4">
        <DatosCobroCard />

        <aside
          role="note"
          aria-labelledby="alcance-cobros-title"
          className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-[12.5px] leading-relaxed text-text-2 sm:px-5"
        >
          <h2 id="alcance-cobros-title" className="font-extrabold text-text">
            Qué muestra Cobros
          </h2>
          <p className="mt-1">
            Incluye sólo cobros registrados manualmente en OrdenFix durante el período seleccionado.
            No es un balance contable, no representa el saldo de una cuenta bancaria o billetera ni confirma acreditaciones reales.
            No contempla egresos, gastos ni comisiones; el efectivo también depende de lo que registre el taller.
          </p>
        </aside>

        {/* Filtro de período */}
        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 sm:w-[210px]">
            <label className="mb-1 block text-[12px] font-bold text-text-2" htmlFor="desde">Desde</label>
            <DateInput
              id="desde"
              label="Desde"
              value={currentDrafts.desde}
              max={!dateInputError(currentDrafts.hasta) ? currentDrafts.hasta || undefined : undefined}
              hasError={rangoInvalido}
              aria-invalid={rangoInvalido || undefined}
              aria-describedby={rangoInvalido ? 'rango-caja-error' : undefined}
              onChange={(value) => changeDate('desde', value)}
            />
          </div>
          <div className="min-w-0 sm:w-[210px]">
            <label className="mb-1 block text-[12px] font-bold text-text-2" htmlFor="hasta">Hasta</label>
            <DateInput
              id="hasta"
              label="Hasta"
              value={currentDrafts.hasta}
              min={!dateInputError(currentDrafts.desde) ? currentDrafts.desde || undefined : undefined}
              hasError={rangoInvalido}
              aria-invalid={rangoInvalido || undefined}
              aria-describedby={rangoInvalido ? 'rango-caja-error' : undefined}
              onChange={(value) => changeDate('hasta', value)}
            />
          </div>
          {(currentDrafts.desde || currentDrafts.hasta || desde || hasta) && (
            <button
              type="button"
              onClick={() => startTransition(() => {
                setDrafts({ locationKey: location.key, desde, hasta });
                if (!desde && !hasta) return;
                updateSearchParams((next) => {
                  next.delete('desde');
                  next.delete('hasta');
                });
              })}
              className="min-h-11 w-full touch-manipulation rounded-lg border border-border-strong bg-surface px-4 py-2 text-[13px] font-bold text-text-2 transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:ml-auto sm:min-h-0 sm:w-auto sm:border-0 sm:bg-transparent sm:px-0 sm:text-text-3 sm:hover:bg-transparent sm:hover:text-text"
            >
              Hoy
            </button>
          )}
        </div>

        {fechasInvalidas ? (
          <p role="status" className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13px] text-text-2">
            Completá o corregí las fechas para consultar los cobros.
          </p>
        ) : rangoInvalido ? (
          <p
            id="rango-caja-error"
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] font-semibold text-danger-fg"
          >
            La fecha “Desde” no puede ser posterior a “Hasta”. Corregí el rango para consultar los cobros.
          </p>
        ) : (
          <>
            {/* Resumen */}
            <section aria-label="Resumen de cobros" aria-busy={isLoading}>
              {isLoading ? (
                <div
                  className="grid grid-cols-1 gap-3.5 sm:grid-cols-2"
                  role="status"
                  aria-live="polite"
                  aria-label="Cargando resumen de cobros"
                >
                  <span className="sr-only">Cargando resumen de cobros…</span>
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
                  <ErrorState onRetry={() => void refetch()} message="No pudimos cargar el resumen de cobros." />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                    <div className="text-[13px] font-bold text-text-2">Cobrado en el período</div>
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
              aria-labelledby="cobros-registrados-title"
              aria-busy={isLoading}
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
            >
              <div className="border-b border-border px-4 py-3">
                <h2 id="cobros-registrados-title" className="text-[15px] font-extrabold text-text">
                  Cobros registrados
                </h2>
              </div>
              <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
                <div className="min-w-0 flex-1">Orden y fecha</div>
                <div className="hidden w-[120px] sm:block">Método</div>
                <div className="w-[110px] text-right">Monto</div>
              </div>
              {isLoading ? (
                <>
                  <p role="status" aria-live="polite" className="sr-only">Cargando cobros registrados…</p>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0" aria-hidden="true">
                      <div className="ofx-skel h-4 flex-1 rounded" />
                    </div>
                  ))}
                </>
              ) : isError || !data ? (
                <ErrorState onRetry={() => void refetch()} message="No pudimos cargar los cobros registrados." />
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
