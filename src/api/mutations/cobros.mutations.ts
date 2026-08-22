import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Cobro, CobroCreate } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { reconcileCobroChanged } from '../cacheConsistency';

const crearCobro = async (
  reparacionId: number,
  body: CobroCreate,
): Promise<Cobro> => {
  const { data } = await apiClient.post<Cobro>(`/reparaciones/${reparacionId}/cobros`, body);
  return data;
};

const anularCobro = async (reparacionId: number, cobroId: number): Promise<void> => {
  await apiClient.delete(`/reparaciones/${reparacionId}/cobros/${cobroId}`);
};

export const useCrearCobroMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CobroCreate) => crearCobro(reparacionId, body),
    onSuccess: async () => {
      await reconcileCobroChanged(qc, reparacionId);
      showSuccess('Cobro registrado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo registrar el cobro')),
  });
};

export const useAnularCobroMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cobroId }: { cobroId: number }) => anularCobro(reparacionId, cobroId),
    onSuccess: async () => {
      await reconcileCobroChanged(qc, reparacionId);
      showSuccess('Cobro anulado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo anular el cobro')),
  });
};
