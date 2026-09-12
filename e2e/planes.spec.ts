import { test, expect } from '@playwright/test';
import { futureToken, mockApi, seedAuth } from './helpers';

const oferta = { precioMensual: 12345.67, moneda: 'ARS', contratacionDisponible: false };
const free = {
  plan: 'FREE', estado: 'ACTIVA', fechaInicio: null, fechaFinTrial: null, proximoCobro: null,
  reparacionesEsteMes: 7, limiteReparacionesMes: 37,
  funciones: { inventario: false, cobros: false, empleadosMultiples: false },
  ofertaPro: oferta,
};

test('planes: muestra precio del servicio y altas apagadas sin iniciar checkout en móvil', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAuth(context);
  await mockApi(page, { suscripcion: free });
  const checkoutRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/pagos/suscripcion')) {
      checkoutRequests.push(request.url());
    }
  });

  await page.goto('/planes');
  await expect(page.getByText(/12\.345,67/)).toBeVisible();
  await expect(page.getByText('Plan FREE activo', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /suscribirme|activar pro|reactivar pro|contratar pro/i })).toHaveCount(0);
  await expect(page.getByText(/contratación.*no está disponible/i)).toBeVisible();
  expect(checkoutRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const capture = testInfo.outputPath('planes-movil-altas-apagadas.png');
  await page.screenshot({ path: capture, fullPage: true, animations: 'disabled' });
  await testInfo.attach('planes-movil-altas-apagadas', { path: capture, contentType: 'image/png' });
});

test('planes: el empleado consulta el precio y no inicia ni cancela suscripciones', async ({ page, context }, testInfo) => {
  await seedAuth(context, futureToken('ROLE_USER'), 'empleado@synthetic.invalid');
  await mockApi(page, {
    suscripcion: { ...free, ofertaPro: { ...oferta, contratacionDisponible: true } },
    perfil: {
      usuario: { id: 2, username: 'Empleado de prueba', email: 'empleado@synthetic.invalid', role: 'USER' },
      taller: { id: 1, nombre: 'Taller de prueba', telefono: '1100000000' },
    },
  });
  const paymentRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/pagos/')) paymentRequests.push(request.url());
  });

  await page.goto('/planes');
  await expect(page.getByText(/12\.345,67/)).toBeVisible();
  await expect(page.getByRole('button', { name: /suscribirme|activar pro|reactivar pro|contratar pro|cancelar pro/i })).toHaveCount(0);
  await expect(page.getByText('La suscripción la gestiona el titular del taller.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /ver opciones pro/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /ver plan del taller/i })).toBeVisible();
  expect(paymentRequests).toEqual([]);
  const capture = testInfo.outputPath('planes-empleado.png');
  await page.screenshot({ path: capture, fullPage: true, animations: 'disabled' });
  await testInfo.attach('planes-empleado', { path: capture, contentType: 'image/png' });
});

test('planes: ADMIN contrata una vez y el retorno confirma sólo con un GET PRO, incluso tras el timeout', async ({ page, context, baseURL }) => {
  await seedAuth(context);
  await page.clock.install();
  await mockApi(page, { suscripcion: { ...free, ofertaPro: { ...oferta, contratacionDisponible: true } } });
  let checkouts = 0;
  await page.route('**/api/pagos/suscripcion', (route) => {
    expect(route.request().method()).toBe('POST');
    checkouts++;
    // Retorno sintético local: no se navega ni se llama al proveedor de pagos.
    return route.fulfill({ json: { preapprovalId: 'synthetic-b', initPoint: `${baseURL}/suscripcion/resultado` } });
  });

  await page.goto('/planes');
  await page.getByRole('button', { name: /suscribirme a pro/i }).click();
  await expect(page).toHaveURL(/\/suscripcion\/resultado$/);
  await expect(page.getByRole('heading', { name: /confirmando tu suscripción/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /ya sos pro/i })).toHaveCount(0);
  expect(checkouts).toBe(1);

  await page.clock.fastForward(60_000);
  await expect(page.getByRole('heading', { name: 'Todavía no pudimos confirmarlo' })).toBeVisible();
  await expect(page.getByText(/si completaste la suscripción en Mercado Pago/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /ya sos pro/i })).toHaveCount(0);
  // Una lectura posterior confirma la suscripción; la URL de retorno no lo hace.
  await page.route('**/api/suscripcion', (route) => route.fulfill({ json: {
    ...free, plan: 'PRO', limiteReparacionesMes: null,
    funciones: { inventario: true, cobros: true, empleadosMultiples: true },
  } }));
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: /ya sos pro/i })).toBeVisible();
  expect(checkouts).toBe(1);
});

test('planes: apagar altas no impide cancelar PRO ni quita capacidades antes de confirmar', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);
  let current = {
    ...free, plan: 'PRO', limiteReparacionesMes: null as number | null,
    funciones: { inventario: true, cobros: true, empleadosMultiples: true },
  };
  await page.route('**/api/suscripcion', (route) => route.fulfill({ json: current }));
  let cancellations = 0;
  let checkouts = 0;
  await page.route('**/api/pagos/suscripcion', (route) => {
    checkouts++;
    return route.fulfill({ status: 500, json: { message: 'No debía iniciar una contratación' } });
  });
  await page.route('**/api/pagos/suscripcion/cancelar', (route) => {
    expect(route.request().method()).toBe('POST');
    cancellations++;
    current = { ...free };
    return route.fulfill({ json: current });
  });

  await page.goto('/planes');
  await expect(page.getByText('Plan PRO activo', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /inventario/i })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar PRO', exact: true }).click();
  expect(cancellations).toBe(0);
  const dialog = page.getByRole('dialog', { name: 'Cancelar PRO' });
  await expect(dialog).not.toContainText('backend');
  await dialog.getByRole('button', { name: 'Cancelar PRO', exact: true }).click();
  await expect(page.getByText('Plan FREE activo', { exact: true })).toBeVisible();
  expect(cancellations).toBe(1);
  expect(checkouts).toBe(0);
});
