import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumenDigital } from '../types';
import { renderWithProviders } from '../test/renderWithProviders';
import { API, server } from '../test/server';
import { ResumenDigitalPage } from './ResumenDigitalPage';

const resumenBase: ResumenDigital = {
  numeroOrden: 'OF-000123',
  codigoSeguimiento: 'ABC123',
  fecha: '2026-08-23T14:30:00',
  estado: 'COMPLETADO',
  taller: { nombre: 'CelExpress Servicio Técnico', telefono: '1133334444' },
  cliente: { nombre: 'Ana', apellido: 'Pérez', telefono: '1122223333' },
  equipo: {
    marca: 'Samsung',
    modelo: 'A54',
    descripcionProblema: 'No enciende y presenta una descripción suficientemente larga para probar el ajuste',
  },
  detalle: {
    repuestos: [{
      nombre: 'Módulo de pantalla original',
      cantidad: 1,
      precioUnitario: 30000,
      subtotal: 30000,
    }],
    manoDeObra: 20000,
    totalRepuestos: 30000,
  },
  importes: {
    total: 50000,
    cobrado: 20000,
    saldo: 30000,
    excedente: 0,
    requiereRevision: false,
    pagado: false,
  },
  pagos: [{
    fecha: '2026-08-23T14:00:00',
    monto: 20000,
    metodo: 'TRANSFERENCIA',
    referencia: `OP-${'1234567890'.repeat(10)}`,
  }],
  datosCobro: {
    alias: `celexpress.${'alias'.repeat(18)}`,
    titular: 'Juan Pérez',
    entidad: 'Mercado Pago',
    qrDisponible: true,
    qrVersion: 'sha256-resumen-1',
  },
  documentoFiscal: false,
  leyenda: 'Documento informativo. No es factura ni comprobante fiscal y no reemplaza los emitidos por ARCA.',

  reparacionId: 7,
  tallerNombre: 'CelExpress Servicio Técnico',
  tallerTelefono: '1133334444',
  clienteNombre: 'Ana',
  clienteApellido: 'Pérez',
  clienteTelefono: '1122223333',
  equipoMarca: 'Samsung',
  equipoModelo: 'A54',
  descripcionProblema: 'No enciende',
  repuestos: [{
    nombre: 'Módulo de pantalla original',
    cantidad: 1,
    precioUnitario: 30000,
    subtotal: 30000,
  }],
  manoDeObra: 20000,
  totalRepuestos: 30000,
  total: 50000,
  cobrado: 20000,
  saldo: 30000,
  excedente: 0,
  requiereRevision: false,
  pagado: false,
};

const renderPage = () => renderWithProviders(<ResumenDigitalPage />, {
  initialEntries: ['/reparaciones/7/resumen'],
  routePath: '/reparaciones/:id/resumen',
  additionalRoutes: [{
    path: '/reparaciones/:id',
    element: <div>Detalle de la orden</div>,
  }],
});

