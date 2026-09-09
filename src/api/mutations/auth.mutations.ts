import { useMutation } from '@tanstack/react-query';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { getRetryAfterSeconds } from '../../utils/retryAfter';
import { publicClient } from '../axios';
import type { RegistrationAttempt } from '../registrationConsent';

const authErrorMessage = (error: unknown, fallback: string) =>
  getRetryAfterSeconds(error) != null
    ? 'Demasiadas solicitudes. Esperá el tiempo indicado antes de volver a intentar.'
    : getErrorMessage(error, fallback);

const loginUser = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const { data } = await publicClient.post<AuthResponse>('/auth/login', credentials);
  return data;
};

const registerTaller = async (input: RegisterRequest | RegistrationAttempt): Promise<AuthResponse> => {
  const { data } = 'payload' in input
    ? await publicClient.post<AuthResponse>('/auth/register', input.payload, {
      headers: { 'Idempotency-Key': input.idempotencyKey }, timeout: 40_000,
    })
    : await publicClient.post<AuthResponse>('/auth/register', input);
  return data;
};

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: loginUser,
    onSuccess: () => {
      showSuccess('Sesión iniciada correctamente');
    },
    onError: (error) => {
      showError(authErrorMessage(error, 'Email o contraseña incorrectos'));
    },
  });
};

export const useRegisterMutation = (options?: { errorMode: 'inline' }) => {
  return useMutation({
    mutationFn: registerTaller,
    retry: false,
    gcTime: 0,
    onSuccess: () => {
      showSuccess('¡Taller creado! Bienvenido a OrdenFix');
    },
    onError: (error) => {
      if (options?.errorMode !== 'inline') showError(authErrorMessage(error, 'No se pudo crear el taller'));
    },
  });
};

/* ---------- Recuperación de contraseña y verificación de email (§4.1) ----------
   Van por publicClient: son endpoints públicos y un 401/403 acá no debe desloguear. */

export const useOlvidePasswordMutation = () => {
  return useMutation({
    // Siempre 200 (no revela si el email existe); el éxito se comunica en la pantalla.
    mutationFn: async (email: string) => {
      await publicClient.post('/auth/password/olvide', { email });
    },
    onError: (error) => showError(authErrorMessage(error, 'No se pudo enviar el email. Probá de nuevo.')),
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: async (payload: { token: string; nuevaPassword: string }) => {
      await publicClient.post('/auth/password/reset', payload);
    },
    onSuccess: () => showSuccess('Contraseña actualizada. Ya podés iniciar sesión.'),
    onError: (error) => showError(authErrorMessage(error, 'El link no es válido o ya venció.')),
  });
};

export const useVerificarEmailMutation = () => {
  return useMutation({
    // El resultado se muestra en la pantalla (sin toast de error: puede ser un token viejo).
    mutationFn: async (token: string) => {
      await publicClient.post('/auth/verificar-email', { token });
    },
  });
};

export const useReenviarVerificacionMutation = () => {
  return useMutation({
    // Siempre 200 (reenvía solo si la cuenta existe y no está verificada).
    mutationFn: async (email: string) => {
      await publicClient.post('/auth/verificar-email/reenviar', { email });
    },
    onSuccess: () => showSuccess('Listo: si tu cuenta lo necesita, te reenviamos el email.'),
    onError: (error) => showError(authErrorMessage(error, 'No se pudo reenviar. Probá de nuevo.')),
  });
};
