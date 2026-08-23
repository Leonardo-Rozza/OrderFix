import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { authStore } from '../store/auth.store';
import { getErrorMessage, showError } from '../utils/toast';
import { captureError } from '../lib/sentry';
import { releaseUnsavedChangesGuards } from '../lib/unsavedChangesLifecycle';
import { resolveApiBaseUrl } from '../config/apiBaseUrl';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** La superficie que hace el GET muestra su propio error y acción de reintento. */
    errorMode?: 'inline';
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

const validateBaseSession = (token: string | null): Promise<SessionValidationResult> => {
  if (!token) return Promise.resolve('invalida');
  if (pendingSessionValidation?.token === token) return pendingSessionValidation.promise;

  const promise = sessionValidationClient
    .get('/suscripcion', { headers: { Authorization: `Bearer ${token}` } })
    .then<SessionValidationResult>(() => 'valida')
    .catch((validationError: unknown): SessionValidationResult => {
      const validationStatus = axios.isAxiosError(validationError)
        ? validationError.response?.status
        : undefined;
      return validationStatus === 401 || validationStatus === 403 ? 'invalida' : 'indeterminada';
    });

  pendingSessionValidation = { token, promise };
  void promise.finally(() => {
    if (pendingSessionValidation?.promise === promise) pendingSessionValidation = null;
  });
  return promise;
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
    // Una búsqueda reemplazada o una query sin observadores no es un fallo para
    // el usuario ni para telemetría. React Query igualmente recibe el rechazo y
    // resuelve el estado de concurrencia de esa request.
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      throw error;
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
        const validation = await validateBaseSession(token);

        // Si la identidad cambió mientras validábamos, no afectamos la nueva sesión.
        if (authStore.getState().token === token) {
          if (validation === 'valida') {
            showError(getErrorMessage(error, 'No tenés permisos para esta acción.'));
          } else if (validation === 'invalida') {
            closeInvalidSession();
          } else {
            showError('No pudimos verificar tu sesión. Revisá tu conexión e intentá de nuevo.');
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
