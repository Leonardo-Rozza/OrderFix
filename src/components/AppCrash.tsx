import { Logo } from './Logo';
import { btnPrimary } from './ui';

/**
 * Fallback del Sentry.ErrorBoundary que envuelve toda la app (fuera del router,
 * por eso no usa hooks de react-router). El error ya quedó reportado a Sentry.
 */
export const AppCrash = () => (
  <div className="grid min-h-dvh min-w-0 place-items-center bg-bg px-4 py-6 text-text sm:px-6">
    <div className="ofx-in w-full min-w-0 max-w-[440px] rounded-2xl border border-border bg-surface p-5 text-center shadow-sm sm:p-8">
      <div className="mb-5 flex justify-center">
        <Logo size={40} withText={false} />
      </div>
      <h1 className="text-[20px] font-extrabold">Algo salió mal</h1>
      <p className="mt-2 text-[14px] text-text-2">
        Tuvimos un problema inesperado. Ya quedó registrado para que lo revisemos. Probá recargar la página.
      </p>
      <div className="mt-6 flex justify-center">
        <button type="button" className={btnPrimary} onClick={() => window.location.reload()}>
          Recargar
        </button>
      </div>
    </div>
  </div>
);
