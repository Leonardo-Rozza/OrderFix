import { QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../api/queryClient';
import { authStore } from '../store/auth.store';
import type { Perfil } from '../types';

const mocks = vi.hoisted(() => ({ profile: vi.fn(), deactivate: vi.fn(), layout: vi.fn() }));
vi.mock('../router/accountProfile', () => ({ useAccountProfile: mocks.profile }));
vi.mock('../api/accountAccessExit', () => ({ deactivateOwnAccess: mocks.deactivate }));
vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children, ...props }: { children: ReactNode; accountMode: boolean; title: string }) => {
    mocks.layout(props);
    return <>{children}</>;
  },
}));

import { AccountAccessExitPage } from './AccountAccessExitPage';

const profile: Perfil = {
  usuario: { id: 8, username: 'Ana Técnica', email: 'ana@taller.com', role: 'USER', emailVerificado: true },
  taller: { id: 2, nombre: 'Taller del Centro', telefono: null },
};
const password = '  contraseña personal exacta  ';
const confirmation = 'Entiendo que se desactivará mi acceso y se cerrarán mis sesiones.';
const action = 'Confirmar baja de mi acceso';

const LoginResult = () => {
  const location = useLocation();
  return <h1>{location.state?.accessDeactivated ? 'Baja confirmada por el servidor' : 'Inicio de sesión'}</h1>;
};

const renderPage = () => {
  const router = createMemoryRouter([
    { path: '/cuenta/baja-acceso', element: <AccountAccessExitPage /> },
    { path: '/cuenta', element: <h1>Cuenta del usuario</h1> },
    { path: '/login', element: <LoginResult /> },
  ], { initialEntries: ['/cuenta/baja-acceso'] });
  return { router, ...render(<QueryClientProvider client={queryClient}><RouterProvider router={router} flushSync={(callback) => { flushSync(callback); }} /></QueryClientProvider>) };
};
const fill = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Contraseña actual', { exact: true }), password);
  await user.click(screen.getByRole('checkbox', { name: confirmation }));
  return user;
};
const pendingResponse = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  mocks.deactivate.mockReturnValue(promise);
  return resolve;
};
const failure = (status: number, code?: string, headers?: Record<string, string>) => new AxiosError(
  'Solicitud rechazada', undefined, undefined, undefined, {
    status, statusText: 'Error', data: { code }, headers: headers ?? {}, config: { headers: new AxiosHeaders() },
  },
);

beforeEach(() => {
  vi.resetAllMocks();
  queryClient.clear();
  authStore.setState({ token: 'employee-session', email: profile.usuario.email, isAuthenticated: true });
  mocks.profile.mockReturnValue(profile);
});
afterEach(() => { queryClient.clear(); vi.restoreAllMocks(); });

