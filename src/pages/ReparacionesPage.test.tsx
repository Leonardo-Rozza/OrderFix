import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useReducer, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageMeta } from '../api/pagination';
import { renderWithProviders } from '../test/renderWithProviders';
import type { EstadoReparacion, Reparacion } from '../types';

interface MockQueryParams {
  q?: string;
  estado?: EstadoReparacion;
  page: number;
  size: number;
  sort?: string;
}

interface MockBoardQueryParams {
  q: string;
  estado: EstadoReparacion;
  size?: number;
  sort?: string;
}

interface MockBoardPage {
  content: Reparacion[];
  page: PageMeta;
}

type MockBoardAttempt =
  | { kind: 'success'; page: MockBoardPage }
  | { kind: 'error' };

interface MockBoardState {
  pages: MockBoardPage[];
  nextAttempts: MockBoardAttempt[];
  isLoading?: boolean;
  isInitialError?: boolean;
  isFetchingNextPage?: boolean;
  isFetchNextPageError?: boolean;
  isRefetchError?: boolean;
}

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  listTotalPages: 5,
  queryParams: [] as MockQueryParams[],
  boardQueryParams: [] as MockBoardQueryParams[],
  boardStates: new Map<EstadoReparacion, MockBoardState>(),
  boardFetchingCount: 0,
  forceRender: null as (() => void) | null,
  fetchNextPage: vi.fn(),
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
  excedente: 0,
  requiereRevision: false,
  estadoPago: 'SIN_COBRAR',
};

const makeReparacion = (id: number, overrides: Partial<Reparacion> = {}): Reparacion => ({
  ...reparacion,
  id,
  equipoId: id,
  equipoModelo: `Equipo ${id}`,
  numeroOrden: `ORD-2026-${String(id).padStart(4, '0')}`,
  ...overrides,
});

const boardPage = (
  number: number,
  content: Reparacion[],
  totalElements: number,
  totalPages: number,
): MockBoardPage => ({
  content,
  page: { number, size: 20, totalElements, totalPages },
});

const defaultBoardState = (estado: EstadoReparacion): MockBoardState => ({
  pages: [boardPage(
    0,
    estado === 'INGRESADO' ? [reparacion] : [],
    estado === 'INGRESADO' ? 1 : 0,
    estado === 'INGRESADO' ? 1 : 0,
  )],
  nextAttempts: [],
});

