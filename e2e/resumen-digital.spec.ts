import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const resumenDigital = {
  reparacionId: 1,
  numeroOrden: 'ORD-2026-0001',
  codigoSeguimiento: 'ABC123',
  fecha: '2026-08-23T10:15:00',
  estado: 'COMPLETADO',
  taller: {
    nombre: 'Servicio Técnico Integral del Centro',
    telefono: '+54 11 5555-1234',
  },
  cliente: {
    nombre: 'Ana',
    apellido: 'Gómez',
    telefono: '1155550000',
  },
  equipo: {
    marca: 'Apple',
    modelo: 'iPhone 13',
    descripcionProblema: 'Pantalla rota',
  },
  detalle: {
    repuestos: [{
      nombre: 'Módulo de pantalla original',
      cantidad: 1,
      precioUnitario: 45_000,
      subtotal: 45_000,
    }],
    manoDeObra: 10_000,
    totalRepuestos: 45_000,
  },
  importes: {
    total: 55_000,
    cobrado: 40_000,
    saldo: 15_000,
    excedente: 0,
    requiereRevision: false,
    pagado: false,
  },
  pagos: [{
    fecha: '2026-08-22T12:30:00',
    monto: 40_000,
    metodo: 'TRANSFERENCIA',
    referencia: 'OP-123456789',
  }],
  datosCobro: {
    alias: 'ordenfix.taller',
    titular: 'Servicio Técnico Integral del Centro',
    entidad: 'Mercado Pago',
    qrDisponible: true,
    qrVersion: 'sha-resumen-e2e',
  },
  documentoFiscal: false,
  leyenda: 'Documento informativo. No es factura ni comprobante fiscal y no reemplaza los emitidos por ARCA.',
  tallerNombre: 'Servicio Técnico Integral del Centro',
  tallerTelefono: '+54 11 5555-1234',
  clienteNombre: 'Ana',
  clienteApellido: 'Gómez',
  clienteTelefono: '1155550000',
  equipoMarca: 'Apple',
  equipoModelo: 'iPhone 13',
  descripcionProblema: 'Pantalla rota',
  repuestos: [{
    nombre: 'Módulo de pantalla original',
    cantidad: 1,
    precioUnitario: 45_000,
    subtotal: 45_000,
  }],
  manoDeObra: 10_000,
  totalRepuestos: 45_000,
  total: 55_000,
  cobrado: 40_000,
  saldo: 15_000,
  excedente: 0,
  requiereRevision: false,
  pagado: false,
};

test('resumen digital: usa el contrato canónico, muestra datos seguros y vuelve a la orden', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, {
    resumenDigital,
    datosCobro: {
      alias: 'ordenfix.taller',
      titular: 'Servicio Técnico Integral del Centro',
      entidad: 'Mercado Pago',
      mostrarEnResumen: true,
      qrDisponible: true,
      qrVersion: 'sha-resumen-e2e',
    },
  });

  const legacyApiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/api/reparaciones/1/recibo')) {
      legacyApiRequests.push(request.url());
    }
  });
  const canonicalRequest = page.waitForRequest((request) => (
    request.method() === 'GET'
    && new URL(request.url()).pathname.endsWith('/api/reparaciones/1/resumen-digital')
  ));

  await page.goto('/reparaciones/1/resumen');
  await canonicalRequest;

  await expect(page.getByRole('heading', { name: 'Resumen digital de la orden' })).toBeVisible();
  await expect(page.getByText('Servicio Técnico Integral del Centro').first()).toBeVisible();
  await expect(page.getByText('Orden ORD-2026-0001')).toBeVisible();
  await expect(page.getByText(/Módulo de pantalla original/)).toBeVisible();
  await expect(page.getByText('Referencia:').locator('..')).toContainText('OP-123456789');
  await expect(page.getByRole('region', { name: 'Datos para cobrar' })).toContainText('ordenfix.taller');
  await expect(page.getByAltText('QR para pagar la orden ORD-2026-0001')).toHaveAttribute('src', /^blob:/);
  await expect(page.getByRole('note', { name: 'Documento informativo' })).toContainText('no reemplaza los emitidos por ARCA');
  await expect(page.getByText(/Generado con/)).toContainText('OrdenFix');
  await expect(page.getByRole('button', { name: /imprimir/i })).toHaveCount(0);
  expect(legacyApiRequests).toEqual([]);

  const back = page.getByRole('link', { name: '← Volver a la orden' });
  await expect(back).toHaveAttribute('href', '/reparaciones/1');
  await back.click();
  await expect(page).toHaveURL(/\/reparaciones\/1$/);
});

test('compatibilidad: /recibo redirige con replace al resumen y usa una sola API/cache', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { resumenDigital });

  const requestedPaths: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (/\/api\/reparaciones\/1\/(resumen-digital|recibo)$/.test(path)) requestedPaths.push(path);
  });
  const canonicalRequest = page.waitForRequest((request) => (
    new URL(request.url()).pathname.endsWith('/api/reparaciones/1/resumen-digital')
  ));

  await page.goto('/reparaciones/1/recibo');
  await canonicalRequest;

  await expect(page).toHaveURL(/\/reparaciones\/1\/resumen$/);
  await expect(page.getByRole('heading', { name: 'Resumen digital de la orden' })).toBeVisible();
  expect(requestedPaths).toEqual(['/api/reparaciones/1/resumen-digital']);
});

test('resumen digital: no consulta ni muestra QR cuando el backend no publica datos para cobrar', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, {
    resumenDigital: {
      ...resumenDigital,
      datosCobro: null,
    },
    // Si la pantalla consultara la configuración global por error, el mock tendría QR.
    datosCobro: {
      mostrarEnResumen: true,
      qrDisponible: true,
      qrVersion: 'sha-no-publicado',
    },
  });

  let qrRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/api/taller/datos-cobro/qr')) qrRequests += 1;
  });

  await page.goto('/reparaciones/1/resumen');
  await expect(page.getByRole('heading', { name: 'Resumen digital de la orden' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('region', { name: 'Datos para cobrar' })).toHaveCount(0);
  await expect(page.getByRole('img', { name: /QR para pagar/ })).toHaveCount(0);
  expect(qrRequests).toBe(0);
});
