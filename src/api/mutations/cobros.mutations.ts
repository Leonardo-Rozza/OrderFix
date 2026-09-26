import { isChargeSessionCurrent } from '../../store/auth.store';
import type { PendingCharge, ChargeSession } from '../../utils/pendingCharge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Cobro, CobroAnulacionRequest, CobroCreate } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { reconcileCobroChanged } from '../cacheConsistency';
import { hasApiErrorCode } from '../errors';

const crearCobro = async (
  reparacionId: number,
  body: CobroCreate,
  session: ChargeSession,
): Promise<Cobro> => {
  const { data } = await apiClient.post<Cobro>(`/reparaciones/${reparacionId}/cobros`, body, { chargeSession: session });
  return data;
};

const anularCobro = async (
  reparacionId: number,
  cobroId: number,
  body: CobroAnulacionRequest,
): Promise<Cobro> => {
  const { data } = await apiClient.post<Cobro>(
    `/reparaciones/${reparacionId}/cobros/${cobroId}/anulacion`,
    body,
  );
  return data;
};

export const useCrearCobroMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attempt, session }: { attempt: PendingCharge; session: ChargeSession }) => {
      if (!isChargeSessionCurrent(session) || attempt.account !== session.account || attempt.reparacionId !== reparacionId) {
        throw new Error('La sesión del intento de cobro cambió.');
      }
      return crearCobro(reparacionId, attempt.payload, session);
    },
    onSuccess: async (cobro, { session }) => {
      if (!isChargeSessionCurrent(session)) return;
      await reconcileCobroChanged(qc, reparacionId);
      if (!isChargeSessionCurrent(session)) return;
      showSuccess(cobro.estado === 'ANULADO'
        ? 'Este cobro ya estaba registrado y fue anulado. No se creó otro cobro.'
        : 'Cobro registrado');
    },
    onError: async (e, { session }) => {
      if (!isChargeSessionCurrent(session)) return;
      // El modal muestra este conflicto junto al monto y conserva el formulario.
      // Un toast adicional repetiría el mismo error fuera de contexto.
      if (hasApiErrorCode(e, 'COBRO_SUPERA_SALDO')) {
        // Otra pestaña pudo registrar el cobro primero. Refrescamos todos los
        // derivados sin resetear los campos dirty que conserva el modal.
        await reconcileCobroChanged(qc, reparacionId);
        return;
      }
      showError(getErrorMessage(e, 'No se pudo registrar el cobro'));
    },
  });
};

export const useAnularCobroMutation = (reparacionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cobroId, motivo }: { cobroId: number; motivo: string }) => (
      anularCobro(reparacionId, cobroId, { motivo })
    ),
    onSuccess: async () => {
      await reconcileCobroChanged(qc, reparacionId);
      showSuccess('Cobro anulado');
    },
    onError: async (e) => {
      if (hasApiErrorCode(e, 'COBRO_YA_ANULADO')) {
        await reconcileCobroChanged(qc, reparacionId);
        return;
      }
      showError(getErrorMessage(e, 'No se pudo anular el cobro'));
    },
  });
};
