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
import {
  reconcileReparacionChanged,
  reconcileReparacionDeleted,
} from '../cacheConsistency';
import { queryKeys } from '../queryKeys';

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
    onSuccess: async (data) => {
      await reconcileReparacionChanged(queryClient, {
        reparacionId: data.id,
        reparacion: data,
        consumo: true,
      });
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
    onSuccess: async (data) => {
      await reconcileReparacionChanged(queryClient, {
        reparacionId: data.reparacion.id,
        reparacion: data.reparacion,
        consumo: true,
      });
      // El formulario puede necesitar un PUT posterior para completar la orden.
      // La notificación final la emite recién cuando termina la transacción entera.
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo crear la reparación'));
    },
  });
};

/**
 * Segundo paso del ingreso rápido. No muestra éxito propio porque forma parte de
 * una única operación visible; sí explica que el POST ya ocurrió y que reintentar
 * es seguro cuando falla.
 */
export const useCompletarIngresoRapidoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateReparacion,
    onSuccess: async (data) => {
      await reconcileReparacionChanged(queryClient, {
        reparacionId: data.id,
        reparacion: data,
        equipoChanged: true,
      });
    },
    onError: (error) => {
      const detail = getErrorMessage(error, 'No se pudieron guardar todos los detalles.');
      showError(
        `La reparación ya fue creada, pero faltó completar sus detalles: ${detail} Volvé a intentar; no se duplicará.`,
      );
    },
  });
};

// Hook para actualizar reparación
export const useUpdateReparacionMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateReparacion,
    onSuccess: async (data) => {
      await reconcileReparacionChanged(queryClient, {
        reparacionId: data.id,
        reparacion: data,
        equipoChanged: true,
      });
      showSuccess('Reparación actualizada');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo actualizar la reparación'));
    },
  });
};

// Hook para cambiar el estado de una reparación. La respuesta del servidor es la
// única que cambia la caché: las páginas filtradas conservan su membresía hasta
// que el refetch confirmado actualiza origen, destino y totales.
export const useCambiarEstadoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cambiarEstado,
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo cambiar el estado'));
    },
    onSuccess: async (data) => {
      await reconcileReparacionChanged(queryClient, {
        reparacionId: data.id,
        reparacion: data,
      });
      showSuccess('Estado actualizado');
    },
  });
};

// Hook para eliminar reparación
export const useDeleteReparacionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReparacion,
    onSuccess: async (_data, id) => {
      await reconcileReparacionDeleted(queryClient, id);
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
    onSuccess: async (data, variables) => {
      await Promise.all([
        reconcileReparacionChanged(queryClient, {
          reparacionId: data.id,
          reparacion: data,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reparaciones.detail(variables.id) }),
      ]);
      showSuccess('Reclamo en garantía creado');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo crear el reclamo en garantía'));
    },
  });
};