describe('ResumenDigitalPage', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:qr-resumen'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('consume el endpoint canónico y presenta al taller como emisor sin impresión', async () => {
    const requests: string[] = [];
    server.use(
      http.get(`${API}/reparaciones/7/resumen-digital`, ({ request }) => {
        requests.push(new URL(request.url).pathname);
        return HttpResponse.json({ ...resumenBase, reparacionId: 999 });
      }),
      http.get(`${API}/taller/datos-cobro/qr`, () => new HttpResponse(
        new Blob(['png'], { type: 'image/png' }),
        { headers: { 'Content-Type': 'image/png' } },
      )),
    );

    const { unmount } = renderPage();

    expect(await screen.findByRole('heading', { name: 'Resumen digital de la orden' })).toBeVisible();
    expect(screen.getByText('CelExpress Servicio Técnico')).toBeVisible();
    expect(screen.getByText('Orden OF-000123')).toBeVisible();
    expect(screen.getByText('Ana Pérez')).toBeVisible();
    expect(screen.getByText('Samsung A54')).toBeVisible();
    expect(screen.getByText(/Módulo de pantalla original/)).toBeVisible();
    expect(screen.getByText('Transferencia')).toBeVisible();
    expect(screen.getByText(/Referencia:/)).toHaveTextContent(resumenBase.pagos[0].referencia!);
    expect(screen.getByRole('heading', { name: 'Datos para cobrar' })).toBeVisible();
    expect(screen.getByText(resumenBase.datosCobro!.alias!)).toHaveClass('[overflow-wrap:anywhere]');
    expect(await screen.findByAltText('QR para pagar la orden OF-000123')).toHaveAttribute('src', 'blob:qr-resumen');
    expect(screen.getByRole('note', { name: 'Documento informativo' })).toHaveTextContent(/no es factura ni comprobante fiscal/i);
    expect(screen.getByText(/Generado con/).closest('footer')).toHaveTextContent('Generado con OrdenFix');
    expect(screen.queryByRole('button', { name: /imprimir/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Recibo$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Volver a la orden' }))
      .toHaveAttribute('href', '/reparaciones/7');
    expect(requests).toEqual(['/api/reparaciones/7/resumen-digital']);

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:qr-resumen');
  });

  it('no consulta ni muestra QR o datos para cobrar cuando el DTO los omite', async () => {
    let qrRequests = 0;
    server.use(
      http.get(`${API}/reparaciones/7/resumen-digital`, () => HttpResponse.json({
        ...resumenBase,
        numeroOrden: null,
        importes: { ...resumenBase.importes, cobrado: 50000, saldo: 0, pagado: true },
        pagos: [],
        datosCobro: null,
      })),
      http.get(`${API}/taller/datos-cobro/qr`, () => {
        qrRequests += 1;
        return new HttpResponse(null, { status: 404 });
      }),
    );

    renderPage();

    expect(await screen.findByText('Pagado')).toBeVisible();
    expect(screen.getByText('Orden #7')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Datos para cobrar' })).not.toBeInTheDocument();
    expect(screen.getByText('Sin cobros registrados.')).toBeVisible();
    expect(qrRequests).toBe(0);
  });

  it('prioriza el excedente histórico y nunca presenta un pendiente negativo', async () => {
    server.use(
      http.get(`${API}/reparaciones/7/resumen-digital`, () => HttpResponse.json({
        ...resumenBase,
        importes: {
          total: 50000,
          cobrado: 60000,
          saldo: 0,
          excedente: 10000,
          requiereRevision: true,
          pagado: true,
        },
        datosCobro: null,
      })),
    );

    renderPage();

    expect((await screen.findAllByText(/Excedente a revisar/)).length).toBeGreaterThanOrEqual(2);
    const importes = screen.getByRole('region', { name: 'Importes' });
    expect(within(importes).getByText('Pendiente de cobro').parentElement).toHaveTextContent('$ 0');
    expect(within(importes).getByText('Excedente a revisar').parentElement).toHaveTextContent('$ 10.000');
    expect(screen.queryByText(/-\s*\$/)).not.toBeInTheDocument();
  });

  it('conserva un retorno determinístico y permite reintentar el error inline', async () => {
    let attempts = 0;
    server.use(
      http.get(`${API}/reparaciones/7/resumen-digital`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ message: 'Temporal' }, { status: 503 })
          : HttpResponse.json({ ...resumenBase, datosCobro: null });
      }),
    );
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('No se pudo cargar el resumen digital')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Volver a la orden' }))
      .toHaveAttribute('href', '/reparaciones/7');
    const retry = screen.getByRole('button', { name: 'Reintentar' });
    expect(retry).toBeVisible();
    await user.click(retry);

    await waitFor(() => expect(attempts).toBe(2));
    expect(await screen.findByRole('heading', { name: 'Resumen digital de la orden' })).toBeVisible();
  });
});
