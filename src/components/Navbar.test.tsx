import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
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
  useAuth: () => ({ logout: mocks.logout }),
}));

vi.mock('../hooks/useSessionIdentity', () => ({
  useSessionIdentity: () => mocks.identity,
}));

vi.mock('./ThemeToggle', () => ({
  ThemeToggle: ({ className }: { className?: string }) => (
    <button type="button" aria-label="Activar modo oscuro" className={className} />
  ),
}));

const renderNavbar = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Navbar title="Inicio" />
  </MemoryRouter>,
);

describe('Navbar — identidad del taller', () => {
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
    mocks.logout.mockReset();
    mocks.identity.refetch.mockReset();
  });

  it('muestra marca y taller en mobile, y el usuario real con rol en desktop', () => {
    renderNavbar();

    expect(screen.getByRole('link', {
      name: 'OrdenFix — Taller CelExpress — Ir al inicio',
    })).toBeVisible();
    expect(screen.getByText('CelExpress')).toHaveAccessibleName('Taller: CelExpress');
    expect(screen.getByText('Juan Pérez')).toBeVisible();
    expect(screen.getByText('Empleado')).toBeVisible();
    expect(screen.getByText('JP')).toBeInTheDocument();
    expect(screen.queryByText('juan@celexpress.com')).not.toBeInTheDocument();
  });

  it('trunca visualmente un taller largo y conserva su valor completo accesible', () => {
    const tallerLargo = 'Servicio Técnico Integral del Centro y Sucursales Asociadas';
    mocks.identity.taller = tallerLargo;

    renderNavbar();

    const taller = screen.getByTitle(tallerLargo);
    expect(taller).toHaveClass('truncate');
    expect(taller).toHaveAccessibleName(`Taller: ${tallerLargo}`);
    expect(screen.getByRole('link', {
      name: `OrdenFix — Taller ${tallerLargo} — Ir al inicio`,
    })).toBeVisible();
  });

  it('usa skeletons locales mientras carga la identidad', () => {
    mocks.identity.isLoading = true;

    renderNavbar();

    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'OrdenFix — Cargando taller — Ir al inicio',
    })).toBeVisible();
    expect(screen.getByRole('status', { name: 'Cargando taller' })).toBeVisible();
    expect(screen.getByRole('status', { name: 'Cargando identidad de usuario' })).toBeVisible();
  });

  it('permite reintentar en mobile y mantiene objetivos táctiles de 44 px', () => {
    mocks.identity.isError = true;

    renderNavbar();

    const retry = screen.getByRole('button', { name: 'Reintentar perfil' });
    expect(retry).toHaveClass('h-11', 'w-11');
    expect(screen.getByRole('button', { name: 'Activar modo oscuro' })).toHaveClass('h-11', 'w-11');
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveClass('h-11', 'w-11');

    fireEvent.click(retry);
    expect(mocks.identity.refetch).toHaveBeenCalledOnce();
  });

  it('conserva el cierre de sesión', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(mocks.logout).toHaveBeenCalledOnce();
  });
});
