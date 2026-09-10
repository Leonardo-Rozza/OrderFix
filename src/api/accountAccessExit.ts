import { apiClient } from './axios';

/** Baja del principal actual. La contraseña sólo vive durante esta petición. */
export const deactivateOwnAccess = async (passwordActual: string, signal: AbortSignal): Promise<void> => {
  if (!passwordActual.trim() || passwordActual.length > 100) throw new Error('Contraseña actual inválida.');
  const response = await apiClient.post<void>('/cuenta/baja-acceso', { passwordActual, confirmado: true }, {
    signal, timeout: 20_000, errorMode: 'inline', sessionValidation: 'profile',
  });
  signal.throwIfAborted();
  if (response.status !== 204) throw new Error('No pudimos confirmar el resultado de la baja.');
};
