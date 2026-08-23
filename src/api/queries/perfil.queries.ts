import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import { authStore } from '../../store/auth.store';
import { isTokenExpired } from '../../utils/jwt';
import type { Perfil } from '../../types';

export const PERFIL_KEY = queryKeys.perfil.all;

/** Perfil del principal actual. La señal cancela requests que pierden observadores. */
export const fetchPerfil = async (signal?: AbortSignal): Promise<Perfil> => {
  const { data } = await apiClient.get<Perfil>('/perfil', {
    signal,
    errorMode: 'inline',
  });
  return data;
};

export const usePerfilQuery = () => {
  const token = authStore((state) => state.token);
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  const sesionVigente = isAuthenticated && !!token && !isTokenExpired(token);

  return useQuery({
    queryKey: queryKeys.perfil.all,
    queryFn: ({ signal }) => fetchPerfil(signal),
    enabled: sesionVigente,
  });
};
