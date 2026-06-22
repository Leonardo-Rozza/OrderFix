import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const equipos = [
  { id: 5, marca: 'Samsung', modelo: 'A52', imei: null, color: null, descripcion: null, clienteId: 1, clienteNombre: 'Ana', clienteApellido: 'Gómez' },
  { id: 6, marca: 'Apple', modelo: 'iPhone 13', imei: null, color: null, descripcion: null, clienteId: 2, clienteNombre: 'Beto', clienteApellido: 'Ruiz' },
];

test('combobox: buscar y elegir un equipo existente para la reparación', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { equipos });

  await page.goto('/reparaciones?nuevo=1');
  await expect(page.getByRole('heading', { name: 'Nueva reparación' })).toBeVisible();

  // Pasar al modo "equipo existente"
  await page.getByRole('button', { name: /elegir equipo existente/i }).click();

  // Abrir el combobox de equipo y filtrar por texto
  await page.getByLabel(/^equipo/i).click();
  await page.getByPlaceholder('Buscar…').fill('A52');

  // Solo queda el match y lo elegimos
  await page.getByRole('option', { name: /samsung a52/i }).click();

  // El disparador refleja la selección
  await expect(page.getByLabel(/^equipo/i)).toHaveText(/samsung a52/i);

  await page.getByLabel(/problema/i).fill('No enciende');

  const reqPromise = page.waitForRequest(
    (r) => r.url().endsWith('/api/reparaciones') && r.method() === 'POST'
  );
  await page.getByRole('button', { name: /crear reparación/i }).click();

  const req = await reqPromise;
  expect(req.postDataJSON()).toMatchObject({ equipoId: 5, descripcionProblema: 'No enciende' });
});
