import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Equipo, Reparacion } from '../types';

const { useReparacionesPorEquipoQueryMock, refetchReparaciones } = vi.hoisted(() => ({
  useReparacionesPorEquipoQueryMock: vi.fn(),
  refetchReparaciones: vi.fn(),
}));

vi.mock('../api/queries/reparaciones.queries', () => ({
  useReparacionesPorEquipoQuery: useReparacionesPorEquipoQueryMock,
}));

import { EquipoReparacionesModal } from './EquipoReparacionesModal';

const equipo: Equipo = {
  id: 3,
  marca: 'Apple',
  modelo: 'iPhone 13',
  imei: null,
  color: null,
  descripcion: null,
  clienteId: 4,
};

const reparacion: Reparacion = {
  id: 7,
  equipoId: equipo.id,
  descripcionProblema: 'No enciende',
  estado: 'INGRESADO',
  precioEstimado: 50000,
  precioFinal: null,
  fechaIngreso: '2026-08-20',
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
};

const renderModal = () => render(
  <MemoryRouter>
    <EquipoReparacionesModal equipo={equipo} onClose={vi.fn()} />
  </MemoryRouter>,
);

describe('EquipoReparacionesModal — estados de reparaciones', () => {
  beforeEach(() => {
    refetchReparaciones.mockReset();
  });

  it('muestra carga local sin anunciar un vacío', () => {
    useReparacionesPorEquipoQueryMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isSuccess: false,
      refetch: refetchReparaciones,
    });

    renderModal();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando reparaciones');
    expect(screen.queryByText('Este equipo no tiene reparaciones.')).not.toBeInTheDocument();
  });

  it('muestra error local y reintenta sólo la consulta de la ficha', async () => {
    const user = userEvent.setup();
    useReparacionesPorEquipoQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isSuccess: false,
      refetch: refetchReparaciones,
    });

    renderModal();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar las reparaciones del equipo.');
    expect(screen.queryByText('Este equipo no tiene reparaciones.')).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(refetchReparaciones).toHaveBeenCalledTimes(1);
  });

  it('muestra el vacío sólo después de una respuesta exitosa', () => {
    useReparacionesPorEquipoQueryMock.mockReturnValue({
      data: [] as Reparacion[],
      isPending: false,
      isError: false,
      isSuccess: true,
      refetch: refetchReparaciones,
    });

    renderModal();

    expect(screen.getByText('Este equipo no tiene reparaciones.')).toBeInTheDocument();
  });

  it('muestra las reparaciones reales sin afirmar ausencia', () => {
    useReparacionesPorEquipoQueryMock.mockReturnValue({
      data: [reparacion],
      isPending: false,
      isError: false,
      isSuccess: true,
      refetch: refetchReparaciones,
    });

    renderModal();

    expect(screen.getByRole('button', { name: /No enciende/i })).toBeInTheDocument();
    expect(screen.queryByText('Este equipo no tiene reparaciones.')).not.toBeInTheDocument();
  });
});
