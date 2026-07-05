import { useMutation } from '@tanstack/react-query';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { apiClient, publicClient } from '../axios';

const loginUser = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return data;
};

const registerTaller = async (payload: RegisterRequest): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  return data;
};

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: loginUser,
    onSuccess: () => {
      showSuccess('Sesión iniciada correctamente');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Email o contraseña incorrectos'));
    },
  });
};

export const useRegisterMutation = () => {
  return useMutation({
    mutationFn: registerTaller,
    onSuccess: () => {
      showSuccess('¡Taller creado! Bienvenido a OrdenFix');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo crear el taller'));
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
    onError: (error) => showError(getErrorMessage(error, 'No se pudo enviar el email. Probá de nuevo.')),
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: async (payload: { token: string; nuevaPassword: string }) => {
      await publicClient.post('/auth/password/reset', payload);
    },
    onSuccess: () => showSuccess('Contraseña actualizada. Ya podés iniciar sesión.'),
    onError: (error) => showError(getErrorMessage(error, 'El link no es válido o ya venció.')),
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
    onError: (error) => showError(getErrorMessage(error, 'No se pudo reenviar. Probá de nuevo.')),
  });
};
