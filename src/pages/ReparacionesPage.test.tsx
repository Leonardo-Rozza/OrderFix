import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EstadoReparacion, Reparacion } from '../types';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  loadingEstado: null as EstadoReparacion | null,
  errorEstado: null as EstadoReparacion | null,
  ingresadoTotal: 1,
  refetch: vi.fn(),
}));

const reparacion: Reparacion = {
  id: 7,
  equipoId: 3,
  equipoMarca: 'Apple',
  equipoModelo: 'iPhone 13',
  clienteNombre: 'Ana',
  clienteApellido: 'Pérez',
  descripcionProblema: 'No enciende',
  estado: 'INGRESADO',
  precioEstimado: 50000,
  precioFinal: null,
  fechaIngreso: '2026-08-13',
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
  numeroOrden: 'ORD-2026-0007',
  total: 50000,
  cobrado: 0,
  saldo: 50000,
  estadoPago: 'SIN_COBRAR',
};

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../hooks/useListParams', () => ({
  useListParams: () => ({
    q: '',
    onSearch: vi.fn(),
    page: 0,
    setPage: vi.fn(),
    debouncedQ: '',
    size: 20,
    sort: 'id,desc',
    setSort: vi.fn(),
  }),
}));

vi.mock('../api/queries/reparaciones.queries', () => ({
  useReparacionesQuery: ({ estado }: { estado?: EstadoReparacion }) => {
    if (estado === mocks.loadingEstado) {
      return {
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: mocks.refetch,
      };
    }
    if (estado === mocks.errorEstado) {
      return {
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mocks.refetch,
      };
    }
    const content = estado === undefined || estado === 'INGRESADO' ? [reparacion] : [];
    return {
      data: {
        content,
        page: {
          number: 0,
          size: estado === undefined ? 20 : 100,
          totalElements: estado === 'INGRESADO' ? mocks.ingresadoTotal : content.length,
          totalPages: estado === 'INGRESADO' ? Math.ceil(mocks.ingresadoTotal / 100) : 1,
        },
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    };
  },
}));

vi.mock('../api/queries/equipos.queries', () => ({
  useEquiposOptions: () => ({ data: [] }),
}));

vi.mock('../api/queries/dashboard.queries', () => ({
  useDashboardQuery: () => ({ data: undefined }),
}));

vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: () => ({ cobros: false }),
}));

vi.mock('../api/mutations/reparaciones.mutations', () => ({
  useCambiarEstadoMutation: () => ({ isPending: mocks.isPending, mutate: mocks.mutate }),
}));

vi.mock('../components/ReparacionFormModal', () => ({ ReparacionFormModal: () => null }));
vi.mock('../components/Pagination', () => ({ Pagination: () => null }));
vi.mock('../components/SortSelect', () => ({ SortSelect: () => null }));

import { ReparacionesPage } from './ReparacionesPage';

