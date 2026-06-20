import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../axios';
import type { Articulo, ArticuloCreate, ArticuloUpdate, AjusteStock } from '../../types';
import { getErrorMessage, showError, showSuccess } from '../../utils/toast';

const createArticulo = async (a: ArticuloCreate): Promise<Articulo> => {
  const { data } = await apiClient.post<Articulo>('/inventario', a);
  return data;
};

const updateArticulo = async ({ id, ...a }: ArticuloUpdate): Promise<Articulo> => {
  const { data } = await apiClient.put<Articulo>(`/inventario/${id}`, a);
  return data;
};

const ajustarStock = async ({ id, ...body }: AjusteStock & { id: number }): Promise<Articulo> => {
  const { data } = await apiClient.post<Articulo>(`/inventario/${id}/ajuste`, body);
  return data;
};

const deleteArticulo = async (id: number): Promise<void> => {
  await apiClient.delete(`/inventario/${id}`);
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['inventario'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
};

export const useCreateArticuloMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createArticulo,
    onSuccess: () => {
      invalidate(qc);
      showSuccess('Artículo creado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo crear el artículo')),
  });
};

export const useUpdateArticuloMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateArticulo,
    onSuccess: () => {
      invalidate(qc);
      showSuccess('Artículo actualizado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo actualizar el artículo')),
  });
};

export const useAjustarStockMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ajustarStock,
    onSuccess: () => {
      invalidate(qc);
      showSuccess('Stock actualizado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo ajustar el stock')),
  });
};

export const useDeleteArticuloMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteArticulo,
    onSuccess: () => {
      invalidate(qc);
      showSuccess('Artículo eliminado');
    },
    onError: (e) => showError(getErrorMessage(e, 'No se pudo eliminar el artículo')),
  });
};
