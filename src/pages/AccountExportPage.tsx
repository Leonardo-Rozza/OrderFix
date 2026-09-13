import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { AccountExportError, downloadAccountExport, getAccountExportStatus, getCurrentAccountExport,
  reauthenticateExport, requestAccountExport, saveExportDownload,
  type AccountExportStatus, type CurrentAccountExport } from '../api/accountExport';
import { ExportReauthForm } from '../components/ExportReauthForm';
import { btnGhost, btnPrimary, card } from '../components/ui';
import { useRetryAfter } from '../hooks/useRetryAfter';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAccountProfile } from '../router/accountProfile';
import { authStore } from '../store/auth.store';

type Action = 'request' | 'zip' | 'excel';
const statusCopy: Record<AccountExportStatus['estado'], { title: string; detail: string }> = {
  QUEUED: { title: 'Solicitud recibida', detail: 'Tu respaldo está en espera. Podés volver a esta pantalla para consultar el avance.' },
  RUNNING: { title: 'Preparando tu respaldo', detail: 'Estamos reuniendo los datos y archivos disponibles. El estado se actualiza mientras esta pantalla está visible.' },
  READY: { title: 'Tu respaldo está listo', detail: 'Descargalo antes del vencimiento. Para protegerlo, te pediremos tu contraseña actual.' },
  FAILED: { title: 'No se pudo preparar el respaldo', detail: 'Podés solicitar otro archivo. Los datos de tu taller se conservan.' },
  EXPIRED: { title: 'El respaldo venció', detail: 'Solicitá uno nuevo para obtener una copia actualizada de tus datos.' },
  REVOKED: { title: 'Este respaldo ya no está disponible', detail: 'Si tu acceso sigue habilitado, podés solicitar una copia nueva.' },
};
const confirmation: Record<Action, { title: string; confirmLabel: string }> = {
  request: { title: 'Solicitar respaldo ZIP', confirmLabel: 'Confirmar solicitud' },
  zip: { title: 'Descargar respaldo ZIP', confirmLabel: 'Confirmar descarga' },
  excel: { title: 'Descargar reporte Excel', confirmLabel: 'Confirmar descarga' },
};
const errorMessage = (error: unknown) => {
  const failure = error instanceof AccountExportError ? error : null;
  if (failure?.code === 'PASSWORD_ACTUAL_INVALIDA') return 'La contraseña actual no es correcta. Volvé a ingresarla.';
  if (failure?.code === 'REAUTENTICACION_INVALIDA') return 'La confirmación ya no es válida. Volvé a ingresar tu contraseña.';
  if (failure?.status === 403) return 'La exportación requiere ser titular del taller, tener el email verificado y una sesión vigente. Revisá tu cuenta e intentá de nuevo.';
  if (failure?.status === 401) return 'Tu sesión venció. Volvé a ingresar.';
  if (failure?.status === 429) return 'Por ahora no podemos iniciar otra operación. Esperá el tiempo indicado antes de continuar.';
  if (failure?.status === 404 || failure?.status === 409) return 'El archivo ya no está disponible para descargar. Consultá su estado antes de continuar.';
  if (failure?.status === 503) return 'La exportación no está disponible en este momento. Podés volver a intentarlo más tarde.';
  return 'No pudimos completar la operación. Revisá tu conexión y volvé a intentar.';
};
const dateTime = (value: string) => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

