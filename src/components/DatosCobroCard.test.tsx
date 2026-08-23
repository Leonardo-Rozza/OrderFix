import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { API, server } from '../test/server';

const mocks = vi.hoisted(() => ({ isAdmin: true }));

vi.mock('../store/auth.store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/auth.store')>();
  return { ...actual, useAuth: () => ({ isAdmin: mocks.isAdmin }) };
});

vi.mock('./DatosCobroFormModal', () => ({
  DatosCobroFormModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div role="dialog" aria-label="Configuración simulada" /> : null
  ),
}));

import { DatosCobroCard } from './DatosCobroCard';

const datos = {
  alias: `taller.${'alias'.repeat(20)}`,
  titular: 'CelExpress Servicio Técnico',
  entidad: 'Mercado Pago',
  mostrarEnResumen: true,
  qrDisponible: true,
  qrVersion: 'sha-qr-1',
};

describe('DatosCobroCard', () => {
  beforeEach(() => {
    mocks.isAdmin = true;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:qr-remoto'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('muestra referencias y QR al empleado, sin ofrecer edición', async () => {
    mocks.isAdmin = false;
    server.use(
      http.get(`${API}/taller/datos-cobro`, () => HttpResponse.json(datos)),
      http.get(`${API}/taller/datos-cobro/qr`, () => new HttpResponse(
        new Blob(['png'], { type: 'image/png' }),
        { headers: { 'Content-Type': 'image/png' } },
      )),
    );

    renderWithProviders(<DatosCobroCard />);

    expect(await screen.findByText(datos.alias)).toBeVisible();
    expect(screen.getByText('CelExpress Servicio Técnico')).toBeVisible();
    expect(screen.getByText(/no accede a tu cuenta ni confirma/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Configurar' })).not.toBeInTheDocument();
    expect(await screen.findByAltText('QR de cobro configurado por el taller')).toBeVisible();
  });

  it('permite al ADMIN abrir el modal incluso cuando la configuración está vacía', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API}/taller/datos-cobro`, () => HttpResponse.json({
        alias: null,
        titular: null,
        entidad: null,
        mostrarEnResumen: true,
        qrDisponible: false,
        qrVersion: null,
      })),
    );

    renderWithProviders(<DatosCobroCard />);

    expect(await screen.findByText(/Todavía no configuraste/)).toBeVisible();
    const configure = screen.getByRole('button', { name: 'Configurar' });
    expect(configure).toHaveClass('min-h-11');
    await user.click(configure);
    expect(screen.getByRole('dialog', { name: 'Configuración simulada' })).toBeVisible();
  });

  it('presenta el error de lectura inline y permite reintentar', async () => {
    let requests = 0;
    server.use(
      http.get(`${API}/taller/datos-cobro`, () => {
        requests += 1;
        return requests === 1
          ? HttpResponse.json({ message: 'Temporal' }, { status: 503 })
          : HttpResponse.json(datos);
      }),
      http.get(`${API}/taller/datos-cobro/qr`, () => new HttpResponse(
        new Blob(['png'], { type: 'image/png' }),
        { headers: { 'Content-Type': 'image/png' } },
      )),
    );
    const user = userEvent.setup();

    renderWithProviders(<DatosCobroCard />);
    expect(await screen.findByText('No pudimos cargar los datos para cobrar.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(requests).toBe(2));
    expect(await screen.findByText(datos.alias)).toBeVisible();
  });

  it('anuncia la carga de la tarjeta y del QR con estados accesibles', async () => {
    server.use(
      http.get(`${API}/taller/datos-cobro`, async () => {
        await delay('infinite');
        return HttpResponse.json(datos);
      }),
    );

    const firstRender = renderWithProviders(<DatosCobroCard />);
    expect(screen.getByRole('status', { name: 'Cargando datos para cobrar' }))
      .toHaveAttribute('aria-live', 'polite');
    firstRender.unmount();

    server.use(
      http.get(`${API}/taller/datos-cobro`, () => HttpResponse.json(datos)),
      http.get(`${API}/taller/datos-cobro/qr`, async () => {
        await delay('infinite');
        return new HttpResponse(null, { headers: { 'Content-Type': 'image/png' } });
      }),
    );

    renderWithProviders(<DatosCobroCard />);
    expect(await screen.findByText(datos.alias)).toBeVisible();
    expect(screen.getByRole('status', { name: 'Cargando QR de cobro' }))
      .toHaveAttribute('aria-live', 'polite');
  });

  it('anuncia el error asíncrono del QR sin mover el foco', async () => {
    server.use(
      http.get(`${API}/taller/datos-cobro`, () => HttpResponse.json(datos)),
      http.get(`${API}/taller/datos-cobro/qr`, () => HttpResponse.json(
        { message: 'Temporal' },
        { status: 503 },
      )),
    );

    renderWithProviders(<DatosCobroCard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el QR de cobro.');
    expect(screen.getByRole('button', { name: 'Reintentar QR' })).toBeVisible();
  });
});
