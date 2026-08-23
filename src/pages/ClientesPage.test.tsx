import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/renderWithProviders';
import { API, server } from '../test/server';
import type { Cliente } from '../types';

const cliente: Cliente = {
  id: 4,
  nombre: 'Ana',
  apellido: 'Pérez',
  telefono: '1122334455',
  email: 'ana@example.com',
  direccion: null,
  equiposCount: 1,
  reparacionesCount: 2,
  ultimaVisita: '2026-08-20',
};

interface ListRequest {
  q: string | null;
  page: string | null;
  size: string | null;
  sort: string | null;
}

const mockClientes = (
  requests: ListRequest[],
  totalPagesFor: (page: number) => number = (page) => Math.max(page + 2, 2),
) => {
  server.use(
    http.get(`${API}/clientes`, ({ request }) => {
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
        content: [cliente],
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

vi.mock('../api/mutations/clientes.mutations', () => ({
  useDeleteClienteMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../store/auth.store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/auth.store')>();
  return {
    ...actual,
    useAuth: () => ({ isAdmin: true }),
  };
});

vi.mock('../components/ClienteFormModal', () => ({ ClienteFormModal: () => null }));
vi.mock('../components/ConfirmDialog', () => ({ ConfirmDialog: () => null }));
vi.mock('../components/ClienteFichaModal', () => ({
  ClienteFichaModal: ({
    isOpen,
    cliente: selected,
    onNuevoEquipo,
  }: {
    isOpen: boolean;
    cliente: Cliente | null;
    onNuevoEquipo: () => void;
  }) => isOpen && selected ? (
    <button type="button" onClick={onNuevoEquipo}>
      Nuevo equipo para {selected.nombre}
    </button>
  ) : null,
}));
vi.mock('../components/EquipoFormModal', () => ({
  EquipoFormModal: ({
    isOpen,
    defaultCliente,
  }: {
    isOpen: boolean;
    defaultCliente?: Cliente | null;
  }) => isOpen && defaultCliente ? (
    <div data-testid="equipo-form-default">
      {defaultCliente.id} · {defaultCliente.nombre} {defaultCliente.apellido} · {defaultCliente.telefono}
    </div>
  ) : null,
}));

import { ClientesPage } from './ClientesPage';

describe('ClientesPage — estado navegable del listado', () => {
  it('hidrata q, página y orden desde un deep link y consulta esos valores', async () => {
    const requests: ListRequest[] = [];
    mockClientes(requests);

    renderWithProviders(<ClientesPage />, {
      initialEntries: ['/clientes?q=%20Ana%20&page=2&sort=id%2Cdesc'],
    });

    expect(screen.getByRole('searchbox', { name: 'Buscar clientes' })).toHaveValue(' Ana ');
    expect(screen.getByRole('combobox', { name: 'Ordenar' })).toHaveValue('id,desc');
    expect(await screen.findByRole('button', { name: 'Ver ficha de Ana Pérez' })).toBeInTheDocument();
    expect(requests).toContainEqual({
      q: 'Ana',
      page: '2',
      size: '20',
      sort: 'id,desc',
    });
  });

  it('canonicaliza parámetros inválidos antes de construir una consulta segura', async () => {
    const requests: ListRequest[] = [];
    mockClientes(requests);
    const { router } = renderWithProviders(<ClientesPage />, {
      initialEntries: ['/clientes?q=%20%20&page=-1&page=2&sort=DROP&externo=1'],
    });

    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    expect(requests).toEqual([
      { q: null, page: '0', size: '20', sort: 'nombre,asc' },
    ]);
    await waitFor(() => expect(router.state.location.search).toBe('?externo=1'));
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('reemplaza la búsqueda y reinicia la página sin perder el orden', async () => {
    const requests: ListRequest[] = [];
    mockClientes(requests);
    const { router } = renderWithProviders(<ClientesPage />, {
      initialEntries: ['/clientes?page=2&sort=id%2Cdesc'],
    });

    await waitFor(() => expect(requests.some(({ page }) => page === '2')).toBe(true));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar clientes' }), {
      target: { value: '  Mara  ' },
    });

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('q')).toBe('  Mara  ');
      expect(params.has('page')).toBe(false);
      expect(params.get('sort')).toBe('id,desc');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    await waitFor(
      () => expect(requests).toContainEqual({
        q: 'Mara',
        page: '0',
        size: '20',
        sort: 'id,desc',
      }),
      { timeout: 1_000 },
    );
  });

  it('agrega el orden al historial y reinicia la página', async () => {
    const user = userEvent.setup();
    const requests: ListRequest[] = [];
    mockClientes(requests);
    const { router } = renderWithProviders(<ClientesPage />, {
      initialEntries: ['/clientes?q=Ana&page=2&sort=id%2Cdesc'],
    });

    await waitFor(() => expect(requests.some(({ page }) => page === '2')).toBe(true));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ordenar' }), 'apellido,asc');

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('q')).toBe('Ana');
      expect(params.has('page')).toBe(false);
      expect(params.get('sort')).toBe('apellido,asc');
    });
    expect(router.state.historyAction).toBe('PUSH');
    await waitFor(() => expect(requests).toContainEqual({
      q: 'Ana',
      page: '0',
      size: '20',
      sort: 'apellido,asc',
    }));
  });

  it('corrige por metadata con REPLACE y no agrega una entrada espuria', async () => {
    const requests: ListRequest[] = [];
    mockClientes(requests, () => 2);
    const { router } = renderWithProviders(<ClientesPage />, {
      initialEntries: ['/anterior', '/clientes?page=4'],
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

describe('ClientesPage — alta de equipo desde la ficha', () => {
  it('pasa el cliente conocido completo sin precargar otro catálogo', async () => {
    const user = userEvent.setup();
    const requests: ListRequest[] = [];
    mockClientes(requests);
    renderWithProviders(<ClientesPage />);

    await user.click(await screen.findByRole('button', { name: 'Ver ficha de Ana Pérez' }));
    await user.click(screen.getByRole('button', { name: 'Nuevo equipo para Ana' }));

    expect(screen.getByTestId('equipo-form-default')).toHaveTextContent(
      '4 · Ana Pérez · 1122334455',
    );
  });
});
