import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosProgressEvent } from 'axios';
import type { DatosCobro, DatosCobroUpdate } from '../../types';
import { apiClient } from '../axios';
import { reconcileDatosCobroChanged } from '../cacheConsistency';

export const actualizarDatosCobro = async (body: DatosCobroUpdate): Promise<DatosCobro> => {
  const { data } = await apiClient.put<DatosCobro>('/taller/datos-cobro', body, {
    errorMode: 'inline',
  });
  return data;
};

export interface SubirQrCobroVariables {
  file: File;
  onProgress?: (progress: number) => void;
}

export const subirQrCobro = async ({
  file,
  onProgress,
}: SubirQrCobroVariables): Promise<DatosCobro> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.put<DatosCobro>('/taller/datos-cobro/qr', formData, {
    // La instancia tiene JSON por defecto: lo quitamos para que Axios/browser
    // agregue el multipart y su boundary. Nunca fijamos multipart manualmente.
    headers: { 'Content-Type': false },
    errorMode: 'inline',
    onUploadProgress: (event: AxiosProgressEvent) => {
      const progress = event.progress
        ?? (event.total && event.total > 0 ? event.loaded / event.total : undefined);
      if (progress != null) onProgress?.(Math.min(100, Math.round(progress * 100)));
    },
  });
  return data;
};

export const eliminarQrCobro = async (): Promise<DatosCobro> => {
  const { data } = await apiClient.delete<DatosCobro>('/taller/datos-cobro/qr', {
    errorMode: 'inline',
  });
  return data;
};

const useDatosCobroMutation = <TVariables,>(
  mutationFn: (variables: TVariables) => Promise<DatosCobro>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (datosCobro) => {
      await reconcileDatosCobroChanged(queryClient, datosCobro);
    },
  });
};

export const useActualizarDatosCobroMutation = () => (
  useDatosCobroMutation(actualizarDatosCobro)
);

export const useSubirQrCobroMutation = () => useDatosCobroMutation(subirQrCobro);

export const useEliminarQrCobroMutation = () => (
  useDatosCobroMutation<void>(async () => eliminarQrCobro())
);
