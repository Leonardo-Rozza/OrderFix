import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

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
