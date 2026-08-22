import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Equipo } from '../types';

const mocks = vi.hoisted(() => ({
  deleteEquipo: vi.fn(),
  refetch: vi.fn(),
}));

const equipo: Equipo = {
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

vi.mock('../api/queries/equipos.queries', () => ({
  useEquiposQuery: () => ({
    data: {
      content: [equipo],
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  }),
}));

vi.mock('../api/mutations/equipos.mutations', () => ({
  useDeleteEquipoMutation: () => ({
    isPending: false,
    mutateAsync: mocks.deleteEquipo,
  }),
}));

vi.mock('../store/auth.store', () => ({
  useAuth: () => ({ isAdmin: true }),
}));

vi.mock('../components/Pagination', () => ({ Pagination: () => null }));
vi.mock('../components/SortSelect', () => ({ SortSelect: () => null }));
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

describe('EquiposPage — semántica de tarjetas', () => {
  beforeEach(() => {
    mocks.deleteEquipo.mockReset();
  });

  it('mantiene navegación, editar y eliminar como botones hermanos sin interacción anidada', async () => {
    const user = userEvent.setup();
    const { container } = render(<EquiposPage />);

    const primary = screen.getByRole('button', { name: 'Ver reparaciones de Apple iPhone 13' });
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
