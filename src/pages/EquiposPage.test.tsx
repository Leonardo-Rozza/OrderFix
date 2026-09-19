import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/renderWithProviders';
import { API, server } from '../test/server';
import type { Equipo } from '../types';
import { queryKeys } from '../api/queryKeys';

const mocks = vi.hoisted(() => ({
  deleteEquipo: vi.fn(),
}));

const equipo: Equipo = {
  tipo: 'CELULAR',
  id: 8,
  marca: 'Apple',
  modelo: 'iPhone 13',
  imei: '123456789',
  color: 'Negro',
  descripcion: null,
  clienteId: 4,
  clienteNombre: 'Ana',
  clienteApellido: 'Pérez',
  reparacionesCount: 2,
};

interface ListRequest {
  q: string | null;
  page: string | null;
  size: string | null;
  sort: string | null;
}

const mockEquipos = (
  requests: ListRequest[],
  totalPagesFor: (page: number) => number = (page) => Math.max(page + 2, 2),
) => {
  server.use(
    http.get(`${API}/equipos`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const page = Number(params.get('page') ?? 0);
      const totalPages = totalPagesFor(page);
      requests.push({
        q: params.get('q'),
        page: params.get('page'),
        size: params.get('size'),
        sort: params.get('sort'),
      });

      return HttpResponse.json({
        content: [equipo],
        page: {
          number: page,
          size: 20,
          totalElements: totalPages * 20,
          totalPages,
        },
      });
    }),
  );
};

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../api/mutations/equipos.mutations', () => ({
  useDeleteEquipoMutation: () => ({
    isPending: false,
    mutateAsync: mocks.deleteEquipo,
  }),
}));

vi.mock('../store/auth.store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/auth.store')>();
  return {
    ...actual,
    useAuth: () => ({ isAdmin: true }),
  };
});

vi.mock('../components/EquipoFormModal', () => ({
  EquipoFormModal: ({ isOpen, editing }: { isOpen: boolean; editing: Equipo | null }) =>
    isOpen ? <div data-testid="equipo-form">{editing ? `Editando ${editing.modelo}` : 'Nuevo equipo'}</div> : null,
}));
vi.mock('../components/EquipoReparacionesModal', () => ({
  EquipoReparacionesModal: ({ equipo: selected }: { equipo: Equipo }) => (
    <div data-testid="reparaciones-equipo">Reparaciones de {selected.modelo}</div>
  ),
}));
vi.mock('../components/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="confirm-delete" /> : null,
}));

import { EquiposPage } from './EquiposPage';

