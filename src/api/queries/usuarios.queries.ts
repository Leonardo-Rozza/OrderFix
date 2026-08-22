import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { unwrapList, type Page } from '../pagination';
import { queryKeys } from '../queryKeys';
import type { Usuario } from '../../types';

// Empleados del taller (solo ADMIN)
const fetchUsuarios = async (): Promise<Usuario[]> => {
  const { data } = await apiClient.get<Usuario[] | Page<Usuario>>('/usuarios');
  return unwrapList(data);
};

export const useUsuariosQuery = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.usuarios.all,
    queryFn: fetchUsuarios,
    enabled,
  });
};
