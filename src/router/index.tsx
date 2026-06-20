import { createBrowserRouter, Navigate } from 'react-router';
import { authStore } from '../store/auth.store';
import type { ReactNode } from 'react';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ClientesPage } from '../pages/ClientesPage';
import { EquiposPage } from '../pages/EquiposPage';
import { ReparacionesPage } from '../pages/ReparacionesPage';
import { ReparacionDetallePage } from '../pages/ReparacionDetallePage';
import { RepuestosPage } from '../pages/RepuestosPage';
import { PlanesPage } from '../pages/PlanesPage';

// Componente para proteger rutas privadas
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = authStore.getState().isAuthenticated;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Componente para redirigir si ya está autenticado
const PublicRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = authStore.getState().isAuthenticated;
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Configuración de rutas
export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clientes',
    element: (
      <ProtectedRoute>
        <ClientesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/equipos',
    element: (
      <ProtectedRoute>
        <EquiposPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reparaciones',
    element: (
      <ProtectedRoute>
        <ReparacionesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reparaciones/:id',
    element: (
      <ProtectedRoute>
        <ReparacionDetallePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/repuestos',
    element: (
      <ProtectedRoute>
        <RepuestosPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/planes',
    element: (
      <ProtectedRoute>
        <PlanesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

