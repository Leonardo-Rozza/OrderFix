import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
    sort: 'nombre,asc',
    setSort: vi.fn(),
  }),
}));

vi.mock('../api/queries/clientes.queries', () => ({
  useClientesQuery: () => ({
    data: {
      content: [cliente],
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    isPlaceholderData: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../api/mutations/clientes.mutations', () => ({
  useDeleteClienteMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../store/auth.store', () => ({
  useAuth: () => ({ isAdmin: true }),
}));

vi.mock('../components/Pagination', () => ({ Pagination: () => null }));
vi.mock('../components/SortSelect', () => ({ SortSelect: () => null }));
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

describe('ClientesPage — alta de equipo desde la ficha', () => {
  it('pasa el cliente conocido completo sin precargar otro catálogo', async () => {
    const user = userEvent.setup();
    render(<ClientesPage />);

    await user.click(screen.getByRole('button', { name: 'Ver ficha de Ana Pérez' }));
    await user.click(screen.getByRole('button', { name: 'Nuevo equipo para Ana' }));

    expect(screen.getByTestId('equipo-form-default')).toHaveTextContent(
      '4 · Ana Pérez · 1122334455',
    );
  });
});
