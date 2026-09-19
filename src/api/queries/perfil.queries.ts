import { useQuery, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import { authStore } from '../../store/auth.store';
import { isTokenExpired } from '../../utils/jwt';
import type { Perfil } from '../../types';

export const PERFIL_KEY = queryKeys.perfil.all;

const profileSchema = z.object({
  accesoTaller: z.enum(['OPERATIVE', 'RESTRICTED']).optional(),
  usuario: z.object({
    id: z.number().int().positive(),
    username: z.string().min(1),
    email: z.string().min(1),
    role: z.enum(['ADMIN', 'USER']),
    emailVerificado: z.boolean(),
  }),
  taller: z.object({
    id: z.number().int().positive(),
    nombre: z.string().min(1),
    telefono: z.string().nullable(),
  }),
});

/** Perfil del principal actual. La señal cancela requests que pierden observadores. */
export const fetchPerfil = async (signal?: AbortSignal, timeout?: number): Promise<Perfil> => {
  const { data } = await apiClient.get<Perfil>('/perfil', {
    signal,
    errorMode: 'inline',
    sessionValidation: 'profile',
    ...(timeout === undefined ? {} : { timeout }),
  });
  return profileSchema.parse(data);
};

/** Un enlace puede verificar otra cuenta: sólo el servidor confirma la sesión abierta. */
export const refreshCurrentSessionProfile = async (client: QueryClient): Promise<Perfil | null> => {
  const { token, isAuthenticated } = authStore.getState();
  if (!isAuthenticated || !token || isTokenExpired(token)) return null;

  try {
    const data = await fetchPerfil(undefined, 20_000);
    if (authStore.getState().token !== token) return null;
    client.setQueryData(PERFIL_KEY, data);
    return data;
  } finally {
    if (authStore.getState().token === token) {
      await Promise.all([
        client.invalidateQueries({ queryKey: PERFIL_KEY, refetchType: 'none' }),
        client.invalidateQueries({ queryKey: ['account-session'] }),
      ]);
    }
  }
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
