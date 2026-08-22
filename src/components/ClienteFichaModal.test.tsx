import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cliente, Equipo } from '../types';

const { useEquiposPorClienteQueryMock, refetchEquipos } = vi.hoisted(() => ({
  useEquiposPorClienteQueryMock: vi.fn(),
  refetchEquipos: vi.fn(),
}));

vi.mock('../api/queries/equipos.queries', () => ({
  useEquiposPorClienteQuery: useEquiposPorClienteQueryMock,
}));

import { ClienteFichaModal } from './ClienteFichaModal';

const cliente: Cliente = {
  id: 4,
  nombre: 'Ana',
  apellido: 'Pérez',
  telefono: '1122334455',
  email: 'ana@example.com',
  direccion: null,
};

const equipo: Equipo = {
  id: 9,
  marca: 'Samsung',
  modelo: 'S24',
  imei: null,
  color: null,
  descripcion: null,
  clienteId: cliente.id,
};

const props = {
  isOpen: true,
  cliente,
  onClose: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onNuevoEquipo: vi.fn(),
};

describe('ClienteFichaModal — estados de equipos', () => {
  beforeEach(() => {
    refetchEquipos.mockReset();
    props.onNuevoEquipo.mockReset();
  });

  it('muestra carga local y bloquea agregar mientras los equipos son desconocidos', () => {
    useEquiposPorClienteQueryMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isSuccess: false,
      refetch: refetchEquipos,
    });

    render(<ClienteFichaModal {...props} />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando equipos');
    expect(screen.queryByText('Este cliente todavía no tiene equipos.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar equipo/i })).toBeDisabled();
  });

  it('muestra un error local, conserva el vacío oculto y permite reintentar', async () => {
    const user = userEvent.setup();
    useEquiposPorClienteQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isSuccess: false,
      refetch: refetchEquipos,
    });

    render(<ClienteFichaModal {...props} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar los equipos del cliente.');
    expect(screen.queryByText('Este cliente todavía no tiene equipos.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar equipo/i })).toBeDisabled();

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(refetchEquipos).toHaveBeenCalledTimes(1);
  });

  it('anuncia ausencia real y habilita agregar sólo después de un éxito vacío', () => {
    useEquiposPorClienteQueryMock.mockReturnValue({
      data: [] as Equipo[],
      isPending: false,
      isError: false,
      isSuccess: true,
      refetch: refetchEquipos,
    });

    render(<ClienteFichaModal {...props} />);

    expect(screen.getByText('Este cliente todavía no tiene equipos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar equipo/i })).toBeEnabled();
  });

  it('renderiza los equipos recibidos sin mostrar el estado vacío', () => {
    useEquiposPorClienteQueryMock.mockReturnValue({
      data: [equipo],
      isPending: false,
      isError: false,
      isSuccess: true,
      refetch: refetchEquipos,
    });

    render(<ClienteFichaModal {...props} />);

    expect(screen.getByText('Samsung S24')).toBeInTheDocument();
    expect(screen.queryByText('Este cliente todavía no tiene equipos.')).not.toBeInTheDocument();
  });
});
