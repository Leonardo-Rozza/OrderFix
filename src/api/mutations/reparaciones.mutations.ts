import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type {
  EstadoReparacion,
  IngresoRapidoRequest,
  IngresoRapidoResponse,
  Reparacion,
  ReparacionCreate,
  ReparacionUpdate,
} from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';

// Crear reparación
const createReparacion = async (reparacion: ReparacionCreate): Promise<Reparacion> => {
  const { data } = await apiClient.post<Reparacion>('/reparaciones', reparacion);
  return data;
};

// Carga rápida: crea cliente + equipo + reparación en un solo paso
const ingresoRapido = async (payload: IngresoRapidoRequest): Promise<IngresoRapidoResponse> => {
  const { data } = await apiClient.post<IngresoRapidoResponse>('/reparaciones/ingreso-rapido', payload);
  return data;
};

// Actualizar reparación
const updateReparacion = async (reparacion: ReparacionUpdate): Promise<Reparacion> => {
  const { id, ...updateData } = reparacion;
  const { data } = await apiClient.put<Reparacion>(`/reparaciones/${id}`, updateData);
  return data;
};

// Cambiar solo el estado: el backend espera el enum como string JSON crudo
const cambiarEstado = async (params: { id: number; estado: EstadoReparacion }): Promise<Reparacion> => {
  const { data } = await apiClient.patch<Reparacion>(
    `/reparaciones/${params.id}/estado`,
    JSON.stringify(params.estado),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data;
};

// Eliminar reparación
const deleteReparacion = async (id: number): Promise<void> => {
  await apiClient.delete(`/reparaciones/${id}`);
};

// Hook para crear reparación
export const useCreateReparacionMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createReparacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones'] });
      showSuccess('Reparación creada');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo crear la reparación'));
    },
  });
};

// Hook para la carga rápida (cliente + equipo + reparación)
export const useIngresoRapidoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ingresoRapido,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones'] });
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showSuccess(data.clienteNuevo ? 'Reparación y cliente creados' : 'Reparación creada');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo crear la reparación'));
    },
  });
};

// Hook para actualizar reparación
export const useUpdateReparacionMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateReparacion,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones'] });
      queryClient.invalidateQueries({ queryKey: ['reparacion', data.id] });
      showSuccess('Reparación actualizada');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo actualizar la reparación'));
    },
  });
};

// Hook para cambiar el estado de una reparación
export const useCambiarEstadoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cambiarEstado,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones'] });
      queryClient.invalidateQueries({ queryKey: ['reparacion', data.id] });
      showSuccess('Estado actualizado');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo cambiar el estado'));
    },
  });
};

// Hook para eliminar reparación
export const useDeleteReparacionMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteReparacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones'] });
      showSuccess('Reparación eliminada');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo eliminar la reparación'));
    },
  });
};
