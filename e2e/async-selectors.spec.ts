import { expect, test } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const reparacion = (
  id: number,
  numeroOrden: string,
  equipoMarca: string,
  equipoModelo: string,
  estado = 'EN_PROCESO',
) => ({
  id,
  equipoId: id,
  descripcionProblema: 'No enciende',
  estado,
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
  numeroOrden,
  equipoMarca,
  equipoModelo,
  clienteNombre: 'Ana',
  clienteApellido: 'Pérez',
});

test('una búsqueda lenta anterior no reemplaza la búsqueda más nueva', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);

  let markSlowStarted!: () => void;
  let markSlowFinished!: () => void;
  const slowStarted = new Promise<void>((resolve) => { markSlowStarted = resolve; });
  const slowFinished = new Promise<void>((resolve) => { markSlowFinished = resolve; });

  // Este handler se registra después del mock general para controlar la carrera
  // sin cambiar los helpers compartidos por el resto de la suite.
  await page.route((url) => (
    url.origin === 'http://localhost:8080'
    && url.pathname.endsWith('/api/reparaciones')
  ), async (route) => {
    const request = route.request();
    if (request.method() !== 'GET') return route.fallback();

    const url = new URL(request.url());
    const query = url.searchParams.get('q') ?? '';
    const isSlow = query === 'anterior';
    const item = isSlow
      ? reparacion(71, 'ORD-ANTERIOR', 'Samsung', 'Viejo')
      : query === 'nueva'
        ? reparacion(72, 'ORD-NUEVA', 'Apple', 'Actual')
        : undefined;

    if (isSlow) {
      markSlowStarted();
      await new Promise((resolve) => setTimeout(resolve, 900));
    } else if (query === 'nueva') {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    try {
      await route.fulfill({
        json: {
          content: item ? [item] : [],
          page: {
            size: 20,
            number: 0,
            totalElements: item ? 1 : 0,
            totalPages: item ? 1 : 0,
          },
        },
      });
    } finally {
      if (isSlow) markSlowFinished();
    }
  });

  await page.goto('/repuestos');
  await page.getByRole('button', { name: 'Nuevo repuesto', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nuevo repuesto' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Reparación asociada' }).click();
  const search = page.getByRole('combobox', { name: 'Buscar reparación' });
  await search.fill('anterior');
  await slowStarted;
  await search.fill('nueva');

  await expect(page.getByRole('option', { name: /ORD-NUEVA/i })).toBeVisible();
  await slowFinished;
  await page.waitForTimeout(100);

  await expect(page.getByRole('option', { name: /ORD-NUEVA/i })).toBeVisible();
  await expect(page.getByRole('option', { name: /ORD-ANTERIOR/i })).toHaveCount(0);
  await expect(search).toHaveValue('nueva');
});

test('editar y usar la reparación de un repuesto nunca consulta su detalle', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, {
    repuestos: [{
      id: 8,
      nombre: 'Pantalla OLED',
      descripcion: null,
      precio: 90_000,
      reparacionId: 42,
      reparacionEquipo: 'Samsung A52',
    }],
    reparaciones: [
      reparacion(42, 'ORD-0042', 'Samsung', 'A52', 'ENTREGADO'),
      reparacion(43, 'ORD-0043', 'Motorola', 'Edge 50'),
    ],
  });

  const detailRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      request.method() === 'GET'
      && /\/api\/reparaciones\/\d+$/.test(url.pathname)
    ) detailRequests.push(url.pathname);
  });

  await page.goto('/repuestos');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar repuesto' })).toBeVisible();

  const selected = page.getByRole('combobox', { name: 'Reparación asociada' });
  await expect(selected).toContainText('Orden #42');
  await expect(selected).toContainText('Samsung A52');
  await selected.click();

  const listRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return request.method() === 'GET'
      && url.pathname.endsWith('/api/reparaciones')
      && url.searchParams.get('q') === 'Motorola';
  });
  await page.getByRole('combobox', { name: 'Buscar reparación' }).fill('Motorola');
  await listRequest;
  await page.getByRole('option', { name: /ORD-0043.*Motorola Edge 50/i }).click();

  await expect(page.getByRole('combobox', { name: 'Reparación asociada' })).toContainText('ORD-0043');
  await page.waitForTimeout(100);
  expect(detailRequests).toEqual([]);
});