describe('EquiposPage — estado navegable del listado', () => {
  it('combina tipo exacto, búsqueda y página; cambia el filtro y restaura todo al volver atrás', async () => {
    const user = userEvent.setup();
    const requests: URLSearchParams[] = [];
    server.use(http.get(`${API}/equipos`, ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return HttpResponse.json({ content: [{ ...equipo, tipo: requests.at(-1)?.get('tipo') }],
        page: { size: 20, number: Number(requests.at(-1)?.get('page')), totalElements: 100, totalPages: 5 } });
    }));
    const { router, queryClient } = renderWithProviders(<EquiposPage />, {
      initialEntries: ['/equipos?q=modelo&page=2&sort=marca%2Casc&tipo=NOTEBOOK'],
    });
    const filtro = screen.getByRole('combobox', { name: 'Filtrar por tipo de equipo' });
    expect(filtro).toHaveValue('NOTEBOOK');
    await waitFor(() => expect(requests.some((p) => p.get('tipo') === 'NOTEBOOK' && p.get('page') === '2')).toBe(true));
    await user.selectOptions(filtro, 'CONSOLA');
    await waitFor(() => expect(requests.some((p) => p.get('tipo') === 'CONSOLA' && p.get('page') === '0' && p.get('q') === 'modelo' && p.get('sort') === 'marca,asc')).toBe(true));
    expect(queryClient.getQueryData(queryKeys.equipos.list({ q: 'modelo', page: 0, size: 20, sort: 'marca,asc', tipo: 'CONSOLA' }))).toBeDefined();
    expect(queryClient.getQueryData(queryKeys.equipos.list({ q: 'modelo', page: 2, size: 20, sort: 'marca,asc', tipo: 'NOTEBOOK' }))).toBeDefined();
    await act(async () => { await router.navigate(-1); });
    expect(filtro).toHaveValue('NOTEBOOK');
    expect(new URLSearchParams(router.state.location.search).get('page')).toBe('2');
    await user.selectOptions(filtro, '');
    await waitFor(() => expect(requests.at(-1)?.has('tipo')).toBe(false));
    expect(new URLSearchParams(router.state.location.search).has('tipo')).toBe(false);
  });

  it.each(['notebook', 'TABLET', ' NOTEBOOK '])('elimina el tipo inválido %s de URL y API', async (tipo) => {
    const requests: string[] = [];
    server.use(http.get(`${API}/equipos`, ({ request }) => {
      requests.push(request.url);
      return HttpResponse.json({ content: [], page: { number: 0, size: 20, totalElements: 0, totalPages: 0 } });
    }));
    const { router } = renderWithProviders(<EquiposPage />, { initialEntries: [`/equipos?tipo=${encodeURIComponent(tipo)}`] });
    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    expect(requests.every((url) => !new URL(url).searchParams.has('tipo'))).toBe(true);
    expect(router.state.location.search).toBe('');
  });

  it('hidrata q, página y orden desde un deep link y consulta esos valores', async () => {
    const requests: ListRequest[] = [];
    mockEquipos(requests);

    renderWithProviders(<EquiposPage />, {
      initialEntries: ['/equipos?q=%20iphone%20&page=3&sort=marca%2Casc'],
    });

    expect(screen.getByRole('searchbox', { name: 'Buscar equipos' })).toHaveValue(' iphone ');
    expect(screen.getByRole('combobox', { name: 'Ordenar' })).toHaveValue('marca,asc');
    expect(await screen.findByRole('button', { name: 'Ver reparaciones de Apple iPhone 13' })).toBeInTheDocument();
    expect(requests).toContainEqual({
      q: 'iphone',
      page: '3',
      size: '20',
      sort: 'marca,asc',
    });
  });

  it('canonicaliza parámetros inválidos antes de construir una consulta segura', async () => {
    const requests: ListRequest[] = [];
    mockEquipos(requests);
    const { router } = renderWithProviders(<EquiposPage />, {
      initialEntries: ['/equipos?q=%20%20&page=01&sort=precio%2Cdesc&externo=1'],
    });

    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    expect(requests).toEqual([
      { q: null, page: '0', size: '20', sort: 'id,desc' },
    ]);
    await waitFor(() => expect(router.state.location.search).toBe('?externo=1'));
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('reemplaza la búsqueda y reinicia la página sin perder el orden', async () => {
    const requests: ListRequest[] = [];
    mockEquipos(requests);
    const { router } = renderWithProviders(<EquiposPage />, {
      initialEntries: ['/equipos?page=2&sort=modelo%2Casc'],
    });

    await waitFor(() => expect(requests.some(({ page }) => page === '2')).toBe(true));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar equipos' }), {
      target: { value: '  Samsung  ' },
    });

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('q')).toBe('  Samsung  ');
      expect(params.has('page')).toBe(false);
      expect(params.get('sort')).toBe('modelo,asc');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    await waitFor(
      () => expect(requests).toContainEqual({
        q: 'Samsung',
        page: '0',
        size: '20',
        sort: 'modelo,asc',
      }),
      { timeout: 1_000 },
    );
  });

  it('agrega el orden al historial y reinicia la página', async () => {
    const user = userEvent.setup();
    const requests: ListRequest[] = [];
    mockEquipos(requests);
    const { router } = renderWithProviders(<EquiposPage />, {
      initialEntries: ['/equipos?q=iphone&page=2&sort=marca%2Casc'],
    });

    await waitFor(() => expect(requests.some(({ page }) => page === '2')).toBe(true));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ordenar' }), 'modelo,asc');

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('q')).toBe('iphone');
      expect(params.has('page')).toBe(false);
      expect(params.get('sort')).toBe('modelo,asc');
    });
    expect(router.state.historyAction).toBe('PUSH');
    await waitFor(() => expect(requests).toContainEqual({
      q: 'iphone',
      page: '0',
      size: '20',
      sort: 'modelo,asc',
    }));
  });

  it('corrige por metadata con REPLACE y no agrega una entrada espuria', async () => {
    const requests: ListRequest[] = [];
    mockEquipos(requests, () => 2);
    const { router } = renderWithProviders(<EquiposPage />, {
      initialEntries: ['/anterior', '/equipos?page=5'],
      initialIndex: 1,
    });

    await waitFor(() => expect(requests.some(({ page }) => page === '1')).toBe(true));
    expect(router.state.location.search).toBe('?page=1');
    expect(router.state.historyAction).toBe('REPLACE');

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/anterior');
  });
});

describe('EquiposPage — semántica de tarjetas', () => {
  it('mantiene navegación, editar y eliminar como botones hermanos sin interacción anidada', async () => {
    const user = userEvent.setup();
    const requests: ListRequest[] = [];
    mockEquipos(requests);
    const { container } = renderWithProviders(<EquiposPage />);

    const primary = await screen.findByRole('button', { name: 'Ver reparaciones de Apple iPhone 13' });
    const edit = screen.getByRole('button', { name: 'Editar' });
    const remove = screen.getByRole('button', { name: 'Eliminar' });
    const card = primary.parentElement;

    expect(card?.tagName).toBe('ARTICLE');
    expect(edit.parentElement).toBe(card);
    expect(remove.parentElement).toBe(card);
    expect(primary).not.toContainElement(edit);
    expect(primary).not.toContainElement(remove);
    expect(container.querySelector('button button, [role="button"] button')).toBeNull();
    expect(edit).toHaveClass('h-11', 'w-11');
    expect(remove).toHaveClass('h-11', 'w-11');

    await user.click(edit);
    expect(screen.getByTestId('equipo-form')).toHaveTextContent('Editando iPhone 13');
    expect(screen.queryByTestId('reparaciones-equipo')).not.toBeInTheDocument();

    primary.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('reparaciones-equipo')).toHaveTextContent('Reparaciones de iPhone 13');

    await user.click(remove);
    expect(screen.getByTestId('confirm-delete')).toBeInTheDocument();
  });
});
