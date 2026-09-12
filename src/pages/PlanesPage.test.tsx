import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server, API } from '../test/server';
import { authStore } from '../store/auth.store';
import { PlanesPage } from './PlanesPage';
import { showError } from '../utils/toast';

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../utils/toast', async (original) => ({
  ...await original<typeof import('../utils/toast')>(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const b64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const adminToken = `${b64url({ alg: 'HS256' })}.${b64url({
  sub: 'admin@ordenfix.test',
  role: 'ROLE_ADMIN',
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.firma`;

const employeeToken = `${b64url({ alg: 'HS256' })}.${b64url({
  sub: 'empleado@ordenfix.test',
  role: 'ROLE_USER',
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.firma`;

const base = {
  fechaInicio: '2026-08-01',
  fechaFinTrial: null,
  proximoCobro: null,
  reparacionesEsteMes: 7,
  ofertaPro: { precioMensual: 31234.56, moneda: 'ARS', contratacionDisponible: true },
};

const freeActiva = {
  ...base,
  plan: 'FREE',
  estado: 'ACTIVA',
  limiteReparacionesMes: 25,
  funciones: { inventario: false, cobros: false, empleadosMultiples: false },
};

const proActiva = {
  ...base,
  plan: 'PRO',
  estado: 'ACTIVA',
  limiteReparacionesMes: null,
  funciones: { inventario: true, cobros: true, empleadosMultiples: true },
};

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PlanesPage />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  authStore.getState().login(adminToken, 'admin@ordenfix.test');
  window.history.replaceState({}, '', '/');
  vi.mocked(showError).mockClear();
});

afterEach(() => {
  cleanup();
  authStore.getState().logout();
  window.history.replaceState({}, '', '/');
});

