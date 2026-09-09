import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cobro, CobrosReparacion, Reparacion } from '../types';

const mocks = vi.hoisted(() => ({
  useRepuestosQuery: vi.fn(),
  usePresupuestosQuery: vi.fn(),
  useCobrosQuery: vi.fn(),
  refetchRepuestos: vi.fn(),
  refetchPresupuestos: vi.fn(),
  refetchCobros: vi.fn(),
  cambiarEstado: vi.fn(),
  isAdmin: true,
}));

const reparacion: Reparacion = {
  id: 7,
  equipoId: 3,
  equipoMarca: 'Apple',
  equipoModelo: 'iPhone 13',
  clienteId: 4,
  clienteNombre: 'Ana',
  clienteApellido: 'Pérez',
  clienteTelefono: '1122334455',
  descripcionProblema: 'No enciende',
  estado: 'INGRESADO',
  precioEstimado: 50000,
  precioFinal: null,
  fechaIngreso: '2026-08-20',
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
  numeroOrden: 'ORD-2026-0007',
  total: 50000,
  estadoPago: 'SIN_COBRAR',
};

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../api/queries/reparaciones.queries', () => ({
  useReparacionQuery: () => ({
    data: reparacion,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    credenciales: { patronDesbloqueo: null, pinDesbloqueo: null },
    limpiarCredenciales: vi.fn(),
    refetchCredenciales: vi.fn(),
  }),
}));

vi.mock('../api/queries/repuestos.queries', () => ({
  useRepuestosPorReparacionQuery: mocks.useRepuestosQuery,
}));

vi.mock('../api/queries/presupuestos.queries', () => ({
  usePresupuestosQuery: mocks.usePresupuestosQuery,
}));

vi.mock('../api/queries/cobros.queries', () => ({
  useCobrosQuery: mocks.useCobrosQuery,
}));

vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: () => ({ cobros: true }),
}));

