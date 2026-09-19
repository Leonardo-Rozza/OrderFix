import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import { authStore } from '../store/auth.store';
import { API, server } from '../test/server';
import type { Perfil, Seguimiento } from '../types';
import { SeguimientoPage } from './SeguimientoPage';

const renderPage = (perfil?: Perfil) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (perfil) client.setQueryData(queryKeys.perfil.all, perfil);

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/seguimiento/ABC123']}>
        <Routes>
          <Route path="/seguimiento/:codigo" element={<SeguimientoPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
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

    const seguimiento: Seguimiento = {
      codigo: 'ABC123', estado: 'PRESUPUESTADO', marca: 'Samsung', modelo: 'S21', taller,
      fechaIngreso: '2026-09-01', fechaEstimadaEntrega: null,
      presupuesto: {
        id: 1, reparacionId: 1, estado: 'PENDIENTE', tipo: 'ORIGINAL',
        items: [{ descripcion: 'Reparación de pantalla', cantidad: 1, precioUnitario: 12000, tipoItem: 'MANO_DE_OBRA', calidad: null }],
        total: 12000, manoDeObraTotal: 12000, repuestosTotal: 0, validezDias: 7,
        validoHasta: null, vencido: false, observaciones: null, fechaRespuesta: null,
        createdAt: '2026-09-01T12:00:00',
      },
    };
    server.use(http.get(`${API}/seguimiento/ABC123`, ({ request }) => {
      expect(request.headers.get('Authorization')).toBeNull();
      return HttpResponse.json(seguimiento);
    }));

    renderPage(perfil);

    expect(await screen.findByText(taller)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Samsung S21' })).toBeVisible();
    expect(screen.getByText('1× Reparación de pantalla')).toBeVisible();
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
