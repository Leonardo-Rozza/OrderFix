import { useEffect } from 'react';
import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router';
import * as Sentry from '@sentry/react';
import { Logo } from './Logo';
import { btnPrimary, btnGhost } from './ui';

/** Pantalla de error amigable (errorElement del router) en lugar de la cruda de React Router. */
export const RouteError = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  // Reporta a Sentry los errores de render capturados por el router.
  useEffect(() => {
    if (error) Sentry.captureException(error);
  }, [error]);

  const detalle = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Error inesperado';

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 text-text">
      <div className="ofx-in w-full max-w-[440px] rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mb-5 flex justify-center">
          <Logo size={40} withText={false} />
        </div>
        <h1 className="text-[20px] font-extrabold">Algo salió mal</h1>
        <p className="mt-2 text-[14px] text-text-2">
          Tuvimos un problema al mostrar esta pantalla. Podés reintentar o volver al inicio.
        </p>
        <pre className="ofx-scroll mt-4 max-h-28 overflow-auto rounded-lg bg-surface-2 p-3 text-left font-mono text-[12px] text-text-3">
          {detalle}
        </pre>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" className={btnPrimary} onClick={() => window.location.reload()}>
            Reintentar
          </button>
          <button type="button" className={btnGhost} onClick={() => navigate('/dashboard')}>
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
};
