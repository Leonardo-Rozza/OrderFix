import { Navigate } from 'react-router';
import { useEffect, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { authStore, useAuth } from '../store/auth.store';
import { isTokenExpired } from '../utils/jwt';
import { useSuscripcionQuery } from '../api/queries/suscripcion.queries';
import { Loader } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';

interface GuardProps {
  children: ReactNode;
}

/** Hay sesión válida si está autenticado y el token existe y no venció. */
const sesionValida = (token: string | null, isAuthenticated: boolean) => {
  return isAuthenticated && !!token && !isTokenExpired(token);
};

/** No deja renderizar datos del taller hasta validar la sesión contra el backend. */
const SessionGate = ({ children }: GuardProps) => {
  const { isPending, isError, error, refetch } = useSuscripcionQuery();
  const status = isAxiosError(error) ? error.response?.status : undefined;
  const sesionInvalida = status === 401 || status === 403;

  useEffect(() => {
    // El interceptor normalmente ya hizo este logout. Lo repetimos de forma
    // idempotente para que el límite también sea seguro con otros queryFn/tests.
    if (sesionInvalida && authStore.getState().isAuthenticated) {
      authStore.getState().logout();
    }
  }, [sesionInvalida]);

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <Loader size="lg" />
        <span className="sr-only">Validando sesión…</span>
      </div>
    );
  }

  if (sesionInvalida) {
    return <Navigate to="/login" replace />;
  }

  if (isError) {
    return (
      <ErrorState
        title="No pudimos validar tu sesión"
        message="Revisá tu conexión e intentá de nuevo. Tu sesión sigue abierta."
        onRetry={() => void refetch()}
      />
    );
  }

  return <>{children}</>;
};

/** Protege rutas privadas: si no hay sesión válida, redirige a /login. */
export const ProtectedRoute = ({ children }: GuardProps) => {
  const { token, isAuthenticated } = useAuth();
  if (!sesionValida(token, isAuthenticated)) {
    return <Navigate to="/login" replace />;
  }
  return <SessionGate>{children}</SessionGate>;
};

/** Rutas públicas (login/registro): si ya hay sesión válida, redirige al dashboard. */
export const PublicRoute = ({ children }: GuardProps) => {
  const { token, isAuthenticated } = useAuth();
  if (sesionValida(token, isAuthenticated)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
