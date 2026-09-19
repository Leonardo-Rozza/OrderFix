import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
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
  reparacionesPorEstado: { EN_PROCESO: 1 },
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
      excedente: 0,
      requiereRevision: false,
      estadoPago: 'PARCIAL',
      fechaIngreso: '2026-08-20',
      fechaEstimadaEntrega: null,
      fechaEntrega: null,
    },
  ],
};

const clientesData = { content: [], page: { totalElements: 1 } };

const stateCounts = [
  { key: 'INGRESADO', label: 'Ingresado', count: 1 },
  { key: 'EN_DIAGNOSTICO', label: 'En diagnóstico', count: 2 },
  { key: 'PRESUPUESTADO', label: 'Presupuestado', count: 3 },
  { key: 'ESPERANDO_ADICIONAL', label: 'Esperando adicional', count: 4 },
  { key: 'EN_PROCESO', label: 'En proceso', count: 5 },
  { key: 'ESPERANDO_REPUESTO', label: 'Esperando repuesto', count: 6 },
  { key: 'NO_REPARABLE', label: 'No reparable', count: 7 },
  { key: 'COMPLETADO', label: 'Completado', count: 8 },
  { key: 'LISTO_SIN_REPARAR', label: 'Listo sin reparar', count: 9 },
  { key: 'ENTREGADO', label: 'Entregado', count: 10 },
  { key: 'ABANDONADO', label: 'Abandonado', count: 11 },
  { key: 'CANCELADO', label: 'Cancelado', count: 12 },
];

const distributedData = {
  ...dashboardData,
  reparacionesPorEstado: Object.fromEntries(stateCounts.map(({ key, count }) => [key, count])),
  totalReparaciones: 78,
};

