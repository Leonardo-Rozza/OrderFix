import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Equipo, EquipoCreate, EquipoUpdate } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { reconcileEquipoChanged } from '../cacheConsistency';

// Crear equipo
const createEquipo = async (equipo: EquipoCreate): Promise<Equipo> => {
  const { data } = await apiClient.post<Equipo>('/equipos', equipo);
  return data;
};

// Actualizar equipo
const updateEquipo = async (equipo: EquipoUpdate): Promise<Equipo> => {
  const { id, ...body } = equipo;
  const { data } = await apiClient.put<Equipo>(`/equipos/${id}`, body);
  return data;
};

// Eliminar equipo
const deleteEquipo = async (id: number): Promise<void> => {
  await apiClient.delete(`/equipos/${id}`);
};

// Hook para crear equipo
export const useCreateEquipoMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEquipo,
    onSuccess: async (equipo) => {
      await reconcileEquipoChanged(queryClient, { type: 'created', equipo });
      showSuccess('Equipo creado correctamente');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo crear el equipo'));
    },
  });
};

// Hook para actualizar equipo
export const useUpdateEquipoMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEquipo,
    onSuccess: async (equipo) => {
      await reconcileEquipoChanged(queryClient, { type: 'updated', equipo });
      showSuccess('Equipo actualizado');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo actualizar el equipo'));
    },
  });
};

// Hook para eliminar equipo
export const useDeleteEquipoMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteEquipo,
    onSuccess: async (_data, equipoId) => {
      await reconcileEquipoChanged(queryClient, { type: 'deleted', equipoId });
      showSuccess('Equipo eliminado');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo eliminar el equipo'));
    },
  });
};
