import { useNavigate } from 'react-router';
import { useAuth } from '../store/auth.store';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const { email, logout } = useAuth();
  const navigate = useNavigate();
  const showSidebarToggle = typeof onToggleSidebar === 'function';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="fixed top-0 right-0 left-0 lg:left-64 z-40 h-16 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {showSidebarToggle && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 lg:hidden"
              aria-label="Abrir menú lateral"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Panel de Control</h2>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold dark:bg-indigo-900/60 dark:text-indigo-200">
              {email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{email || 'Usuario'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Administrador</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
            title="Cerrar sesión"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