describe('AccountAccessExitPage — baja personal del empleado', () => {
  it('explica el alcance sin presentar cierre del taller o eliminación de sus registros', () => {
    renderPage();
    expect(screen.getByText(/no elimina tus datos personales ni cierra el taller/i)).toBeVisible();
    expect(screen.getByText(/Las reparaciones y la evidencia asociada se conservarán/i)).toBeVisible();
    expect(screen.getByRole('checkbox', { name: confirmation })).not.toBeChecked();
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toHaveAttribute('maxlength', '100');
    expect(screen.getByRole('button', { name: action })).toBeDisabled();
    expect(mocks.layout).toHaveBeenCalledWith(expect.objectContaining({ accountMode: true }));
    expect(mocks.deactivate).not.toHaveBeenCalled();
  });

  it('redirige al titular a Cuenta sin formulario ni petición de baja', async () => {
    mocks.profile.mockReturnValue({ ...profile, usuario: { ...profile.usuario, role: 'ADMIN' } });
    const { router } = renderPage();
    expect(await screen.findByRole('heading', { name: 'Cuenta del usuario' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/cuenta');
    expect(screen.queryByLabelText('Contraseña actual', { exact: true })).not.toBeInTheDocument();
    expect(mocks.deactivate).not.toHaveBeenCalled();
    expect(authStore.getState().isAuthenticated).toBe(true);
  });

  it('exige contraseña y confirmación incluso si se presenta directamente el formulario', async () => {
    renderPage();
    const input = screen.getByLabelText('Contraseña actual', { exact: true });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    fireEvent.change(input, { target: { value: password } });
    fireEvent.submit(form);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('checkbox', { name: confirmation }));
    fireEvent.submit(form);
    await act(async () => {});
    expect(mocks.deactivate).not.toHaveBeenCalled();
    expect(authStore.getState().isAuthenticated).toBe(true);
  });

  it('envía la contraseña exacta una vez, la descarta al enviar y vacía los datos privados sólo tras éxito', async () => {
    const resolve = pendingResponse();
    queryClient.setQueryData(['private-workshop-data'], { cliente: 'Cliente privado', reparacion: 8 });
    const { router } = renderPage();
    await fill();
    const input = screen.getByLabelText('Contraseña actual', { exact: true });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledOnce());
    expect(mocks.deactivate.mock.calls[0][0]).toBe(password);
    expect(mocks.deactivate.mock.calls[0][1]).toBeInstanceOf(AbortSignal);
    expect(input).toHaveValue('');
    expect(input).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: confirmation })).not.toBeChecked();
    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(queryClient.getQueryData(['private-workshop-data'])).toBeDefined();
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    expect(JSON.stringify(localStorage)).not.toContain(password);
    expect(JSON.stringify(sessionStorage)).not.toContain(password);
    expect(screen.queryByText('Baja confirmada por el servidor')).not.toBeInTheDocument();

    await act(async () => resolve());
    expect(await screen.findByRole('heading', { name: 'Baja confirmada por el servidor' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
    expect(authStore.getState()).toMatchObject({ token: null, email: null, isAuthenticated: false });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it('una navegación durante el POST explica que la solicitud ya fue enviada y bloquea el descarte hasta la respuesta', async () => {
    const resolve = pendingResponse();
    const { router } = renderPage();
    const user = await fill();
    await user.click(screen.getByRole('button', { name: action }));
    await act(async () => { await router.navigate('/cuenta'); });
    const dialog = await screen.findByRole('dialog', { name: 'Salir de la confirmación' });
    expect(within(dialog).getByText('La solicitud ya fue enviada. Esperá la respuesta para conocer el resultado.')).toBeVisible();
    expect(within(dialog).queryByText(/No se solicitará la baja/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Esperando respuesta' })).toBeDisabled();
    expect(router.state.location.pathname).toBe('/cuenta/baja-acceso');
    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(mocks.deactivate).toHaveBeenCalledOnce();

    await act(async () => resolve());
    expect(await screen.findByRole('heading', { name: 'Baja confirmada por el servidor' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
    expect(authStore.getState()).toMatchObject({ token: null, email: null, isAuthenticated: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('una contraseña incorrecta conserva la sesión y exige ingresar y confirmar nuevamente', async () => {
    mocks.deactivate.mockRejectedValueOnce(failure(400, 'PASSWORD_ACTUAL_INVALIDA')).mockResolvedValueOnce(undefined);
    renderPage();
    const user = await fill();
    await user.click(screen.getByRole('button', { name: action }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña actual no es correcta');
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: confirmation })).not.toBeChecked();
    expect(screen.getByRole('button', { name: action })).toBeDisabled();
    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(mocks.deactivate).toHaveBeenCalledOnce();
    await fill();
    await user.click(screen.getByRole('button', { name: action }));
    expect(await screen.findByRole('heading', { name: 'Baja confirmada por el servidor' })).toBeVisible();
    expect(mocks.deactivate).toHaveBeenCalledTimes(2);
  });

  it.each([failure(503), new Error('Conexión interrumpida')])('un resultado indeterminado no afirma la baja ni reintenta automáticamente: %s', async (error) => {
    mocks.deactivate.mockRejectedValue(error);
    renderPage();
    const user = await fill();
    await user.click(screen.getByRole('button', { name: action }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos confirmar si la baja se completó');
    expect(authStore.getState().isAuthenticated).toBe(true);
    expect(screen.queryByText('Baja confirmada por el servidor')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: confirmation })).not.toBeChecked();
    await act(async () => {});
    expect(mocks.deactivate).toHaveBeenCalledOnce();
  });

  it('respeta Retry-After sin conservar la contraseña ni enviar otro intento al terminar la pausa', async () => {
    mocks.deactivate.mockRejectedValue(failure(429, 'RATE_LIMITED', { 'retry-after': '1' }));
    renderPage();
    const user = await fill();
    await user.click(screen.getByRole('button', { name: action }));
    expect(await screen.findByRole('button', { name: 'Reintentá en 1 s' })).toBeDisabled();
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toHaveValue('');
    expect(authStore.getState().isAuthenticated).toBe(true);
    await waitFor(() => expect(screen.getByRole('button', { name: action })).toBeDisabled(), { timeout: 2500 });
    expect(mocks.deactivate).toHaveBeenCalledOnce();
  });

  it('desmontar aborta la espera y un éxito tardío no cierra una nueva sesión', async () => {
    const resolve = pendingResponse();
    const view = renderPage();
    const user = await fill();
    await user.click(screen.getByRole('button', { name: action }));
    const signal = mocks.deactivate.mock.calls[0][1] as AbortSignal;
    expect(signal.aborted).toBe(false);
    view.unmount();
    expect(signal.aborted).toBe(true);
    authStore.setState({ token: 'new-session', email: 'otra@taller.com', isAuthenticated: true });
    queryClient.setQueryData(['new-user-private-data'], 'datos nuevos');
    await act(async () => resolve());
    expect(authStore.getState()).toMatchObject({ token: 'new-session', isAuthenticated: true });
    expect(queryClient.getQueryData(['new-user-private-data'])).toBe('datos nuevos');
    expect(view.router.state.location.pathname).toBe('/cuenta/baja-acceso');
  });

  it('una respuesta de la identidad anterior tampoco afecta la nueva identidad si la página sigue montada', async () => {
    const resolve = pendingResponse();
    const { router } = renderPage();
    const user = await fill();
    await user.click(screen.getByRole('button', { name: action }));
    authStore.setState({ token: 'new-session', email: 'otra@taller.com', isAuthenticated: true });
    queryClient.setQueryData(['new-user-private-data'], 'datos nuevos');
    await act(async () => resolve());
    expect(authStore.getState().token).toBe('new-session');
    expect(queryClient.getQueryData(['new-user-private-data'])).toBe('datos nuevos');
    expect(router.state.location.pathname).toBe('/cuenta/baja-acceso');
  });
});
