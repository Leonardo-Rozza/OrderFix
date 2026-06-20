import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { CheckoutResponse } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';

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
  return useMutation({
    mutationFn: iniciarPagoPro,
    onSuccess: (data) => {
      window.location.href = data.initPoint;
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No pudimos iniciar el pago, probá de nuevo en un momento.'));
    },
  });
};

// Cancela la suscripción PRO → baja a FREE.
const cancelarSuscripcion = async (): Promise<void> => {
  await apiClient.post('/pagos/suscripcion/cancelar');
};

export const useCancelarSuscripcionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelarSuscripcion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suscripcion'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showSuccess('Tu plan volvió a FREE.');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'No se pudo cancelar la suscripción.'));
    },
  });
};