const renderPage = () => render(
  <MemoryRouter initialEntries={['/reparaciones']}>
    <Routes>
      <Route path="/reparaciones" element={<ReparacionesPage />} />
      <Route path="/reparaciones/:id" element={<div>Detalle de reparación</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('ReparacionesPage — semántica de tarjetas y filas', () => {
  beforeEach(() => {
    mocks.mutate.mockReset().mockImplementation(
      (_variables: unknown, options?: { onSettled?: () => void }) => options?.onSettled?.(),
    );
    mocks.isPending = false;
    mocks.loadingEstado = null;
    mocks.errorEstado = null;
    mocks.ingresadoTotal = 1;
    mocks.refetch.mockReset();
  });

  it('separa abrir/avanzar en kanban y conserva drag-and-drop y teclado', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    const card = screen.getByTestId('card-7');
    const primary = screen.getByRole('button', { name: /Abrir reparación ORD-2026-0007/i });
    const advance = screen.getByRole('button', { name: 'Avanzar' });
    expect(card.tagName).toBe('ARTICLE');
    expect(card).toHaveAttribute('draggable', 'true');
    expect(primary.parentElement).toBe(card);
    expect(advance.parentElement).toBe(card);
    expect(primary).not.toContainElement(advance);
    expect(container.querySelector('button button, [role="button"] button')).toBeNull();

    await user.click(advance);
    expect(mocks.mutate).toHaveBeenLastCalledWith(
      { id: 7, estado: 'EN_DIAGNOSTICO' },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
    expect(screen.queryByText('Detalle de reparación')).not.toBeInTheDocument();

    mocks.mutate.mockClear();
    const dataTransfer = { effectAllowed: 'none' };
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(screen.getByTestId('col-EN_DIAGNOSTICO'), { dataTransfer });
    fireEvent.drop(screen.getByTestId('col-EN_DIAGNOSTICO'), { dataTransfer });
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(mocks.mutate).toHaveBeenCalledWith(
      { id: 7, estado: 'EN_DIAGNOSTICO' },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );

    primary.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Detalle de reparación')).toBeInTheDocument();
  });

  it('usa botones hermanos también en la vista lista', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(screen.getByRole('button', { name: 'Lista' }));

    const primary = screen.getByRole('button', { name: /Abrir reparación ORD-2026-0007/i });
    const advance = screen.getByRole('button', { name: 'Avanzar estado' });
    const row = primary.parentElement;
    expect(row?.tagName).toBe('ARTICLE');
    expect(advance.parentElement).toBe(row);
    expect(primary).not.toContainElement(advance);
    expect(container.querySelector('button button, [role="button"] button')).toBeNull();
    expect(advance).toHaveClass('h-11', 'w-11');

    await user.click(advance);
    expect(mocks.mutate).toHaveBeenLastCalledWith(
      { id: 7, estado: 'EN_DIAGNOSTICO' },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
    expect(screen.queryByText('Detalle de reparación')).not.toBeInTheDocument();

    await user.click(primary);
    expect(screen.getByText('Detalle de reparación')).toBeInTheDocument();
  });

  it('muestra el saldo derivado aunque registrar cobros no esté habilitado', () => {
    renderPage();
    expect(screen.getAllByText(/Falta/).length).toBeGreaterThan(0);
  });

  it('no anuncia cero ni vacío mientras una etapa sigue cargando', () => {
    mocks.loadingEstado = 'INGRESADO';

    renderPage();

    const zona = screen.getByTestId('col-INGRESADO');
    expect(zona).toHaveAttribute('aria-busy', 'true');
    expect(within(zona).getByLabelText('Cargando Ingresado')).toBeInTheDocument();
    expect(within(zona).queryByText('Sin reparaciones')).not.toBeInTheDocument();
    expect(within(zona).queryByText('0')).not.toBeInTheDocument();
  });

  it('muestra error y reintento sólo en la etapa que falló', async () => {
    const user = userEvent.setup();
    mocks.errorEstado = 'INGRESADO';

    renderPage();

    const zona = screen.getByTestId('col-INGRESADO');
    expect(within(zona).getByText('No se pudo cargar esta etapa')).toBeInTheDocument();
    expect(within(zona).queryByText('Sin reparaciones')).not.toBeInTheDocument();
    expect(within(zona).getByLabelText('Cantidad de Ingresado no disponible')).toHaveTextContent('—');

    await user.click(within(zona).getByRole('button', { name: 'Reintentar' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('avisa cuando el total de una etapa supera lo cargado', () => {
    mocks.ingresadoTotal = 142;

    renderPage();

    const zona = screen.getByTestId('col-INGRESADO');
    expect(within(zona).getByRole('status')).toHaveTextContent('Mostrando 1 de 142');
    expect(within(zona).getByText(/carga hasta 100 por estado/i)).toBeInTheDocument();
  });

  it('bloquea todos los accesos de transición mientras hay otra en curso', async () => {
    const user = userEvent.setup();
    mocks.isPending = true;

    renderPage();

    const card = screen.getByTestId('card-7');
    const advance = screen.getByRole('button', { name: 'Avanzar' });
    expect(card).toHaveAttribute('draggable', 'false');
    expect(advance).toBeDisabled();

    const dataTransfer = { effectAllowed: 'none' };
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(screen.getByTestId('col-EN_DIAGNOSTICO'), { dataTransfer });
    fireEvent.drop(screen.getByTestId('col-EN_DIAGNOSTICO'), { dataTransfer });
    await user.click(advance);
    expect(mocks.mutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('button', { name: 'Avanzar estado' })).toBeDisabled();
  });
});
