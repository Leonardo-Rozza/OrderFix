import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import type { EstadoReparacion, Reparacion } from '../types';

interface MockQueryParams {
  q?: string;
  estado?: EstadoReparacion;
  page: number;
  size: number;
  sort?: string;
}

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  loadingEstado: null as EstadoReparacion | null,
  errorEstado: null as EstadoReparacion | null,
  ingresadoTotal: 1,
  listTotalPages: 5,
  queryParams: [] as MockQueryParams[],
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

vi.mock('../api/queries/reparaciones.queries', () => ({
  useReparacionesQuery: (params: MockQueryParams) => {
    mocks.queryParams.push({ ...params });
    const { estado, page, size } = params;
    const boardQuery = size === 100;

    if (boardQuery && estado === mocks.loadingEstado) {
      return {
        data: undefined,
        isLoading: true,
        isError: false,
        isFetching: false,
        isPlaceholderData: false,
        refetch: mocks.refetch,
      };
    }
    if (boardQuery && estado === mocks.errorEstado) {
      return {
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
        isPlaceholderData: false,
        refetch: mocks.refetch,
      };
    }
    const content = boardQuery
      ? (estado === 'INGRESADO' ? [reparacion] : [])
      : [reparacion];
    return {
      data: {
        content,
        page: {
          number: page,
          size,
          totalElements: boardQuery && estado === 'INGRESADO'
            ? mocks.ingresadoTotal
            : content.length,
          totalPages: boardQuery
            ? (estado === 'INGRESADO' ? Math.ceil(mocks.ingresadoTotal / 100) : 1)
            : mocks.listTotalPages,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isPlaceholderData: false,
      refetch: mocks.refetch,
    };
  },
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

vi.mock('../components/ReparacionFormModal', () => ({
  ReparacionFormModal: ({
    isOpen,
    onClose,
    onCreated,
    onNavigationDiscard,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (id: number) => void;
    onNavigationDiscard?: () => void;
  }) => isOpen ? (
    <div data-testid="reparacion-form-mock">
      <button type="button" onClick={onClose}>Cerrar formulario</button>
      <button type="button" onClick={() => onCreated(99)}>Crear reparación mock</button>
      <button type="button" onClick={onNavigationDiscard}>Descartar navegación mock</button>
    </div>
  ) : null,
}));

import { ReparacionesPage } from './ReparacionesPage';

const renderPage = (
  initialEntries = ['/reparaciones'],
  initialIndex?: number,
) => renderWithProviders(<ReparacionesPage />, {
  initialEntries,
  initialIndex,
  routePath: '/reparaciones',
  additionalRoutes: [
    { path: '/reparaciones/:id', element: <div>Detalle de reparación</div> },
    { path: '/origen', element: <div>Pantalla de origen</div> },
  ],
});

const lastListQuery = () => [...mocks.queryParams]
  .reverse()
  .find(({ size }) => size === 20);

describe('ReparacionesPage — semántica de tarjetas y filas', () => {
  beforeEach(() => {
    mocks.mutate.mockReset().mockImplementation(
      (_variables: unknown, options?: { onSettled?: () => void }) => options?.onSettled?.(),
    );
    mocks.isPending = false;
    mocks.loadingEstado = null;
    mocks.errorEstado = null;
    mocks.ingresadoTotal = 1;
    mocks.listTotalPages = 5;
    mocks.queryParams.length = 0;
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

  it('hidrata vista, filtro, búsqueda, página y orden desde un deep link', async () => {
    renderPage([
      '/reparaciones?vista=list&estado=INGRESADO&q=iphone&page=2&sort=estado%2Casc',
    ]);

    expect(screen.getByRole('button', { name: 'Lista' })).toHaveClass('bg-surface');
    expect(screen.getByRole('button', { name: 'Ingresado' })).toHaveClass('bg-primary');
    expect(screen.getByRole('searchbox', { name: 'Buscar reparaciones' })).toHaveValue('iphone');
    expect(screen.getByRole('combobox')).toHaveValue('estado,asc');
    await waitFor(() => expect(lastListQuery()).toEqual(expect.objectContaining({
      q: 'iphone',
      estado: 'INGRESADO',
      page: 2,
      size: 20,
      sort: 'estado,asc',
    })));
  });

  it('cambia vista y filtro con PUSH, reinicia página y los restaura con historial', async () => {
    const user = userEvent.setup();
    const { router } = renderPage(['/reparaciones?page=2']);

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    await waitFor(() => expect(new URLSearchParams(router.state.location.search).get('vista')).toBe('list'));
    await user.click(screen.getByRole('button', { name: 'En diagnóstico' }));

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('vista')).toBe('list');
      expect(params.get('estado')).toBe('EN_DIAGNOSTICO');
      expect(params.has('page')).toBe(false);
    });
    expect(router.state.historyAction).toBe('PUSH');

    await act(async () => {
      await router.navigate(-1);
    });
    expect(new URLSearchParams(router.state.location.search).get('page')).toBe('2');
    expect(new URLSearchParams(router.state.location.search).has('estado')).toBe(false);
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveClass('bg-primary');

    await act(async () => {
      await router.navigate(1);
    });
    expect(new URLSearchParams(router.state.location.search).get('estado')).toBe('EN_DIAGNOSTICO');
    expect(screen.getByRole('button', { name: 'En diagnóstico' })).toHaveClass('bg-primary');
  });

  it('canonicaliza parámetros inválidos antes de consultar la lista', async () => {
    const user = userEvent.setup();
    const { router } = renderPage([
      '/reparaciones?vista=grid&estado=DESCONOCIDO&sort=hack&page=-1&nuevo=0&extra=1',
    ]);

    await waitFor(() => expect(router.state.location.search).toBe('?extra=1'));
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.queryByTestId('reparacion-form-mock')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    await waitFor(() => expect(lastListQuery()).toEqual(expect.objectContaining({
      q: '',
      estado: undefined,
      page: 0,
      size: 20,
      sort: 'id,desc',
    })));
  });

  it('preserva el listado y elimina sólo nuevo al cerrar un deep link', async () => {
    const user = userEvent.setup();
    const { router } = renderPage([
      '/reparaciones?nuevo=1&vista=list&estado=INGRESADO&q=ada&page=2&sort=estado%2Casc&extra=1',
    ]);

    expect(screen.getByTestId('reparacion-form-mock')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

    await waitFor(() => expect(screen.queryByTestId('reparacion-form-mock')).not.toBeInTheDocument());
    const params = new URLSearchParams(router.state.location.search);
    expect(params.has('nuevo')).toBe(false);
    expect(params.get('vista')).toBe('list');
    expect(params.get('estado')).toBe('INGRESADO');
    expect(params.get('q')).toBe('ada');
    expect(params.get('page')).toBe('2');
    expect(params.get('sort')).toBe('estado,asc');
    expect(params.get('extra')).toBe('1');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('mantiene nuevo al buscar y reinicia página en la misma navegación', async () => {
    const { router } = renderPage([
      '/reparaciones?nuevo=1&vista=list&page=3&extra=1',
    ]);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar reparaciones' }), {
      target: { value: 'motorola' },
    });

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('q')).toBe('motorola');
      expect(params.has('page')).toBe(false);
      expect(params.get('nuevo')).toBe('1');
      expect(params.get('vista')).toBe('list');
      expect(params.get('extra')).toBe('1');
    });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('reemplaza el alta profunda por el detalle creado y no la reabre al volver', async () => {
    const user = userEvent.setup();
    const { router } = renderPage([
      '/origen',
      '/reparaciones?nuevo=1&q=ada',
    ], 1);

    await user.click(screen.getByRole('button', { name: 'Crear reparación mock' }));
    expect(await screen.findByText('Detalle de reparación')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/reparaciones/99');
    expect(router.state.historyAction).toBe('REPLACE');

    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByText('Pantalla de origen')).toBeInTheDocument();
  });

  it('usa PUSH al crear desde el botón local y permite volver al listado exacto', async () => {
    const user = userEvent.setup();
    const { router } = renderPage(['/reparaciones?vista=list&q=ada']);

    await user.click(screen.getByRole('button', { name: 'Nueva reparación' }));
    await user.click(screen.getByRole('button', { name: 'Crear reparación mock' }));
    expect(await screen.findByText('Detalle de reparación')).toBeInTheDocument();
    expect(router.state.historyAction).toBe('PUSH');

    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByRole('searchbox', { name: 'Buscar reparaciones' })).toHaveValue('ada');
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveClass('bg-surface');
    expect(screen.queryByTestId('reparacion-form-mock')).not.toBeInTheDocument();
  });

  it('corrige una página huérfana con REPLACE', async () => {
    mocks.listTotalPages = 2;
    const { router } = renderPage(['/reparaciones?vista=list&page=4']);

    await waitFor(() => expect(router.state.location.search).toBe('?vista=list&page=1'));
    expect(mocks.queryParams.some(({ size, page }) => size === 20 && page === 4)).toBe(true);
    expect(lastListQuery()).toEqual(expect.objectContaining({ page: 1, size: 20 }));
    expect(router.state.historyAction).toBe('REPLACE');
  });
});
