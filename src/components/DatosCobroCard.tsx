import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDatosCobroQuery, useQrCobroQuery } from '../api/queries/datosCobro.queries';
import { useAuth } from '../store/auth.store';
import { ErrorState } from './ErrorState';
import { DatosCobroFormModal } from './DatosCobroFormModal';
import { btnGhost, card } from './ui';
import { BlobImage } from './BlobImage';

export const DatosCobroCard = () => {
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const datosQuery = useDatosCobroQuery();
  const datos = datosQuery.data;
  const qrQuery = useQrCobroQuery(
    datos?.qrVersion,
    !!datos?.qrDisponible && !!datos?.qrVersion,
  );

  const tieneDatos = !!(
    datos?.alias
    || datos?.titular
    || datos?.entidad
    || datos?.qrDisponible
  );

  return (
    <>
      <section aria-label="Datos para cobrar" className={`${card} overflow-hidden`}>
        <div className="flex min-w-0 flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold text-text">Datos para cobrar</h2>
            <p className="mt-1 max-w-[620px] text-[12.5px] leading-relaxed text-text-3">
              OrdenFix guarda estas referencias para mostrarlas en la app. No accede a tu cuenta ni confirma acreditaciones o pagos.
            </p>
          </div>
          {isAdmin && datos ? (
            <button type="button" className={`${btnGhost} shrink-0`} onClick={() => setEditing(true)}>
              Configurar
            </button>
          ) : null}
        </div>

        {datosQuery.isLoading ? (
          <div
            className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_112px] sm:p-5"
            role="status"
            aria-live="polite"
            aria-label="Cargando datos para cobrar"
          >
            <span className="sr-only">Cargando datos para cobrar…</span>
            <div className="space-y-3" aria-hidden="true">
              <div className="ofx-skel h-4 w-52 max-w-full rounded" />
              <div className="ofx-skel h-4 w-64 max-w-full rounded" />
              <div className="ofx-skel h-4 w-40 max-w-full rounded" />
            </div>
            <div className="ofx-skel h-28 w-28 max-w-full rounded-lg" aria-hidden="true" />
          </div>
        ) : datosQuery.isError || !datos ? (
          <ErrorState
            message="No pudimos cargar los datos para cobrar."
            onRetry={() => void datosQuery.refetch()}
          />
        ) : !tieneDatos ? (
          <div className="px-4 py-5 sm:px-5">
            <p className="text-[13px] font-semibold text-text-2">
              {isAdmin
                ? 'Todavía no configuraste alias, titular, entidad ni QR.'
                : 'El taller todavía no configuró datos públicos para cobrar.'}
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_112px] sm:items-start sm:p-5">
            <dl className="min-w-0 space-y-2 text-[13px]">
              {datos.alias ? (
                <div className="grid min-w-0 gap-0.5 sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-3">
                  <dt className="font-semibold text-text-3">Alias</dt>
                  <dd className="font-mono font-bold [overflow-wrap:anywhere]">{datos.alias}</dd>
                </div>
              ) : null}
              {datos.titular ? (
                <div className="grid min-w-0 gap-0.5 sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-3">
                  <dt className="font-semibold text-text-3">Titular</dt>
                  <dd className="font-semibold [overflow-wrap:anywhere]">{datos.titular}</dd>
                </div>
              ) : null}
              {datos.entidad ? (
                <div className="grid min-w-0 gap-0.5 sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-3">
                  <dt className="font-semibold text-text-3">Entidad</dt>
                  <dd className="font-semibold [overflow-wrap:anywhere]">{datos.entidad}</dd>
                </div>
              ) : null}
              <div className="grid min-w-0 gap-0.5 sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-3">
                <dt className="font-semibold text-text-3">Resumen</dt>
                <dd className="font-semibold">
                  {datos.mostrarEnResumen ? 'Visible en el resumen digital' : 'Oculto en el resumen digital'}
                </dd>
              </div>
            </dl>

            {datos.qrDisponible ? (
              <div className="grid h-28 w-full place-items-center overflow-hidden rounded-lg border border-border bg-surface-2 sm:w-28">
                {qrQuery.data ? (
                  <BlobImage
                    blob={qrQuery.data}
                    alt="QR de cobro configurado por el taller"
                    className="h-full w-full object-contain p-2"
                  />
                ) : qrQuery.isError ? (
                  <div role="alert" className="grid place-items-center">
                    <span className="sr-only">No pudimos cargar el QR de cobro.</span>
                    <button
                      type="button"
                      onClick={() => void qrQuery.refetch()}
                      className="min-h-11 px-2 text-[12px] font-bold text-danger-fg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
                    >
                      Reintentar QR
                    </button>
                  </div>
                ) : (
                  <span
                    className="grid h-6 w-6 place-items-center"
                    role="status"
                    aria-live="polite"
                    aria-label="Cargando QR de cobro"
                  >
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-surface-3 border-t-primary" aria-hidden="true" />
                    <span className="sr-only">Cargando QR de cobro…</span>
                  </span>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {isAdmin && datos && typeof document !== 'undefined'
        ? createPortal(
          <DatosCobroFormModal
            isOpen={editing}
            onClose={() => setEditing(false)}
            datos={datos}
          />,
          document.body,
        )
        : null}
    </>
  );
};
