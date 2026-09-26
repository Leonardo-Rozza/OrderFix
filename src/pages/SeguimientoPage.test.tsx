import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import { authStore } from '../store/auth.store';
import { API, server } from '../test/server';
import type { Perfil, Seguimiento } from '../types';
import { SeguimientoPage } from './SeguimientoPage';

const tracking = (id = 1): Seguimiento => ({
  codigo: 'ABC123', estado: 'PRESUPUESTADO', marca: 'Samsung', modelo: 'S21', taller: 'Taller',
  fechaIngreso: '2026-09-01', fechaEstimadaEntrega: null,
  presupuesto: {
    id, reparacionId: 1, estado: 'PENDIENTE', tipo: 'ORIGINAL',
    items: [{ descripcion: `Reparación ${id}`, cantidad: 1, precioUnitario: 12000, tipoItem: 'MANO_DE_OBRA', calidad: null }],
    total: 12000, manoDeObraTotal: 12000, repuestosTotal: 0, validezDias: 7,
    validoHasta: null, vencido: false, observaciones: null, fechaRespuesta: null,
    createdAt: '2026-09-01T12:00:00',
  },
});

const renderPage = (perfil?: Perfil) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (perfil) client.setQueryData(queryKeys.perfil.all, perfil);

  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/seguimiento/ABC123']}>
        <Routes>
          <Route path="/seguimiento/:codigo" element={<SeguimientoPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, client };
};

