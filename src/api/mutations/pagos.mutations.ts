import { CanceledError } from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { SUSCRIPCION_KEY } from '../queries/suscripcion.queries';
import type { CheckoutResponse, Suscripcion } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { reconcileSuscripcionDegraded } from '../cacheConsistency';
import { captureSubscriptionSession, isSubscriptionSessionCurrent } from '../subscriptionSession';
import { paidAccessLabel } from '../../utils/subscriptionPresentation';

// Inicia la suscripción PRO en MercadoPago y devuelve la URL de checkout.
const iniciarPagoPro = async (): Promise<CheckoutResponse> => {
  const { data } = await apiClient.post<CheckoutResponse>('/pagos/suscripcion');
  return data;
};

/**
 * Hook para arrancar el upgrade a PRO. Al tener éxito redirige a MercadoPago
 * (initPoint). El 502 (proveedor de pagos caído / no habilitado) se avisa por toast.
 */
export const useIniciarPagoProMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: iniciarPagoPro,
    onSuccess: (data) => {
      window.location.href = data.initPoint;
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No pudimos iniciar el pago, probá de nuevo en un momento.'));

      const status =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 409) {
        void queryClient.invalidateQueries({ queryKey: SUSCRIPCION_KEY });
      }
    },
  });
};

// Cancel renewal; the server decides whether paid PRO access remains.
export const useCancelarSuscripcionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const session = captureSubscriptionSession();
      if (!session.authenticated || !session.token) throw new CanceledError('Cancellation requires a current session');
      const { data } = await apiClient.post<Suscripcion>('/pagos/suscripcion/cancelar', undefined, {
        subscriptionSession: session,
      });
      return { suscripcion: data, session };
    },
    onSuccess: async ({ suscripcion, session }) => {
      const current = () => isSubscriptionSessionCurrent(session);
      if (!current()) throw new CanceledError('Subscription mutation session changed');
      await reconcileSuscripcionDegraded(queryClient, suscripcion, current);
      if (!current()) throw new CanceledError('Subscription mutation session changed');
      if (suscripcion.plan === 'FREE' && suscripcion.estado !== 'TRIAL') {
        showSuccess('Tu plan volvió a FREE.');
      } else if (suscripcion.renovacionCancelada === true) {
        const expiry = paidAccessLabel(suscripcion);
        showSuccess(expiry ? `Renovación cancelada. Acceso PRO disponible hasta ${expiry}.` : 'Renovación cancelada. Tu acceso vigente se conserva según el período confirmado.');
      }
    },
    onError: (error) => {
      if (error && typeof error === 'object' && 'config' in error) {
        const session = (error as { config?: { subscriptionSession?: ReturnType<typeof captureSubscriptionSession> } }).config?.subscriptionSession;
        if (session && !isSubscriptionSessionCurrent(session)) return;
      }
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_CANCELED') return;
      showError(getErrorMessage(error, 'No se pudo cancelar la suscripción.'));
    },
  });
};
