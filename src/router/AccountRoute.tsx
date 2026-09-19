import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { EMAIL_VERIFICATION_REQUIRED_EVENT } from '../api/axios';
import { queryKeys } from '../api/queryKeys';
import { fetchPerfil, PERFIL_KEY } from '../api/queries/perfil.queries';
import { authStore, useAuth } from '../store/auth.store';
import { isTokenExpired } from '../utils/jwt';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';
import { AccountProfileContext, AccountSessionStatusContext } from './accountProfile';
import type { Perfil } from '../types';

const operationalRoots = new Set<string>(Object.entries(queryKeys)
  .filter(([name]) => name !== 'perfil' && name !== 'seguimiento' && name !== 'suscripcion')
  .flatMap(([, keys]) => [keys.all[0], ...('details' in keys ? [keys.details[0]] : [])]));

const AccountSession = ({ token, children, purpose }: { token: string; children: ReactNode; purpose: 'account' | 'session' }) => {
  // Una entrada a Cuenta siempre exige una observación nueva. No guarda tokens
  // en query keys ni reutiliza el perfil visual que puede seguir fresco en caché.
  const [scope] = useState(() => crypto.randomUUID());
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ['account-session', scope],
    queryFn: async ({ signal }) => {
      const data = await fetchPerfil(signal, 20_000);
      if (!signal.aborted && authStore.getState().token === token) {
        client.setQueryData(PERFIL_KEY, data);
      }
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const status = isAxiosError(profile.error) ? profile.error.response?.status : undefined;
  const invalid = status === 401 || status === 403;

  useEffect(() => {
    if (invalid && authStore.getState().token === token) authStore.getState().logout();
  }, [invalid, token]);

  useEffect(() => {
    const onVerificationRequired = (event: Event) => {
      if ((event as CustomEvent<{ token: string }>).detail?.token !== token || authStore.getState().token !== token) return;
      const key = ['account-session', scope];
      void client.cancelQueries({ queryKey: key });
      const pending = (previous: Perfil | undefined) => previous
        ? { ...previous, usuario: { ...previous.usuario, emailVerificado: false } } : previous;
      client.setQueryData<Perfil>(key, pending);
      client.setQueryData<Perfil>(PERFIL_KEY, pending);
      void client.invalidateQueries({ queryKey: key });
    };
    window.addEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, onVerificationRequired);
    return () => window.removeEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, onVerificationRequired);
  }, [client, scope, token]);

  useEffect(() => {
    if (profile.data?.usuario.emailVerificado !== false) return;
    const filter = { predicate: (query: { queryKey: readonly unknown[] }) => operationalRoots.has(String(query.queryKey[0])) };
    void client.cancelQueries(filter);
    client.removeQueries(filter);
  }, [client, profile.data?.usuario.emailVerificado]);

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
  return <AccountProfileContext value={profile.data}>
    <AccountSessionStatusContext value={{ isFetching: profile.isFetching, error: profile.error, refetch: profile.refetch }}>
      {children}
    </AccountSessionStatusContext>
  </AccountProfileContext>;
};

/** Cuenta requiere sesión remota vigente, sin depender de funciones comerciales. */
export const AccountRoute = ({ children, purpose = 'account' }: { children: ReactNode; purpose?: 'account' | 'session' }) => {
  const { token, isAuthenticated } = useAuth();
  if (!isAuthenticated || !token || isTokenExpired(token)) return <Navigate to="/login" replace />;
  // También descarta lectores/historial pendientes al cambiar el token.
  return <AccountSession key={token} token={token} purpose={purpose}>{children}</AccountSession>;
};
