import * as Sentry from '@sentry/react';
import { authStore } from '../store/auth.store';

const SENTRY_REDACTED = '[Filtered]';
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'setcookie',
  'pindesbloqueo',
  'patrondesbloqueo',
]);
const SENSITIVE_TEXT_VALUE = /((?:"|')?(?:pinDesbloqueo|patronDesbloqueo|authorization|set-cookie|cookie|[a-z0-9_-]*(?:password|contrase(?:n|ñ)a|token)[a-z0-9_-]*)(?:"|')?\s*(?::|=)\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^,}\]&\s]+)/gi;
const BEARER_TOKEN = /\bBearer\s+[a-z0-9._~+/=-]+/gi;

const normalizeKey = (key: string): string =>
  key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

const isSensitiveKey = (key: string): boolean => {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEYS.has(normalized)
    || normalized.includes('password')
    || normalized.includes('contrasena')
    || normalized === 'token'
    || normalized.endsWith('token');
};

const sanitizeText = (value: string): string =>
  value
    .replace(BEARER_TOKEN, `Bearer ${SENTRY_REDACTED}`)
    .replace(SENSITIVE_TEXT_VALUE, `$1"${SENTRY_REDACTED}"`);

/**
 * Clona y filtra payloads antes de que salgan del navegador. Además de objetos
 * cubre el JSON serializado de Axios (`error.config.data`) y breadcrumbs HTTP.
 */
export const sanitizeSentryPayload = <T>(value: T): T => {
  const seen = new WeakMap<object, unknown>();

  const visit = (current: unknown, key?: string): unknown => {
    if (key && isSensitiveKey(key)) return SENTRY_REDACTED;
    if (typeof current === 'string') return sanitizeText(current);
    if (current === null || typeof current !== 'object') return current;
    if (current instanceof Date) return current;

    const known = seen.get(current);
    if (known) return known;

    if (Array.isArray(current)) {
      const copy: unknown[] = [];
      seen.set(current, copy);
      current.forEach((item) => copy.push(visit(item)));
      return copy;
    }

    const copy: Record<string, unknown> = {};
    seen.set(current, copy);
    Object.entries(current).forEach(([entryKey, entryValue]) => {
      copy[entryKey] = visit(entryValue, entryKey);
    });
    return copy;
  };

  return visit(value) as T;
};

/**
 * Crea una excepción reportable sin adjuntar el AxiosError original. En
 * particular, nunca viajan `config.data`, headers Authorization ni cookies.
 */
export const toSafeSentryError = (error: unknown): Error => {
  const source = error instanceof Error ? error : new Error(String(error));
  const safe = new Error(sanitizeText(source.message));
  safe.name = source.name;
  if (source.stack) safe.stack = sanitizeText(source.stack);
  return safe;
};

/** Devuelve el status HTTP si el error parece una respuesta de axios. */
const httpStatus = (err: unknown): number | undefined =>
  err && typeof err === 'object' && 'response' in err
    ? (err as { response?: { status?: number } }).response?.status
    : undefined;

/**
 * Inicializa Sentry SÓLO si hay DSN configurado (VITE_SENTRY_DSN).
 * Sin DSN es un no-op total, así que en dev y en tests no molesta.
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // Muestreo de performance: 100% en dev, 10% en producción.
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // No reportar errores de negocio esperados (auth/permiso/límite/no encontrado):
      // ya se manejan en la UI (toast, modal, logout).
      const status = httpStatus(hint?.originalException);
      if (typeof status === 'number' && status >= 400 && status < 500) return null;
      return sanitizeSentryPayload(event);
    },
    beforeBreadcrumb: (breadcrumb) => sanitizeSentryPayload(breadcrumb),
    beforeSendTransaction: (event) => sanitizeSentryPayload(event),
  });

  // Asocia el email del usuario logueado a los eventos y lo mantiene sincronizado.
  const applyUser = (email: string | null) => Sentry.setUser(email ? { email } : null);
  applyUser(authStore.getState().email);
  authStore.subscribe((state) => applyUser(state.email));
};

/** Reporta un error a Sentry (no-op si no está inicializado). */
export const captureError = (error: unknown) => {
  const status = httpStatus(error);
  // Sólo errores de red/servidor (5xx o sin respuesta); los 4xx son esperados.
  if (status === undefined || status >= 500) {
    Sentry.captureException(toSafeSentryError(error));
  }
};
