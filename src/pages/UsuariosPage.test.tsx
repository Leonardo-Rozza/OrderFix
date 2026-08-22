import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Usuario } from '../types';

const mocks = vi.hoisted(() => ({ updateUsuario: vi.fn() }));

const usuarios: Usuario[] = [
  {
    id: 1,
    username: 'titular',
    email: 'admin@taller.com',
    role: 'ADMIN',
    active: true,
  },
  {
    id: 2,
    username: 'tecnico',
    email: 'tecnico@taller.com',
    role: 'USER',
    active: true,
  },
];

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../api/queries/usuarios.queries', () => ({
  useUsuariosQuery: () => ({
    data: usuarios,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: () => ({ empleadosMultiples: true }),
}));

vi.mock('../api/mutations/usuarios.mutations', () => ({
  useUpdateUsuarioMutation: () => ({
    isPending: false,
    mutate: mocks.updateUsuario,
  }),
}));

vi.mock('../store/auth.store', () => ({
  useAuth: () => ({ isAdmin: true, email: 'admin@taller.com' }),
}));

vi.mock('../components/UsuarioFormModal', () => ({ UsuarioFormModal: () => null }));

import { UsuariosPage } from './UsuariosPage';

describe('UsuariosPage — rol del titular', () => {
  it('muestra roles sólo lectura y no permite promover empleados a ADMIN', async () => {
    const user = userEvent.setup();
    render(<UsuariosPage />);

    expect(screen.getByText(/el rol administrador corresponde únicamente al titular/i)).toBeInTheDocument();
    expect(screen.getByText('Administrador titular', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Empleado', { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /admin/i })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Activo' })[1]);
    expect(mocks.updateUsuario).toHaveBeenCalledWith({ id: 2, active: false });
    expect(mocks.updateUsuario).not.toHaveBeenCalledWith(expect.objectContaining({ role: expect.anything() }));
  });
});