vi.mock('../api/mutations/presupuestos.mutations', () => ({
  useResponderPresupuestoTallerMutation: () => ({ isPending: false, mutate: vi.fn() }),
  useRepresupuestarMutation: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock('../api/mutations/reparaciones.mutations', () => ({
  useCambiarEstadoMutation: () => ({ isPending: false, mutate: mocks.cambiarEstado }),
  useDeleteReparacionMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../api/mutations/repuestos.mutations', () => ({
  useDeleteRepuestoMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../store/auth.store', async (importOriginal) => ({
  ...await importOriginal<typeof import('../store/auth.store')>(),
  useAuth: () => ({ isAdmin: mocks.isAdmin }),
}));

vi.mock('../components/ReparacionFormModal', () => ({ ReparacionFormModal: () => null }));
vi.mock('../components/RepuestoFormModal', () => ({
  RepuestoFormModal: ({
    isOpen,
    lockedReparacionId,
  }: {
    isOpen: boolean;
    lockedReparacionId?: number;
  }) => (isOpen ? (
    <div role="dialog" aria-label="Editor de repuesto simulado">
      Orden {lockedReparacionId}
    </div>
  ) : null),
}));
vi.mock('../components/PresupuestoFormModal', () => ({ PresupuestoFormModal: () => null }));
vi.mock('../components/CobroFormModal', () => ({ CobroFormModal: () => null }));
vi.mock('../components/CobroAnulacionModal', () => ({
  CobroAnulacionModal: ({ isOpen, cobro }: { isOpen: boolean; cobro: Cobro | null }) => (
    isOpen ? <div role="dialog" aria-label="Anulación simulada">Cobro {cobro?.id}</div> : null
  ),
}));
vi.mock('../components/ReclamoGarantiaModal', () => ({ ReclamoGarantiaModal: () => null }));
vi.mock('../components/ConfirmDialog', () => ({ ConfirmDialog: () => null }));

import { ReparacionDetallePage } from './ReparacionDetallePage';

const pendingResult = (refetch: ReturnType<typeof vi.fn>) => ({
  data: undefined,
  isPending: true,
  isError: false,
  isSuccess: false,
  refetch,
});

const errorResult = (refetch: ReturnType<typeof vi.fn>) => ({
  data: undefined,
  isPending: false,
  isError: true,
  isSuccess: false,
  refetch,
});

const successResult = <T,>(data: T, refetch: ReturnType<typeof vi.fn>) => ({
  data,
  isPending: false,
  isError: false,
  isSuccess: true,
  refetch,
});

const renderPage = () => render(
  <MemoryRouter initialEntries={['/reparaciones/7']}>
    <Routes>
      <Route path="/reparaciones/:id" element={<ReparacionDetallePage />} />
    </Routes>
  </MemoryRouter>,
);

describe('ReparacionDetallePage — estados honestos de subconsultas', () => {
  beforeEach(() => {
    mocks.refetchRepuestos.mockReset();
    mocks.refetchPresupuestos.mockReset();
    mocks.refetchCobros.mockReset();
    mocks.cambiarEstado.mockReset();
    mocks.useRepuestosQuery.mockReturnValue(pendingResult(mocks.refetchRepuestos));
    mocks.usePresupuestosQuery.mockReturnValue(pendingResult(mocks.refetchPresupuestos));
    mocks.useCobrosQuery.mockReturnValue(pendingResult(mocks.refetchCobros));
    mocks.isAdmin = true;
  });

  it('muestra loaders locales, no inventa vacíos ni importes y bloquea las acciones dependientes', () => {
    renderPage();

    const repuestos = screen.getByRole('region', { name: 'Repuestos' });
    const presupuestos = screen.getByRole('region', { name: 'Presupuestos' });
    const cobros = screen.getByRole('region', { name: 'Cobros' });

    expect(within(repuestos).getByRole('status')).toHaveTextContent('Cargando repuestos');
    expect(within(presupuestos).getByRole('status')).toHaveTextContent('Cargando presupuestos');
    expect(within(cobros).getByRole('status')).toHaveTextContent('Cargando cobros');

    expect(within(repuestos).queryByText('Sin repuestos cargados.')).not.toBeInTheDocument();
    expect(within(presupuestos).queryByText(/Sin presupuestos/)).not.toBeInTheDocument();
    expect(within(cobros).queryByText('Sin cobros registrados.')).not.toBeInTheDocument();
    expect(within(repuestos).getByRole('button', { name: 'Agregar' })).toBeDisabled();
    expect(within(presupuestos).getByRole('button', { name: 'Nuevo' })).toBeDisabled();
    expect(within(cobros).getByRole('button', { name: 'Registrar cobro' })).toBeDisabled();
    expect(within(cobros).getByRole('link', { name: 'Resumen digital' }))
      .toHaveAttribute('aria-disabled', 'true');
    expect(within(cobros).queryByText('$0')).not.toBeInTheDocument();
  });

  it('muestra errores aislados y cada reintento actúa sólo sobre su sección', async () => {
    const user = userEvent.setup();
    mocks.useRepuestosQuery.mockReturnValue(errorResult(mocks.refetchRepuestos));
    mocks.usePresupuestosQuery.mockReturnValue(errorResult(mocks.refetchPresupuestos));
    mocks.useCobrosQuery.mockReturnValue(errorResult(mocks.refetchCobros));

    renderPage();

    const repuestos = screen.getByRole('region', { name: 'Repuestos' });
    const presupuestos = screen.getByRole('region', { name: 'Presupuestos' });
    const cobros = screen.getByRole('region', { name: 'Cobros' });

    expect(within(repuestos).getByRole('alert')).toHaveTextContent('No pudimos cargar los repuestos.');
    expect(within(presupuestos).getByRole('alert')).toHaveTextContent('No pudimos cargar los presupuestos.');
    expect(within(cobros).getByRole('alert')).toHaveTextContent('No pudimos cargar los cobros.');
    expect(within(repuestos).queryByText('Sin repuestos cargados.')).not.toBeInTheDocument();
    expect(within(presupuestos).queryByText(/Sin presupuestos/)).not.toBeInTheDocument();
    expect(within(cobros).queryByText('Sin cobros registrados.')).not.toBeInTheDocument();

    await user.click(within(repuestos).getByRole('button', { name: 'Reintentar' }));
    await user.click(within(presupuestos).getByRole('button', { name: 'Reintentar' }));
    await user.click(within(cobros).getByRole('button', { name: 'Reintentar' }));

    expect(mocks.refetchRepuestos).toHaveBeenCalledTimes(1);
    expect(mocks.refetchPresupuestos).toHaveBeenCalledTimes(1);
    expect(mocks.refetchCobros).toHaveBeenCalledTimes(1);
  });

  it('muestra los tres vacíos únicamente después de respuestas exitosas', () => {
    const cobrosVacios: CobrosReparacion = {
      total: 0,
      cobrado: 0,
      saldo: 0,
      excedente: 0,
      requiereRevision: false,
      pagado: false,
      cobros: [],
    };
    mocks.useRepuestosQuery.mockReturnValue(successResult([], mocks.refetchRepuestos));
    mocks.usePresupuestosQuery.mockReturnValue(successResult([], mocks.refetchPresupuestos));
    mocks.useCobrosQuery.mockReturnValue(successResult(cobrosVacios, mocks.refetchCobros));

    renderPage();

    expect(screen.getByText('Sin repuestos cargados.')).toBeInTheDocument();
    expect(screen.getByText(/Sin presupuestos/)).toBeInTheDocument();
    expect(screen.getByText('Sin cobros registrados.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Registrar cobro' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Registrar cobro' })).toHaveAttribute(
      'title',
      'La orden no tiene pendiente de cobro',
    );
    expect(screen.getByRole('link', { name: 'Resumen digital' }))
      .toHaveAttribute('href', '/reparaciones/7/resumen');
  });

  it('muestra activos y anulados como historia auditable, con acción sólo sobre el activo', async () => {
    const user = userEvent.setup();
    mocks.useRepuestosQuery.mockReturnValue(successResult([], mocks.refetchRepuestos));
    mocks.usePresupuestosQuery.mockReturnValue(successResult([], mocks.refetchPresupuestos));
    mocks.useCobrosQuery.mockReturnValue(successResult<CobrosReparacion>({
      total: 50000,
      cobrado: 10000,
      saldo: 40000,
      excedente: 0,
      requiereRevision: false,
      pagado: false,
      cobros: [{
        id: 2,
        reparacionId: 7,
        monto: 10000,
        metodo: 'TRANSFERENCIA',
        referencia: 'OP-123',
        observaciones: 'Seña inicial',
        fecha: '2026-08-20T10:00:00',
        estado: 'ACTIVO',
        anuladoAt: null,
        anuladoPorNombre: null,
        motivoAnulacion: null,
      }, {
        id: 3,
        reparacionId: 7,
        monto: 5000,
        metodo: 'EFECTIVO',
        referencia: null,
        observaciones: null,
        fecha: '2026-08-19T10:00:00',
        estado: 'ANULADO',
        anuladoAt: '2026-08-21T12:00:00',
        anuladoPorNombre: 'Juan Pérez',
        motivoAnulacion: 'Carga duplicada por error de caja',
      }],
    }, mocks.refetchCobros));

    renderPage();

    const cobros = screen.getByRole('region', { name: 'Cobros' });
    expect(within(cobros).getByText('Pendiente de cobro')).toBeVisible();
    expect(within(cobros).getByText(/40\.000/)).toBeVisible();
    expect(within(cobros).getByText(/Referencia:/)).toHaveTextContent('Referencia: OP-123');
    expect(within(cobros).getByText('Observación: Seña inicial')).toBeVisible();
    expect(within(cobros).getByRole('button', { name: 'Registrar cobro' })).toBeEnabled();
    expect(within(cobros).getByText('Anulado')).toBeVisible();
    expect(within(cobros).getByText(/Anulado el.*por Juan Pérez/)).toBeVisible();
    expect(within(cobros).getByText('Motivo: Carga duplicada por error de caja')).toBeVisible();

    const acciones = within(cobros).getAllByRole('button', { name: /Anular cobro de/i });
    expect(acciones).toHaveLength(1);
    expect(acciones[0]).toHaveAccessibleName(/Anular cobro de.*10\.000.*20/);
    await user.click(acciones[0]);
    expect(screen.getByRole('dialog', { name: 'Anulación simulada' })).toHaveTextContent('Cobro 2');
  });

  it('no ofrece anular movimientos a un empleado', () => {
    mocks.isAdmin = false;
    mocks.useRepuestosQuery.mockReturnValue(successResult([], mocks.refetchRepuestos));
    mocks.usePresupuestosQuery.mockReturnValue(successResult([], mocks.refetchPresupuestos));
    mocks.useCobrosQuery.mockReturnValue(successResult<CobrosReparacion>({
      total: 50000,
      cobrado: 10000,
      saldo: 40000,
      excedente: 0,
      requiereRevision: false,
      pagado: false,
      cobros: [{
        id: 2,
        reparacionId: 7,
        monto: 10000,
        metodo: 'EFECTIVO',
        referencia: null,
        observaciones: null,
        fecha: '2026-08-20T10:00:00',
        estado: 'ACTIVO',
        anuladoAt: null,
        anuladoPorNombre: null,
        motivoAnulacion: null,
      }],
    }, mocks.refetchCobros));

    renderPage();

    expect(screen.queryByRole('button', { name: /Anular cobro de/i })).not.toBeInTheDocument();
  });

  it('prioriza el excedente, oculta Cobro completo registrado y bloquea otro cobro', () => {
    mocks.useRepuestosQuery.mockReturnValue(successResult([], mocks.refetchRepuestos));
    mocks.usePresupuestosQuery.mockReturnValue(successResult([], mocks.refetchPresupuestos));
    mocks.useCobrosQuery.mockReturnValue(successResult<CobrosReparacion>({
      total: 50000,
      cobrado: 60000,
      saldo: 0,
      excedente: 10000,
      requiereRevision: true,
      pagado: true,
      cobros: [],
    }, mocks.refetchCobros));

    renderPage();

    const cobros = screen.getByRole('region', { name: 'Cobros' });
    expect(within(cobros).getByText('Excedente a revisar')).toBeVisible();
    expect(within(cobros).getByRole('alert')).toHaveTextContent(/excedente histórico/i);
    expect(within(cobros).queryByText('Cobro completo registrado')).not.toBeInTheDocument();
    expect(within(cobros).getByRole('button', { name: 'Registrar cobro' })).toBeDisabled();
  });

  it('serializa los cambios de estado y bloquea todos los controles hasta finalizar', () => {
    mocks.useRepuestosQuery.mockReturnValue(successResult([], mocks.refetchRepuestos));
    mocks.usePresupuestosQuery.mockReturnValue(successResult([], mocks.refetchPresupuestos));
    mocks.useCobrosQuery.mockReturnValue(successResult({
      total: 0,
      cobrado: 0,
      saldo: 0,
      excedente: 0,
      requiereRevision: false,
      pagado: false,
      cobros: [],
    }, mocks.refetchCobros));

    renderPage();

    const advance = screen.getByRole('button', { name: /Marcar como/i });
    fireEvent.click(advance);
    fireEvent.click(advance);

    expect(mocks.cambiarEstado).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Cambiar estado')).toBeDisabled();
    expect(advance).toBeDisabled();

    const callbacks = mocks.cambiarEstado.mock.calls[0]?.[1] as { onSettled?: () => void };
    act(() => callbacks.onSettled?.());

    expect(screen.getByLabelText('Cambiar estado')).toBeEnabled();
    expect(advance).toBeEnabled();
  });

  it('descarta el estado de los editores al navegar a otra reparación', async () => {
    const user = userEvent.setup();
    mocks.useRepuestosQuery.mockReturnValue(successResult([], mocks.refetchRepuestos));
    mocks.usePresupuestosQuery.mockReturnValue(successResult([], mocks.refetchPresupuestos));
    mocks.useCobrosQuery.mockReturnValue(successResult({
      total: 0,
      cobrado: 0,
      saldo: 0,
      excedente: 0,
      requiereRevision: false,
      pagado: false,
      cobros: [],
    }, mocks.refetchCobros));

    render(
      <MemoryRouter initialEntries={['/reparaciones/7']}>
        <Link to="/reparaciones/8">Ir a otra reparación</Link>
        <Routes>
          <Route path="/reparaciones/:id" element={<ReparacionDetallePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByRole('dialog', { name: 'Editor de repuesto simulado' }))
      .toHaveTextContent('Orden 7');

    await user.click(screen.getByRole('link', { name: 'Ir a otra reparación' }));

    expect(screen.queryByRole('dialog', { name: 'Editor de repuesto simulado' }))
      .not.toBeInTheDocument();
  });
});
