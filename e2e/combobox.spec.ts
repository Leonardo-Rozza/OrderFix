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
  const searchRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/api/equipos')
      && url.searchParams.get('q') === 'A52'
      && url.searchParams.get('page') === '0'
      && url.searchParams.get('size') === '20';
  });
  await page.getByRole('combobox', { name: 'Buscar equipo' }).fill('A52');
  await searchRequest;

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

test('combobox: carga una segunda página sin perder el formulario', async ({ page, context }) => {
  await seedAuth(context);
  const muchosEquipos = Array.from({ length: 21 }, (_, index) => ({
    id: index + 1,
    marca: index === 0 ? 'Motorola' : 'Marca',
    modelo: index === 0 ? 'Edge 50' : `Modelo ${index + 1}`,
    imei: null,
    color: null,
    descripcion: null,
    clienteId: 1,
    clienteNombre: 'Ana',
    clienteApellido: 'Gómez',
  }));
  await mockApi(page, { equipos: muchosEquipos });

  await page.goto('/reparaciones?nuevo=1');
  await page.getByRole('button', { name: /elegir equipo existente/i }).click();
  await page.getByLabel(/^equipo/i).click();

  await expect(page.getByRole('button', { name: 'Cargar más' })).toBeVisible();
  const secondPage = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/api/equipos') && url.searchParams.get('page') === '1';
  });
  await page.getByRole('button', { name: 'Cargar más' }).click();
  await secondPage;

  await page.getByRole('option', { name: /motorola edge 50/i }).click();
  await expect(page.getByLabel(/^equipo/i)).toHaveText(/motorola edge 50/i);
  await expect(page.getByLabel(/problema/i)).toBeVisible();
});
