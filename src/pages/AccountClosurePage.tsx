import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { getWorkshopClosure, reauthenticateWorkshopClosure, submitWorkshopClosure, WorkshopClosureError,
  type WorkshopClosureStatus } from '../api/services/workshopClosure.service';
import { DiscardChangesDialog } from '../components/DiscardChangesDialog';
import { PasswordInput } from '../components/PasswordInput';
import { btnDanger, btnGhost, btnPrimary, card, inputClass } from '../components/ui';
import { workshopClosureEnabled } from '../config/workshopClosure';
import { useRetryAfter } from '../hooks/useRetryAfter';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { releaseUnsavedChangesGuards } from '../lib/unsavedChangesLifecycle';
import { useAccountProfile } from '../router/accountProfile';
import { authStore } from '../store/auth.store';

const dateTime = (value: string) => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long', timeStyle: 'short',
}).format(new Date(value));
const failureMessage = (error: unknown) => {
  const failure = error instanceof WorkshopClosureError ? error : null;
  if (failure?.code === 'PASSWORD_ACTUAL_INVALIDA') return 'La contraseña actual no es correcta. Volvé a ingresarla.';
  if (failure?.code === 'REAUTENTICACION_INVALIDA') return 'La confirmación ya no es válida. Volvé a ingresar tu contraseña y la frase.';
  if (failure?.code === 'EMAIL_NO_VERIFICADO') return 'Verificá el email de tu cuenta antes de continuar.';
  if (failure?.status === 403) return 'Esta acción requiere ser titular del taller, tener el email verificado y una sesión vigente.';
  if (failure?.status === 404) return 'El cierre y la restauración no están disponibles en este entorno.';
  if (failure?.status === 409 || failure?.status === 423) return 'El estado del taller cambió. Consultá el estado actualizado antes de confirmar otra vez.';
  if (failure?.status === 429) return 'Alcanzaste el límite de intentos. Esperá antes de volver a confirmar.';
  if (failure?.status === 400) return 'No pudimos validar la confirmación. Ingresá nuevamente tu contraseña y la frase exacta.';
  return 'No pudimos consultar o preparar la operación. Revisá tu conexión y volvé a intentar.';
};

const ClosureUnavailable = () => {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <DashboardLayout accountMode title="Cierre del taller">
  <div className="mx-auto max-w-2xl space-y-4">
    <h1 ref={heading} tabIndex={-1} className="text-[22px] font-extrabold tracking-tight outline-none">Cierre del taller</h1>
    <p className="text-sm leading-6 text-text-2">El cierre y la restauración no están disponibles en este entorno.</p>
    <Link to="/cuenta" className={`${btnGhost} min-h-11 sm:min-h-11`}>Volver a Cuenta</Link>
  </div>
</DashboardLayout>;
};