describe('PlanesPage', () => {
  it('muestra un estado neutral mientras verifica la capacidad efectiva', async () => {
    server.use(
      http.get(`${API}/suscripcion`, async () => {
        await delay(80);
        return HttpResponse.json({
          ...base,
          plan: 'FREE',
          estado: 'ACTIVA',
          limiteReparacionesMes: 25,
          funciones: { inventario: false, cobros: false, empleadosMultiples: false },
        });
      }),
    );

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(/verificando tu plan/i);
    expect(screen.queryByRole('button', { name: /suscribirme|activar pro|contratar pro/i })).not.toBeInTheDocument();
    expect(await screen.findByText(/plan free activo/i)).toBeInTheDocument();
  });

  it('permite reintentar si no se pudo consultar la suscripción', async () => {
    let intentos = 0;
    server.use(
      http.get(`${API}/suscripcion`, () => {
        intentos += 1;
        if (intentos === 1) {
          return HttpResponse.json({ message: 'Temporal' }, { status: 500 });
        }
        return HttpResponse.json({
          ...base,
          plan: 'FREE',
          estado: 'ACTIVA',
          limiteReparacionesMes: 25,
          funciones: { inventario: false, cobros: false, empleadosMultiples: false },
        });
      }),
    );

    renderPage();

    expect(await screen.findByText(/no pudimos verificar tu plan/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suscribirme|activar pro|contratar pro/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText(/plan free activo/i)).toBeInTheDocument();
    expect(intentos).toBe(2);
  });

  it.each([
    {
      nombre: 'FREE/TRIAL',
      respuesta: {
        ...base,
        plan: 'FREE',
        estado: 'TRIAL',
        fechaFinTrial: '2026-08-31',
        limiteReparacionesMes: null,
        funciones: { inventario: true, cobros: true, empleadosMultiples: true },
      },
      estadoVisible: /prueba pro activa/i,
      detalle: /reparaciones ilimitadas.*inventario.*cobros.*varios empleados/i,
      accion: /activar pro ahora/i,
    },
    {
      nombre: 'FREE/ACTIVA',
      respuesta: {
        ...base,
        plan: 'FREE',
        estado: 'ACTIVA',
        limiteReparacionesMes: 25,
        funciones: { inventario: false, cobros: false, empleadosMultiples: false },
      },
      estadoVisible: /plan free activo/i,
      detalle: /7 de 25 reparaciones/i,
      accion: /suscribirme a pro/i,
    },
    {
      nombre: 'PRO/ACTIVA',
      respuesta: {
        ...base,
        plan: 'PRO',
        estado: 'ACTIVA',
        proximoCobro: '2026-09-01',
        limiteReparacionesMes: null,
        funciones: { inventario: true, cobros: true, empleadosMultiples: true },
      },
      estadoVisible: /plan pro activo/i,
      detalle: /reparaciones ilimitadas.*inventario.*cobros.*varios empleados/i,
      accion: /tu plan actual/i,
    },
    {
      nombre: 'PRO/VENCIDA',
      respuesta: {
        ...base,
        plan: 'PRO',
        estado: 'VENCIDA',
        limiteReparacionesMes: null,
        funciones: { inventario: false, cobros: false, empleadosMultiples: false },
      },
      estadoVisible: /plan pro vencido/i,
      detalle: /funciones pro están pausadas/i,
      accion: /contratar pro/i,
    },
    {
      nombre: 'PRO/CANCELADA',
      respuesta: {
        ...base,
        plan: 'PRO',
        estado: 'CANCELADA',
        limiteReparacionesMes: null,
        funciones: { inventario: false, cobros: false, empleadosMultiples: false },
      },
      estadoVisible: /plan pro cancelado/i,
      detalle: /funciones pro están pausadas/i,
      accion: /contratar pro/i,
    },
  ])('representa $nombre con los datos contractuales', async ({ respuesta, estadoVisible, detalle, accion }) => {
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json(respuesta)));

    renderPage();

    expect(await screen.findByText(estadoVisible)).toBeInTheDocument();
    expect(screen.getAllByText(detalle).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cobros manuales, datos para cobrar y resumen digital')).toHaveLength(2);
    expect(screen.getByText(/inventario, cobros manuales y varios empleados/i)).toBeVisible();
    expect(screen.queryByText(/cobros, caja y recibo/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: accion })).toBeInTheDocument();
    expect(screen.getByText(/ARS\s*31\.234,56/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /exportar a excel/i })).not.toBeInTheDocument();
    if (respuesta.estado === 'CANCELADA') {
      expect(screen.getByText('CANCELADO', { exact: true })).toBeVisible();
      expect(screen.queryByText('VENCIDO', { exact: true })).not.toBeInTheDocument();
    }
  });

  it('usa el límite recibido y no deja fijo el valor del plan FREE', async () => {
    server.use(
      http.get(`${API}/suscripcion`, () =>
        HttpResponse.json({
          ...base,
          plan: 'FREE',
          estado: 'ACTIVA',
          limiteReparacionesMes: 37,
          funciones: { inventario: false, cobros: false, empleadosMultiples: false },
        }),
      ),
    );

    renderPage();

    await waitFor(() => expect(screen.getAllByText(/37/).length).toBeGreaterThan(0));
    expect(screen.queryByText(/hasta 25/i)).not.toBeInTheDocument();
  });

  it.each(['FREE', 'PRO'])('orienta al empleado al titular y no le ofrece gestionar el plan %s', async (plan) => {
    authStore.getState().login(employeeToken, 'empleado@ordenfix.test');
    let mutations = 0;
    server.use(
      http.get(`${API}/suscripcion`, () => HttpResponse.json({
        ...base,
        plan,
        estado: 'ACTIVA',
        limiteReparacionesMes: plan === 'FREE' ? 25 : null,
        funciones: { inventario: plan === 'PRO', cobros: plan === 'PRO', empleadosMultiples: plan === 'PRO' },
      })),
      http.post(`${API}/pagos/suscripcion`, () => { mutations++; return HttpResponse.json({}); }),
      http.post(`${API}/pagos/suscripcion/cancelar`, () => { mutations++; return HttpResponse.json({}); }),
    );
    renderPage();

    expect(await screen.findByRole('heading', { name: 'El plan de tu taller' })).toBeVisible();
    expect(screen.getByText(/El titular administra la suscripción/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /suscribirme|activar pro|contratar pro|cancelar pro/i })).not.toBeInTheDocument();
    expect(mutations).toBe(0);
  });

  it('muestra precio y moneda del servicio con contratación apagada sin iniciar solicitudes', async () => {
    let checkouts = 0;
    server.use(
      http.get(`${API}/suscripcion`, () => HttpResponse.json({
        ...freeActiva,
        ofertaPro: { precioMensual: 480.75, moneda: 'USD', contratacionDisponible: false },
      })),
      http.post(`${API}/pagos/suscripcion`, () => { checkouts++; return HttpResponse.json({}); }),
    );
    renderPage();

    expect(await screen.findByText(/USD\s*480,75/)).toBeVisible();
    expect(screen.getByText('La contratación de PRO no está disponible por el momento.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /suscribirme|activar pro|contratar pro/i })).not.toBeInTheDocument();
    expect(checkouts).toBe(0);
  });

  it.each([
    { nombre: 'ausente', ofertaPro: undefined },
    { nombre: 'incompleta', ofertaPro: { precioMensual: 123, moneda: 'ARS' } },
  ])('cierra la contratación cuando la oferta está $nombre y permite consultar de nuevo', async ({ ofertaPro }) => {
    let consultas = 0;
    let checkouts = 0;
    server.use(
      http.get(`${API}/suscripcion`, () => {
        consultas++;
        return HttpResponse.json(consultas === 1 ? { ...freeActiva, ofertaPro } : freeActiva);
      }),
      http.post(`${API}/pagos/suscripcion`, () => { checkouts++; return HttpResponse.json({}); }),
    );
    renderPage();

    expect(await screen.findByText('Precio y contratación no disponibles')).toBeVisible();
    expect(screen.getByText('Plan FREE activo')).toBeVisible();
    expect(screen.queryByText(/ARS/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suscribirme|activar pro|contratar pro/i })).not.toBeInTheDocument();
    expect(checkouts).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar oferta PRO' }));
    expect(await screen.findByRole('button', { name: 'Suscribirme a PRO' })).toBeEnabled();
    expect(screen.getByText(/ARS\s*31\.234,56/)).toBeVisible();
    expect(consultas).toBe(2);
    expect(checkouts).toBe(0);
  });

  it('mantiene funciones y cancelación de PRO aunque falte la oferta', async () => {
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json({ ...proActiva, ofertaPro: null })));
    renderPage();

    expect(await screen.findByText('Plan PRO activo')).toBeVisible();
    expect(screen.getByText(/Reparaciones ilimitadas.*inventario.*cobros manuales.*varios empleados/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancelar PRO' })).toBeEnabled();
    expect(screen.getByText('Precio y contratación no disponibles')).toBeVisible();
  });

  it('el ADMIN inicia una sola contratación confirmada y bloquea la acción mientras espera', async () => {
    let checkouts = 0;
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    server.use(
      http.get(`${API}/suscripcion`, () => HttpResponse.json(freeActiva)),
      http.post(`${API}/pagos/suscripcion`, async () => {
        checkouts++;
        await held;
        // Una navegación al fragmento local acredita el contrato sin abrir un proveedor.
        return HttpResponse.json({ initPoint: `${window.location.origin}/#checkout-prueba` });
      }),
    );
    renderPage();
    const button = await screen.findByRole('button', { name: 'Suscribirme a PRO' });
    fireEvent.click(button);

    try {
      await waitFor(() => expect(button).toHaveTextContent('Redirigiendo…'));
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      fireEvent.click(button);
      await waitFor(() => expect(checkouts).toBe(1));
      release();
      await waitFor(() => expect(window.location.hash).toBe('#checkout-prueba'));
      expect(checkouts).toBe(1);
    } finally { release(); }
  });

  it('el ADMIN puede cancelar PRO con la contratación apagada y ve la confirmación del servicio', async () => {
    const ofertaPro = { ...base.ofertaPro, contratacionDisponible: false };
    let cancelaciones = 0;
    server.use(
      http.get(`${API}/suscripcion`, () => HttpResponse.json({ ...(cancelaciones ? freeActiva : proActiva), ofertaPro })),
      http.post(`${API}/pagos/suscripcion/cancelar`, () => {
        cancelaciones++;
        return HttpResponse.json({ ...freeActiva, ofertaPro });
      }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar PRO' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar PRO' });
    expect(dialog).toHaveTextContent('Cuando se confirme la cancelación, tu taller volverá al plan FREE');
    expect(dialog).not.toHaveTextContent(/backend/i);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar PRO' }));

    expect(await screen.findByText('Plan FREE activo')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cancelaciones).toBe(1);
    expect(screen.getByText('La contratación de PRO no está disponible por el momento.')).toBeVisible();
  });

  it('mantiene PRO y la confirmación abierta si la cancelación falla, con un aviso y reintento', async () => {
    let cancelaciones = 0;
    server.use(
      http.get(`${API}/suscripcion`, () => HttpResponse.json(cancelaciones === 2 ? freeActiva : proActiva)),
      http.post(`${API}/pagos/suscripcion/cancelar`, () => {
        cancelaciones++;
        return cancelaciones === 1
          ? HttpResponse.json({ message: 'No pudimos confirmar la cancelación.' }, { status: 502 })
          : HttpResponse.json(freeActiva);
      }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar PRO' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar PRO' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar PRO' }));

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
    expect(showError).toHaveBeenCalledWith('No pudimos confirmar la cancelación.');
    expect(dialog).toBeVisible();
    expect(screen.getByText('Plan PRO activo')).toBeInTheDocument();
    expect(screen.queryByText('Plan FREE activo')).not.toBeInTheDocument();
    const retry = within(dialog).getByRole('button', { name: 'Cancelar PRO' });
    await waitFor(() => expect(retry).toBeEnabled());
    await userEvent.click(retry);

    expect(await screen.findByText('Plan FREE activo')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cancelaciones).toBe(2);
    expect(showError).toHaveBeenCalledTimes(1);
  });
});