const AdminExportPage = () => {
  const { taller, accesoTaller } = useAccountProfile();
  const restricted = accesoTaller === 'RESTRICTED';
  const [session] = useState(() => authStore.getState().token);
  const [current, setCurrent] = useState<CurrentAccountExport | null>(null);
  const [reading, setReading] = useState(true);
  const [readMessage, setReadMessage] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  const readRequest = useRef<AbortController | null>(null);
  const operation = useRef<AbortController | null>(null);
  // Idempotencia de un resultado incierto, sólo en RAM y sin incluir pruebas o contraseñas.
  const requestKey = useRef<string | null>(null);
  const retry = useRetryAfter();
  const startRetryAfter = retry.startRetryAfter;
  const alive = useCallback((controller: AbortController) => !controller.signal.aborted
    && authStore.getState().token === session, [session]);

  const refresh = useCallback(async (id?: string) => {
    if (readRequest.current || operation.current) return;
    const controller = new AbortController();
    readRequest.current = controller;
    setReading(true);
    try {
      if (id) {
        const status = await getAccountExportStatus(id, controller.signal);
        if (!alive(controller)) return;
        setCurrent((previous) => previous ? { ...previous, exportacion: status } : previous);
        if (!['QUEUED', 'RUNNING'].includes(status.estado)) setNotice('');
      } else {
        const result = await getCurrentAccountExport(controller.signal);
        if (!alive(controller)) return;
        setCurrent(result);
        if (result.exportacion && !['QUEUED', 'RUNNING'].includes(result.exportacion.estado)) setNotice('');
        setUncertain(false);
        // /actual puede devolver un trabajo anterior: sólo el POST con la misma
        // clave puede resolver inequívocamente una solicitud que perdió su respuesta.
      }
      setNow(Date.now());
      setReadMessage('');
      setForbidden(false);
    } catch (error) {
      if (!alive(controller)) return;
      startRetryAfter(error);
      setForbidden(error instanceof AccountExportError && error.status === 403);
      setReadMessage(errorMessage(error));
    } finally {
      if (readRequest.current === controller) readRequest.current = null;
      if (alive(controller)) setReading(false);
    }
  }, [alive, startRetryAfter]);

  useEffect(() => {
    void refresh();
    const visibilityChanged = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', visibilityChanged);
    const unsubscribe = authStore.subscribe((state) => {
      if (state.token !== session) {
        readRequest.current?.abort(); operation.current?.abort(); requestKey.current = null;
      }
    });
    return () => {
      readRequest.current?.abort(); readRequest.current = null;
      operation.current?.abort(); operation.current = null; requestKey.current = null;
      document.removeEventListener('visibilitychange', visibilityChanged);
      unsubscribe();
    };
  }, [refresh, session]);

  const status = current?.exportacion;
  const state = status && Date.parse(status.expiresAt) <= now
    && ['QUEUED', 'RUNNING', 'READY'].includes(status.estado) ? 'EXPIRED' : status?.estado;
  const waiting = !restricted && (state === 'QUEUED' || state === 'RUNNING');
  useEffect(() => {
    if (!status || !waiting || !visible || busy || readMessage || retry.isCoolingDown) return;
    const timer = window.setInterval(() => void refresh(status.id), 15_000);
    return () => window.clearInterval(timer);
  }, [status, waiting, visible, busy, readMessage, retry.isCoolingDown, refresh]);
  useEffect(() => {
    if (!status || !['QUEUED', 'RUNNING', 'READY'].includes(status.estado)) return;
    const delay = Date.parse(status.expiresAt) - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(delay + 1, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [status]);

  const openConfirmation = (next: Action) => {
    if (operation.current || retry.isCoolingDown || forbidden || (restricted && next !== 'zip')) return;
    setMessage(''); setNotice(''); setAction(next);
  };
  const confirm = async (password: string) => {
    if (!action || operation.current || retry.isCoolingDown || forbidden || (restricted && action !== 'zip')) return;
    const selected = action;
    if (selected === 'zip' && (!status || status.estado !== 'READY' || Date.parse(status.expiresAt) <= Date.now())) {
      setMessage('El respaldo venció. Cerrá esta confirmación y consultá su estado.'); return;
    }
    const controller = new AbortController();
    operation.current = controller;
    readRequest.current?.abort(); readRequest.current = null; setReading(false);
    setBusy(true); setMessage(''); setNotice('');
    let submitted = false;
    let proof = '';
    try {
      const grant = reauthenticateExport(password, selected === 'request' ? 'EXPORTAR' : 'DESCARGAR_EXPORTACION', controller.signal);
      password = '';
      proof = await grant;
      if (!alive(controller)) return;
      if (selected === 'request') {
        requestKey.current ??= crypto.randomUUID();
        submitted = true;
        const pending = requestAccountExport(requestKey.current, proof, controller.signal);
        proof = '';
        const result = await pending;
        if (!alive(controller)) return;
        setCurrent({ habilitada: true, exportacion: result }); setNow(Date.now());
        requestKey.current = null; setUncertain(false); setReadMessage('');
        setNotice(result.reused && ['FAILED', 'EXPIRED', 'REVOKED'].includes(result.estado)
          ? 'La solicitud anterior ya terminó. Podés solicitar un respaldo nuevo.'
          : 'Solicitud recibida. Podés consultar el avance en esta pantalla.');
      } else {
        const pending = downloadAccountExport(selected === 'zip' ? status!.id : null, proof, controller.signal);
        proof = '';
        const download = await pending;
        if (!alive(controller)) return;
        saveExportDownload(download);
        setNotice('Archivo listo. Revisá las descargas de tu navegador.');
      }
      setAction(null);
    } catch (error) {
      if (!alive(controller)) return;
      retry.startRetryAfter(error);
      if (submitted && (!(error instanceof AccountExportError) || error.status == null || error.status >= 500)) {
        setUncertain(true); setAction(null);
        setReadMessage('No pudimos confirmar la solicitud. Consultá el estado antes de volver a solicitar un archivo.');
      } else setMessage(errorMessage(error));
    } finally {
      proof = ''; password = '';
      if (operation.current === controller) operation.current = null;
      if (alive(controller)) setBusy(false);
    }
  };

  const blocked = busy || retry.isCoolingDown || forbidden;
  const canRequest = !restricted && current?.habilitada && !uncertain && !readMessage && !reading
    && (!state || ['FAILED', 'EXPIRED', 'REVOKED'].includes(state));
  const canDownload = current?.habilitada && state === 'READY' && !readMessage;
  const copy = state ? restricted && state !== 'READY'
    ? { title: statusCopy[state].title, detail: 'Durante el cierre sólo podés descargar un respaldo que ya estuviera listo y siga vigente. No se preparan archivos nuevos.' }
    : statusCopy[state] : null;
  return <DashboardLayout accountMode title="Exportar datos">
    <div className="ofx-in mx-auto max-w-[900px] space-y-4">
      <div>
        <Link to="/cuenta" className="inline-flex min-h-11 items-center rounded-md text-sm font-bold text-primary underline focus-visible:outline focus-visible:outline-primary">← Volver a Cuenta</Link>
        <h1 className="text-[22px] font-extrabold tracking-tight">Exportar datos</h1>
        <p className="mt-2 text-sm leading-6 text-text-2 [overflow-wrap:anywhere]">{restricted
          ? `Consultá el respaldo previo de ${taller.nombre}. Cada descarga requiere tu contraseña actual.`
          : `Guardá una copia de los datos de ${taller.nombre}. Cada solicitud y descarga requiere tu contraseña actual.`}</p>
      </div>

      {restricted && <p role="status" className="rounded-xl border border-border bg-surface-2 p-4 text-sm leading-6 text-text-2">
        El taller tiene acceso restringido. Podés descargar un respaldo previo que siga disponible; el cierre no amplía su vencimiento. No se pueden solicitar nuevos respaldos ni reportes Excel.
      </p>}

      <section aria-labelledby="export-zip-title" className={`${card} space-y-4 p-4 sm:p-5`}>
        <div>
          <span className="text-[12px] font-bold uppercase tracking-wide text-text-3">Respaldo del taller · ZIP</span>
          <h2 id="export-zip-title" className="mt-1 text-[18px] font-extrabold">Exportación integral</h2>
          <p className="mt-2 text-sm leading-6 text-text-2">Datos del taller, tus constancias legales y los archivos disponibles y autorizados, en un único respaldo.</p>
        </div>
        <details className="group rounded-xl border border-border bg-surface-2 px-3 py-2">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline focus-visible:outline-primary">
            Contenido y exclusiones
            <svg aria-hidden="true" viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}
              className="shrink-0 transition group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <div className="space-y-2 pb-2 text-sm leading-6 text-text-2">
            <p>Incluye información del taller, empleados, clientes, equipos, reparaciones, inventario, presupuestos, cobros manuales y suscripción. Los datos se entregan en JSON, con tus documentos legales, QR y fotos privadas cuando corresponde.</p>
            <p>No incluye contraseñas, PIN o patrones, tokens, códigos o enlaces de seguimiento ni aceptaciones personales de empleados. Las fotos vencidas, eliminadas o de origen no acreditado conservan su referencia, sin el archivo de imagen.</p>
            <p>El índice del ZIP detalla su contenido y las exclusiones.</p>
          </div>
        </details>

        <div className="rounded-xl border border-border bg-surface-2 p-4" aria-busy={reading}>
          {copy ? <>
            <p className={`text-[15px] font-extrabold ${state === 'READY' ? 'text-success' : 'text-text'}`}>{copy.title}</p>
            <p className="mt-1 text-sm leading-6 text-text-2">{copy.detail}</p>
            {status && <p className="mt-2 text-[12.5px] text-text-3">Vencimiento: {dateTime(status.expiresAt)} · hora local</p>}
          </> : reading && !current ? <p role="status" className="text-sm text-text-2">Consultando exportaciones…</p>
            : current && <p className="text-sm text-text-2">Todavía no hay un respaldo para esta cuenta.</p>}
          {current?.habilitada === false && <p className="mt-2 text-sm leading-6 text-text-2">{restricted
            ? 'La descarga de respaldos no está disponible en este momento.'
            : 'La preparación de respaldos ZIP todavía no está habilitada. El reporte Excel se gestiona por separado más abajo.'}</p>}
          {readMessage && <p role="alert" className="mt-2 text-sm leading-6 text-danger-fg">{readMessage}</p>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {canRequest && <button type="button" className={btnPrimary} disabled={blocked} onClick={() => openConfirmation('request')}>
              {state ? 'Solicitar nuevo respaldo ZIP' : 'Solicitar respaldo ZIP'}
            </button>}
            {canDownload && <button type="button" className={btnPrimary} disabled={blocked || reading} onClick={() => openConfirmation('zip')}>Descargar respaldo ZIP</button>}
            <button type="button" className={btnGhost} disabled={busy || reading || retry.isCoolingDown} onClick={() => void refresh()}>
              {reading ? 'Consultando…' : retry.isCoolingDown ? `Reintentá en ${retry.secondsRemaining} s` : 'Consultar estado'}
            </button>
          </div>
        </div>
      </section>

      {!restricted && <section id="excel" aria-labelledby="export-excel-title" className={`${card} space-y-3 p-4 sm:p-5 scroll-mt-20`}>
        <div>
          <span className="text-[12px] font-bold uppercase tracking-wide text-text-3">Reporte operativo · Excel</span>
          <h2 id="export-excel-title" className="mt-1 text-[18px] font-extrabold">Un resumen para trabajar</h2>
          <p className="mt-2 text-sm leading-6 text-text-2">Clientes, órdenes, cobros manuales y presupuestos en un archivo con filtros y formato de lectura. Este reporte no reemplaza al respaldo integral.</p>
        </div>
        <button type="button" className={btnGhost} disabled={blocked} onClick={() => openConfirmation('excel')}>Descargar reporte Excel</button>
      </section>}
      <p className="text-[12.5px] leading-6 text-text-3">Los cobros reflejan lo registrado por el taller. OrdenFix no procesa pagos de tus clientes ni emite comprobantes fiscales.</p>
      {notice && <p role="status" className="rounded-xl border border-success/30 bg-success-soft p-4 text-sm font-semibold text-success">{notice}</p>}
    </div>
    {action && <ExportReauthForm key={action} {...confirmation[action]} pending={busy} message={message}
      retrySeconds={retry.secondsRemaining} onClose={() => { if (!operation.current) { setAction(null); setMessage(''); } }}
      onConfirm={(password) => { void confirm(password); }} />}
  </DashboardLayout>;
};

/** No monta estado, formularios ni requests de exportación para un empleado. */
export const AccountExportPage = () => {
  const profile = useAccountProfile();
  return profile.usuario.role === 'ADMIN' ? <AdminExportPage /> : <Navigate to="/cuenta" replace />;
};