const AdminWorkshopClosure = () => {
  const navigate = useNavigate();
  const { taller } = useAccountProfile();
  const [session] = useState(() => authStore.getState().token);
  const [status, setStatus] = useState<WorkshopClosureStatus | null>(null);
  const [reading, setReading] = useState(true);
  const [readMessage, setReadMessage] = useState('');
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  const readRequest = useRef<AbortController | null>(null);
  const operation = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorRegion = useRef<HTMLDivElement>(null);
  const retry = useRetryAfter();
  const startRetryAfter = retry.startRetryAfter;
  const guard = useUnsavedChangesGuard({
    isOpen: true, isDirty: !!password || !!phrase, isBusy: pending,
    onClose: () => navigate('/cuenta'),
    onNavigationDiscard: () => { setPassword(''); setPhrase(''); },
    copy: {
      title: 'Salir de la confirmación',
      message: pending
        ? 'La operación está en curso. Esperá la respuesta para conocer el resultado.'
        : 'Se descartarán la contraseña y la frase ingresadas. No se enviará una confirmación.',
      discardLabel: pending ? 'Esperando respuesta' : 'Volver sin confirmar',
    },
  });
  const isCurrentSession = useCallback(() => mounted.current && authStore.getState().token === session, [session]);
  const returnToLogin = useCallback((notice?: 'CLOSED' | 'RESTORED' | 'UNKNOWN') => {
    if (!isCurrentSession()) return;
    releaseUnsavedChangesGuards();
    authStore.getState().logout();
    navigate('/login', { replace: true, flushSync: true, state: {
      ...(notice ? { workshopClosureNotice: notice } : {}), from: { pathname: '/cuenta/cierre' },
    } });
  }, [isCurrentSession, navigate]);

  const refreshStatus = useCallback(async () => {
    if (operation.current || !isCurrentSession()) return;
    readRequest.current?.abort();
    const controller = new AbortController();
    readRequest.current = controller;
    setReading(true); setReadMessage(''); setStatus(null);
    try {
      const current = await getWorkshopClosure(controller.signal);
      if (controller.signal.aborted || !isCurrentSession()) return;
      setStatus(current);
    } catch (error) {
      if (controller.signal.aborted || !isCurrentSession()) return;
      if (error instanceof WorkshopClosureError && error.status === 401) returnToLogin();
      else { startRetryAfter(error); setReadMessage(failureMessage(error)); }
    } finally {
      if (!controller.signal.aborted && isCurrentSession()) {
        if (readRequest.current === controller) readRequest.current = null;
        setReading(false);
      }
    }
  }, [isCurrentSession, returnToLogin, startRetryAfter]);

  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    void refreshStatus();
    return () => { mounted.current = false; readRequest.current?.abort(); };
  }, [refreshStatus]);
  useEffect(() => { if (message || readMessage) errorRegion.current?.focus(); }, [message, readMessage]);

  const restricted = status?.estado === 'RESTRINGIDO';
  const allowed = status && (restricted ? status.puedeRestaurar : status.puedeSolicitar);
  const expectedPhrase = restricted ? 'RESTAURAR MI TALLER' : 'CERRAR MI TALLER';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (operation.current || reading || retry.isCoolingDown || guard.isSuspended || !status || !allowed) return;
    if (!password.trim() || password.length > 100 || phrase !== expectedPhrase) {
      setMessage(`Ingresá tu contraseña actual y escribí ${expectedPhrase} exactamente.`);
      return;
    }
    operation.current = true;
    setPending(true); setMessage('');
    let enteredPassword = password;
    let proof = '';
    let commandSent = false;
    let refreshAfter = false;
    const previous = status;
    setPassword(''); setPhrase('');
    try {
      // Capability and current reference come from a fresh server read, never the browser clock.
      const controller = new AbortController();
      readRequest.current = controller;
      const current = await getWorkshopClosure(controller.signal);
      if (!isCurrentSession() || controller.signal.aborted) return;
      setStatus(current);
      const canContinue = current.estado === previous.estado
        && current.referencia === previous.referencia
        && (current.estado === 'RESTRINGIDO' ? current.puedeRestaurar : current.puedeSolicitar);
      if (!canContinue) {
        setMessage('El estado del taller cambió. Revisá la información actualizada antes de confirmar.');
        return;
      }
      const operationId = crypto.randomUUID();
      const identity = current.estado === 'ABIERTO'
        ? { proposito: 'CERRAR' as const, operacionId: operationId, cierreReferencia: operationId }
        : { proposito: 'RESTAURAR' as const, operacionId: operationId, cierreReferencia: current.referencia! };
      const input = { ...identity, passwordActual: enteredPassword };
      enteredPassword = '';
      try { proof = await reauthenticateWorkshopClosure(input); }
      finally { input.passwordActual = ''; }
      if (!isCurrentSession()) return;
      commandSent = true;
      const receipt = await submitWorkshopClosure({ ...identity, confirmacion: expectedPhrase }, proof);
      proof = '';
      if (isCurrentSession()) returnToLogin(receipt.proposito === 'CERRAR' ? 'CLOSED' : 'RESTORED');
    } catch (error) {
      if (!isCurrentSession()) return;
      const failure = error instanceof WorkshopClosureError ? error : null;
      if (commandSent && (failure?.status == null || failure.status === 401 || failure.status >= 500)) {
        returnToLogin('UNKNOWN');
        return;
      }
      if (failure?.status === 401) { returnToLogin(); return; }
      startRetryAfter(error);
      setMessage(failureMessage(error));
      refreshAfter = failure?.status === 409 || failure?.status === 423;
    } finally {
      enteredPassword = ''; proof = '';
      operation.current = false;
      if (isCurrentSession()) {
        setPassword(''); setPhrase(''); setPending(false);
        if (refreshAfter) void refreshStatus();
      }
    }
  };

  return <DashboardLayout accountMode title="Cierre del taller">
    <div className="mx-auto max-w-2xl space-y-4 [overflow-wrap:anywhere]">
      <div>
        <h1 ref={heading} tabIndex={-1} className="text-[22px] font-extrabold tracking-tight outline-none">Cierre del taller</h1>
        <p className="mt-2 text-sm leading-6 text-text-2">Gestioná el acceso a {status?.tallerNombre ?? taller.nombre} y consultá las confirmaciones de cierre y restauración.</p>
      </div>
      {reading && <div role="status" className={`${card} p-4 text-sm text-text-2 sm:p-5`}>Consultando el estado del taller…</div>}
      {(readMessage || message) && <div id="closure-error" ref={errorRegion} tabIndex={-1} role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm leading-6 text-danger-fg outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]">
        {readMessage || message}
      </div>}
      {!reading && !status && <button type="button" disabled={retry.isCoolingDown} onClick={() => void refreshStatus()} className={`${btnGhost} min-h-11 sm:min-h-11`}>
        {retry.isCoolingDown ? `Reintentá en ${retry.secondsRemaining} s` : 'Volver a consultar'}
      </button>}
      {status && <>
        <section aria-labelledby="closure-state-title" className={`${card} p-4 sm:p-5`}>
          <h2 id="closure-state-title" className="text-[16px] font-extrabold">{restricted ? 'El taller tiene acceso restringido' : 'El taller está abierto'}</h2>
          {restricted ? <>
            <p className="mt-2 text-sm leading-6 text-text-2">El trabajo del taller está suspendido. El titular puede consultar Cuenta y los respaldos que sigan disponibles durante el plazo de recuperación.</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="font-bold text-text-2">Cierre confirmado</dt><dd className="mt-1">{dateTime(status.confirmadoEn!)}</dd></div>
              <div><dt className="font-bold text-text-2">Restauración disponible hasta</dt><dd className="mt-1 font-bold">{dateTime(status.reversibleHasta!)}</dd></div>
              <div><dt className="font-bold text-text-2">Referencia de cierre</dt><dd className="mt-1 break-all font-mono text-[12px]">{status.referencia}</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-text-2">Restaurar vuelve a habilitar el acceso y requiere que cada usuario inicie sesión otra vez. No renueva automáticamente tu suscripción ni amplía el plazo del cierre.</p>
          </> : <div className="mt-3 space-y-3 text-sm leading-6 text-text-2">
            <p>Al confirmar, se restringirá el acceso al taller y se cerrarán las sesiones del titular y de los empleados.</p>
            <p>Durante los 7 días posteriores a la confirmación, el titular podrá volver a ingresar a Cuenta para restaurar el acceso. La fecha exacta quedará registrada.</p>
            <p>No se podrán crear nuevos respaldos. Si ya hay un ZIP listo y válido, podrá descargarse mientras siga disponible; el cierre no extiende su vencimiento.</p>
          </div>}
          <p className="mt-4 text-sm leading-6 text-text-2">El cierre no confirma el envío de correos ni la cancelación de la renovación de OrdenFix. Tampoco elimina de inmediato tus datos, reparaciones o evidencia.</p>
          <p className="mt-4 text-xs text-text-3">Estado consultado el {dateTime(status.observadoEn)}.</p>
        </section>
        <section aria-labelledby="closure-export-title" className={`${card} p-4 sm:p-5`}>
          <h2 id="closure-export-title" className="text-[16px] font-extrabold">Tu copia de los datos</h2>
          <p className="mt-2 text-sm leading-6 text-text-2">{restricted
            ? 'Consultá si conservás un respaldo ZIP listo para descargar. Su fecha de vencimiento sigue siendo la original.'
            : 'Si querés conservar una copia, prepará y descargá tu respaldo antes de cerrar. Exportar es opcional.'}</p>
          <Link to="/cuenta/exportacion" className={`${btnGhost} mt-3 min-h-11 sm:min-h-11`}>Consultar respaldos</Link>
        </section>
        {allowed ? <form onSubmit={(event) => void submit(event)} className={`${card} space-y-4 p-4 sm:p-5`} aria-labelledby="closure-confirm-title" noValidate>
          <h2 id="closure-confirm-title" className="text-[16px] font-extrabold">{restricted ? 'Restaurar el acceso al taller' : 'Confirmar el cierre del taller'}</h2>
          <p className="text-sm leading-6 text-text-2">Para continuar, ingresá tu contraseña actual y la frase de confirmación. Después tendrás que iniciar sesión nuevamente para consultar el resultado.</p>
          <div>
            <label htmlFor="closure-password" className="mb-2 block text-sm font-bold">Contraseña actual</label>
            <PasswordInput id="closure-password" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={100}
              autoComplete="current-password" disabled={pending || guard.isSuspended} aria-describedby={message ? 'closure-error' : undefined} />
          </div>
          <div>
            <label htmlFor="closure-phrase" className="mb-2 block text-sm font-bold">Escribí {expectedPhrase}</label>
            <input id="closure-phrase" type="text" value={phrase} onChange={(event) => setPhrase(event.target.value)}
              autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={40} disabled={pending || guard.isSuspended}
              className={inputClass()} aria-describedby="closure-phrase-help" />
            <p id="closure-phrase-help" className="mt-2 text-xs text-text-2">Escribí la frase tal como aparece, en mayúsculas.</p>
          </div>
          {pending && <p role="status" className="text-sm leading-6 text-text-2">Confirmando la operación. Esperá la respuesta para conocer el resultado.</p>}
          <button type="submit" className={`${restricted ? btnPrimary : btnDanger} min-h-11 w-full sm:min-h-11 sm:w-auto`}
            disabled={pending || reading || guard.isSuspended || retry.isCoolingDown || !password.trim() || password.length > 100 || phrase !== expectedPhrase}>
            {pending ? 'Confirmando…' : retry.isCoolingDown ? `Reintentá en ${retry.secondsRemaining} s` : restricted ? 'Confirmar restauración' : 'Confirmar cierre del taller'}
          </button>
        </form> : <section className={`${card} space-y-3 p-4 text-sm leading-6 sm:p-5`} aria-label="Acciones disponibles">
          <p className="text-text-2">{restricted
            ? 'El servidor no permite restaurar el taller en este momento. Consultá el estado actualizado; no se amplía el plazo de recuperación.'
            : 'El servidor no permite solicitar el cierre con el acceso actual. Revisá tu cuenta y la verificación de tu email.'}</p>
          <button type="button" onClick={() => void refreshStatus()} disabled={pending || retry.isCoolingDown} className={`${btnGhost} min-h-11 sm:min-h-11`}>Actualizar estado</button>
        </section>}
        <section aria-labelledby="closure-history-title" className={`${card} p-4 sm:p-5`}>
          <h2 id="closure-history-title" className="text-[16px] font-extrabold">Última confirmación registrada</h2>
          {status.ultimaOperacion ? <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="font-bold text-text-2">Operación</dt><dd className="mt-1">{status.ultimaOperacion.proposito === 'CERRAR' ? 'Cierre del taller' : 'Restauración del acceso'}</dd></div>
            <div><dt className="font-bold text-text-2">Registrada</dt><dd className="mt-1">{dateTime(status.ultimaOperacion.registradaEn)}</dd></div>
            <div><dt className="font-bold text-text-2">Identificador de la operación</dt><dd className="mt-1 break-all font-mono text-[12px]">{status.ultimaOperacion.operacionId}</dd></div>
            <div><dt className="font-bold text-text-2">Referencia asociada</dt><dd className="mt-1 break-all font-mono text-[12px]">{status.ultimaOperacion.referencia}</dd></div>
          </dl> : <p className="mt-2 text-sm leading-6 text-text-2">Todavía no hay confirmaciones de cierre o restauración registradas.</p>}
          <p className="mt-3 text-xs leading-5 text-text-3">Esta constancia corresponde al acceso al taller. No acredita borrado de datos, envío de avisos o cancelación de una suscripción.</p>
        </section>
      </>}
      <button type="button" onClick={(event) => guard.requestClose(event)} disabled={pending} className={`${btnGhost} min-h-11 sm:min-h-11`}>Volver a Cuenta</button>
    </div>
    <DiscardChangesDialog {...guard.dialog} />
  </DashboardLayout>;
};

export const AccountClosurePage = () => {
  const { usuario } = useAccountProfile();
  if (usuario.role !== 'ADMIN') return <Navigate to="/cuenta" replace />;
  return workshopClosureEnabled ? <AdminWorkshopClosure /> : <ClosureUnavailable />;
};
export default AccountClosurePage;
