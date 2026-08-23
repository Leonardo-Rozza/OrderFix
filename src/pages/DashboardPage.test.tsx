import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

const mocks = vi.hoisted(() => ({
  dashboard: {
    data: undefined as unknown,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  clientes: {
    data: undefined as unknown,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  identity: {
    nombreSaludo: 'Juan Pérez',
    taller: 'CelExpress',
    isLoading: false,
  },
}));

const dashboardData = {
  reparacionesPorEstado: {},
  totalReparaciones: 1,
  equiposListos: 0,
  reparacionesEsteMes: 1,
  articulosStockBajo: 0,
  ultimasReparaciones: [
    {
      id: 7,
      equipoId: 3,
      equipoMarca: 'Samsung',
      equipoModelo: 'S24',
      clienteNombre: 'Ana',
      clienteApellido: 'Pérez',
      descripcionProblema: 'No carga',
      estado: 'EN_PROCESO',
      precioEstimado: 1000,
      precioFinal: 2000,
      total: 34567,
      saldo: 12345,
      estadoPago: 'PARCIAL',
      fechaIngreso: '2026-08-20',
      fechaEstimadaEntrega: null,
      fechaEntrega: null,
    },
  ],
};

const clientesData = { content: [], page: { totalElements: 1 } };

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../components/ExportExcelButton', () => ({ ExportExcelButton: () => null }));
vi.mock('../api/queries/dashboard.queries', () => ({
  useDashboardQuery: () => mocks.dashboard,
}));
vi.mock('../api/queries/clientes.queries', () => ({
  useClientesQuery: () => mocks.clientes,
}));
vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: () => ({ inventario: false, cobros: false, empleadosMultiples: false }),
}));
vi.mock('../hooks/useSessionIdentity', () => ({
  useSessionIdentity: () => mocks.identity,
}));

const renderPage = () => render(
  <MemoryRouter>
    <DashboardPage />
  </MemoryRouter>,
);

describe('DashboardPage — consistencia de indicadores', () => {
  beforeEach(() => {
    mocks.dashboard.data = dashboardData;
    mocks.dashboard.isLoading = false;
    mocks.dashboard.isError = false;
    mocks.dashboard.refetch.mockReset();
    mocks.clientes.data = clientesData;
    mocks.clientes.isLoading = false;
    mocks.clientes.isError = false;
    mocks.clientes.refetch.mockReset();
    mocks.identity.nombreSaludo = 'Juan Pérez';
    mocks.identity.taller = 'CelExpress';
    mocks.identity.isLoading = false;
  });

  it('saluda con el username remoto y ubica la actividad en el taller', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Hola, Juan Pérez 👋' })).toBeVisible();
    expect(screen.getByText(/Esto es lo que pasa hoy en/)).toHaveTextContent(
      'Esto es lo que pasa hoy en CelExpress.',
    );
    expect(screen.queryByText(/Hola, admin/)).not.toBeInTheDocument();
  });

  it('el skeleton de identidad no bloquea los indicadores ya disponibles', () => {
    mocks.identity.isLoading = true;

    renderPage();

    expect(screen.getByRole('status', { name: 'Cargando identidad del taller' })).toBeVisible();
    expect(screen.getByText('Reparaciones activas')).toBeVisible();
    expect(screen.getByText('Total reparaciones')).toBeVisible();
  });

  it('muestra total y saldo derivados aunque cobros no esté habilitado', () => {
    renderPage();

    expect(screen.getByText(/34\.567/)).toBeInTheDocument();
    expect(screen.getByText(/Falta.*12\.345/)).toBeInTheDocument();
    expect(screen.queryByText(/2\.000/)).not.toBeInTheDocument();
  });

  it('mantiene todo el bloque de KPI como desconocido mientras carga', () => {
    mocks.dashboard.data = undefined;
    mocks.dashboard.isLoading = true;
    mocks.clientes.data = undefined;
    mocks.clientes.isLoading = true;

    renderPage();

    const indicadores = screen.getByRole('region', { name: 'Indicadores del taller' });
    expect(indicadores).toHaveAttribute('aria-busy', 'true');
    expect(within(indicadores).queryByText('Reparaciones activas')).not.toBeInTheDocument();
    expect(screen.queryByText('Total reparaciones')).not.toBeInTheDocument();
    expect(screen.queryByText('Todavía no hay reparaciones')).not.toBeInTheDocument();
  });

  it('presenta error y reintento sin convertir métricas desconocidas en cero', () => {
    mocks.dashboard.data = undefined;
    mocks.dashboard.isError = true;
    mocks.clientes.data = undefined;
    mocks.clientes.isError = true;

    renderPage();

    const indicadores = screen.getByRole('region', { name: 'Indicadores del taller' });
    expect(within(indicadores).getByText('No pudimos cargar los indicadores del taller.')).toBeInTheDocument();
    expect(within(indicadores).queryByText('Reparaciones activas')).not.toBeInTheDocument();
    expect(screen.getByText('No pudimos cargar los ingresos recientes.')).toBeInTheDocument();
    expect(screen.getByText('No pudimos cargar la distribución por estado.')).toBeInTheDocument();

    fireEvent.click(within(indicadores).getByRole('button', { name: 'Reintentar' }));
    expect(mocks.dashboard.refetch).toHaveBeenCalledOnce();
    expect(mocks.clientes.refetch).toHaveBeenCalledOnce();
  });
});
