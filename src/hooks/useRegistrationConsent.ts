import { useCallback, useEffect, useRef, useState } from 'react';
import type { RegisterRequest } from '../types';
import { createRegistrationAttempt, getRegistrationRequirements, registrationErrorResponse, registrationRetryError } from '../api/registrationConsent';
import type { RegistrationAttempt, RegistrationRequirements } from '../api/registrationConsent';
import { useRetryAfter } from './useRetryAfter';

export const useRegistrationConsent = (enabled: boolean) => {
  const [snapshot, setSnapshot] = useState<RegistrationRequirements | null>(null);
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(enabled);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const attempt = useRef<RegistrationAttempt | null>(null);
  const request = useRef<AbortController | null>(null);
  const retry = useRetryAfter();
  const { startRetryAfter } = retry;

  const reload = useCallback(async () => {
    if (!enabled) return;
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    attempt.current = null;
    setConfirmed(new Set());
    setSnapshot(null);
    setLoading(true);
    setLoadError(false);
    try {
      const next = await getRegistrationRequirements(current.signal);
      if (!current.signal.aborted) setSnapshot(next);
    } catch (error) {
      if (!current.signal.aborted) {
        setLoadError(true);
        startRetryAfter(registrationRetryError(error));
      }
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }, [enabled, startRetryAfter]);

  useEffect(() => {
    void reload();
    return () => {
      request.current?.abort();
      attempt.current = null;
    };
  }, [reload]);

  const edited = () => { attempt.current = null; setMessage(null); };
  const confirm = (id: string, value: boolean) => {
    edited();
    setConfirmed((previous) => {
      const next = new Set(previous);
      if (value) next.add(id); else next.delete(id);
      return next;
    });
  };
  const ready = snapshot !== null && !loading && !loadError
    && snapshot.requisitos.every((requirement) => !requirement.requerido || confirmed.has(requirement.id));

  const submission = (registration: RegisterRequest): RegistrationAttempt => {
    if (!ready || snapshot === null || retry.isCoolingDown) throw new Error('Las condiciones no están confirmadas.');
    // La referencia vive sólo en esta pantalla: se conserva incluso si el commit perdió su respuesta.
    attempt.current ??= createRegistrationAttempt(registration, snapshot, confirmed);
    return attempt.current;
  };

  const failed = async (error: unknown) => {
    startRetryAfter(registrationRetryError(error));
    const response = registrationErrorResponse(error);
    const code = response?.data?.code;
    if ((response?.status === 409 && code === 'DOCUMENTOS_LEGALES_DESACTUALIZADOS')
      || (response?.status === 428 && code === 'ACEPTACION_LEGAL_REQUERIDA')) {
      setMessage('Las condiciones cambiaron. Conservamos tus datos; revisá los documentos y confirmá nuevamente.');
      await reload();
    } else if (response?.status === 409 && code === 'IDEMPOTENCY_KEY_REUTILIZADA') {
      setMessage('Este intento corresponde a otros datos. Revisá las condiciones para iniciar uno nuevo.');
      await reload();
    } else if (response?.status === 409 && code === 'IDEMPOTENCY_EN_PROGRESO') {
      setMessage('El registro sigue en curso. Esperá y reintentá; conservaremos el mismo intento.');
    } else if (response?.status === 401) {
      setMessage('No pudimos iniciar sesión con esos datos. Revisá tu contraseña o ingresá con tu cuenta.');
    } else if (response?.status === 400) {
      setMessage('No pudimos validar el registro. Revisá los datos y las condiciones antes de volver a intentar.');
      // Un rechazo definitivo permite una revisión explícita; no cambia la clave en silencio.
    } else if (response?.status === 429) {
      setMessage('Demasiados intentos. Esperá el tiempo indicado antes de reintentar.');
    } else {
      setMessage('No pudimos confirmar el resultado del registro. Reintentá sin cambiar los datos para recuperar el mismo intento.');
    }
  };

  return { snapshot, confirmed, loading, loadError, message, ready, retry, reload, confirm, edited, submission, failed };
};
