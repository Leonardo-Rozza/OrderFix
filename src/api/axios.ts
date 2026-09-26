import type { ChargeSession } from '../utils/pendingCharge';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { authStore, isChargeSessionCurrent } from '../store/auth.store';
import { getErrorMessage, showError } from '../utils/toast';
import { captureError } from '../lib/sentry';
import { releaseUnsavedChangesGuards } from '../lib/unsavedChangesLifecycle';
import { resolveApiBaseUrl } from '../config/apiBaseUrl';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Prevent a late recoverable charge from affecting a replacement session. */
    chargeSession?: ChargeSession;
    /** La superficie que hace el GET muestra su propio error y acción de reintento. */
    errorMode?: 'inline';
    /** Las consultas de Cuenta comprueban el 403 sin depender de la suscripción. */
    sessionValidation?: 'profile' | 'closure';
  }
}

const API_BASE_URL = resolveApiBaseUrl({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
}, {
  development: import.meta.env.DEV,
});

/** Evento global para el límite de plan (402). El modal "Pasá a PRO" lo escucha. */
export const LIMITE_PLAN_EVENT = 'ofx:limite-plan';
export const EMAIL_VERIFICATION_REQUIRED_EVENT = 'ofx:email-verification-required';

export const isEmailVerificationRequired = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 403 &&
  error.response.data?.code === 'EMAIL_NO_VERIFICADO';

const notifyEmailVerificationRequired = (token: string) => {
  if (authStore.getState().token === token) {
    window.dispatchEvent(new CustomEvent(EMAIL_VERIFICATION_REQUIRED_EVENT, { detail: { token } }));
  }
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Cliente para endpoints públicos (sin token ni interceptores): por ejemplo el
 * seguimiento público que abren los clientes del taller sin estar logueados.
 */
export const publicClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Cliente aislado para comprobar la vigencia de una sesión después de un 403.
// No usa el interceptor de respuesta de apiClient, por lo que no recursa.
const sessionValidationClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

type SessionValidationResult = 'valida' | 'invalida' | 'indeterminada';

let pendingSessionValidation: {
  token: string;
  resource: '/perfil' | '/suscripcion';
  promise: Promise<SessionValidationResult>;
} | null = null;

const isBaseSessionRequest = (url?: string) => {
  if (!url) return false;
  try {
    const pathname = new URL(url, `${API_BASE_URL}/`).pathname.replace(/\/+$/, '');
    return pathname.endsWith('/suscripcion') || pathname.endsWith('/perfil');
  } catch {
    const normalized = url.replace(/\?.*$/, '').replace(/\/+$/, '');
    return normalized.endsWith('/suscripcion') || normalized.endsWith('/perfil');
  }
};

const redirectToLogin = () => {
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
  }
};

const closeInvalidSession = () => {
  // El release es sincrónico: un formulario sucio no debe interceptar ni mostrar
  // beforeunload durante el logout que dispara esta misma respuesta.
  releaseUnsavedChangesGuards();
  authStore.getState().logout();
  redirectToLogin();
};

