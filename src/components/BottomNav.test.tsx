import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';

const { useAuthMock, useFuncionesMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useFuncionesMock: vi.fn(),
}));

vi.mock('../store/auth.store', () => ({
  useAuth: useAuthMock,
}));

vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: useFuncionesMock,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderBottomNav = (path = '/dashboard') => render(
  <MemoryRouter initialEntries={[path]}>
    <BottomNav />
    <LocationProbe />
  </MemoryRouter>,
);

const openMore = async (path = '/dashboard') => {
  renderBottomNav(path);
  const user = userEvent.setup();
  const trigger = screen.getByRole('button', { name: 'Más' });
  await user.click(trigger);
  return { user, trigger, dialog: screen.getByRole('dialog', { name: 'Más herramientas' }) };
};

describe('BottomNav', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ isAdmin: false });
    useFuncionesMock.mockReturnValue({
      inventario: false,
      cobros: false,
      empleadosMultiples: false,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('mantiene exactamente cinco destinos primarios y mueve Plan fuera de la barra', () => {
    renderBottomNav();

    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getAllByRole('link')).toHaveLength(4);
    expect(within(nav).getAllByRole('button')).toHaveLength(1);
    expect(nav.querySelectorAll('a, button')).toHaveLength(5);

    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Reparaciones' })).toBeVisible();
    expect(within(nav).getByRole('link', { name: 'Clientes' })).toBeVisible();
    expect(within(nav).getByRole('link', { name: 'Equipos' })).toBeVisible();
    expect(within(nav).getByRole('button', { name: 'Más' })).toHaveAttribute('aria-haspopup', 'dialog');
    expect(within(nav).queryByRole('link', { name: 'Plan' })).not.toBeInTheDocument();
  });

  it('incluye Plan dentro de la bandeja Más', async () => {
    const { trigger, dialog } = await openMore();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/planes');
  });

  it('para USER FREE muestra solo Repuestos y Plan', async () => {
    const { dialog } = await openMore();

    expect(within(dialog).getAllByRole('link').map((link) => link.textContent?.trim())).toEqual([
      'Repuestos',
      'Plan',
    ]);
    expect(within(dialog).queryByRole('link', { name: 'Empleados' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Inventario' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Cobros' })).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Reportes')).not.toBeInTheDocument();
  });

  it('para USER con funciones habilitadas muestra Inventario y Cobros, pero no Empleados', async () => {
    useFuncionesMock.mockReturnValue({
      inventario: true,
      cobros: true,
      empleadosMultiples: true,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const { dialog } = await openMore();

    expect(within(dialog).getByRole('link', { name: 'Inventario' })).toBeVisible();
    expect(within(dialog).getByRole('link', { name: 'Cobros' })).toHaveAttribute('href', '/caja');
    expect(within(dialog).queryByRole('link', { name: 'Empleados' })).not.toBeInTheDocument();
  });

  it('para ADMIN FREE agrega Empleados sin exponer funciones deshabilitadas', async () => {
    useAuthMock.mockReturnValue({ isAdmin: true });

    const { dialog } = await openMore();

    expect(within(dialog).getByRole('link', { name: 'Empleados' })).toBeVisible();
    expect(within(dialog).queryByRole('link', { name: 'Inventario' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Cobros' })).not.toBeInTheDocument();
  });

  it('para ADMIN con todas las funciones muestra todas las herramientas permitidas', async () => {
    useAuthMock.mockReturnValue({ isAdmin: true });
    useFuncionesMock.mockReturnValue({
      inventario: true,
      cobros: true,
      empleadosMultiples: true,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const { dialog } = await openMore();

    expect(within(dialog).getAllByRole('link').map((link) => link.textContent?.trim())).toEqual([
      'Repuestos',
      'Plan',
      'Empleados',
      'Cobros',
      'Inventario',
    ]);
  });

  it('marca Más y la herramienta actual al estar en una ruta secundaria', async () => {
    useAuthMock.mockReturnValue({ isAdmin: true });
    useFuncionesMock.mockReturnValue({
      inventario: true,
      cobros: true,
      empleadosMultiples: true,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderBottomNav('/inventario');

    const trigger = screen.getByRole('button', { name: 'Más' });
    expect(trigger).toHaveAttribute('aria-current', 'page');

    const user = userEvent.setup();
    await user.click(trigger);
    expect(screen.getByRole('link', { name: 'Inventario' })).toHaveAttribute('aria-current', 'page');
  });

  it('mantiene Más y Plan activos durante el retorno de suscripción', async () => {
    renderBottomNav('/suscripcion/resultado');

    const trigger = screen.getByRole('button', { name: 'Más' });
    expect(trigger).toHaveAttribute('aria-current', 'page');

    const user = userEvent.setup();
    await user.click(trigger);
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');
  });

  it('cierra con Escape y restaura el foco en el botón Más', async () => {
    const { user, trigger } = await openMore();

    await waitFor(() => expect(screen.getByRole('link', { name: 'Repuestos' })).toHaveFocus());
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Más herramientas' })).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveFocus();
    });
  });

  it('cierra la bandeja y navega al seleccionar una herramienta', async () => {
    const { user, trigger, dialog } = await openMore();

    await user.click(within(dialog).getByRole('link', { name: 'Repuestos' }));

    expect(screen.queryByRole('dialog', { name: 'Más herramientas' })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('location')).toHaveTextContent('/repuestos');
  });
});
