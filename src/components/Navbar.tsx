import { Link, useNavigate } from 'react-router';
import { useAuth } from '../store/auth.store';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';

interface NavbarProps {
  title?: string;
}

/** Barra superior. En desktop muestra el título de la sección; en mobile, la marca. */
export const Navbar = ({ title }: NavbarProps) => {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/85 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/dashboard" className="lg:hidden" aria-label="Ir al inicio">
            <Logo size={32} />
          </Link>
          {title && <h1 className="hidden truncate text-lg font-extrabold tracking-tight lg:block">{title}</h1>}
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <div className="hidden h-9 items-center gap-2.5 rounded-full border border-border bg-surface-2 pl-1 pr-3 sm:flex">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-fg">
              {email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="max-w-[160px] truncate text-[13px] font-semibold text-text-2">{email || 'Usuario'}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="grid h-9 w-9 place-items-center rounded-full border border-border-strong bg-surface text-text-2 transition-colors hover:border-danger hover:text-danger-fg"
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