const RepairsDestination = () => {
  const location = useLocation();
  return <output aria-label="Destino de reparaciones">{location.pathname}{location.search}</output>;
};

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
  <MemoryRouter initialEntries={['/dashboard']}>
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/reparaciones" element={<RepairsDestination />} />
      <Route path="/reparaciones/7" element={<div>Detalle de la reparación 7</div>} />
    </Routes>
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
    dashboardData.ultimasReparaciones[0].saldo = 12345;
    dashboardData.ultimasReparaciones[0].excedente = 0;
    dashboardData.ultimasReparaciones[0].requiereRevision = false;
    dashboardData.ultimasReparaciones[0].estadoPago = 'PARCIAL';
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

  it('muestra total y pendiente derivados aunque cobros no esté habilitado', () => {
    renderPage();

    const reciente = screen.getByRole('button', { name: 'Abrir reparación #7 — Samsung S24' });
    expect(within(reciente).getByText('Samsung S24')).toBeInTheDocument();
    expect(within(reciente).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(reciente).getAllByText('En proceso')).toHaveLength(1);
    expect(within(reciente).getByText(/34\.567/)).toBeInTheDocument();
    expect(within(reciente).getAllByText(/Pendiente de cobro.*12\.345/)).toHaveLength(1);
    expect(screen.queryByText(/2\.000/)).not.toBeInTheDocument();
  });

  it('prioriza el excedente de una reparación reciente sobre Cobro completo registrado', () => {
    dashboardData.ultimasReparaciones[0].saldo = 0;
    dashboardData.ultimasReparaciones[0].excedente = 88323;
    dashboardData.ultimasReparaciones[0].requiereRevision = true;
    dashboardData.ultimasReparaciones[0].estadoPago = 'PAGADO';

    renderPage();

    expect(screen.getByText(/Excedente a revisar.*88\.323/)).toBeVisible();
    expect(screen.queryByText('Cobro completo registrado')).not.toBeInTheDocument();
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

  it.each(['clic', 'Enter', ' '])('conserva la apertura de una reparación reciente mediante %s', (accion) => {
    renderPage();
    const reciente = screen.getByRole('button', { name: 'Abrir reparación #7 — Samsung S24' });

    if (accion === 'clic') fireEvent.click(reciente);
    else fireEvent.keyDown(reciente, { key: accion });

    expect(screen.getByText('Detalle de la reparación 7')).toBeInTheDocument();
  });

  it('mantiene el estado vacío y la acción de nueva reparación sin inventar filas ni estados', () => {
    mocks.dashboard.data = { ...dashboardData, reparacionesPorEstado: {}, totalReparaciones: 0, ultimasReparaciones: [] };
    renderPage();

    expect(screen.getByText('Todavía no hay reparaciones')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Abrir reparación/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva reparación' })).toBeEnabled();
    expect(screen.queryByText(/Pendiente de cobro|Cobro completo registrado|Excedente a revisar/)).not.toBeInTheDocument();
  });

  it('resume los doce estados en seis etapas sin perder cantidades ni el total', () => {
    mocks.dashboard.data = distributedData;
    renderPage();

    const panel = screen.getByRole('region', { name: 'Reparaciones por estado' });
    expect(within(panel).getByRole('heading', { name: 'Reparaciones por estado' })).toBeVisible();
    const expectedPhases = [
      ['Ingreso', '1'], ['Diagnóstico', '2'], ['Aprobación', '7'],
      ['En trabajo', '18'], ['Listo', '17'], ['Cerradas', '33'],
    ];
    for (const [label, count] of expectedPhases) {
      const term = within(panel).getByText(label, { exact: true });
      expect(within(term.parentElement!).getByText(count, { exact: true })).toBeVisible();
    }
    expect(within(panel).getByText('Total reparaciones')).toBeVisible();
    expect(within(panel).getByText('78', { exact: true })).toBeVisible();
    expect(within(panel).queryAllByRole('link')).toHaveLength(0);
    expect(within(panel).getByRole('button', { name: 'Ver todos los estados' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('expande y contrae con teclado, conserva aria-controls y muestra el desglose exacto', async () => {
    mocks.dashboard.data = distributedData;
    const user = userEvent.setup();
    renderPage();

    const panel = screen.getByRole('region', { name: 'Reparaciones por estado' });
    const toggle = within(panel).getByRole('button', { name: 'Ver todos los estados' });
    const controls = toggle.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    toggle.focus();
    await user.keyboard('{Enter}');

    expect(within(panel).getByRole('button', { name: 'Ver menos' })).toHaveAttribute('aria-expanded', 'true');
    const details = document.getElementById(controls!);
    expect(details).toBeVisible();
    expect(within(details!).getAllByRole('link')).toHaveLength(12);
    for (const { key, label, count } of stateCounts) {
      const link = within(details!).getByRole('link', { name: new RegExp(`^${label}\\b`) });
      expect(link).toHaveAttribute('href', `/reparaciones?vista=list&estado=${key}`);
      expect(within(link).getByText(String(count), { exact: true })).toBeVisible();
    }
    expect(within(panel).getByText('78', { exact: true })).toBeVisible();

    await user.keyboard(' ');
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', controls);
    expect(toggle).toHaveAccessibleName('Ver todos los estados');
    expect(within(panel).queryAllByRole('link')).toHaveLength(0);
  });

  it.each([
    { key: 'EN_PROCESO', label: 'En proceso', count: 1 },
    { key: 'ESPERANDO_ADICIONAL', label: 'Esperando adicional', count: 0 },
  ])('abre la lista filtrada por $key aunque el conteo sea $count', async ({ key, label, count }) => {
    const user = userEvent.setup();
    renderPage();
    const panel = screen.getByRole('region', { name: 'Reparaciones por estado' });
    await user.click(within(panel).getByRole('button', { name: 'Ver todos los estados' }));
    const link = within(panel).getByRole('link', { name: new RegExp(`^${label}\\b`) });
    expect(within(link).getByText(String(count), { exact: true })).toBeVisible();
    await user.click(link);
    expect(screen.getByLabelText('Destino de reparaciones')).toHaveTextContent(`/reparaciones?vista=list&estado=${key}`);
  });

  it('con cero reparaciones conserva seis etapas en cero y un único vacío de ingresos', async () => {
    mocks.dashboard.data = { ...dashboardData, reparacionesPorEstado: {}, totalReparaciones: 0, equiposListos: 0, reparacionesEsteMes: 0, ultimasReparaciones: [] };
    const user = userEvent.setup();
    renderPage();
    const panel = screen.getByRole('region', { name: 'Reparaciones por estado' });
    for (const label of ['Ingreso', 'Diagnóstico', 'Aprobación', 'En trabajo', 'Listo', 'Cerradas']) {
      const term = within(panel).getByText(label, { exact: true });
      expect(within(term.parentElement!).getByText('0', { exact: true })).toBeVisible();
    }
    expect(screen.getAllByText('Todavía no hay reparaciones')).toHaveLength(1);
    expect(within(panel).queryByText(/sin reparaciones|todavía no hay reparaciones/i)).not.toBeInTheDocument();
    expect(within(panel).queryAllByRole('link')).toHaveLength(0);
    await user.click(within(panel).getByRole('button', { name: 'Ver todos los estados' }));
    const links = within(panel).getAllByRole('link');
    expect(links).toHaveLength(12);
    for (const link of links) expect(within(link).getByText('0', { exact: true })).toBeVisible();
  });

  it('el panel en carga no inventa conteos ni permite desplegar estados', () => {
    mocks.dashboard.data = undefined;
    mocks.dashboard.isLoading = true;
    renderPage();

    const panel = screen.getByRole('region', { name: 'Reparaciones por estado' });
    expect(panel).toHaveAttribute('aria-busy', 'true');
    expect(within(panel).getByLabelText('Cargando reparaciones por estado')).toBeInTheDocument();
    expect(within(panel).queryByText(/^0$/)).not.toBeInTheDocument();
    expect(within(panel).queryByText('Total reparaciones')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Ver todos los estados' })).not.toBeInTheDocument();
    expect(within(panel).queryAllByRole('link')).toHaveLength(0);
  });

  it.each([
    { scenario: 'sin respuesta', data: undefined, isError: false },
    { scenario: 'error con datos previos', data: distributedData, isError: true },
    { scenario: 'mapa de estados ausente', data: { ...dashboardData, reparacionesPorEstado: undefined }, isError: false },
    { scenario: 'total ausente', data: { ...dashboardData, totalReparaciones: undefined }, isError: false },
  ])('el panel distingue $scenario de un total cero y permite reintentar', ({ data, isError }) => {
    mocks.dashboard.data = data;
    mocks.dashboard.isError = isError;
    renderPage();

    const panel = screen.getByRole('region', { name: 'Reparaciones por estado' });
    expect(within(panel).getByText('No pudimos cargar la distribución por estado.')).toBeVisible();
    expect(within(panel).queryByText(/^0$|^78$/)).not.toBeInTheDocument();
    expect(within(panel).queryByText('Total reparaciones')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Ver todos los estados' })).not.toBeInTheDocument();
    expect(within(panel).queryAllByRole('link')).toHaveLength(0);
    fireEvent.click(within(panel).getByRole('button', { name: 'Reintentar' }));
    expect(mocks.dashboard.refetch).toHaveBeenCalledOnce();
    expect(mocks.clientes.refetch).not.toHaveBeenCalled();
  });
});
