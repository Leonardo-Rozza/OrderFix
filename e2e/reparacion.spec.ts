import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

for (const cobrosHabilitados of [false, true]) {
  test(`entrega sin cobros registrados, con módulo ${cobrosHabilitados ? 'habilitado' : 'deshabilitado'}`, async ({ page, context }) => {
    await seedAuth(context);
    await mockApi(page, {
      suscripcion: {
        plan: cobrosHabilitados ? 'PRO' : 'FREE',
        estado: 'ACTIVA',
        funciones: { inventario: false, cobros: cobrosHabilitados, empleadosMultiples: false },
      },
      reparacionDetalle: {
        estado: 'COMPLETADO',
        fechaEntrega: null,
        cobrado: 0,
        saldo: 50000,
        estadoPago: 'SIN_COBRAR',
      },
      cobros: { total: 50000, cobrado: 0, saldo: 50000, pagado: false, cobros: [] },
    });
    const escrituras: string[] = [];
    const consultasCobros: string[] = [];
    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) escrituras.push(pathname);
      if (request.method() === 'GET' && pathname.endsWith('/cobros')) consultasCobros.push(pathname);
    });

    await page.goto('/reparaciones/1');
    const cambiarEstado = page.getByLabel('Cambiar estado', { exact: true });
    await expect(cambiarEstado).toHaveValue('COMPLETADO');
    if (cobrosHabilitados) {
      await expect(page.getByRole('button', { name: 'Registrar cobro', exact: true })).toBeEnabled();
    } else {
      await expect(page.getByRole('region', { name: 'Cobros', exact: true })).toHaveCount(0);
    }

    const entrega = page.waitForRequest((request) => (
      new URL(request.url()).pathname === '/api/reparaciones/1/estado'
      && request.method() === 'PATCH'
    ));
    await cambiarEstado.selectOption('ENTREGADO');
    expect((await entrega).postDataJSON()).toEqual({ estado: 'ENTREGADO' });
    await expect(cambiarEstado).toHaveValue('ENTREGADO');
    await expect(page.getByText('Pendiente de cobro $ 50.000', { exact: true })).toBeVisible();
    expect(escrituras).toEqual(['/api/reparaciones/1/estado']);
    if (!cobrosHabilitados) expect(consultasCobros).toEqual([]);
  });
}

test('alta rápida: crea una reparación en un paso desde ?nuevo=1', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);

  await page.goto('/reparaciones?nuevo=1');

  // El modal se abre solo por el parámetro
  await expect(page.getByRole('heading', { name: 'Nueva reparación' })).toBeVisible();

  await page.getByLabel(/^nombre/i).fill('Juan');
  await page.getByLabel(/teléfono/i).fill('1155551234');
  await page.getByLabel(/^marca/i).fill('Apple');
  await page.getByLabel(/^modelo/i).fill('iPhone 12');
  await page.getByLabel(/problema/i).fill('Pantalla rota');

  const reqPromise = page.waitForRequest(
    (r) => r.url().includes('/reparaciones/ingreso-rapido') && r.method() === 'POST'
  );
  await page.getByRole('button', { name: /crear reparación/i }).click();

  const req = await reqPromise;
  expect(req.postDataJSON()).toMatchObject({
    clienteNombre: 'Juan',
    clienteTelefono: '1155551234',
    equipoMarca: 'Apple',
    equipoModelo: 'iPhone 12',
    descripcionProblema: 'Pantalla rota',
  });

  // El modal se cierra tras crear
  await expect(page.getByRole('button', { name: /crear reparación/i })).toBeHidden();
});

test('alta con cliente/equipo nuevos + detalles de ingreso: hace ingreso-rápido y completa con un PUT', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);

  await page.goto('/reparaciones?nuevo=1');
  await expect(page.getByRole('heading', { name: 'Nueva reparación' })).toBeVisible();

  await page.getByLabel(/^nombre/i).fill('Ana');
  await page.getByLabel(/teléfono/i).fill('1166667777');
  await page.getByLabel(/^marca/i).fill('Samsung');
  await page.getByLabel(/^modelo/i).fill('A52');
  await page.getByLabel(/problema/i).fill('No enciende');

  // Detalle extra que el ingreso rápido no acepta → debe dispararse el PUT
  await page.getByText('Detalles de ingreso (opcional)').click();
  await page.locator('#patronDesbloqueo').fill('L invertida');
  await page.getByLabel(/mojado/i).check();

  const ingreso = page.waitForRequest(
    (r) => r.url().includes('/reparaciones/ingreso-rapido') && r.method() === 'POST'
  );
  const put = page.waitForRequest(
    (r) => /\/reparaciones\/999$/.test(r.url()) && r.method() === 'PUT'
  );
  await page.getByRole('button', { name: /crear reparación/i }).click();

  await ingreso;
  const putReq = await put;
  expect(putReq.postDataJSON()).toMatchObject({
    equipoId: 1,
    patronDesbloqueo: 'L invertida',
    mojado: true,
  });
});
