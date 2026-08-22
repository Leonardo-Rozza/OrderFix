import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, publicClient } from '../axios';
import type { Presupuesto, PresupuestoCreate } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { reconcilePresupuestoChanged } from '../cacheConsistency';
import { queryKeys } from '../queryKeys';

// Crear presupuesto (con token, desde el taller)
const crearPresupuesto = async (
  reparacionId: number,
  body: PresupuestoCreate,
): Promise<Presupuesto> => {
  const { data } = await apiClient.post<Presupuesto>(`/reparaciones/${reparacionId}/presupuestos`, body);
  return data;
};

export const useCrearPresupuestoMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PresupuestoCreate) => crearPresupuesto(reparacionId, body),
    onSuccess: async () => {
      await reconcilePresupuestoChanged(qc, { reparacionId });
      showSuccess('Presupuesto enviado al cliente');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo crear el presupuesto')),
  });
};

// Aprobar / rechazar desde el taller (el cliente respondió por teléfono o en persona)
interface ResponderPresupuestoVariables {
  presupuestoId: number;
  accion: 'aprobar' | 'rechazar';
}

const responderPresupuestoTaller = async (
  reparacionId: number,
  { presupuestoId, accion }: ResponderPresupuestoVariables,
): Promise<Presupuesto> => {
  const { data } = await apiClient.post<Presupuesto>(
    `/reparaciones/${reparacionId}/presupuestos/${presupuestoId}/${accion}`
  );
  return data;
};

export const useResponderPresupuestoTallerMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variables: ResponderPresupuestoVariables) =>
      responderPresupuestoTaller(reparacionId, variables),
    onSuccess: async (_d, vars) => {
      await reconcilePresupuestoChanged(qc, { reparacionId });
      showSuccess(vars.accion === 'aprobar' ? 'Presupuesto aprobado' : 'Presupuesto rechazado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo registrar la respuesta')),
  });
};

// Re-presupuestar: clona un presupuesto vencido en uno nuevo PENDIENTE con validez fresca
const represupuestar = async (
  reparacionId: number,
  presupuestoId: number,
): Promise<Presupuesto> => {
  const { data } = await apiClient.post<Presupuesto>(
    `/reparaciones/${reparacionId}/presupuestos/${presupuestoId}/represupuestar`
  );
  return data;
};

export const useRepresupuestarMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ presupuestoId }: { presupuestoId: number }) =>
      represupuestar(reparacionId, presupuestoId),
    onSuccess: async () => {
      await reconcilePresupuestoChanged(qc, { reparacionId });
      showSuccess('Presupuesto renovado y enviado al cliente');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo re-presupuestar')),
  });
};

// Aprobar / rechazar desde el seguimiento público (sin token)
const responderPresupuesto = async (
  codigo: string,
  accion: 'aprobar' | 'rechazar',
): Promise<void> => {
  await publicClient.post(`/seguimiento/${codigo}/presupuesto/${accion}`);
};

export const useResponderPresupuestoMutation = (codigo: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accion }: { accion: 'aprobar' | 'rechazar' }) =>
      responderPresupuesto(codigo, accion),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.seguimiento.byCodigo(codigo) });
      showSuccess(vars.accion === 'aprobar' ? '¡Presupuesto aprobado!' : 'Presupuesto rechazado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo registrar la respuesta')),
  });
};
