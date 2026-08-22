import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { isNavItemActive, isNavItemVisible, mobileMoreItems, mobileNavItems } from '../config/nav';
import { useFunciones } from '../api/queries/suscripcion.queries';
import { useAuth } from '../store/auth.store';
import { MobileMoreMenu } from './MobileMoreMenu';

/** Barra de navegación inferior (solo mobile). */
export const BottomNav = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const funciones = useFunciones();
  const visibleMoreItems = mobileMoreItems.filter((item) =>
    isNavItemVisible(item, { isAdmin, funciones })
  );
  const moreActive = mobileMoreItems.some((item) => isNavItemActive(item, pathname));

  return (
    <>
      <nav aria-label="Principal" className="sticky bottom-0 z-30 flex border-t border-border bg-surface px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] ${
                isActive ? 'text-primary' : 'text-text-3'
              }`
            }
          >
            <span className="grid h-5 w-5 place-items-center">{item.icon}</span>
            {item.mobileLabel ?? item.label}
          </NavLink>
        ))}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-current={moreActive ? 'page' : undefined}
          onClick={() => setMoreOpen(true)}
          className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] ${
            moreActive ? 'text-primary' : 'text-text-3'
          }`}
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="6" height="6" rx="1.5" />
            <rect x="14" y="4" width="6" height="6" rx="1.5" />
            <rect x="4" y="14" width="6" height="6" rx="1.5" />
            <rect x="14" y="14" width="6" height="6" rx="1.5" />
          </svg>
          Más
        </button>
      </nav>

      <MobileMoreMenu
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={visibleMoreItems}
      />
    </>
  );
};
