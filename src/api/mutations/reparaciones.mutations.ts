import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Page } from '../pagination';
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

// Cambiar solo el estado: el backend espera { estado: "EN_PROCESO" }
const cambiarEstado = async (params: { id: number; estado: EstadoReparacion }): Promise<Reparacion> => {
  const { data } = await apiClient.patch<Reparacion>(`/reparaciones/${params.id}/estado`, {
    estado: params.estado,
  });
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

// Hook para cambiar el estado de una reparación (optimista: la tarjeta se mueve al instante)
export const useCambiarEstadoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cambiarEstado,
    onMutate: async ({ id, estado }) => {
      await queryClient.cancelQueries({ queryKey: ['reparaciones'] });
      // Snapshot de todas las páginas cacheadas y update optimista en cada una.
      const prev = queryClient.getQueriesData<Page<Reparacion>>({ queryKey: ['reparaciones'] });
      queryClient.setQueriesData<Page<Reparacion>>({ queryKey: ['reparaciones'] }, (old) =>
        old ? { ...old, content: old.content.map((r) => (r.id === id ? { ...r, estado } : r)) } : old
      );
      queryClient.setQueryData<Reparacion>(['reparacion', id], (old) => (old ? { ...old, estado } : old));
      return { prev };
    },
    onError: (error, _vars, context) => {
      context?.prev?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      showError(getErrorMessage(error, 'No se pudo cambiar el estado'));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reparacion', data.id] });
      showSuccess('Estado actualizado');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones'] });
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

// Reclamo en garantía: crea una reparación nueva vinculada al original
// (mismo equipo, esGarantia, sin precio; no consume cupo del plan FREE)
const crearReclamoGarantia = async (params: { id: number; descripcionProblema: string }): Promise<Reparacion> => {
  const { data } = await apiClient.post<Reparacion>(`/reparaciones/${params.id}/garantia`, {
    descripcionProblema: params.descripcionProblema,
  });
  return data;
};

export const useReclamoGarantiaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crearReclamoGarantia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones'] });
      showSuccess('Reclamo en garantía creado');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo crear el reclamo en garantía'));
    },
  });
};
