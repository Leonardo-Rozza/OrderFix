import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { API, server } from '../test/server';
import { SeguimientoPage } from './SeguimientoPage';

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

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
