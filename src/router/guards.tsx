import { Link, Navigate, useLocation } from 'react-router';
import { useEffect, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { authStore, useAuth } from '../store/auth.store';
import { isTokenExpired } from '../utils/jwt';
import { useSuscripcionQuery } from '../api/queries/suscripcion.queries';
import { AccountRoute } from './AccountRoute';
import { useAccountProfile } from './accountProfile';
import { workshopClosureEnabled } from '../config/workshopClosure';
import { Loader } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import { isEmailVerificationRequired } from '../api/axios';
import { EmailVerificationPreview, UnverifiedSubscriptionPage } from '../pages/EmailVerificationPreview';

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
  const sesionInvalida = status === 401 || (status === 403 && !isEmailVerificationRequired(error));

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
      <div className="text-center">
        <ErrorState
          title="No pudimos validar tu sesión"
          message="Revisá tu conexión e intentá de nuevo. Tu sesión sigue abierta."
          onRetry={() => void refetch()}
        />
        <Link to="/cuenta" className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-primary underline focus-visible:outline focus-visible:outline-primary">
          Ir a Cuenta y privacidad
        </Link>
      </div>
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
  return <AccountRoute purpose="session"><OperationalAccess>{children}</OperationalAccess></AccountRoute>;
};

/** El estado remoto precede al plan: un taller restringido no consulta /suscripcion. */
const OperationalAccess = ({ children }: GuardProps) => {
  const profile = useAccountProfile();
  const { pathname } = useLocation();
  if (profile.accesoTaller === 'RESTRICTED') {
    return <Navigate to={workshopClosureEnabled && profile.usuario.role === 'ADMIN' ? '/cuenta/cierre' : '/cuenta'} replace />;
  }
  if (!profile.usuario.emailVerificado) {
    if (pathname === '/planes' && profile.usuario.role === 'ADMIN') return <UnverifiedSubscriptionPage />;
    return <EmailVerificationPreview />;
  }
  return <SessionGate>{children}</SessionGate>;
};

/** Exportar/cerrar tampoco puede saltarse el gate entrando por Cuenta. */
export const VerifiedEmailRoute = ({ children }: GuardProps) =>
  useAccountProfile().usuario.emailVerificado ? <>{children}</> : <EmailVerificationPreview />;

const PublicSessionRedirect = () => {
  const profile = useAccountProfile();
  const location = useLocation();
  const accountReturn = location.state?.from?.pathname === '/cuenta/cierre';
  if (profile.accesoTaller === 'RESTRICTED' || accountReturn) {
    return <Navigate to={workshopClosureEnabled && profile.usuario.role === 'ADMIN' ? '/cuenta/cierre' : '/cuenta'} replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

/** Rutas públicas (login/registro): si ya hay sesión válida, redirige al dashboard. */
export const PublicRoute = ({ children }: GuardProps) => {
  const { token, isAuthenticated } = useAuth();
  if (sesionValida(token, isAuthenticated)) {
    return <AccountRoute purpose="session"><PublicSessionRedirect /></AccountRoute>;
  }
  return <>{children}</>;
};
