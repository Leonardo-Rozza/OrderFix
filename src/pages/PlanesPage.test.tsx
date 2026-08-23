import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server, API } from '../test/server';
import { authStore } from '../store/auth.store';
import { PlanesPage } from './PlanesPage';

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const b64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const adminToken = `${b64url({ alg: 'HS256' })}.${b64url({
  sub: 'admin@ordenfix.test',
  role: 'ROLE_ADMIN',
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.firma`;

const base = {
  fechaInicio: '2026-08-01',
  fechaFinTrial: null,
  proximoCobro: null,
  reparacionesEsteMes: 7,
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
      accion: /reactivar pro/i,
    },
  ])('representa $nombre con los datos contractuales', async ({ respuesta, estadoVisible, detalle, accion }) => {
    server.use(http.get(`${API}/suscripcion`, () => HttpResponse.json(respuesta)));

    renderPage();

    expect(await screen.findByText(estadoVisible)).toBeInTheDocument();
    expect(screen.getAllByText(detalle).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cobros manuales y datos para cobrar')).toHaveLength(2);
    expect(screen.getByText(/inventario, cobros manuales y varios empleados/i)).toBeVisible();
    expect(screen.queryByText(/cobros, caja y recibo/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: accion })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /exportar a excel/i })).not.toBeInTheDocument();
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
});
