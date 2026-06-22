import { NavLink } from 'react-router';
import { mobileNavItems } from '../config/nav';

/** Barra de navegación inferior (solo mobile). */
export const BottomNav = () => (
  <nav aria-label="Principal" className="sticky bottom-0 z-30 flex border-t border-border bg-surface px-1 py-1.5 lg:hidden">
    {mobileNavItems.map((item) => (
      <NavLink
        key={item.key}
        to={item.path}
        className={({ isActive }) =>
          `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-bold transition-colors ${
            isActive ? 'text-primary' : 'text-text-3'
          }`
        }
      >
        <span className="grid h-5 w-5 place-items-center">{item.icon}</span>
        {item.label}
      </NavLink>
    ))}
  </nav>
);