describe('SeguimientoPage — identidad pública', () => {
  afterEach(() => authStore.getState().logout());

  it.each([
    'CelExpress',
    'Servicio Técnico Integral del Centro y Sucursales Asociadas',
  ])('muestra el taller del presupuesto %s aunque haya una sesión de otro taller', async (taller) => {
    const perfil: Perfil = {
      usuario: { id: 99, username: 'Ana Administradora', email: 'ana@otro-taller.test', role: 'ADMIN', emailVerificado: true },
      taller: { id: 99, nombre: 'Otro taller de la sesión', telefono: null },
    };
    const payload = btoa(JSON.stringify({
      sub: perfil.usuario.email, tallerId: perfil.taller.id, role: 'ROLE_ADMIN',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    authStore.getState().login(`eyJhbGciOiJIUzI1NiJ9.${payload}.firma-test`, perfil.usuario.email);

    const seguimiento = { ...tracking(), taller };
    server.use(http.get(`${API}/seguimiento/ABC123`, ({ request }) => {
      expect(request.headers.get('Authorization')).toBeNull();
      return HttpResponse.json(seguimiento);
    }));

    renderPage(perfil);

    expect(await screen.findByText(taller)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Samsung S21' })).toBeVisible();
    expect(screen.getByText('1× Reparación 1')).toBeVisible();
    expect(screen.queryByText(perfil.taller.nombre)).not.toBeInTheDocument();
    expect(screen.queryByText(perfil.usuario.username)).not.toBeInTheDocument();
    expect(screen.queryByText('MVGR Reparaciones')).not.toBeInTheDocument();
  });
});

describe('SeguimientoPage — errores públicos', () => {
  it('respeta Retry-After ante 429 y no lo presenta como código inexistente', async () => {
    server.use(
      http.get(`${API}/seguimiento/ABC123`, () =>
        new HttpResponse(null, { status: 429, headers: { 'Retry-After': '5' } }),
      ),
    );

    renderPage();

    expect(await screen.findByText('Demasiadas consultas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentá en 5 s' })).toBeDisabled();
    expect(screen.queryByText('Código no encontrado')).not.toBeInTheDocument();
  });

  it('distingue un 404 de un error transitorio', async () => {
    server.use(
      http.get(`${API}/seguimiento/ABC123`, () => new HttpResponse(null, { status: 404 })),
    );
    renderPage();

    expect(await screen.findByText('Código no encontrado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver a intentar' })).not.toBeInTheDocument();
  });

  it('permite reintentar un error inesperado', async () => {
    server.use(
      http.get(`${API}/seguimiento/ABC123`, () => new HttpResponse(null, { status: 500 })),
    );
    renderPage();

    expect(await screen.findByText('No pudimos consultar el seguimiento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toBeEnabled();
  });
});


describe('SeguimientoPage — respuesta al presupuesto visualizado', () => {
  it.each([
    ['aprobar', 'Aprobar presupuesto'],
    ['rechazar', 'Rechazar'],
  ])('envía el ID visualizado al %s y conserva el éxito', async (accion, label) => {
    const bodies: unknown[] = [];
    let answered = false;
    server.use(
      http.get(`${API}/seguimiento/ABC123`, () => {
        const data = tracking();
        if (answered) data.presupuesto!.estado = accion === 'aprobar' ? 'APROBADO' : 'RECHAZADO';
        return HttpResponse.json(data);
      }),
      http.post(`${API}/seguimiento/ABC123/presupuesto/${accion}`, async ({ request }) => {
        bodies.push(await request.json());
        expect(request.headers.get('Authorization')).toBeNull();
        answered = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: label }));
    await waitFor(() => expect(bodies).toEqual([{ presupuestoId: 1 }]));
    await waitFor(() => expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument());
  });

  it.each([false, true])('exige otra decisión tras actualizar; falla de actualización: %s', async (failsRefresh) => {
    const bodies: unknown[] = [];
    let reads = 0;
    let releaseRefresh!: () => void;
    const refreshBarrier = new Promise<void>((resolve) => { releaseRefresh = resolve; });
    server.use(
      http.get(`${API}/seguimiento/ABC123`, async () => {
        reads += 1;
        if (reads === 1) return HttpResponse.json(tracking());
        if (reads === 2) {
          await refreshBarrier;
          if (failsRefresh) return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json(tracking(2));
      }),
      http.post(`${API}/seguimiento/ABC123/presupuesto/:accion`, async ({ request }) => {
        bodies.push(await request.json());
        return bodies.length === 1
          ? HttpResponse.json({ code: 'PRESUPUESTO_DESACTUALIZADO' }, { status: 409 })
          : new HttpResponse(null, { status: 204 });
      }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar presupuesto' }));
    await waitFor(() => expect(reads).toBe(2));
    expect(screen.getByRole('button', { name: 'Aprobar presupuesto' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
    expect(bodies).toEqual([{ presupuestoId: 1 }]);
    releaseRefresh();
    if (failsRefresh) {
      const retry = await screen.findByRole('button', { name: 'Actualizar presupuesto' });
      expect(screen.getByRole('button', { name: 'Aprobar presupuesto' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
      expect(screen.getByText(/No se pudo actualizar el presupuesto/)).toBeVisible();
      await userEvent.click(retry);
    }
    expect(await screen.findByText('1× Reparación 2')).toBeVisible();
    expect(screen.getByText(/El taller cambió el presupuesto/)).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rechazar' })).toBeEnabled());
    expect(bodies).toEqual([{ presupuestoId: 1 }]);
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    await waitFor(() => expect(bodies).toEqual([{ presupuestoId: 1 }, { presupuestoId: 2 }]));
  });

  it('conserva el presupuesto y permite una decisión manual después de un error ordinario', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API}/seguimiento/ABC123`, () => HttpResponse.json(tracking())),
      http.post(`${API}/seguimiento/ABC123/presupuesto/aprobar`, async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 500 });
      }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar presupuesto' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aprobar presupuesto' })).toBeEnabled());
    expect(screen.queryByText(/El taller cambió el presupuesto/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar presupuesto' }));
    await waitFor(() => expect(bodies).toEqual([{ presupuestoId: 1 }, { presupuestoId: 1 }]));
  });
});


it.each([
  [404, 'Código no encontrado'],
  [429, 'Demasiadas consultas'],
  [500, 'No pudimos consultar el seguimiento'],
])('conserva el error de consulta %s después de recuperar un presupuesto actualizado', async (status, message) => {
  let reads = 0;
  server.use(
    http.get(`${API}/seguimiento/ABC123`, () => {
      reads += 1;
      return reads < 3
        ? HttpResponse.json(tracking(reads))
        : new HttpResponse(null, { status, headers: { 'Retry-After': '5' } });
    }),
    http.post(`${API}/seguimiento/ABC123/presupuesto/aprobar`, () =>
      HttpResponse.json({ code: 'PRESUPUESTO_DESACTUALIZADO' }, { status: 409 }),
    ),
  );
  const { client } = renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Aprobar presupuesto' }));
  await screen.findByText('1× Reparación 2');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Aprobar presupuesto' })).toBeEnabled());
  await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.seguimiento.byCodigo('ABC123') }); });
  expect(await screen.findByText(message)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Aprobar presupuesto' })).not.toBeInTheDocument();
});
