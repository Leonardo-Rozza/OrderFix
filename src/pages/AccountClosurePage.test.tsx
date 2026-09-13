import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../api/queryClient';
import { WorkshopClosureError, type WorkshopClosureStatus } from '../api/services/workshopClosure.service';
import { authStore } from '../store/auth.store';

const mocks = vi.hoisted(() => ({ get: vi.fn(), reauth: vi.fn(), submit: vi.fn(), profile: vi.fn(), enabled: true }));
vi.mock('../router/accountProfile', () => ({ useAccountProfile: mocks.profile }));
vi.mock('../config/workshopClosure', () => ({ get workshopClosureEnabled() { return mocks.enabled; } }));
vi.mock('../layouts/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../api/services/workshopClosure.service', async (original) => ({
  ...await original<typeof import('../api/services/workshopClosure.service')>(),
  getWorkshopClosure: mocks.get, reauthenticateWorkshopClosure: mocks.reauth, submitWorkshopClosure: mocks.submit,
}));
import AccountClosurePage from './AccountClosurePage';

const reference = '12345678-1234-4234-8234-123456789abc';
const newId = '98765432-1234-4234-8234-123456789abc';
const proof = 'p'.repeat(43);
const password = ' contraseña exacta ';
const profile = { usuario: { id: 8, role: 'ADMIN', username: 'Titular', email: 'titular@ordenfix.test' },
  taller: { id: 2, nombre: 'Taller del Centro', telefono: null } };
const open: WorkshopClosureStatus = { estado: 'ABIERTO', tallerNombre: 'Taller del Centro', observadoEn: '2026-09-12T12:00:00Z',
  referencia: null, confirmadoEn: null, reversibleHasta: null, puedeSolicitar: true, puedeRestaurar: false, ultimaOperacion: null };
const restricted: WorkshopClosureStatus = { ...open, estado: 'RESTRINGIDO', referencia: reference,
  confirmadoEn: '2026-09-12T12:00:00Z', reversibleHasta: '2026-09-19T12:00:00Z', puedeSolicitar: false, puedeRestaurar: true };
