import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Repuesto, RepuestoCreate, RepuestoUpdate } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';

// Crear repuesto
const createRepuesto = async (repuesto: RepuestoCreate): Promise<Repuesto> => {
  const { data } = await apiClient.post<Repuesto>('/repuestos', repuesto);
  return data;
};

// Actualizar repuesto
const updateRepuesto = async (repuesto: RepuestoUpdate): Promise<Repuesto> => {
  const { id, ...body } = repuesto;
  const { data } = await apiClient.put<Repuesto>(`/repuestos/${id}`, body);
  return data;
};

// Eliminar repuesto
const deleteRepuesto = async (id: number): Promise<void> => {
  await apiClient.delete(`/repuestos/${id}`);
};

// Hook para crear repuesto
export const useCreateRepuestoMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRepuesto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
      showSuccess('Repuesto creado');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo crear el repuesto'));
    },
  });
};

// Hook para actualizar repuesto
export const useUpdateRepuestoMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateRepuesto,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
      queryClient.invalidateQueries({ queryKey: ['repuesto', data.id] });
      showSuccess('Repuesto actualizado');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo actualizar el repuesto'));
    },
  });
};

// Hook para eliminar repuesto
export const useDeleteRepuestoMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteRepuesto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
      showSuccess('Repuesto eliminado');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo eliminar el repuesto'));
    },
  });
};
