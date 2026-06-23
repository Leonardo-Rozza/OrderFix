import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { UsuarioFormModal } from '../components/UsuarioFormModal';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { btnPrimary } from '../components/ui';
import { iniciales } from '../utils/format';
import { useUsuariosQuery } from '../api/queries/usuarios.queries';
import { useFunciones } from '../api/queries/suscripcion.queries';
import { useUpdateUsuarioMutation } from '../api/mutations/usuarios.mutations';
import { useAuth } from '../store/auth.store';
import type { Rol } from '../types';

export const UsuariosPage = () => {
  const { isAdmin, email } = useAuth();
  const { empleadosMultiples } = useFunciones();
  const { data: usuarios = [], isLoading, isError, refetch } = useUsuariosQuery(isAdmin);
  const updateUsuario = useUpdateUsuarioMutation();
  const [formOpen, setFormOpen] = useState(false);

  if (!isAdmin) {
    return (
      <DashboardLayout title="Empleados">
        <div className="ofx-in mx-auto max-w-md py-20 text-center">
          <div className="text-[16px] font-extrabold">Solo para administradores</div>
          <div className="mt-1 text-[13px] text-text-3">No tenés permisos para gestionar empleados.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Empleados">
      <div className="ofx-in mx-auto max-w-[900px] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13.5px] text-text-2">Gestioná los usuarios de tu taller y sus permisos.</p>
          {empleadosMultiples ? (
            <button type="button" className={btnPrimary} onClick={() => setFormOpen(true)}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nuevo empleado
            </button>
          ) : (
            <span className="rounded-lg bg-surface-3 px-3 py-2 text-[12.5px] font-semibold text-text-2">
              Sumar empleados es PRO ·{' '}
              <a href="/planes" className="font-bold text-primary">
                Ver planes
              </a>
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
            <div className="min-w-0 flex-[1.6]">Usuario</div>
            <div className="w-[150px]">Rol</div>
            <div className="w-[110px] text-right">Estado</div>
          </div>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <div className="ofx-skel h-9 w-9 rounded-full" />
                <div className="ofx-skel h-4 flex-1 rounded" />
              </div>
            ))
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} message="No pudimos cargar los empleados." />
          ) : usuarios.length === 0 ? (
            <EmptyState title="Sin empleados" hint="Sumá el primer usuario de tu taller." />
          ) : (
            usuarios.map((u) => {
              const esYo = u.email === email;
              return (
                <div key={u.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                  <div className="flex min-w-0 flex-[1.6] items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-extrabold text-primary-soft-fg">
                      {iniciales(u.username)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-bold">
                        {u.username}
                        {esYo && <span className="ml-2 text-[11px] font-bold text-text-3">(vos)</span>}
                      </div>
                      <div className="truncate text-[12.5px] text-text-3">{u.email}</div>
                    </div>
                  </div>

                  <div className="w-[150px]">
                    <select
                      value={u.role}
                      disabled={esYo || updateUsuario.isPending}
                      onChange={(e) => updateUsuario.mutate({ id: u.id, role: e.target.value as Rol })}
                      className="w-full rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-text outline-none transition focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)] disabled:opacity-60"
                    >
                      <option value="USER">Empleado</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="flex w-[110px] justify-end">
                    <button
                      type="button"
                      disabled={esYo || updateUsuario.isPending}
                      onClick={() => updateUsuario.mutate({ id: u.id, active: !u.active })}
                      className={`rounded-full px-3 py-1 text-[12px] font-bold transition disabled:opacity-60 ${
                        u.active
                          ? 'bg-st-completado-bg text-st-completado'
                          : 'bg-danger-soft text-danger-fg'
                      }`}
                      title={esYo ? 'No podés cambiar tu propio estado' : u.active ? 'Desactivar' : 'Activar'}
                    >
                      {u.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <UsuarioFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} />
    </DashboardLayout>
  );
};
