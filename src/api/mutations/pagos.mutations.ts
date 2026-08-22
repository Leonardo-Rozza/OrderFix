import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { SUSCRIPCION_KEY } from '../queries/suscripcion.queries';
import type { CheckoutResponse, Suscripcion } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';
import { reconcileSuscripcionDegraded } from '../cacheConsistency';

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

// Cancela la suscripción PRO → baja a FREE.
const cancelarSuscripcion = async (): Promise<Suscripcion> => {
  const { data } = await apiClient.post<Suscripcion>('/pagos/suscripcion/cancelar');
  return data;
};

export const useCancelarSuscripcionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelarSuscripcion,
    onSuccess: async (suscripcion) => {
      await reconcileSuscripcionDegraded(queryClient, suscripcion);
      showSuccess('Tu plan volvió a FREE.');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo cancelar la suscripción.'));
    },
  });
};
