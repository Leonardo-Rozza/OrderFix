import { useMutation } from '@tanstack/react-query';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { apiClient } from '../axios';

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
