import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { FeatureLocked } from '../components/FeatureLocked';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { formatMoney, formatDate } from '../utils/format';
import { METODOS, metodoLabel } from '../config/cobros';
import { useCajaQuery } from '../api/queries/cobros.queries';
import { useFunciones } from '../api/queries/suscripcion.queries';

export const CajaPage = () => {
  const { cobros: cobrosHabilitado } = useFunciones();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const { data, isLoading, isError, refetch } = useCajaQuery({ desde: desde || undefined, hasta: hasta || undefined }, cobrosHabilitado);

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
        {/* Filtro de período */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-[12px] font-bold text-text-2" htmlFor="desde">Desde</label>
            <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-[13.5px] text-text outline-none focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]" />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-bold text-text-2" htmlFor="hasta">Hasta</label>
            <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-[13.5px] text-text outline-none focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]" />
          </div>
          {(desde || hasta) && (
            <button
              type="button"
              onClick={() => {
                setDesde('');
                setHasta('');
              }}
              className="ml-auto text-[13px] font-bold text-text-3 hover:text-text"
            >
              Hoy
            </button>
          )}
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="text-[13px] font-bold text-text-2">Total cobrado</div>
            <div className="mt-1 font-mono text-[30px] font-extrabold tracking-tight text-success">{formatMoney(data?.totalCobrado)}</div>
            <div className="mt-1 text-[12.5px] text-text-3">
              {data ? `${data.cantidad} cobro${data.cantidad === 1 ? '' : 's'} · ${formatDate(data.desde)}${data.hasta !== data.desde ? ` → ${formatDate(data.hasta)}` : ''}` : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-2 text-[13px] font-bold text-text-2">Por método</div>
            <div className="space-y-1.5">
              {METODOS.map((m) => (
                <div key={m.key} className="flex justify-between text-[13.5px]">
                  <span className="text-text-2">{m.label}</span>
                  <span className="font-mono font-bold">{formatMoney(data?.porMetodo?.[m.key] ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de cobros */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
            <div className="flex-1">Cobro</div>
            <div className="hidden w-[120px] sm:block">Método</div>
            <div className="w-[110px] text-right">Monto</div>
          </div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <div className="ofx-skel h-4 flex-1 rounded" />
              </div>
            ))
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} message="No pudimos cargar la caja." />
          ) : (data?.cobros.length ?? 0) === 0 ? (
            <EmptyState title="Sin cobros en el período" hint="Probá con otro rango de fechas." />
          ) : (
            data!.cobros.map((c) => (
              <div key={c.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">Orden #{c.reparacionId}</div>
                  <div className="text-[12px] text-text-3">
                    {formatDate(c.fecha)}
                    {c.observaciones ? ` · ${c.observaciones}` : ''}
                  </div>
                </div>
                <div className="hidden w-[120px] text-[13px] text-text-2 sm:block">{metodoLabel(c.metodo)}</div>
                <div className="w-[110px] text-right font-mono text-[13.5px] font-bold">{formatMoney(c.monto)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
