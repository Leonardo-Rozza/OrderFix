import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, publicClient } from '../axios';
import type { Presupuesto, PresupuestoCreate } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';

// Crear presupuesto (con token, desde el taller)
const crearPresupuesto = async ({
  reparacionId,
  ...body
}: PresupuestoCreate & { reparacionId: number }): Promise<Presupuesto> => {
  const { data } = await apiClient.post<Presupuesto>(`/reparaciones/${reparacionId}/presupuestos`, body);
  return data;
};

/** Crear/responder/represupuestar pueden mover el estado de la reparación (auto-estado §4.11). */
const invalidarPresupuestosYReparacion = (qc: ReturnType<typeof useQueryClient>, reparacionId: number) => {
  qc.invalidateQueries({ queryKey: ['presupuestos', reparacionId] });
  qc.invalidateQueries({ queryKey: ['reparacion', reparacionId] });
  qc.invalidateQueries({ queryKey: ['reparaciones'] });
};

export const useCrearPresupuestoMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crearPresupuesto,
    onSuccess: () => {
      invalidarPresupuestosYReparacion(qc, reparacionId);
      showSuccess('Presupuesto enviado al cliente');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo crear el presupuesto')),
  });
};

// Aprobar / rechazar desde el taller (el cliente respondió por teléfono o en persona)
const responderPresupuestoTaller = async ({
  reparacionId,
  presupuestoId,
  accion,
}: {
  reparacionId: number;
  presupuestoId: number;
  accion: 'aprobar' | 'rechazar';
}): Promise<Presupuesto> => {
  const { data } = await apiClient.post<Presupuesto>(
    `/reparaciones/${reparacionId}/presupuestos/${presupuestoId}/${accion}`
  );
  return data;
};

export const useResponderPresupuestoTallerMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: responderPresupuestoTaller,
    onSuccess: (_d, vars) => {
      invalidarPresupuestosYReparacion(qc, reparacionId);
      showSuccess(vars.accion === 'aprobar' ? 'Presupuesto aprobado' : 'Presupuesto rechazado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo registrar la respuesta')),
  });
};

// Re-presupuestar: clona un presupuesto vencido en uno nuevo PENDIENTE con validez fresca
const represupuestar = async ({
  reparacionId,
  presupuestoId,
}: {
  reparacionId: number;
  presupuestoId: number;
}): Promise<Presupuesto> => {
  const { data } = await apiClient.post<Presupuesto>(
    `/reparaciones/${reparacionId}/presupuestos/${presupuestoId}/represupuestar`
  );
  return data;
};

export const useRepresupuestarMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: represupuestar,
    onSuccess: () => {
      invalidarPresupuestosYReparacion(qc, reparacionId);
      showSuccess('Presupuesto renovado y enviado al cliente');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo re-presupuestar')),
  });
};

// Aprobar / rechazar desde el seguimiento público (sin token)
const responderPresupuesto = async ({
  codigo,
  accion,
}: {
  codigo: string;
  accion: 'aprobar' | 'rechazar';
}): Promise<void> => {
  await publicClient.post(`/seguimiento/${codigo}/presupuesto/${accion}`);
};

export const useResponderPresupuestoMutation = (codigo: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: responderPresupuesto,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['seguimiento', codigo] });
      showSuccess(vars.accion === 'aprobar' ? '¡Presupuesto aprobado!' : 'Presupuesto rechazado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo registrar la respuesta')),
  });
};
