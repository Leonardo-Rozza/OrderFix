import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { authStore } from '../store/auth.store';
import { isTokenExpired } from '../utils/jwt';

interface GuardProps {
  children: ReactNode;
}

/** Hay sesión válida si está autenticado y el token existe y no venció. */
const sesionValida = () => {
  const { token, isAuthenticated } = authStore.getState();
  return isAuthenticated && !!token && !isTokenExpired(token);
};

/** Protege rutas privadas: si no hay sesión válida, redirige a /login. */
export const ProtectedRoute = ({ children }: GuardProps) => {
  if (!sesionValida()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/** Rutas públicas (login/registro): si ya hay sesión válida, redirige al dashboard. */
export const PublicRoute = ({ children }: GuardProps) => {
  if (sesionValida()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
