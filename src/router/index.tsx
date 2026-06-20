import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { ProtectedRoute, PublicRoute } from './guards';
import { RouteError } from '../components/RouteError';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ClientesPage } from '../pages/ClientesPage';
import { EquiposPage } from '../pages/EquiposPage';
import { ReparacionesPage } from '../pages/ReparacionesPage';
import { ReparacionDetallePage } from '../pages/ReparacionDetallePage';
import { RepuestosPage } from '../pages/RepuestosPage';
import { PlanesPage } from '../pages/PlanesPage';
import { SuscripcionResultadoPage } from '../pages/SuscripcionResultadoPage';

// Configuración de rutas
const appRoutes = [
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
    path: '/suscripcion/resultado',
    element: (
      <ProtectedRoute>
        <SuscripcionResultadoPage />
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
];

// Ruta raíz con errorElement: cualquier error de render cae en una pantalla amigable.
export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    children: appRoutes,
  },
]);

