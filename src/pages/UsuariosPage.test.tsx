import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    mocks.updateUsuario.mockClear();
    usuarios[0].emailVerificado = true;
    usuarios[1].active = true;
    delete usuarios[1].emailVerificado;
  });

  it.each([
    [true, true], [true, false], [false, true], [false, false],
  ])('separates activation %s from email verification %s', async (active, verified) => {
    const user = userEvent.setup();
    usuarios[1].active = active;
    usuarios[1].emailVerificado = verified;
    render(<UsuariosPage />);
    const employeeIdentity = within(screen.getByText('tecnico@taller.com').parentElement!);
    const expected = verified ? 'Email verificado' : 'Email pendiente de verificación';
    expect(employeeIdentity.getByText(expected, { exact: true })).toBeInTheDocument();
    expect(employeeIdentity.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /verificar|reenviar/i })).not.toBeInTheDocument();
    const activation = screen.getAllByRole('button', { name: active ? 'Activo' : 'Inactivo' })
      .find((button) => !button.hasAttribute('disabled'))!;
    await user.click(activation);
    expect(mocks.updateUsuario).toHaveBeenCalledExactlyOnceWith({ id: 2, active: !active });
    expect(employeeIdentity.getByText(expected, { exact: true })).toBeInTheDocument();
  });

  it('does not infer verification from an older response that omits the field', () => {
    render(<UsuariosPage />);
    const employeeIdentity = within(screen.getByText('tecnico@taller.com').parentElement!);
    expect(employeeIdentity.getByText('Verificación de email no disponible')).toBeInTheDocument();
    expect(employeeIdentity.queryByText('Email pendiente de verificación')).not.toBeInTheDocument();
    expect(employeeIdentity.queryByText('Email verificado')).not.toBeInTheDocument();
  });

  it('updates the displayed verification when the existing query returns new data', () => {
    usuarios[1].emailVerificado = false;
    const { rerender } = render(<UsuariosPage />);
    const employeeIdentity = within(screen.getByText('tecnico@taller.com').parentElement!);
    expect(employeeIdentity.getByText('Email pendiente de verificación')).toBeInTheDocument();
    usuarios[1].emailVerificado = true;
    rerender(<UsuariosPage />);
    expect(employeeIdentity.getByText('Email verificado')).toBeInTheDocument();
    expect(employeeIdentity.queryByText('Email pendiente de verificación')).not.toBeInTheDocument();
    expect(mocks.updateUsuario).not.toHaveBeenCalled();
  });

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