const validateBaseSession = (token: string | null, resource: '/perfil' | '/suscripcion'): Promise<SessionValidationResult> => {
  if (!token) return Promise.resolve('invalida');
  if (pendingSessionValidation?.token === token && pendingSessionValidation.resource === resource) return pendingSessionValidation.promise;

  const promise = sessionValidationClient
    .get(resource, { headers: { Authorization: `Bearer ${token}` }, ...(resource === '/perfil' ? { timeout: 20_000 } : {}) })
    .then<SessionValidationResult>(() => 'valida')
    .catch((validationError: unknown): SessionValidationResult => {
      if (isEmailVerificationRequired(validationError)) {
        notifyEmailVerificationRequired(token);
        return 'valida';
      }
      const validationStatus = axios.isAxiosError(validationError)
        ? validationError.response?.status
        : undefined;
      return validationStatus === 401 || validationStatus === 403 ? 'invalida' : 'indeterminada';
    });

  pendingSessionValidation = { token, resource, promise };
  void promise.finally(() => {
    if (pendingSessionValidation?.promise === promise) pendingSessionValidation = null;
  });
  return promise;
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.chargeSession && !isChargeSessionCurrent(config.chargeSession)) {
      throw new axios.CanceledError('Charge session changed before dispatch');
    }
    const token = authStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.config?.chargeSession && !isChargeSessionCurrent(error.config.chargeSession)) throw error;
    // Una búsqueda reemplazada o una query sin observadores no es un fallo para
    // el usuario ni para telemetría. React Query igualmente recibe el rechazo y
    // resuelve el estado de concurrencia de esa request.
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      throw error;
    }

    // Es una sesión vigente con acceso pendiente, no un token revocado. Una
    // respuesta tardía de otra identidad tampoco puede bloquear la sesión nueva.
    if (isEmailVerificationRequired(error)) {
      const token = authStore.getState().token;
      const sent = AxiosHeaders.from(error.config?.headers).get('Authorization');
      if (token && sent === `Bearer ${token}`) notifyEmailVerificationRequired(token);
      throw error;
    }

    // Cerrar/restaurar puede revocar la sesión antes de que llegue el ACK.
    // La pantalla compara la sesión y resuelve el resultado incierto sin que
    // una navegación global borre su aviso. Tampoco reporta el error sensible.
    if (error.config?.sessionValidation === 'closure') throw error;

    const accountRead = error.config?.sessionValidation === 'profile';
    if (accountRead) {
      // El interceptor corre antes que el catch de la pantalla. Una respuesta
      // de otra sesión no puede cerrar la identidad nueva ni liberar sus guards.
      const currentToken = authStore.getState().token;
      const sentAuthorization = AxiosHeaders.from(error.config?.headers).get('Authorization');
      if (!currentToken || sentAuthorization !== `Bearer ${currentToken}`) throw error;
    }
    const status = error.response?.status;

    if (status === 401) {
      // Token inválido o vencido → cerrar sesión
      closeInvalidSession();
    } else if (status === 402) {
      // Límite del plan / suscripción no vigente → modal de upgrade
      const message = getErrorMessage(error, 'Alcanzaste el límite de tu plan.');
      window.dispatchEvent(new CustomEvent(LIMITE_PLAN_EVENT, { detail: { message } }));
    } else if (status === 403) {
      if (isBaseSessionRequest(error.config?.url)) {
        // Estos recursos aceptan ambos roles: su 403 significa sesión revocada.
        closeInvalidSession();
      } else {
        // En cualquier otro endpoint un 403 puede ser falta de rol o una cuenta
        // desactivada. La consulta base deduplicada permite distinguirlos.
        const token = authStore.getState().token;
        const validation = await validateBaseSession(token, accountRead ? '/perfil' : '/suscripcion');

        // Si la identidad cambió mientras validábamos, no afectamos la nueva sesión.
        if (authStore.getState().token === token
          && (!error.config?.chargeSession || isChargeSessionCurrent(error.config.chargeSession))) {
          if (validation === 'valida') {
            if (!accountRead) showError(getErrorMessage(error, 'No tenés permisos para esta acción.'));
          } else if (validation === 'invalida') {
            closeInvalidSession();
          } else {
            if (!accountRead) showError('No pudimos verificar tu sesión. Revisá tu conexión e intentá de nuevo.');
          }
        }
      }
    } else {
      // Errores de lectura: avisar por toast (las mutaciones manejan su propio onError)
      const method = error.config?.method?.toLowerCase();
      if (method === 'get' && error.config?.errorMode !== 'inline') {
        showError(getErrorMessage(error, 'No se pudo obtener la información.'));
      }
      // Reportar a Sentry los errores de red/servidor (5xx o sin respuesta).
      captureError(error);
    }

    throw error;
  }
);

export default apiClient;
