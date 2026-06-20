import { Link, NavLink } from 'react-router';
import { Logo } from './Logo';
import { navItems } from '../config/nav';
import { useAuth } from '../store/auth.store';

/** Sidebar de escritorio (oculto en mobile; en mobile se usa BottomNav). */
export const Sidebar = () => {
  const { email } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link to="/dashboard" className="rounded-lg transition hover:opacity-80" aria-label="Ir al inicio">
          <Logo size={34} />
        </Link>
      </div>

      <nav className="ofx-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {navItems.map((item) =>
          item.soon ? (
            <div
              key={item.key}
              className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-3/70"
              title="Próximamente"
            >
              <span className="grid h-5 w-5 place-items-center">{item.icon}</span>
              <span>{item.label}</span>
              <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-3">
                Pronto
              </span>
            </div>
          ) : (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-fg shadow-sm'
                    : 'text-text-2 hover:bg-surface-2 hover:text-text'
                }`
              }
            >
              <span className="grid h-5 w-5 place-items-center">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-soft-fg">
            {email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13.5px] font-bold">OrdenFix</div>
            <div className="truncate text-[12px] text-text-3" title={email ?? undefined}>
              {email ?? 'Mi taller'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
