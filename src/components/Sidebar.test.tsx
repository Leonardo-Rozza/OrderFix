import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

const mocks = vi.hoisted(() => ({
  identity: {
    nombre: 'Juan Pérez',
    nombreSaludo: 'Juan Pérez',
    taller: 'CelExpress',
    email: 'juan@celexpress.com',
    rolVisible: 'Empleado',
    iniciales: 'JP',
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock('../store/auth.store', () => ({
  useAuth: () => ({ isAdmin: false }),
}));

vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: () => ({ inventario: false, cobros: false, empleadosMultiples: false }),
  useSuscripcionQuery: () => ({
    data: {
      plan: 'PRO',
      reparacionesEsteMes: 0,
      limiteReparacionesMes: null,
    },
  }),
}));

vi.mock('../hooks/useSessionIdentity', () => ({
  useSessionIdentity: () => mocks.identity,
}));

const renderSidebar = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Sidebar />
  </MemoryRouter>,
);

describe('Sidebar — identidad del taller', () => {
  beforeEach(() => {
    Object.assign(mocks.identity, {
      nombre: 'Juan Pérez',
      nombreSaludo: 'Juan Pérez',
      taller: 'CelExpress',
      email: 'juan@celexpress.com',
      rolVisible: 'Empleado',
      iniciales: 'JP',
      isLoading: false,
      isError: false,
    });
    mocks.identity.refetch.mockReset();
  });

  it('jerarquiza OrdenFix → taller y muestra usuario, rol, email e iniciales reales', () => {
    renderSidebar();

    expect(screen.getByRole('link', {
      name: 'OrdenFix — Taller CelExpress — Ir al inicio',
    })).toBeVisible();
    expect(screen.getByText('CelExpress')).toHaveAccessibleName('Taller: CelExpress');
    expect(screen.getByText('Juan Pérez')).toHaveAttribute('title', 'Juan Pérez');
    expect(screen.getByText('Empleado')).toBeVisible();
    expect(screen.getByText('juan@celexpress.com')).toHaveAttribute('title', 'juan@celexpress.com');
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('conserva el nombre completo del taller accesible aunque se trunque', () => {
    const tallerLargo = 'Servicio Técnico Integral del Centro y Sucursales Asociadas';
    mocks.identity.taller = tallerLargo;

    renderSidebar();

    const taller = screen.getByTitle(tallerLargo);
    expect(taller).toHaveClass('truncate');
    expect(taller).toHaveAccessibleName(`Taller: ${tallerLargo}`);
    expect(screen.getByRole('link', {
      name: `OrdenFix — Taller ${tallerLargo} — Ir al inicio`,
    })).toBeVisible();
  });

  it('muestra skeleton local durante la carga sin reemplazar la navegación', () => {
    mocks.identity.isLoading = true;

    renderSidebar();

    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    expect(screen.getByRole('link', {
      name: 'OrdenFix — Cargando taller — Ir al inicio',
    })).toBeVisible();
    expect(screen.getByRole('status', { name: 'Cargando taller' })).toBeVisible();
    expect(screen.getByRole('status', { name: 'Cargando identidad de usuario' })).toBeVisible();
  });

  it('mantiene el fallback visible y permite reintentar cuando falla el perfil', () => {
    Object.assign(mocks.identity, {
      nombre: 'fallback@taller.com',
      taller: 'Mi taller',
      email: 'fallback@taller.com',
      iniciales: 'F',
      isError: true,
    });

    renderSidebar();

    expect(screen.getByText('fallback@taller.com')).toBeVisible();
    const retry = screen.getByRole('button', { name: 'Reintentar perfil' });
    expect(retry).toHaveClass('min-h-11');
    fireEvent.click(retry);
    expect(mocks.identity.refetch).toHaveBeenCalledOnce();
  });
});
