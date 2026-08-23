import { Link, useParams } from 'react-router';
import { BlobImage } from '../components/BlobImage';
import { EstadoBadge } from '../components/EstadoBadge';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';
import { PagoChip } from '../components/PagoChip';
import { btnGhost } from '../components/ui';
import { useResumenDigitalQuery } from '../api/queries/cobros.queries';
import { useQrCobroQuery } from '../api/queries/datosCobro.queries';
import { metodoLabel } from '../config/cobros';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const AmountRow = ({
  label,
  value,
  emphasis = false,
  tone = '',
}: {
  label: string;
  value: number;
  emphasis?: boolean;
  tone?: string;
}) => (
  <div className={`flex min-w-0 items-start justify-between gap-3 ${emphasis ? 'text-[16px] font-extrabold' : 'text-[13.5px]'}`}>
    <span className="min-w-0 text-text-2">{label}</span>
    <span className={`max-w-[55%] text-right font-mono font-bold [overflow-wrap:anywhere] ${tone}`}>
      {formatMoney(value)}
    </span>
  </div>
);

export const ResumenDigitalPage = () => {
  const { id } = useParams();
  const reparacionId = Number(id);
  const validId = Number.isInteger(reparacionId) && reparacionId > 0;
  const resumenQuery = useResumenDigitalQuery(validId ? reparacionId : undefined);
  const resumen = resumenQuery.data;
  const datosCobro = resumen?.datosCobro;
  const qrConfigurado = Boolean(
    datosCobro?.qrDisponible
    && datosCobro.qrVersion,
  );
  const qrQuery = useQrCobroQuery(datosCobro?.qrVersion, qrConfigurado);
  const ordenPath = validId ? `/reparaciones/${reparacionId}` : '/reparaciones';

  if (!validId || resumenQuery.isError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4 py-8 text-text">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-sm [&_button]:min-h-11">
          <ErrorState
            title="No se pudo cargar el resumen digital"
            message={validId
              ? 'Reintentá o volvé al detalle de la orden.'
              : 'La orden indicada no es válida.'}
            onRetry={validId ? () => void resumenQuery.refetch() : undefined}
          />
          <div className="border-t border-border p-4 text-center">
            <Link to={ordenPath} className={btnGhost}>Volver a la orden</Link>
          </div>
        </div>
      </main>
    );
  }

  if (resumenQuery.isPending || !resumen) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4 text-text">
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-[14px] font-semibold text-text-2">
          <Loader size="lg" />
          <span>Cargando resumen digital…</span>
        </div>
      </main>
    );
  }

  const estadoPago = resumen.importes.pagado
    ? 'PAGADO'
    : resumen.importes.cobrado > 0
      ? 'PARCIAL'
      : 'SIN_COBRAR';
  const ordenVisible = resumen.numeroOrden || `#${reparacionId}`;

  return (
    <main className="min-h-dvh bg-bg px-4 py-4 text-text sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-[820px]">
        <nav aria-label="Acciones del resumen" className="mb-4">
          <Link
            to={ordenPath}
            className={btnGhost}
          >
            ← Volver a la orden
          </Link>
        </nav>

        <article
          aria-labelledby="resumen-digital-title"
          className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
        >
          <header className="grid min-w-0 gap-4 border-b border-border px-4 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:px-7 sm:py-6">
            <div className="min-w-0">
              <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">Emitido por</p>
              <div className="mt-1 text-[22px] font-extrabold tracking-tight [overflow-wrap:anywhere]">
                {resumen.taller.nombre}
              </div>
              {resumen.taller.telefono ? (
                <div className="mt-1 font-mono text-[12.5px] text-text-3 [overflow-wrap:anywhere]">
                  Tel: {resumen.taller.telefono}
                </div>
              ) : null}
            </div>
            <div className="min-w-0 sm:text-right">
              <h1 id="resumen-digital-title" className="text-[18px] font-extrabold tracking-tight">
                Resumen digital de la orden
              </h1>
              <div className="mt-1 font-mono text-[13px] font-bold [overflow-wrap:anywhere]">
                Orden {ordenVisible}
              </div>
              <div className="mt-0.5 text-[12.5px] text-text-3">{formatDate(resumen.fecha)}</div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                <EstadoBadge estado={resumen.estado} />
                <PagoChip
                  estadoPago={estadoPago}
                  saldo={resumen.importes.saldo}
                  excedente={resumen.importes.excedente}
                  requiereRevision={resumen.importes.requiereRevision}
                />
              </div>
            </div>
          </header>

          <div className="min-w-0 space-y-6 px-4 py-5 sm:px-7 sm:py-6">
            <section aria-labelledby="personas-equipo-title" className="min-w-0">
              <h2 id="personas-equipo-title" className="sr-only">Cliente y equipo</h2>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-border bg-surface-2 p-4">
                  <h3 className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">Cliente</h3>
                  <div className="mt-1 text-[14px] font-bold [overflow-wrap:anywhere]">
                    {resumen.cliente.nombre} {resumen.cliente.apellido}
                  </div>
                  {resumen.cliente.telefono ? (
                    <div className="mt-0.5 font-mono text-[12.5px] text-text-3 [overflow-wrap:anywhere]">
                      {resumen.cliente.telefono}
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 rounded-xl border border-border bg-surface-2 p-4">
                  <h3 className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">Equipo</h3>
                  <div className="mt-1 text-[14px] font-bold [overflow-wrap:anywhere]">
                    {resumen.equipo.marca} {resumen.equipo.modelo}
                  </div>
                  <div className="mt-1 text-[12.5px] leading-relaxed text-text-3 [overflow-wrap:anywhere]">
                    Problema informado: {resumen.equipo.descripcionProblema}
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="detalle-orden-title" className="min-w-0">
              <h2 id="detalle-orden-title" className="text-[15px] font-extrabold">Detalle de la orden</h2>
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                {resumen.detalle.repuestos.length === 0 ? (
                  <p className="px-4 py-3 text-[13px] text-text-3">Sin repuestos registrados.</p>
                ) : resumen.detalle.repuestos.map((item, index) => (
                  <div
                    key={`${item.nombre}-${index}`}
                    className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold [overflow-wrap:anywhere]">
                        {item.cantidad}× {item.nombre}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-text-3 [overflow-wrap:anywhere]">
                        {formatMoney(item.precioUnitario)} c/u
                      </div>
                    </div>
                    <div className="max-w-[45%] text-right font-mono text-[13px] font-bold [overflow-wrap:anywhere]">
                      {formatMoney(item.subtotal)}
                    </div>
                  </div>
                ))}
                <div className="flex min-w-0 items-start justify-between gap-3 border-t border-border bg-surface-2 px-4 py-3 text-[13.5px]">
                  <span className="min-w-0 font-semibold">Mano de obra</span>
                  <span className="max-w-[55%] text-right font-mono font-bold [overflow-wrap:anywhere]">
                    {formatMoney(resumen.detalle.manoDeObra)}
                  </span>
                </div>
              </div>
            </section>

            <section aria-labelledby="importes-title" className="min-w-0 rounded-xl border border-border bg-surface-2 p-4">
              <h2 id="importes-title" className="mb-3 text-[15px] font-extrabold">Importes</h2>
              <div className="space-y-2">
                <AmountRow label="Repuestos" value={resumen.detalle.totalRepuestos} />
                <AmountRow label="Total" value={resumen.importes.total} emphasis />
                <AmountRow label="Cobrado" value={resumen.importes.cobrado} tone="text-success" />
                <AmountRow label="Pendiente de cobro" value={resumen.importes.saldo} />
                {resumen.importes.requiereRevision || resumen.importes.excedente > 0 ? (
                  <AmountRow
                    label="Excedente a revisar"
                    value={resumen.importes.excedente}
                    tone="text-danger-fg"
                  />
                ) : null}
              </div>
            </section>

            <section aria-labelledby="pagos-resumen-title" className="min-w-0">
              <h2 id="pagos-resumen-title" className="text-[15px] font-extrabold">Cobros registrados</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-text-3">
                Movimientos activos declarados por el taller. No incluyen observaciones internas ni confirman acreditaciones bancarias.
              </p>
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                {resumen.pagos.length === 0 ? (
                  <p className="px-4 py-3 text-[13px] text-text-3">Sin cobros registrados.</p>
                ) : resumen.pagos.map((pago, index) => (
                  <div
                    key={`${pago.fecha}-${index}`}
                    className="flex min-w-0 flex-wrap items-start gap-3 border-b border-border px-4 py-3 last:border-0 sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1 basis-[180px]">
                      <div className="text-[13.5px] font-semibold">{metodoLabel(pago.metodo)}</div>
                      <div className="text-[11.5px] text-text-3">{formatDateTime(pago.fecha)}</div>
                      {pago.referencia ? (
                        <div className="mt-1 text-[12px] font-semibold text-text-2 [overflow-wrap:anywhere]">
                          Referencia: <span className="font-mono">{pago.referencia}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="max-w-full shrink-0 text-right font-mono text-[13.5px] font-bold [overflow-wrap:anywhere] sm:max-w-[45%]">
                      {formatMoney(pago.monto)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {datosCobro ? (
              <section aria-labelledby="datos-cobro-resumen-title" className="min-w-0 rounded-xl border border-border bg-surface-2 p-4 sm:p-5">
                <h2 id="datos-cobro-resumen-title" className="text-[15px] font-extrabold">Datos para cobrar</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-text-3">
                  Referencias informadas por el taller. OrdenFix no procesa ni confirma el pago.
                </p>
                <div className={`mt-4 grid min-w-0 grid-cols-1 gap-4 ${qrConfigurado ? 'sm:grid-cols-[minmax(0,1fr)_144px]' : ''}`}>
                  <dl className="min-w-0 space-y-2 text-[13px]">
                    {datosCobro.alias ? (
                      <div className="min-w-0">
                        <dt className="font-semibold text-text-3">Alias</dt>
                        <dd className="font-mono font-bold [overflow-wrap:anywhere]">{datosCobro.alias}</dd>
                      </div>
                    ) : null}
                    {datosCobro.titular ? (
                      <div className="min-w-0">
                        <dt className="font-semibold text-text-3">Titular</dt>
                        <dd className="font-bold [overflow-wrap:anywhere]">{datosCobro.titular}</dd>
                      </div>
                    ) : null}
                    {datosCobro.entidad ? (
                      <div className="min-w-0">
                        <dt className="font-semibold text-text-3">Entidad o billetera</dt>
                        <dd className="font-bold [overflow-wrap:anywhere]">{datosCobro.entidad}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {qrConfigurado ? (
                    <div className="grid h-40 w-full place-items-center overflow-hidden rounded-lg border border-border bg-surface sm:h-36 sm:w-36">
                      {qrQuery.data ? (
                        <BlobImage
                          blob={qrQuery.data}
                          alt={`QR para pagar la orden ${ordenVisible}`}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : qrQuery.isError ? (
                        <div role="alert" className="px-2 text-center">
                          <p className="sr-only">No pudimos cargar el QR para pagar.</p>
                          <button
                            type="button"
                            onClick={() => void qrQuery.refetch()}
                            className="min-h-11 rounded-md px-2 text-[12px] font-bold text-danger-fg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
                          >
                            Reintentar QR
                          </button>
                        </div>
                      ) : (
                        <span
                          role="status"
                          aria-live="polite"
                          aria-label="Cargando QR para pagar"
                          className="grid h-6 w-6 place-items-center"
                        >
                          <span className="h-6 w-6 animate-spin rounded-full border-2 border-surface-3 border-t-primary" aria-hidden="true" />
                          <span className="sr-only">Cargando QR para pagar…</span>
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            <aside role="note" aria-labelledby="leyenda-fiscal-title" className="rounded-xl border border-border bg-surface-2 p-4">
              <h2 id="leyenda-fiscal-title" className="text-[13px] font-extrabold">Documento informativo</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-2 [overflow-wrap:anywhere]">
                {resumen.leyenda}
              </p>
            </aside>
          </div>

          <footer className="border-t border-border px-4 py-4 text-center text-[12px] font-semibold text-text-3 sm:px-7">
            Generado con <span className="font-extrabold text-text-2">OrdenFix</span>
          </footer>
        </article>
      </div>
    </main>
  );
};
