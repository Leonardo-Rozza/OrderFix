import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EstadoBadge } from './EstadoBadge';
import { PresupuestoBadge } from './PresupuestoBadge';
import type { EstadoReparacion, PresupuestoEstado } from '../types';

describe('EstadoBadge', () => {
  it('renderiza un estado conocido', () => {
    render(<EstadoBadge estado="EN_PROCESO" />);
    expect(screen.getByText('En proceso')).toBeInTheDocument();
  });

  it('no crashea si el backend manda un estado que el front no conoce', () => {
    // El contrato nuevo tiene 12 estados; hasta absorberlos, el badge debe
    // degradar a un pill neutro con el nombre humanizado.
    render(<EstadoBadge estado={'NO_REPARABLE' as unknown as EstadoReparacion} />);
    expect(screen.getByText('No reparable')).toBeInTheDocument();
  });
});

describe('PresupuestoBadge', () => {
  it('muestra el estado VENCIDO', () => {
    render(<PresupuestoBadge estado="VENCIDO" />);
    expect(screen.getByText('Vencido')).toBeInTheDocument();
  });

  it('no crashea con un estado desconocido', () => {
    render(<PresupuestoBadge estado={'OTRO' as unknown as PresupuestoEstado} />);
    expect(screen.getByText('OTRO')).toBeInTheDocument();
  });
});
