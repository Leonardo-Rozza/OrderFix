import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const reparacion = {
  id: 1,
  numeroOrden: 'ORD-2026-0001',
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

const allStates = [
  'INGRESADO', 'EN_DIAGNOSTICO', 'PRESUPUESTADO', 'ESPERANDO_ADICIONAL',
  'EN_PROCESO', 'ESPERANDO_REPUESTO', 'NO_REPARABLE', 'COMPLETADO',
  'LISTO_SIN_REPARAR', 'ENTREGADO', 'ABANDONADO', 'CANCELADO',
];

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

test('etapas: cambia el estado por modal y permite abrir el destino sin cambiar de etapa automáticamente', async ({ page, context }) => {
  await seedAuth(context);
  const current = { ...reparacion };
  await mockApi(page, { reparaciones: [current] });
  await page.route('**/api/reparaciones/1/estado', async (route) => {
    const body = route.request().postDataJSON() as { estado: string };
    current.estado = body.estado;
    await route.fulfill({ json: current });
  });

  await page.goto('/reparaciones');

  await expect(page.getByTestId('col-INGRESADO').getByTestId('card-1')).toBeVisible();
  const phases = page.getByRole('group', { name: 'Etapas de reparación', exact: true });
  await expect(phases.getByRole('button')).toHaveCount(6);
  await expect(phases.getByRole('button', { name: /^Ingreso\b/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('col-EN_PROCESO')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cambiar estado de ORD-2026-0001', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cambiar estado', exact: true });
  await dialog.getByRole('combobox', { name: 'Nuevo estado', exact: true }).selectOption('EN_PROCESO');
  const patchPromise = page.waitForRequest(
    (r) => /\/reparaciones\/1\/estado$/.test(r.url()) && r.method() === 'PATCH'
  );
  await dialog.getByRole('button', { name: 'Guardar estado', exact: true }).click();
  const patch = await patchPromise;
  expect(patch.postDataJSON()).toEqual({ estado: 'EN_PROCESO' });
  await expect(dialog).toBeHidden();
  await expect(phases.getByRole('button', { name: /^Ingreso\b/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('card-1')).toHaveCount(0);
  await page.getByRole('status').getByRole('button', { name: 'Ver En trabajo', exact: true }).click();
  await expect(phases.getByRole('button', { name: /^En trabajo\b/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('col-EN_PROCESO').getByTestId('card-1')).toBeVisible();
  await expect(page.getByTestId('col-INGRESADO')).toHaveCount(0);
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
  const initialFullStates: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('/api/reparaciones') && url.searchParams.get('page') === '0' && url.searchParams.get('size') === '20') {
      initialFullStates.push(url.searchParams.get('estado') ?? 'SIN_ESTADO');
    }
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
  expect(initialFullStates).toEqual(['INGRESADO']);

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

test('etapas: la búsqueda cuenta los doce estados y sólo carga órdenes de la etapa elegida', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { reparaciones: [
    { ...reparacion, id: 1, estado: 'INGRESADO', descripcionProblema: 'Batería agotada' },
    { ...reparacion, id: 2, estado: 'EN_PROCESO', descripcionProblema: 'Batería desconectada' },
    { ...reparacion, id: 3, estado: 'ESPERANDO_REPUESTO', descripcionProblema: 'Batería nueva' },
    { ...reparacion, id: 4, estado: 'PRESUPUESTADO', descripcionProblema: 'Pantalla rota' },
  ] });
  const stateKeys = [
    'INGRESADO', 'EN_DIAGNOSTICO', 'PRESUPUESTADO', 'ESPERANDO_ADICIONAL',
    'EN_PROCESO', 'ESPERANDO_REPUESTO', 'NO_REPARABLE', 'COMPLETADO',
    'LISTO_SIN_REPARAR', 'ENTREGADO', 'ABANDONADO', 'CANCELADO',
  ];
  await page.route('**/api/dashboard', (route) => route.fulfill({ json: {
    reparacionesPorEstado: Object.fromEntries(stateKeys.map((state) => [state, ['INGRESADO', 'EN_PROCESO', 'ESPERANDO_REPUESTO', 'PRESUPUESTADO'].includes(state) ? 1 : 0])),
    totalReparaciones: 4, reparacionesEsteMes: 4, equiposListos: 0,
  } }));
  const countRequests: string[] = [];
  const fullRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname !== '/api/reparaciones' || url.searchParams.get('q') !== 'Batería') return;
    const state = url.searchParams.get('estado') ?? '';
    if (url.searchParams.get('size') === '1') countRequests.push(state);
    if (url.searchParams.get('size') === '20') fullRequests.push(state);
  });
  await page.goto('/reparaciones');
  const phases = page.getByRole('group', { name: 'Etapas de reparación', exact: true });
  await expect(phases.getByRole('button', { name: /^Aprobación\b/ }).getByText('1', { exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar reparaciones', exact: true }).fill('Batería');

  await expect(phases.getByRole('button', { name: /^Aprobación\b/ }).getByText('0', { exact: true })).toBeVisible();
  await expect(phases.getByRole('button', { name: /^En trabajo\b/ }).getByText('2', { exact: true })).toBeVisible();
  await expect(page.getByTestId('col-INGRESADO').getByTestId('card-1')).toBeVisible();
  expect([...new Set(countRequests)].sort()).toEqual([...stateKeys].sort());
  expect([...new Set(fullRequests)]).toEqual(['INGRESADO']);

  await phases.getByRole('button', { name: /^En trabajo\b/ }).click();
  await expect(page.getByTestId('col-EN_PROCESO').getByTestId('card-2')).toBeVisible();
  await expect(page.getByTestId('col-ESPERANDO_REPUESTO').getByTestId('card-3')).toBeVisible();
  await expect(page.getByTestId('col-NO_REPARABLE').getByText('Sin coincidencias en este estado', { exact: true })).toBeVisible();
  expect([...new Set(fullRequests)].sort()).toEqual(['INGRESADO', 'EN_PROCESO', 'ESPERANDO_REPUESTO', 'NO_REPARABLE'].sort());
  await expect(page.getByTestId('col-INGRESADO')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('q')).toBe('Batería');
});

test('etapas: tres estados y nombres extensos caben sin scroll horizontal de 320 a 1920px', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('ordenfix-theme', 'light'));
  await seedAuth(context);
  const repairs = ['EN_PROCESO', 'ESPERANDO_REPUESTO', 'NO_REPARABLE', 'EN_PROCESO', 'ESPERANDO_REPUESTO', 'NO_REPARABLE'].map((estado, index) => ({
    ...reparacion,
    id: index + 1,
    numeroOrden: `ORD-2026-${String(index + 1).padStart(4, '0')}`,
    estado,
    equipoModelo: index < 3 ? 'ModeloEdiciónEspecial'.repeat(8) : 'iPhone 14',
    clienteApellido: index < 3 ? 'ApellidoDePrueba'.repeat(8) : 'Prueba',
    descripcionProblema: index < 3 ? 'ObservacionTecnicaExtendida'.repeat(10) : 'Revisar conector de carga',
  }));
  await mockApi(page, { reparaciones: repairs });
  await page.route('**/api/dashboard', (route) => route.fulfill({ json: {
    reparacionesPorEstado: Object.fromEntries(allStates.map((state) => [state, ['EN_PROCESO', 'ESPERANDO_REPUESTO', 'NO_REPARABLE'].includes(state) ? 2 : 0])),
    totalReparaciones: 6, reparacionesEsteMes: 6, equiposListos: 0,
  } }));
  await page.goto('/reparaciones?vista=board&etapa=EN_TRABAJO');
  const board = page.getByRole('region', { name: 'Reparaciones por etapas', exact: true });
  await expect(page.getByTestId('card-3')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  mkdirSync('docs/evidence/2026-09-19-stage5', { recursive: true });
  for (const [width, height, theme] of [
    [320, 568, 'light'], [390, 844, 'dark'], [640, 900, 'light'],
    [1280, 800, 'light'], [1440, 900, 'dark'], [1920, 1080, 'dark'],
  ] as const) {
    await page.setViewportSize({ width, height });
    const toggle = page.getByRole('button', { name: `Activar modo ${theme === 'light' ? 'claro' : 'oscuro'}`, exact: true });
    if (await toggle.isVisible()) await toggle.click();
    await expect(board).toBeVisible();
    const documentWidth = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(documentWidth.width, `documento a ${width}px`).toBeLessThanOrEqual(documentWidth.viewport + 1);
    const boardWidth = await board.evaluate((element) => ({ width: element.scrollWidth, viewport: element.clientWidth }));
    expect(boardWidth.width, `etapas a ${width}px`).toBeLessThanOrEqual(boardWidth.viewport + 1);
    await expect(page.getByRole('group', { name: 'Etapas de reparación' }).getByRole('button')).toHaveCount(6);
    for (const state of ['EN_PROCESO', 'ESPERANDO_REPUESTO', 'NO_REPARABLE']) {
      const bounds = await page.getByTestId(`col-${state}`).boundingBox();
      expect(bounds?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((bounds?.x ?? width) + (bounds?.width ?? width)).toBeLessThanOrEqual(width + 1);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/evidence/2026-09-19-stage5/etapas-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
  }
  repairs.forEach((repair, index) => {
    repair.equipoMarca = ['Samsung', 'Motorola', 'Apple'][index % 3];
    repair.equipoModelo = ['Galaxy A35', 'Moto G84', 'iPhone 14'][index % 3];
    repair.clienteNombre = ['Ana', 'Luis', 'Maya'][index % 3];
    repair.clienteApellido = 'Prueba';
    repair.descripcionProblema = ['Revisar conector de carga', 'Cambio de pantalla', 'Falla de encendido'][index % 3];
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(page.getByTestId('card-6')).toBeVisible();
  await page.getByRole('button', { name: 'Activar modo oscuro', exact: true }).click();
  await page.screenshot({ path: 'docs/evidence/2026-09-19-stage5/etapas-realista-1440-dark.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reparaciones');
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Abrir reparación ORD-2026-0006/ })).toBeVisible();
  await page.getByRole('button', { name: 'Activar modo oscuro', exact: true }).click();
  await page.screenshot({ path: 'docs/evidence/2026-09-19-stage5/lista-realista-390-dark.png', fullPage: true, animations: 'disabled' });
});

test('etapas: el escritorio vacío conserva las seis etapas sin altura artificial ni scroll horizontal', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('ordenfix-theme', 'light'));
  await seedAuth(context);
  await mockApi(page, { reparaciones: [] });
  await page.route('**/api/dashboard', (route) => route.fulfill({ json: {
    reparacionesPorEstado: Object.fromEntries(allStates.map((state) => [state, 0])),
    totalReparaciones: 0, reparacionesEsteMes: 0, equiposListos: 0,
  } }));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/reparaciones');
  const board = page.getByRole('region', { name: 'Reparaciones por etapas', exact: true });
  const phases = page.getByRole('group', { name: 'Etapas de reparación', exact: true });
  await expect(phases.getByRole('button')).toHaveCount(6);
  await expect(phases.getByText('0', { exact: true })).toHaveCount(6);
  await expect(page.getByTestId('col-INGRESADO').getByText('Sin reparaciones', { exact: true })).toBeVisible();
  await expect(page.locator('[data-testid^="col-"]')).toHaveCount(1);
  const geometry = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, viewportWidth: window.innerWidth,
    height: document.documentElement.scrollHeight, viewportHeight: window.innerHeight,
  }));
  expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.height).toBeLessThanOrEqual(geometry.viewportHeight + 1);
  expect((await board.boundingBox())?.height ?? 800).toBeLessThan(400);
  await page.evaluate(() => document.fonts.ready);
  mkdirSync('docs/evidence/2026-09-19-stage5', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/2026-09-19-stage5/etapas-vacio-1280-light.png', fullPage: true, animations: 'disabled' });
});
