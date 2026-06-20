import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { authStore } from '../store/auth.store';

interface GuardProps {
  children: ReactNode;
}

/** Protege rutas privadas: si no hay sesión, redirige a /login. */
export const ProtectedRoute = ({ children }: GuardProps) => {
  const isAuthenticated = authStore.getState().isAuthenticated;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/** Rutas públicas (login/registro): si ya hay sesión, redirige al dashboard. */
export const PublicRoute = ({ children }: GuardProps) => {
  const isAuthenticated = authStore.getState().isAuthenticated;
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
