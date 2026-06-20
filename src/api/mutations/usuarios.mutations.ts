import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Usuario, UsuarioCreate, UsuarioUpdate } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';

// Crear empleado
const createUsuario = async (usuario: UsuarioCreate): Promise<Usuario> => {
  const { data } = await apiClient.post<Usuario>('/usuarios', usuario);
  return data;
};

// Actualizar rol / activo
const updateUsuario = async ({ id, ...cambios }: UsuarioUpdate & { id: number }): Promise<Usuario> => {
  const { data } = await apiClient.patch<Usuario>(`/usuarios/${id}`, cambios);
  return data;
};

export const useCreateUsuarioMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      showSuccess('Empleado creado');
    },
    onError: (error) => showError(getErrorMessage(error, 'No se pudo crear el empleado')),
  });
};

export const useUpdateUsuarioMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      showSuccess('Empleado actualizado');
    },
    onError: (error) => showError(getErrorMessage(error, 'No se pudo actualizar el empleado')),
  });
};
