import { Link, NavLink } from 'react-router';
import { Logo } from './Logo';
import { isNavItemVisible, navItems } from '../config/nav';
import { useAuth } from '../store/auth.store';
import { useFunciones, useSuscripcionQuery } from '../api/queries/suscripcion.queries';
import { useSessionIdentity } from '../hooks/useSessionIdentity';

/** Sidebar de escritorio (oculto en mobile; en mobile se usa BottomNav). */
export const Sidebar = () => {
  const { isAdmin } = useAuth();
  const identity = useSessionIdentity();
  const funciones = useFunciones();
  const { data: sus } = useSuscripcionQuery();
  const items = navItems.filter((item) => isNavItemVisible(item, { isAdmin, funciones }));

  // Consumo del plan FREE (nudge a PRO)
  const limite = sus?.plan === 'FREE' ? sus.limiteReparacionesMes : null;
  const usados = sus?.reparacionesEsteMes ?? 0;
  const pct = limite ? Math.min(100, Math.round((usados / limite) * 100)) : 0;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link
          to="/dashboard"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
          aria-label={identity.isLoading
            ? 'OrdenFix — Cargando taller — Ir al inicio'
            : `OrdenFix — Taller ${identity.taller} — Ir al inicio`}
        >
          <Logo size={34} withText={false} className="shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block text-[16px] font-extrabold tracking-tight">OrdenFix</span>
            {identity.isLoading ? (
              <span
                role="status"
                aria-label="Cargando taller"
                className="ofx-skel mt-1 block h-3 w-28 max-w-full rounded"
              />
            ) : (
              <span
                className="block truncate text-[12px] font-semibold text-text-3"
                title={identity.taller}
                aria-label={`Taller: ${identity.taller}`}
              >
                {identity.taller}
              </span>
            )}
          </span>
        </Link>
      </div>

      <nav aria-label="Principal" className="ofx-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {items.map((item) =>
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
        {limite != null && (
          <Link to="/planes" className="mb-2 block rounded-lg bg-surface-2 px-3 py-2.5 transition hover:bg-surface-3">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="font-bold text-text-2">Plan FREE</span>
              <span className="font-mono font-bold text-text-3">{usados}/{limite}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--warning)' : 'var(--primary)' }} />
            </div>
            <div className="mt-1.5 text-[11.5px] font-bold text-primary">Pasar a PRO →</div>
          </Link>
        )}
        {identity.isLoading ? (
          <div
            role="status"
            aria-label="Cargando identidad de usuario"
            className="flex items-center gap-3 rounded-lg px-2 py-2"
          >
            <div className="ofx-skel h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="ofx-skel h-3.5 w-28 max-w-full rounded" />
              <div className="ofx-skel h-3 w-36 max-w-full rounded" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-soft-fg"
              aria-hidden="true"
            >
              {identity.iniciales}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13.5px] font-bold" title={identity.nombre}>
                {identity.nombre}
              </div>
              <div className="truncate text-[12px] font-semibold text-text-2">{identity.rolVisible}</div>
              {identity.email && identity.email !== identity.nombre ? (
                <div className="truncate text-[11.5px] text-text-3" title={identity.email}>
                  {identity.email}
                </div>
              ) : null}
            </div>
          </div>
        )}
        {identity.isError ? (
          <button
            type="button"
            onClick={() => void identity.refetch()}
            className="mt-1 flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-[12.5px] font-bold text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
          >
            Reintentar perfil
          </button>
        ) : null}
      </div>
    </aside>
  );
};
