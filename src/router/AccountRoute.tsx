import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { z } from 'zod';
import { fetchPerfil, PERFIL_KEY } from '../api/queries/perfil.queries';
import { authStore, useAuth } from '../store/auth.store';
import { isTokenExpired } from '../utils/jwt';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';
import { AccountProfileContext } from './accountProfile';

const profileSchema = z.object({
  accesoTaller: z.enum(['OPERATIVE', 'RESTRICTED']).optional(),
  usuario: z.object({
    id: z.number().int().positive(),
    username: z.string().min(1),
    email: z.string().min(1),
    role: z.enum(['ADMIN', 'USER']),
  }),
  taller: z.object({
    id: z.number().int().positive(),
    nombre: z.string().min(1),
    telefono: z.string().nullable(),
  }),
});

const AccountSession = ({ token, children, purpose }: { token: string; children: ReactNode; purpose: 'account' | 'session' }) => {
  // Una entrada a Cuenta siempre exige una observación nueva. No guarda tokens
  // en query keys ni reutiliza el perfil visual que puede seguir fresco en caché.
  const [scope] = useState(() => crypto.randomUUID());
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ['account-session', scope],
    queryFn: async ({ signal }) => {
      const data = profileSchema.parse(await fetchPerfil(signal, 20_000));
      if (!signal.aborted && authStore.getState().token === token) {
        client.setQueryData(PERFIL_KEY, data);
      }
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const status = isAxiosError(profile.error) ? profile.error.response?.status : undefined;
  const invalid = status === 401 || status === 403;

  useEffect(() => {
    if (invalid && authStore.getState().token === token) authStore.getState().logout();
  }, [invalid, token]);

  if (invalid) return <Navigate to="/login" replace />;
  if (profile.isPending) return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <Loader size="lg" />
      <span className="sr-only">{purpose === 'account' ? 'Validando acceso a Cuenta…' : 'Validando sesión…'}</span>
    </div>
  );
  if (profile.isError) return (
    <div className="mx-auto max-w-lg px-4 text-center">
      <ErrorState title={purpose === 'account' ? 'No pudimos validar tu cuenta' : 'No pudimos validar tu sesión'}
        message="Revisá tu conexión e intentá de nuevo. Tu sesión sigue abierta."
        onRetry={() => void profile.refetch()} />
      <button type="button" onClick={() => authStore.getState().logout()}
        className="min-h-11 rounded-lg px-4 text-sm font-semibold text-primary underline focus-visible:outline focus-visible:outline-primary">
        Cerrar sesión
      </button>
    </div>
  );
  return <AccountProfileContext value={profile.data}>{children}</AccountProfileContext>;
};

/** Cuenta requiere sesión remota vigente, sin depender de funciones comerciales. */
export const AccountRoute = ({ children, purpose = 'account' }: { children: ReactNode; purpose?: 'account' | 'session' }) => {
  const { token, isAuthenticated } = useAuth();
  if (!isAuthenticated || !token || isTokenExpired(token)) return <Navigate to="/login" replace />;
  // También descarta lectores/historial pendientes al cambiar el token.
  return <AccountSession key={token} token={token} purpose={purpose}>{children}</AccountSession>;
};
