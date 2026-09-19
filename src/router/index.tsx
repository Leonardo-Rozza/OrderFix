import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { ProtectedRoute, PublicRoute, VerifiedEmailRoute } from './guards';
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
import { SeguimientoPage } from '../pages/SeguimientoPage';
import { UsuariosPage } from '../pages/UsuariosPage';
import { InventarioPage } from '../pages/InventarioPage';
import { CajaPage } from '../pages/CajaPage';
import { ResumenDigitalPage } from '../pages/ResumenDigitalPage';
import { OlvidePasswordPage } from '../pages/OlvidePasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { VerificarEmailPage } from '../pages/VerificarEmailPage';
import { ReciboCompatRedirect } from './ReciboCompatRedirect';
import { AccountRoute } from './AccountRoute';
import { AccountPage } from '../pages/AccountPage';
import { AccountAccessExitPage } from '../pages/AccountAccessExitPage';
import { AccountExportPage } from '../pages/AccountExportPage';
import AccountClosurePage from '../pages/AccountClosurePage';

// Configuración de rutas
const appRoutes = [
  {
    path: '/cuenta/cierre',
    element: <AccountRoute><VerifiedEmailRoute><AccountClosurePage /></VerifiedEmailRoute></AccountRoute>,
  },
  {
    path: '/cuenta/exportacion',
    element: <AccountRoute><VerifiedEmailRoute><AccountExportPage /></VerifiedEmailRoute></AccountRoute>,
  },
  {
    path: '/cuenta/baja-acceso',
    element: <AccountRoute><AccountAccessExitPage /></AccountRoute>,
  },
  {
    path: '/cuenta',
    element: <AccountRoute><AccountPage /></AccountRoute>,
  },
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
    path: '/olvide-password',
    element: (
      <PublicRoute>
        <OlvidePasswordPage />
      </PublicRoute>
    ),
  },
  {
    // Llega desde el link del email; debe funcionar con o sin sesión abierta.
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    // Ídem: el link del email de bienvenida se puede abrir estando logueado o no.
    path: '/verificar-email',
    element: <VerificarEmailPage />,
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
    path: '/reparaciones/:id/resumen',
    element: (
      <ProtectedRoute>
        <ResumenDigitalPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reparaciones/:id/recibo',
    element: (
      <ProtectedRoute>
        <ReciboCompatRedirect />
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
    path: '/usuarios',
    element: (
      <ProtectedRoute>
        <UsuariosPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventario',
    element: (
      <ProtectedRoute>
        <InventarioPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/caja',
    element: (
      <ProtectedRoute>
        <CajaPage />
      </ProtectedRoute>
    ),
  },
  {
    // Seguimiento público: accesible sin sesión (lo abre el cliente del taller)
    path: '/seguimiento/:codigo',
    element: <SeguimientoPage />,
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
