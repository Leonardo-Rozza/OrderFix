import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Cobro, CobroCreate } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';

const crearCobro = async ({
  reparacionId,
  ...body
}: CobroCreate & { reparacionId: number }): Promise<Cobro> => {
  const { data } = await apiClient.post<Cobro>(`/reparaciones/${reparacionId}/cobros`, body);
  return data;
};

const anularCobro = async ({ reparacionId, cobroId }: { reparacionId: number; cobroId: number }): Promise<void> => {
  await apiClient.delete(`/reparaciones/${reparacionId}/cobros/${cobroId}`);
};

const invalidate = (qc: ReturnType<typeof useQueryClient>, reparacionId: number) => {
  qc.invalidateQueries({ queryKey: ['cobros', reparacionId] });
  qc.invalidateQueries({ queryKey: ['caja'] });
};

export const useCrearCobroMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crearCobro,
    onSuccess: () => {
      invalidate(qc, reparacionId);
      showSuccess('Cobro registrado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo registrar el cobro')),
  });
};

export const useAnularCobroMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: anularCobro,
    onSuccess: () => {
      invalidate(qc, reparacionId);
      showSuccess('Cobro anulado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo anular el cobro')),
  });
};
