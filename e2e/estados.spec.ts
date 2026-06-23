import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

test('estado de error: el listado muestra reintentar y se recupera', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);

  // Override: los primeros intentos de GET /clientes fallan (React Query reintenta
  // 5xx hasta 2 veces → 3 intentos); tras reintentar manualmente, responde OK.
  let attempts = 0;
  await page.route(
    (url) => url.origin === 'http://localhost:8080' && url.pathname.endsWith('/api/clientes'),
    async (route) => {
      const u = new URL(route.request().url());
      // La query de "options" usa size=200; dejamos que la maneje mockApi y solo
      // afectamos la query del listado (size=20).
      if (route.request().method() !== 'GET' || u.searchParams.get('size') === '200') {
        return route.fallback();
      }
      attempts += 1;
      if (attempts <= 3) {
        return route.fulfill({ status: 500, json: { message: 'boom' } });
      }
      return route.fulfill({
        json: { content: [{ id: 1, nombre: 'Ana', apellido: 'Gómez', telefono: '111', email: null, direccion: null }], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } },
      });
    },
  );

  await page.goto('/clientes');

  // Se ve el estado de error con botón de reintento (RQ reintenta con backoff)
  await expect(page.getByText(/no pudimos cargar los clientes/i)).toBeVisible({ timeout: 10000 });
  const retry = page.getByRole('button', { name: /reintentar/i });
  await expect(retry).toBeVisible();

  // Al reintentar, carga la lista
  await retry.click();
  await expect(page.getByText('Ana Gómez')).toBeVisible();
});

test('estado vacío: listado sin resultados muestra el mensaje', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { clientes: [] });

  await page.goto('/clientes');
  await expect(page.getByText('Sin clientes')).toBeVisible();
});
