import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Navigate, useNavigate } from 'react-router';
import { deactivateOwnAccess } from '../api/accountAccessExit';
import { PasswordInput } from '../components/PasswordInput';
import { DiscardChangesDialog } from '../components/DiscardChangesDialog';
import { btnDanger, btnGhost, card } from '../components/ui';
import { useRetryAfter } from '../hooks/useRetryAfter';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { releaseUnsavedChangesGuards } from '../lib/unsavedChangesLifecycle';
import { useAccountProfile } from '../router/accountProfile';
import { authStore } from '../store/auth.store';

const EmployeeAccessExit = () => {
  const { usuario, taller } = useAccountProfile();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const retry = useRetryAfter();
  const guard = useUnsavedChangesGuard({
    isOpen: true, isDirty: !!password || confirmed, isBusy: pending,
    onClose: () => navigate('/cuenta'),
    onNavigationDiscard: () => { setPassword(''); setConfirmed(false); },
    copy: {
      title: 'Salir de la confirmación',
      message: pending
        ? 'La solicitud ya fue enviada. Esperá la respuesta para conocer el resultado.'
        : 'Se descartará la contraseña ingresada. No se solicitará la baja.',
      discardLabel: pending ? 'Esperando respuesta' : 'Volver sin dar de baja',
    },
  });

  useEffect(() => () => { request.current?.abort(); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.current || retry.isCoolingDown || guard.isSuspended) return;
    if (!confirmed || !password.trim() || password.length > 100) {
      setMessage('Ingresá tu contraseña actual y confirmá la baja.');
      passwordInput.current?.focus();
      return;
    }
    const controller = new AbortController();
    const token = authStore.getState().token;
    request.current = controller;
    setPending(true);
    setMessage('');
    // No usamos una mutation de React Query, que conservaría variables sensibles.
    const attempt = deactivateOwnAccess(password, controller.signal);
    setPassword('');
    setConfirmed(false);
    try {
      await attempt;
      if (controller.signal.aborted || authStore.getState().token !== token) return;
      releaseUnsavedChangesGuards();
      authStore.getState().logout();
      // Confirmar la navegación junto con el logout evita que el guard la reemplace sin la constancia.
      navigate('/login', { replace: true, state: { accessDeactivated: true }, flushSync: true });
    } catch (error) {
      if (controller.signal.aborted || authStore.getState().token !== token) return;
      const status = isAxiosError(error) ? error.response?.status : undefined;
      const code = isAxiosError(error) ? error.response?.data?.code : undefined;
      if (retry.startRetryAfter(error)) setMessage('Demasiados intentos. Esperá antes de volver a confirmar.');
      else if (status === 400 && code === 'PASSWORD_ACTUAL_INVALIDA') {
        setMessage('La contraseña actual no es correcta. Volvé a ingresarla.');
      } else if (status === 400) setMessage('No pudimos validar la confirmación. Revisá los datos y volvé a intentar.');
      else if (status === 401 || status === 403 || status === 409) {
        setMessage('Tu sesión cambió. Cerrá sesión y volvé a ingresar para revisar tu acceso.');
      } else {
        setMessage('No pudimos confirmar si la baja se completó. Podés cerrar sesión y comprobar tu acceso antes de volver a intentarlo.');
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted && authStore.getState().token === token) setPending(false);
    }
  };

  return <DashboardLayout accountMode title="Baja de mi acceso">
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight">Dar de baja mi acceso</h1>
        <p className="mt-2 text-sm leading-6 text-text-2 [overflow-wrap:anywhere]">Cuenta de {usuario.email} en {taller.nombre}.</p>
      </div>
      <section className={`${card} space-y-3 p-4 text-sm leading-6 text-text-2 sm:p-5`} aria-label="Alcance de la baja">
        <p>Se desactivará tu usuario y tus sesiones dejarán de permitir el acceso a OrdenFix.</p>
        <p>El taller y los demás empleados podrán seguir trabajando. Las reparaciones y la evidencia asociada se conservarán.</p>
        <p>Esta acción no elimina tus datos personales ni cierra el taller. El titular podrá volver a habilitar tu acceso; tus sesiones anteriores seguirán revocadas.</p>
      </section>
      <form onSubmit={(event) => void submit(event)} className={`${card} space-y-4 p-4 sm:p-5`} noValidate>
        <div>
          <label htmlFor="access-exit-password" className="mb-2 block text-sm font-bold">Contraseña actual</label>
          <PasswordInput id="access-exit-password" ref={passwordInput} autoComplete="current-password" maxLength={100}
            value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending || guard.isSuspended}
            aria-describedby={message ? 'access-exit-error' : undefined} />
        </div>
        <label className="flex min-h-11 items-start gap-3 py-2 text-sm leading-6">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}
            disabled={pending || guard.isSuspended} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
          <span>Entiendo que se desactivará mi acceso y se cerrarán mis sesiones.</span>
        </label>
        {message && <p id="access-exit-error" role="alert" className="text-sm leading-6 text-danger-fg">{message}</p>}
        {pending && <p role="status" className="text-sm text-text-2">Confirmando la baja. Esperá la respuesta para conocer el resultado.</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="submit" className={`${btnDanger} min-h-11`} disabled={!confirmed || !password.trim() || password.length > 100 || pending || retry.isCoolingDown || guard.isSuspended}>
            {pending ? 'Confirmando baja…' : retry.isCoolingDown ? `Reintentá en ${retry.secondsRemaining} s` : 'Confirmar baja de mi acceso'}
          </button>
          <button type="button" className={`${btnGhost} min-h-11`} disabled={pending} onClick={(event) => guard.requestClose(event)}>Volver a Cuenta</button>
        </div>
      </form>
    </div>
    <DiscardChangesDialog {...guard.dialog} />
  </DashboardLayout>;
};

export const AccountAccessExitPage = () => {
  const profile = useAccountProfile();
  return profile.usuario.role === 'USER' ? <EmployeeAccessExit /> : <Navigate to="/cuenta" replace />;
};
