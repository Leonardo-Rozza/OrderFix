import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

test('inventario: crea un artículo nuevo', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { articulos: [] }); // suscripción por defecto = inventario habilitado

  await page.goto('/inventario');

  await page.getByRole('button', { name: /nuevo artículo/i }).click();
  await expect(page.getByRole('heading', { name: 'Nuevo artículo' })).toBeVisible();

  await page.getByLabel(/^nombre/i).fill('Pantalla iPhone 11');
  await page.getByLabel(/precio venta/i).fill('45000');

  const reqPromise = page.waitForRequest(
    (r) => r.url().endsWith('/api/inventario') && r.method() === 'POST'
  );
  await page.getByRole('button', { name: /crear artículo/i }).click();

  const req = await reqPromise;
  expect(req.postDataJSON()).toMatchObject({ nombre: 'Pantalla iPhone 11', precio: 45000 });

  // El modal se cierra tras crear
  await expect(page.getByRole('button', { name: /crear artículo/i })).toBeHidden();
});
