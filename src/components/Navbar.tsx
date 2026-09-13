import { Link, useNavigate } from 'react-router';
import { useAuth } from '../store/auth.store';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { useSessionIdentity } from '../hooks/useSessionIdentity';

interface NavbarProps {
  title?: string;
  restricted?: boolean;
}

/** Barra superior. En desktop muestra el título de la sección; en mobile, la marca. */
export const Navbar = ({ title, restricted = false }: NavbarProps) => {
  const { logout } = useAuth();
  const identity = useSessionIdentity();
  const navigate = useNavigate();
  const homeLabel = restricted ? 'Ir a Cuenta' : 'Ir al inicio';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/85 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-2 px-4 lg:gap-3 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            to={restricted ? '/cuenta' : '/dashboard'}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg lg:hidden"
            aria-label={identity.isLoading
              ? `OrdenFix — Cargando taller — ${homeLabel}`
              : `OrdenFix — Taller ${identity.taller} — ${homeLabel}`}
          >
            <Logo size={32} withText={false} className="shrink-0" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[14px] font-extrabold tracking-tight">OrdenFix</span>
              {identity.isLoading ? (
                <span
                  role="status"
                  aria-label="Cargando taller"
                  className="ofx-skel mt-1 block h-2.5 w-20 max-w-full rounded"
                />
              ) : (
                <span
                  className="block truncate text-[11px] font-semibold text-text-3"
                  title={identity.taller}
                  aria-label={`Taller: ${identity.taller}`}
                >
                  {identity.taller}
                </span>
              )}
            </span>
          </Link>
          {title && <h1 className="hidden truncate text-lg font-extrabold tracking-tight lg:block">{title}</h1>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {identity.isError ? (
            <button
              type="button"
              onClick={() => void identity.refetch()}
              aria-label="Reintentar perfil"
              title="Reintentar perfil"
              className="grid h-11 w-11 place-items-center rounded-full border border-border-strong bg-surface text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] lg:hidden"
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
              </svg>
            </button>
          ) : null}
          <ThemeToggle className="h-11 w-11 lg:h-9 lg:w-9" />
          <div className="hidden h-10 min-w-0 max-w-[220px] items-center gap-2.5 rounded-full border border-border bg-surface-2 pl-1 pr-3 lg:flex">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-fg">
              {identity.isLoading ? <span className="ofx-skel h-full w-full rounded-full" /> : identity.iniciales}
            </div>
            {identity.isLoading ? (
              <span role="status" aria-label="Cargando identidad de usuario" className="space-y-1">
                <span className="ofx-skel block h-3 w-24 rounded" />
                <span className="ofx-skel block h-2.5 w-16 rounded" />
              </span>
            ) : (
              <span className="min-w-0 leading-tight" title={identity.email || identity.nombre}>
                <span className="block truncate text-[12.5px] font-bold text-text-2">{identity.nombre}</span>
                <span className="block truncate text-[10.5px] font-semibold text-text-3">{identity.rolVisible}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="grid h-11 w-11 place-items-center rounded-full border border-border-strong bg-surface text-text-2 transition-colors hover:border-danger hover:text-danger-fg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] lg:h-9 lg:w-9"
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