const renderPage = () => {
  const router = createMemoryRouter([
    { path: '/cuenta/cierre', element: <AccountClosurePage /> },
    { path: '/cuenta', element: <h1>Cuenta del usuario</h1> },
    { path: '/login', element: <h1>Volver a ingresar</h1> },
    { path: '/cuenta/exportacion', element: <h1>Respaldos del taller</h1> },
  ], { initialEntries: ['/cuenta/cierre'] });
  return { router, ...render(<QueryClientProvider client={queryClient}><RouterProvider router={router} flushSync={(callback) => { flushSync(callback); }} /></QueryClientProvider>) };
};
const fill = async (restoring = false) => {
  const input = await screen.findByLabelText('Contraseña actual', { exact: true });
  fireEvent.change(input, { target: { value: password } });
  fireEvent.change(screen.getByLabelText(`Escribí ${restoring ? 'RESTAURAR' : 'CERRAR'} MI TALLER`), {
    target: { value: restoring ? 'RESTAURAR MI TALLER' : 'CERRAR MI TALLER' },
  });
  return input.closest('form')!;
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

beforeEach(() => {
  vi.resetAllMocks(); mocks.enabled = true;
  queryClient.clear();
  authStore.setState({ token: 'owner-session', email: profile.usuario.email, isAuthenticated: true });
  mocks.profile.mockReturnValue(profile);
  mocks.get.mockResolvedValue(open);
  mocks.reauth.mockResolvedValue(proof);
  mocks.submit.mockImplementation(async (input) => ({ operacionId: input.operacionId, referencia: input.cierreReferencia,
    proposito: input.proposito, estadoResultante: input.proposito === 'CERRAR' ? 'RESTRINGIDO' : 'ABIERTO',
    confirmadoEn: restricted.confirmadoEn, reversibleHasta: restricted.reversibleHasta,
    registradaEn: '2026-09-12T12:00:01Z', reutilizada: false }));
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(newId);
});
afterEach(() => { queryClient.clear(); vi.restoreAllMocks(); });

describe('AccountClosurePage — confirmación por titular y recuperación', () => {
  it('muestra estado remoto, consecuencias, exportación opcional y constancia vacía', async () => {
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Consultando el estado');
    expect(await screen.findByRole('heading', { name: 'El taller está abierto' })).toBeVisible();
    expect(screen.getByText(/Durante los 7 días/)).toBeVisible();
    expect(screen.getByText(/no confirma el envío de correos ni la cancelación/)).toBeVisible();
    expect(screen.getByText(/Exportar es opcional/)).toBeVisible();
    expect(screen.getByText(/Todavía no hay confirmaciones/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Consultar respaldos' })).toHaveAttribute('href', '/cuenta/exportacion');
    expect(screen.getByRole('button', { name: 'Confirmar cierre del taller' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Cierre del taller' })).toHaveFocus();
    expect(mocks.reauth).not.toHaveBeenCalled();
  });

  it('flag apagado informa indisponibilidad sin ningún GET o formulario', () => {
    mocks.enabled = false; renderPage();
    expect(screen.getByText(/no están disponibles en este entorno/)).toBeVisible();
    expect(screen.queryByLabelText('Contraseña actual', { exact: true })).not.toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('un empleado vuelve a Cuenta sin solicitar estado ni ofrecer cierre', async () => {
    mocks.profile.mockReturnValue({ ...profile, usuario: { ...profile.usuario, role: 'USER' } });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Cuenta del usuario' })).toBeVisible();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('no permite enviar contraseña vacía o una frase aproximada mediante submit directo', async () => {
    renderPage();
    const input = await screen.findByLabelText('Contraseña actual', { exact: true });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    fireEvent.change(input, { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Escribí CERRAR MI TALLER'), { target: { value: 'cerrar mi taller' } });
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent('exactamente');
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('confirma una vez, limpia secretos, vacía cachés y exige login con aviso mínimo', async () => {
    let submittedPassword = '';
    const grant = deferred<string>();
    mocks.reauth.mockImplementation((input) => { submittedPassword = input.passwordActual; return grant.promise; });
    queryClient.setQueryData(['datos-privados'], 'no debe sobrevivir al cierre');
    const { router } = renderPage();
    const form = await fill();
    fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(mocks.reauth).toHaveBeenCalledOnce());
    expect(submittedPassword).toBe(password);
    expect(mocks.reauth.mock.calls[0][0]).toMatchObject({ proposito: 'CERRAR', operacionId: newId, cierreReferencia: newId });
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toHaveValue('');
    expect(screen.getByLabelText('Escribí CERRAR MI TALLER')).toHaveValue('');
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    expect(JSON.stringify(localStorage)).not.toContain(password);
    expect(JSON.stringify(sessionStorage)).not.toContain(proof);
    expect(mocks.submit).not.toHaveBeenCalled();
    await act(async () => grant.resolve(proof));
    expect(await screen.findByRole('heading', { name: 'Volver a ingresar' })).toBeVisible();
    expect(mocks.submit).toHaveBeenCalledExactlyOnceWith({ proposito: 'CERRAR', operacionId: newId, cierreReferencia: newId, confirmacion: 'CERRAR MI TALLER' }, proof);
    expect(router.state.location.state).toEqual({ workshopClosureNotice: 'CLOSED', from: { pathname: '/cuenta/cierre' } });
    expect(authStore.getState().token).toBeNull(); expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(mocks.reauth.mock.calls[0][0].passwordActual).toBe('');
  });

  it('restaura con referencia vigente y una operación distinta, aun con reloj local posterior al plazo', async () => {
    mocks.get.mockResolvedValue({ ...restricted, confirmadoEn: '2020-01-01T12:00:00Z', reversibleHasta: '2020-01-08T12:00:00Z' });
    const { router } = renderPage();
    fireEvent.submit(await fill(true));
    expect(await screen.findByRole('heading', { name: 'Volver a ingresar' })).toBeVisible();
    expect(mocks.submit).toHaveBeenCalledExactlyOnceWith({ proposito: 'RESTAURAR', operacionId: newId, cierreReferencia: reference, confirmacion: 'RESTAURAR MI TALLER' }, proof);
    expect(router.state.location.state.workshopClosureNotice).toBe('RESTORED');
  });

  it('capacidad remota falsa preserva fechas/referencia/consulta pero no inventa un formulario', async () => {
    mocks.get.mockResolvedValue({ ...restricted, puedeRestaurar: false }); renderPage();
    expect(await screen.findByText(reference)).toBeVisible();
    expect(screen.getByText(/El servidor no permite restaurar/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Actualizar estado' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Consultar respaldos' })).toBeVisible();
    expect(screen.queryByLabelText('Contraseña actual', { exact: true })).not.toBeInTheDocument();
  });

  it('un cambio de estado en el GET previo impide emitir proof o comando', async () => {
    mocks.get.mockResolvedValueOnce(open).mockResolvedValue({ ...restricted, puedeRestaurar: false }); renderPage();
    fireEvent.submit(await fill());
    expect(await screen.findByRole('alert')).toHaveTextContent('El estado del taller cambió');
    expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.submit).not.toHaveBeenCalled();
    expect(authStore.getState().isAuthenticated).toBe(true);
  });

  it.each([new WorkshopClosureError(503), new WorkshopClosureError(401), new WorkshopClosureError(), new Error('timeout')])('un comando incierto exige login y no reintenta ni afirma cierre', async (error) => {
    mocks.submit.mockRejectedValue(error); const { router } = renderPage();
    fireEvent.submit(await fill());
    expect(await screen.findByRole('heading', { name: 'Volver a ingresar' })).toBeVisible();
    expect(router.state.location.state).toEqual({ workshopClosureNotice: 'UNKNOWN', from: { pathname: '/cuenta/cierre' } });
    expect(mocks.submit).toHaveBeenCalledOnce(); expect(mocks.reauth).toHaveBeenCalledOnce();
    expect(authStore.getState().token).toBeNull();
  });

  it('una contraseña incorrecta limpia el formulario, conserva sesión y permite una nueva confirmación explícita', async () => {
    mocks.reauth.mockRejectedValue(new WorkshopClosureError(400, 'PASSWORD_ACTUAL_INVALIDA')); renderPage();
    fireEvent.submit(await fill());
    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña actual no es correcta');
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toHaveValue('');
    expect(screen.getByLabelText('Escribí CERRAR MI TALLER')).toHaveValue('');
    expect(authStore.getState().token).toBe('owner-session'); expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('reauth no disponible no se interpreta como un cierre incierto ya enviado', async () => {
    mocks.reauth.mockRejectedValue(new WorkshopClosureError(503)); renderPage();
    fireEvent.submit(await fill());
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar o preparar');
    expect(authStore.getState().token).toBe('owner-session'); expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('429 respeta Retry-After y conserva sólo controles vacíos', async () => {
    mocks.reauth.mockRejectedValue(new WorkshopClosureError(429, 'LIMITE_SOLICITUDES', 10)); renderPage();
    fireEvent.submit(await fill());
    expect(await screen.findByRole('button', { name: /Reintentá en 10 s/ })).toBeDisabled();
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toHaveValue('');
    expect(mocks.submit).not.toHaveBeenCalled(); expect(mocks.reauth).toHaveBeenCalledOnce();
  });

  it('409 consulta nuevamente el estado sin reutilizar proof ni repetir comando', async () => {
    mocks.get.mockResolvedValueOnce(open).mockResolvedValueOnce(open).mockResolvedValue(restricted);
    mocks.submit.mockRejectedValue(new WorkshopClosureError(409, 'CIERRE_CONFLICTO')); renderPage();
    fireEvent.submit(await fill());
    expect(await screen.findByRole('heading', { name: 'El taller tiene acceso restringido' })).toBeVisible();
    expect(mocks.get).toHaveBeenCalledTimes(3); expect(mocks.submit).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Contraseña actual', { exact: true })).toHaveValue('');
    expect(authStore.getState().token).toBe('owner-session');
  });

  it('un GET 404 explica indisponibilidad sin presentar acciones de cierre', async () => {
    mocks.get.mockRejectedValue(new WorkshopClosureError(404)); renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('no están disponibles en este entorno');
    expect(screen.queryByLabelText('Contraseña actual', { exact: true })).not.toBeInTheDocument();
    expect(mocks.reauth).not.toHaveBeenCalled();
  });

  it('no abandona la navegación durante la confirmación y libera el guard para el login final', async () => {
    const grant = deferred<string>(); mocks.reauth.mockReturnValue(grant.promise);
    const { router } = renderPage(); fireEvent.submit(await fill());
    await waitFor(() => expect(mocks.reauth).toHaveBeenCalledOnce());
    await act(async () => { await router.navigate('/cuenta'); });
    const dialog = await screen.findByRole('dialog', { name: 'Salir de la confirmación' });
    expect(within(dialog).getByText(/La operación está en curso/)).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Esperando respuesta' })).toBeDisabled();
    await act(async () => grant.resolve(proof));
    expect(await screen.findByRole('heading', { name: 'Volver a ingresar' })).toBeVisible();
    expect(router.state.location.state.workshopClosureNotice).toBe('CLOSED');
  });

  it('una respuesta de la identidad anterior no ejecuta el comando ni cierra la sesión nueva', async () => {
    const grant = deferred<string>(); mocks.reauth.mockReturnValue(grant.promise);
    const { router } = renderPage(); fireEvent.submit(await fill());
    await waitFor(() => expect(mocks.reauth).toHaveBeenCalledOnce());
    authStore.setState({ token: 'new-session', email: 'otra@ordenfix.test', isAuthenticated: true });
    await act(async () => grant.resolve(proof));
    expect(mocks.submit).not.toHaveBeenCalled(); expect(authStore.getState().token).toBe('new-session');
    expect(router.state.location.pathname).toBe('/cuenta/cierre');
  });

  it('desmontar mientras se espera proof impide un comando tardío', async () => {
    const grant = deferred<string>(); mocks.reauth.mockReturnValue(grant.promise);
    const view = renderPage(); fireEvent.submit(await fill());
    await waitFor(() => expect(mocks.reauth).toHaveBeenCalledOnce());
    view.unmount(); await act(async () => grant.resolve(proof));
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('recupera la última operación durable como sólo lectura al volver a abrir la página', async () => {
    mocks.get.mockResolvedValue({ ...open, ultimaOperacion: { operacionId: newId, referencia: reference,
      proposito: 'RESTAURAR', estadoResultante: 'ABIERTO', confirmadoEn: restricted.confirmadoEn,
      reversibleHasta: restricted.reversibleHasta, registradaEn: '2026-09-13T15:00:00Z', reutilizada: false } });
    renderPage();
    expect(await screen.findByText('Restauración del acceso', { exact: true })).toBeVisible();
    expect(screen.getByText(newId)).toBeVisible();
    expect(screen.getByText(/No acredita borrado de datos/)).toBeVisible();
    expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.submit).not.toHaveBeenCalled();
  });
});
