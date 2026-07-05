import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { authStore } from '../store/auth.store';
import { getErrorMessage, showError } from '../utils/toast';
import { captureError } from '../lib/sentry';

// La base puede venir con o sin sufijo /api (el contrato sugiere VITE_API_URL=http://localhost:8080).
// Normalizamos para que las llamadas sin /api funcionen en ambos casos.
const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080';
const TRIMMED_BASE = RAW_BASE.replace(/\/+$/, '');
const API_BASE_URL = /\/api$/.test(TRIMMED_BASE) ? TRIMMED_BASE : `${TRIMMED_BASE}/api`;

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
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token inválido o vencido → cerrar sesión
      authStore.getState().logout();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    } else if (status === 402) {
      // Límite del plan / suscripción no vigente → modal de upgrade
      const message = getErrorMessage(error, 'Alcanzaste el límite de tu plan.');
      window.dispatchEvent(new CustomEvent(LIMITE_PLAN_EVENT, { detail: { message } }));
    } else if (status === 403) {
      // Un usuario desactivado pierde acceso al instante: hasta sus GETs (que
      // cualquier rol puede hacer) devuelven 403 → tratarlo como sesión inválida.
      // Un 403 en una mutación es una acción solo-ADMIN: avisar sin desloguear.
      const method = error.config?.method?.toLowerCase();
      if (method === 'get') {
        authStore.getState().logout();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      } else {
        showError(getErrorMessage(error, 'No tenés permisos para esta acción.'));
      }
    } else {
      // Errores de lectura: avisar por toast (las mutaciones manejan su propio onError)
      const method = error.config?.method?.toLowerCase();
      if (method === 'get') {
        showError(getErrorMessage(error, 'No se pudo obtener la información.'));
      }
      // Reportar a Sentry los errores de red/servidor (5xx o sin respuesta).
      captureError(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
