import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { unwrapList, FETCH_ALL_PARAMS, type Page } from '../pagination';
import type { Repuesto } from '../../types';

// Obtener todos los repuestos (la respuesta puede venir paginada)
const fetchRepuestos = async (): Promise<Repuesto[]> => {
  const { data } = await apiClient.get<Repuesto[] | Page<Repuesto>>('/repuestos', { params: FETCH_ALL_PARAMS });
  return unwrapList(data);
};

// Hook para obtener repuestos
export const useRepuestosQuery = () => {
  return useQuery({
    queryKey: ['repuestos'],
    queryFn: fetchRepuestos,
  });
};

// Obtener un repuesto por ID
const fetchRepuestoById = async (id: number): Promise<Repuesto> => {
  const { data } = await apiClient.get<Repuesto>(`/repuestos/${id}`);
  return data;
};

// Hook para obtener un repuesto por ID
export const useRepuestoQuery = (id: number) => {
  return useQuery({
    queryKey: ['repuesto', id],
    queryFn: () => fetchRepuestoById(id),
    enabled: !!id,
  });
};

// Obtener repuestos de una reparación (la respuesta puede venir paginada)
const fetchRepuestosPorReparacion = async (reparacionId: number): Promise<Repuesto[]> => {
  const { data } = await apiClient.get<Repuesto[] | Page<Repuesto>>(`/repuestos/reparacion/${reparacionId}`, {
    params: FETCH_ALL_PARAMS,
  });
  return unwrapList(data);
};

// Hook para obtener repuestos por reparación
export const useRepuestosPorReparacionQuery = (reparacionId: number | undefined) => {
  return useQuery({
    queryKey: ['repuestos', 'reparacion', reparacionId],
    queryFn: () => fetchRepuestosPorReparacion(reparacionId as number),
    enabled: !!reparacionId,
  });
};
