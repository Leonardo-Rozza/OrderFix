import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CobrosReparacion, Reparacion } from '../types';

const mocks = vi.hoisted(() => ({
  useRepuestosQuery: vi.fn(),
  usePresupuestosQuery: vi.fn(),
  useCobrosQuery: vi.fn(),
  refetchRepuestos: vi.fn(),
  refetchPresupuestos: vi.fn(),
  refetchCobros: vi.fn(),
  cambiarEstado: vi.fn(),
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

vi.mock('../api/queries/equipos.queries', () => ({
  useEquiposOptions: () => ({ data: [] }),
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

vi.mock('../api/mutations/cobros.mutations', () => ({
  useAnularCobroMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../api/mutations/reparaciones.mutations', () => ({
  useCambiarEstadoMutation: () => ({ isPending: false, mutate: mocks.cambiarEstado }),
  useDeleteReparacionMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../api/mutations/repuestos.mutations', () => ({
  useDeleteRepuestoMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../store/auth.store', () => ({
  useAuth: () => ({ isAdmin: true }),
}));

vi.mock('../components/ReparacionFormModal', () => ({ ReparacionFormModal: () => null }));
vi.mock('../components/RepuestoFormModal', () => ({ RepuestoFormModal: () => null }));
vi.mock('../components/PresupuestoFormModal', () => ({ PresupuestoFormModal: () => null }));
vi.mock('../components/CobroFormModal', () => ({ CobroFormModal: () => null }));
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
    expect(within(cobros).getByRole('button', { name: 'Cobrar' })).toBeDisabled();
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
    expect(screen.getByRole('button', { name: 'Cobrar' })).toBeEnabled();
  });

  it('serializa los cambios de estado y bloquea todos los controles hasta finalizar', () => {
    mocks.useRepuestosQuery.mockReturnValue(successResult([], mocks.refetchRepuestos));
    mocks.usePresupuestosQuery.mockReturnValue(successResult([], mocks.refetchPresupuestos));
    mocks.useCobrosQuery.mockReturnValue(successResult({
      total: 0,
      cobrado: 0,
      saldo: 0,
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
});
