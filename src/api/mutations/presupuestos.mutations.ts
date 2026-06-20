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

export const useCrearPresupuestoMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crearPresupuesto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presupuestos', reparacionId] });
      showSuccess('Presupuesto enviado al cliente');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo crear el presupuesto')),
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
