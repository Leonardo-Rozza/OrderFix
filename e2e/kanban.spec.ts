import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const reparacion = {
  id: 1,
  equipoId: 10,
  descripcionProblema: 'No carga',
  estado: 'INGRESADO',
  precioEstimado: 1000,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
  equipoMarca: 'Apple',
  equipoModelo: 'iPhone',
  clienteId: 5,
  clienteNombre: 'Ana',
  clienteApellido: 'Gómez',
  clienteTelefono: '1',
};

const reparacionesIngresadas = Array.from({ length: 42 }, (_, index) => {
  const id = index + 1;

  return {
    ...reparacion,
    id,
    equipoId: 100 + id,
    descripcionProblema: `Falla de prueba ${id}`,
    numeroOrden: `ORD-2026-${String(id).padStart(4, '0')}`,
    equipoMarca: 'Marca',
    equipoModelo: `Equipo ${id}`,
  };
});

test('kanban: arrastrar una tarjeta dispara el cambio de estado (drag & drop)', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { reparaciones: [reparacion] });

  await page.goto('/reparaciones');

  // Arranca en la columna "Ingresado"
  await expect(page.getByTestId('col-INGRESADO').getByTestId('card-1')).toBeVisible();

  const card = page.getByTestId('card-1');
  const destino = page.getByTestId('col-EN_PROCESO');

  const patchPromise = page.waitForRequest(
    (r) => /\/reparaciones\/1\/estado$/.test(r.url()) && r.method() === 'PATCH'
  );

  // HTML5 drag & drop: dispatch manual con un DataTransfer compartido
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await card.dispatchEvent('dragstart', { dataTransfer });
  await destino.dispatchEvent('dragover', { dataTransfer });
  await destino.dispatchEvent('drop', { dataTransfer });

  const patch = await patchPromise;
  expect(patch.postDataJSON()).toEqual({ estado: 'EN_PROCESO' });
});

test('kanban: carga sólo la página siguiente del estado elegido, conserva el foco y permite abrirla', async ({
  page,
  context,
}) => {
  await seedAuth(context);
  await mockApi(page, {
    reparaciones: reparacionesIngresadas,
    reparacionDetalle: {
      id: 22,
      numeroOrden: 'ORD-2026-0022',
      equipoMarca: 'Marca',
      equipoModelo: 'Equipo 22',
    },
  });

  const initialRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/api/reparaciones')
      && url.searchParams.get('estado') === 'INGRESADO'
      && url.searchParams.get('page') === '0';
  });
  const requestedSecondPages: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.endsWith('/api/reparaciones')
      && url.searchParams.get('page') === '1'
    ) {
      requestedSecondPages.push(url.searchParams.get('estado') ?? 'SIN_ESTADO');
    }
  });

  await page.goto('/reparaciones');

  const firstRequestUrl = new URL((await initialRequest).url());
  expect(firstRequestUrl.searchParams.get('size')).toBe('20');
  expect(firstRequestUrl.searchParams.get('sort')).toBe('id,desc');

  const ingresado = page.getByTestId('col-INGRESADO');
  const cards = ingresado.locator('[data-testid^="card-"]');
  const loadMore = ingresado.getByRole('button', {
    name: 'Cargar 20 reparaciones más en Ingresado',
    exact: true,
  });

  await expect(ingresado.getByText('20 de 42 visibles', { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(20);
  await expect(loadMore).toHaveText('Cargar 20 más');

  const secondPageRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/api/reparaciones')
      && url.searchParams.get('estado') === 'INGRESADO'
      && url.searchParams.get('page') === '1';
  });
  await loadMore.click();

  const secondRequestUrl = new URL((await secondPageRequest).url());
  expect(secondRequestUrl.searchParams.get('size')).toBe('20');
  expect(secondRequestUrl.searchParams.get('sort')).toBe('id,desc');

  await expect(ingresado.getByText('40 de 42 visibles', { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(40);
  expect(requestedSecondPages).toEqual(['INGRESADO']);

  const cardIds = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-testid')),
  );
  expect(new Set(cardIds).size).toBe(cardIds.length);

  const firstNewCard = ingresado.getByTestId('card-22');
  const openFirstNewCard = firstNewCard.getByRole('button', {
    name: 'Abrir reparación ORD-2026-0022 — Marca Equipo 22',
    exact: true,
  });
  await expect(openFirstNewCard).toBeFocused();

  await openFirstNewCard.click();
  await expect(page).toHaveURL(/\/reparaciones\/22$/);
  await expect(page.getByText('ORD-2026-0022', { exact: true })).toBeVisible();
});

test('kanban: conserva la primera página y permite reintentar una carga incremental fallida', async ({
  page,
  context,
}) => {
  await seedAuth(context);
  await mockApi(page, { reparaciones: reparacionesIngresadas });

  let failNextPage = true;
  await page.route('**/api/reparaciones?**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      failNextPage
      && request.method() === 'GET'
      && url.searchParams.get('estado') === 'INGRESADO'
      && url.searchParams.get('page') === '1'
    ) {
      await route.fulfill({
        status: 500,
        json: { message: 'Falla temporal al cargar la página siguiente' },
      });
      return;
    }
    await route.fallback();
  });

  await page.goto('/reparaciones');

  const ingresado = page.getByTestId('col-INGRESADO');
  const cards = ingresado.locator('[data-testid^="card-"]');
  await ingresado.getByRole('button', {
    name: 'Cargar 20 reparaciones más en Ingresado',
  }).click();

  await expect(ingresado.getByRole('alert')).toContainText('No pudimos cargar más', {
    timeout: 10_000,
  });
  await expect(cards).toHaveCount(20);

  failNextPage = false;
  await ingresado.getByRole('button', { name: 'Reintentar carga en Ingresado' }).click();

  await expect(ingresado.getByText('40 de 42 visibles', { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(40);
});
