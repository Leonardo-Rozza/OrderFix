import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAccountProfile } from '../router/accountProfile';
import { useSuscripcionQuery } from '../api/queries/suscripcion.queries';
import { useCancelarSuscripcionMutation } from '../api/mutations/pagos.mutations';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';

const sections: Record<string, { title: string; description: string; action: string; columns: string[] }> = {
  reparaciones: { title: 'Reparaciones', description: 'Seguí cada equipo desde el ingreso hasta la entrega.', action: 'Nueva reparación', columns: ['Equipo', 'Cliente', 'Estado'] },
  clientes: { title: 'Clientes', description: 'Reuní los contactos y el historial de tus clientes.', action: 'Nuevo cliente', columns: ['Nombre', 'Contacto', 'Equipos'] },
  equipos: { title: 'Equipos', description: 'Organizá los equipos que pasan por tu taller.', action: 'Nuevo equipo', columns: ['Equipo', 'Cliente', 'Identificación'] },
  repuestos: { title: 'Repuestos', description: 'Llevá el detalle de los repuestos de cada reparación.', action: 'Nuevo repuesto', columns: ['Repuesto', 'Reparación', 'Costo'] },
  usuarios: { title: 'Empleados', description: 'Administrá los accesos de tu equipo de trabajo.', action: 'Nuevo empleado', columns: ['Nombre', 'Email', 'Rol'] },
  inventario: { title: 'Inventario', description: 'Consultá el stock y registrá sus movimientos.', action: 'Nuevo artículo', columns: ['Artículo', 'Stock', 'Costo'] },
  caja: { title: 'Cobros', description: 'Registrá los cobros del taller y consultá sus totales.', action: 'Registrar cobro', columns: ['Orden', 'Método', 'Monto'] },
  planes: { title: 'Plan', description: 'Consultá las opciones disponibles para tu taller.', action: 'Contratar PRO', columns: ['Plan', 'Funciones', 'Estado'] },
  cuenta: { title: 'Cuenta', description: 'Verificá tu email para acceder a esta acción de tu cuenta.', action: 'Continuar', columns: [] },
};

/** No monta componentes ni consultas operativas: la vista previa es explícita. */
export const EmailVerificationPreview = () => {
  const { pathname } = useLocation();
  const profile = useAccountProfile();
  const section = sections[pathname.split('/')[1]];
  const title = section?.title ?? 'Inicio';
  return (
    <DashboardLayout title={title}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="mb-2 inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-soft-fg">Vista previa</span>
          <h1 className="text-2xl font-extrabold [overflow-wrap:anywhere]">{section?.title ?? `Hola, ${profile.usuario.username}`}</h1>
          <p className="mt-2 text-sm text-text-2">{section?.description ?? 'Conocé las secciones de tu taller antes de empezar.'}</p>
        </div>
        <button type="button" disabled className="min-h-11 rounded-xl bg-surface-3 px-5 text-sm font-bold text-text-3" aria-describedby="verification-preview-message">
          {section?.action ?? 'Nueva reparación'}
        </button>
      </div>
      {!section && <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {['Reparaciones activas', 'Equipos sin retirar', 'Reparaciones del mes', 'Clientes'].map(label => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm font-semibold text-text-2">{label}</p>
            <p className="mt-4 text-3xl font-bold text-text-3" aria-label="Disponible al verificar">—</p>
          </div>
        ))}
      </div>}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label={`Vista previa de ${title}`}>
        {(section?.columns.length ?? 0) > 0 && <div aria-hidden="true" className="grid grid-cols-3 gap-3 border-b border-border bg-surface-2 px-5 py-4 text-xs font-bold uppercase text-text-3">
          {section!.columns.map(column => <span key={column}>{column}</span>)}
        </div>}
        <div className="px-5 py-10 text-center">
          <h2 className="text-lg font-bold">Tu taller está a un paso</h2>
          <p id="verification-preview-message" className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-2">
            Confirmá tu email para consultar los datos y empezar a trabajar. Mientras tanto, podés recorrer las secciones de OrdenFix.
          </p>
          <Link to="/cuenta" className="mt-4 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-bold text-primary underline focus-visible:outline focus-visible:outline-primary">Ir a Cuenta y ayuda</Link>
        </div>
      </section>
    </DashboardLayout>
  );
};

/** Excepción de salida: sólo el titular consulta/cancela una suscripción previa. */
export const UnverifiedSubscriptionPage = () => {
  const subscription = useSuscripcionQuery();
  const cancel = useCancelarSuscripcionMutation();
  const [confirm, setConfirm] = useState(false);
  const active = subscription.data?.plan === 'PRO' && subscription.data.estado === 'ACTIVA';
  return <DashboardLayout title="Plan" accountMode>
    <h1 className="text-2xl font-extrabold">Tu suscripción</h1>
    <p className="mt-2 text-sm text-text-2">Podés cancelar una suscripción existente. Para contratar un plan o usar las funciones del taller, primero confirmá tu email.</p>
    <section className="mt-6 max-w-xl rounded-2xl border border-border bg-surface p-6">
      {subscription.isPending ? <Loader /> : subscription.isError ? <ErrorState title="No pudimos consultar tu plan" onRetry={() => void subscription.refetch()} /> : <>
        <h2 className="text-lg font-bold">Plan {subscription.data.plan}</h2>
        <p className="mt-2 text-sm text-text-2">{active ? 'Tu suscripción PRO está activa.' : 'No tenés una suscripción PRO activa para cancelar.'}</p>
        {active && <button type="button" onClick={() => setConfirm(true)} className="mt-4 min-h-11 rounded-lg border border-border px-4 text-sm font-bold text-danger">Cancelar PRO</button>}
      </>}
    </section>
    <ConfirmDialog isOpen={confirm && active} title="Cancelar PRO" message="Cuando se confirme la cancelación, tu taller volverá al plan FREE y dejará de tener las funciones PRO. ¿Querés continuar?" confirmLabel="Cancelar PRO" loading={cancel.isPending} onClose={() => setConfirm(false)} onConfirm={async () => {
      if (!active || cancel.isPending) return;
      try { await cancel.mutateAsync(); setConfirm(false); } catch { /* La mutation muestra el error y permite reintentar. */ }
    }} />
  </DashboardLayout>;
};
