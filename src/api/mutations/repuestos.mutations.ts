import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
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

/**
 * Un repuesto cambia totales, saldo/recibo y, si nació del inventario, stock.
 * Se invalidan prefijos para cubrir también una reasignación entre reparaciones:
 * el payload de update no informa necesariamente cuál era la asociación previa.
 */
const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.repuestos.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.repuestos.details });
  queryClient.invalidateQueries({ queryKey: queryKeys.reparaciones.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.reparaciones.details });
  queryClient.invalidateQueries({ queryKey: queryKeys.cobros.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.recibos.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventario.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
};

// Hook para crear repuesto
export const useCreateRepuestoMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRepuesto,
    onSuccess: () => {
      invalidate(queryClient);
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
    onSuccess: () => {
      invalidate(queryClient);
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
      invalidate(queryClient);
      showSuccess('Repuesto eliminado');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo eliminar el repuesto'));
    },
  });
};
