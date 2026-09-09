import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPhotoRequirements, photoErrorCode, photoRetryAfterSeconds, PhotoIntentTerminalError, preparePhotoAttempt, uploadPhotoAttempt,
  type PhotoAttempt, type PhotoRequirements, type SelectedPhoto,
} from '../api/repairPhotos';
import { authStore } from '../store/auth.store';
import { btnGhost, btnPrimary } from './ui';

interface Props {
  repairId: number;
  photos: SelectedPhoto[];
  onComplete: () => void;
  onBusyChange: (busy: boolean) => void;
}

export const PhotoUploadPanel = ({ repairId, photos, onComplete, onBusyChange }: Props) => {
  const token = authStore((state) => state.token);
  const [snapshot, setSnapshot] = useState<PhotoRequirements | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [contextConfirmed, setContextConfirmed] = useState(false);
  const [confirmationLocked, setConfirmationLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(0);
  const [retryAt, setRetryAt] = useState(0);
  const attempts = useRef(new Map<number, PhotoAttempt>());
  const controller = useRef<AbortController | null>(null);
  const active = useRef(false);
  const lock = useRef(false);
  const attempted = attempts.current.size > 0;

  const load = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setSnapshot(null);
    setConfirmationLocked(false);
    setConfirmed(new Set());
    setContextConfirmed(false);
    setError(null);
    try {
      const value = await getPhotoRequirements(repairId, request.signal);
      if (!request.signal.aborted) setSnapshot(value);
    } catch {
      if (!request.signal.aborted) setError('La carga de fotos privadas no está disponible. No se enviaron archivos nuevos; la orden se conserva.');
    }
  }, [repairId]);

  useEffect(() => {
    active.current = true;
    const currentAttempts = attempts.current;
    currentAttempts.clear();
    void load();
    return () => {
      active.current = false;
      controller.current?.abort();
      currentAttempts.clear();
    };
  }, [load, token]);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  const send = async () => {
    if (lock.current || !snapshot || !contextConfirmed || retryAt
      || snapshot.requisitos.some((item) => item.requerido && !confirmed.has(item.id))) return;
    lock.current = true;
    setBusy(true);
    setConfirmationLocked(true);
    setError(null);
    const request = new AbortController();
    controller.current = request;
    let currentIndex = -1;
    try {
      for (let index = 0; index < photos.length; index++) {
        currentIndex = index;
        let attempt = attempts.current.get(index);
        if (!attempt) {
          attempt = await preparePhotoAttempt(photos[index], snapshot, confirmed);
          request.signal.throwIfAborted();
          attempts.current.set(index, attempt);
        }
        await uploadPhotoAttempt(repairId, attempt, request.signal);
        request.signal.throwIfAborted();
        if (active.current) setCompleted(index + 1);
      }
      if (active.current) onComplete();
    } catch (failure) {
      if (request.signal.aborted || !active.current) return;
      const code = photoErrorCode(failure);
      if (failure instanceof PhotoIntentTerminalError || code === 'INTENCION_FOTO_EXPIRADA') {
        attempts.current.delete(currentIndex);
        await load();
        setError('La intención anterior terminó. La orden y las fotos guardadas se conservan. Revisá y confirmá nuevamente para crear un intento nuevo sólo para las fotos pendientes.');
      } else if (code === 'REQUISITOS_LEGALES_DESACTUALIZADOS' || code === 'ATESTACION_REQUERIDA') {
        // Sólo descartar solicitudes que el servidor rechazó antes de crear una intención.
        for (const [index, attempt] of attempts.current) if (!attempt.intent) attempts.current.delete(index);
        await load();
        setError('Las condiciones cambiaron. Revisá los documentos y confirmá nuevamente para esta orden.');
      } else if (code === 'OPERACION_EN_PROGRESO') {
        setRetryAt(Date.now() + Math.max(1, photoRetryAfterSeconds(failure)) * 1000);
        setError('La operación sigue en curso. Esperá un momento y reintentá las fotos con el mismo intento.');
      } else if (code === 'FOTO_LIMITE_ALCANZADO') {
        setError('Esta orden alcanzó el límite de fotos. Cerrá esta selección y eliminá una foto que ya no necesites antes de volver a cargar. La orden se conserva.');
      } else if (code === 'FOTO_INVALIDA') {
        setError('No pudimos validar la imagen. La orden se conserva; cerrá y elegí otra foto JPEG o PNG, de hasta 8 MB, 25 megapíxeles y 12.000 píxeles por lado.');
      } else if (code === 'IDEMPOTENCY_KEY_REUTILIZADA') {
        setError('No se pudo reutilizar este intento. La orden se conserva; cerrá y seleccioná las fotos nuevamente.');
      } else {
        setError('No se completó la carga de fotos. La orden se conserva. Reintentar continúa sobre la misma orden y las fotos ya guardadas no se duplican.');
      }
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  };

  return (
    <section aria-label="Confirmar fotos privadas" className="min-w-0 space-y-4">
      <p className="font-semibold">La orden ya está guardada. Falta confirmar y cargar las fotos.</p>
      <p className="text-sm text-text-2">{completed} de {photos.length} fotos guardadas. Esta autorización corresponde únicamente a esta reparación.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!snapshot ? (
        <button type="button" className={btnGhost} disabled={busy} onClick={() => void load()}>Reintentar requisitos de fotos</button>
      ) : <>
        {snapshot.requisitos.map((requirement) => (
          <div key={requirement.id} className="min-w-0 space-y-2 rounded-lg border border-border p-3">
            {requirement.documentos.map((document) => (
              <details key={document.id} className="min-w-0">
                <summary className="cursor-pointer break-words font-semibold">{document.titulo} · {document.version}</summary>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-text-2">{document.contenidoMarkdown}</div>
              </details>
            ))}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={confirmed.has(requirement.id)} disabled={busy || confirmationLocked}
                onChange={(event) => setConfirmed((previous) => {
                  const next = new Set(previous);
                  if (event.target.checked) next.add(requirement.id); else next.delete(requirement.id);
                  return next;
                })} />
              <span>{requirement.afirmacion}{requirement.requerido ? ' (obligatorio)' : ' (opcional)'}</span>
            </label>
          </div>
        ))}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={contextConfirmed} disabled={busy || confirmationLocked}
            onChange={(event) => setContextConfirmed(event.target.checked)} />
          <span>Confirmo que cuento con autorización para adjuntar estas fotos del cliente a esta reparación y que evité información ajena a su reparación.</span>
        </label>
        <button type="button" className={btnPrimary} onClick={() => void send()}
          disabled={busy || Boolean(retryAt) || !contextConfirmed || snapshot.requisitos.some((item) => item.requerido && !confirmed.has(item.id))}>
          {busy ? 'Guardando fotos…' : attempted ? 'Reintentar fotos' : 'Confirmar y guardar fotos'}
        </button>
      </>}
    </section>
  );
};