const getBoardState = (estado: EstadoReparacion): MockBoardState => {
  const existing = mocks.boardStates.get(estado);
  if (existing) return existing;
  const state = defaultBoardState(estado);
  mocks.boardStates.set(estado, state);
  return state;
};

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useIsFetching: () => mocks.boardFetchingCount,
}));

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../api/queries/reparaciones.queries', () => ({
  useReparacionesQuery: (params: MockQueryParams) => {
    mocks.queryParams.push({ ...params });
    const { page, size } = params;
    const content = [reparacion];
    return {
      data: {
        content,
        page: {
          number: page,
          size,
          totalElements: content.length,
          totalPages: mocks.listTotalPages,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isPlaceholderData: false,
      refetch: mocks.refetch,
    };
  },
  useReparacionesBoardInfiniteQuery: (params: MockBoardQueryParams) => {
    mocks.boardQueryParams.push({ ...params });
    const state = getBoardState(params.estado);
    const lastPage = state.pages.at(-1);
    const hasNextPage = lastPage
      ? lastPage.page.number + 1 < lastPage.page.totalPages
      : false;

    return {
      data: state.isLoading || state.isInitialError
        ? undefined
        : {
            pages: state.pages,
            pageParams: state.pages.map(({ page }) => page.number),
          },
      isLoading: !!state.isLoading,
      isPending: !!state.isLoading,
      isError: !!state.isInitialError || !!state.isFetchNextPageError || !!state.isRefetchError,
      isFetching: !!state.isLoading || !!state.isFetchingNextPage,
      isFetchingNextPage: !!state.isFetchingNextPage,
      isFetchNextPageError: !!state.isFetchNextPageError,
      isRefetchError: !!state.isRefetchError,
      hasNextPage,
      fetchNextPage: (options?: { cancelRefetch?: boolean }) => {
        mocks.fetchNextPage({ estado: params.estado, options });
        const attempt = state.nextAttempts.shift();
        if (attempt?.kind === 'error') {
          state.isFetchNextPageError = true;
        } else if (attempt?.kind === 'success') {
          state.pages = [...state.pages, attempt.page];
          state.isFetchNextPageError = false;
        }
        mocks.forceRender?.();
        return Promise.resolve({
          data: { pages: state.pages, pageParams: state.pages.map(({ page }) => page.number) },
          error: attempt?.kind === 'error' ? new Error('Falla incremental') : null,
        });
      },
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

const PageHarness = () => {
  const [, forceRender] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    mocks.forceRender = forceRender;
    return () => {
      if (mocks.forceRender === forceRender) mocks.forceRender = null;
    };
  }, [forceRender]);
  return <ReparacionesPage />;
};

const renderPage = (
  initialEntries = ['/reparaciones'],
  initialIndex?: number,
) => renderWithProviders(<PageHarness />, {
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
    mocks.listTotalPages = 5;
    mocks.queryParams.length = 0;
    mocks.boardQueryParams.length = 0;
    mocks.boardStates.clear();
    mocks.boardFetchingCount = 0;
    mocks.forceRender = null;
    mocks.fetchNextPage.mockReset();
    mocks.refetch.mockReset();
    reparacion.saldo = 50000;
    reparacion.excedente = 0;
    reparacion.requiereRevision = false;
    reparacion.estadoPago = 'SIN_COBRAR';
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

  it('muestra el pendiente derivado aunque registrar cobros no esté habilitado', () => {
    renderPage();
    expect(screen.getAllByText(/Pendiente de cobro/).length).toBeGreaterThan(0);
  });

  it('propaga y prioriza un excedente legacy en kanban y lista', async () => {
    const user = userEvent.setup();
    reparacion.saldo = 0;
    reparacion.excedente = 88323;
    reparacion.requiereRevision = true;
    reparacion.estadoPago = 'PAGADO';

    renderPage();
    expect(screen.getAllByText(/Excedente a revisar.*88\.323/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Pagado')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getAllByText(/Excedente a revisar.*88\.323/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Pagado')).not.toBeInTheDocument();
  });

  it('no anuncia cero ni vacío mientras una etapa sigue cargando', () => {
    mocks.boardStates.set('INGRESADO', {
      pages: [],
      nextAttempts: [],
      isLoading: true,
    });

    renderPage();

    const zona = screen.getByTestId('col-INGRESADO');
    expect(zona).toHaveAttribute('aria-busy', 'true');
    expect(within(zona).getByLabelText('Cargando Ingresado')).toBeInTheDocument();
    expect(within(zona).queryByText('Sin reparaciones')).not.toBeInTheDocument();
    expect(within(zona).queryByText('0')).not.toBeInTheDocument();
  });

  it('muestra error y reintento sólo en la etapa que falló', async () => {
    const user = userEvent.setup();
    mocks.boardStates.set('INGRESADO', {
      pages: [],
      nextAttempts: [],
      isInitialError: true,
    });

    renderPage();

    const zona = screen.getByTestId('col-INGRESADO');
    expect(within(zona).getByText('No se pudo cargar esta etapa')).toBeInTheDocument();
    expect(within(zona).queryByText('Sin reparaciones')).not.toBeInTheDocument();
    expect(within(zona).getByLabelText('Cantidad de Ingresado no disponible')).toHaveTextContent('—');

    await user.click(within(zona).getByRole('button', { name: 'Reintentar' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('muestra progreso y permite pedir el siguiente lote de un solo estado', async () => {
    const user = userEvent.setup();
    const firstTwenty = Array.from({ length: 20 }, (_, index) => makeReparacion(42 - index));
    mocks.boardStates.set('INGRESADO', {
      pages: [boardPage(0, firstTwenty, 42, 3)],
      nextAttempts: [],
    });

    renderPage();

    const zona = screen.getByTestId('col-INGRESADO');
    expect(within(zona).getByRole('status')).toHaveTextContent('20 de 42 visibles');
    const loadMore = within(zona).getByRole('button', {
      name: 'Cargar 20 reparaciones más en Ingresado',
    });
    expect(loadMore).toHaveTextContent('Cargar 20 más');

    await user.click(loadMore);
    expect(mocks.fetchNextPage).toHaveBeenCalledWith({
      estado: 'INGRESADO',
      options: { cancelRefetch: false },
    });
    expect(mocks.boardQueryParams).toContainEqual({
      estado: 'INGRESADO',
      q: '',
      size: 20,
    });
  });

  it('acumula, deduplica y enfoca la primera reparación nueva', async () => {
    const user = userEvent.setup();
    const firstTwenty = Array.from({ length: 20 }, (_, index) => makeReparacion(42 - index));
    const secondPage = [
      makeReparacion(23, { equipoModelo: 'Equipo 23 actualizado' }),
      ...Array.from({ length: 19 }, (_, index) => makeReparacion(22 - index)),
    ];
    mocks.boardStates.set('INGRESADO', {
      pages: [boardPage(0, firstTwenty, 42, 3)],
      nextAttempts: [{ kind: 'success', page: boardPage(1, secondPage, 42, 3) }],
    });

    renderPage();
    const zona = screen.getByTestId('col-INGRESADO');
    await user.click(within(zona).getByRole('button', {
      name: 'Cargar 20 reparaciones más en Ingresado',
    }));

    await waitFor(() => expect(within(zona).getByRole('status')).toHaveTextContent('39 de 42 visibles'));
    expect(within(zona).getAllByTestId('card-23')).toHaveLength(1);
    expect(within(zona).getByText(/Equipo 23 actualizado/)).toBeInTheDocument();
    expect(within(zona).getByRole('button', {
      name: /Abrir reparación ORD-2026-0022/i,
    })).toHaveFocus();
    expect(within(zona).getByRole('button', {
      name: 'Cargar 3 reparaciones más en Ingresado',
    })).toHaveTextContent('Cargar 3 más');
  });

  it('conserva las tarjetas y reintenta una página adicional fallida', async () => {
    const user = userEvent.setup();
    const firstTwenty = Array.from({ length: 20 }, (_, index) => makeReparacion(42 - index));
    const secondTwenty = Array.from({ length: 20 }, (_, index) => makeReparacion(22 - index));
    mocks.boardStates.set('INGRESADO', {
      pages: [boardPage(0, firstTwenty, 42, 3)],
      nextAttempts: [
        { kind: 'error' },
        { kind: 'success', page: boardPage(1, secondTwenty, 42, 3) },
      ],
    });

    renderPage();
    const zona = screen.getByTestId('col-INGRESADO');
    await user.click(within(zona).getByRole('button', {
      name: 'Cargar 20 reparaciones más en Ingresado',
    }));

    expect(within(zona).getByRole('alert')).toHaveTextContent('No pudimos cargar más');
    expect(within(zona).getAllByTestId(/^card-/)).toHaveLength(20);

    await user.click(within(zona).getByRole('button', {
      name: 'Reintentar carga en Ingresado',
    }));
    await waitFor(() => expect(within(zona).getByRole('status')).toHaveTextContent('40 de 42 visibles'));
    expect(within(zona).getAllByTestId(/^card-/)).toHaveLength(40);
    expect(mocks.fetchNextPage).toHaveBeenCalledTimes(2);
  });

  it('conserva datos pero pausa transiciones si falla una reconciliación', async () => {
    const user = userEvent.setup();
    mocks.boardStates.set('INGRESADO', {
      pages: [boardPage(0, [reparacion], 1, 1)],
      nextAttempts: [],
      isRefetchError: true,
    });

    renderPage();

    const zona = screen.getByTestId('col-INGRESADO');
    expect(within(zona).getByRole('alert')).toHaveTextContent('No pudimos actualizar esta etapa');
    expect(within(zona).getByTestId('card-7')).toHaveAttribute('draggable', 'false');
    expect(within(zona).getByRole('button', { name: 'Avanzar' })).toBeDisabled();
    expect(within(zona).getByRole('button', {
      name: /Abrir reparación ORD-2026-0007/i,
    })).toBeEnabled();

    await user.click(within(zona).getByRole('button', { name: 'Actualizar Ingresado' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('bloquea transiciones durante una carga del board pero permite abrir', async () => {
    const user = userEvent.setup();
    mocks.boardFetchingCount = 1;
    mocks.boardStates.set('INGRESADO', {
      pages: [boardPage(0, [reparacion], 21, 2)],
      nextAttempts: [],
      isFetchingNextPage: true,
    });

    renderPage();

    const zona = screen.getByTestId('col-INGRESADO');
    expect(screen.getByTestId('card-7')).toHaveAttribute('draggable', 'false');
    expect(within(zona).getByRole('button', { name: 'Avanzar' })).toBeDisabled();
    expect(within(zona).getByRole('button', {
      name: 'Cargar 20 reparaciones más en Ingresado',
    })).toBeDisabled();

    const openButton = within(zona).getByRole('button', {
      name: /Abrir reparación ORD-2026-0007/i,
    });
    expect(openButton).toBeEnabled();
    await user.click(openButton);
    expect(screen.getByText('Detalle de reparación')).toBeInTheDocument();
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
