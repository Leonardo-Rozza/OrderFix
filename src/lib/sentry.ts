import * as Sentry from '@sentry/react';
import { authStore } from '../store/auth.store';

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
      return event;
    },
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
    Sentry.captureException(error);
  }
};
