import { mkdirSync } from 'node:fs';
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

const evidenceDirectory = 'docs/evidence/2026-09-19-stage4';
const fixedInstant = new Date('2026-09-19T02:30:00Z'); // En Argentina todavía es el 18.
const localToday = '2026-09-18';
const paramsOf = (page: Page) => new URL(page.url()).searchParams;
const input = (page: Page, label: string) => page.getByRole('textbox', { name: label, exact: true });
const trigger = (page: Page, label: string) => page.getByRole('button', { name: `Abrir calendario: ${label}`, exact: true });
const calendar = (page: Page, label: string) => page.getByRole('dialog', { name: `Calendario: ${label}`, exact: true });
const day = (panel: Locator, date: string) => panel.getByRole('button', { name: new RegExp(date, 'i') });

async function prepare(page: Page, context: BrowserContext, theme: 'light' | 'dark' = 'light') {
  await context.addInitScript((selected) => localStorage.setItem('ordenfix-theme', selected), theme);
  await page.clock.setFixedTime(fixedInstant);
  await seedAuth(context, undefined, 'calendario@synthetic.invalid');
  await mockApi(page, {
    perfil: {
      usuario: { id: 1, username: 'Alex', email: 'calendario@synthetic.invalid', role: 'ADMIN', emailVerificado: true },
      taller: { id: 1, nombre: 'Taller de prueba', telefono: null },
    },
  });

  const requests: Array<{ desde: string | null; hasta: string | null }> = [];
  await page.route((url) => url.origin === 'http://localhost:8080' && url.pathname === '/api/caja', async (route) => {
    const url = new URL(route.request().url());
    const range = { desde: url.searchParams.get('desde'), hasta: url.searchParams.get('hasta') };
    requests.push(range);
    await route.fulfill({ json: {
      desde: range.desde ?? localToday,
      hasta: range.hasta ?? localToday,
      totalCobrado: 0, cantidad: 0, porMetodo: {}, cobros: [],
    } });
  });
  return requests;
}

async function openCalendar(page: Page, label: string) {
  await trigger(page, label).click();
  const panel = calendar(page, label);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('grid')).toBeVisible();
  await expect(panel.getByRole('combobox', { name: 'Mes', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Limpiar fecha', exact: true })).toBeVisible();
  return panel;
}

async function expectCalendarWithinViewport(page: Page, panel: Locator) {
  await expect.poll(async () => {
    const bounds = await panel.boundingBox();
    const viewport = page.viewportSize();
    return Boolean(bounds && viewport && bounds.x >= 0 && bounds.y >= 0
      && bounds.x + bounds.width <= viewport.width + 1
      && bounds.y + bounds.height <= viewport.height + 1);
  }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  // Un popup puede tener medidas correctas y seguir recortado por el scroll del
  // modal. Comprobamos que sus controles se puedan alcanzar realmente.
  const obscuredControls = await panel.evaluate((element) => Array.from(
    element.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button:not([disabled]), select:not([disabled])'),
  ).filter((control) => {
    const rect = control.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit !== control && !control.contains(hit);
  }).map((control) => control.getAttribute('aria-label') ?? control.textContent));
  expect(obscuredControls).toEqual([]);
}

async function capture(page: Page, name: string) {
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  const browserName = page.context().browser()?.browserType().name() ?? 'browser';
  const suffix = browserName === 'chromium' ? '' : `-${browserName}`;
  await page.screenshot({ path: `${evidenceDirectory}/${name}${suffix}.png`, animations: 'disabled' });
}

test('Cobros conserva un borrador inválido sin consultar y confirma el día bisiesto como ISO', async ({ page, context }) => {
  const requests = await prepare(page, context);
  await page.goto('/caja?desde=2024-02-01&hasta=2024-03-31&externo=1');
  await expect.poll(() => requests).toEqual([{ desde: '2024-02-01', hasta: '2024-03-31' }]);
  await expect(input(page, 'Desde')).toHaveValue('01/02/2024');
  await expect(input(page, 'Hasta')).toHaveValue('31/03/2024');

  for (const invalid of ['29/02/2026', '31/04/2024', '29/02/']) {
    await input(page, 'Desde').fill(invalid);
    await input(page, 'Desde').press('Tab');
    await expect(input(page, 'Desde')).toHaveValue(invalid);
    await expect(input(page, 'Desde')).toHaveAttribute('aria-invalid', 'true');
    expect(paramsOf(page).get('desde')).toBe('2024-02-01');
    expect(requests).toHaveLength(1);
  }

  await input(page, 'Desde').fill('29/02/2024');
  await expect.poll(() => requests.at(-1)).toEqual({ desde: '2024-02-29', hasta: '2024-03-31' });
  expect(paramsOf(page).get('desde')).toBe('2024-02-29');
  expect(paramsOf(page).get('externo')).toBe('1');
  await expect(input(page, 'Desde')).not.toHaveAttribute('aria-invalid', 'true');
  await page.goBack();
  await expect(input(page, 'Desde')).toHaveValue('01/02/2024');
  await page.goForward();
  await expect(input(page, 'Desde')).toHaveValue('29/02/2024');
});

test('Cobros permite corregir un rango invertido y conserva sus límites al elegir con teclado', async ({ page, context }) => {
  const requests = await prepare(page, context);
  await page.goto('/caja?desde=2026-08-20&hasta=2026-08-10&externo=1');
  await expect(input(page, 'Desde')).toHaveValue('20/08/2026');
  await expect(input(page, 'Hasta')).toHaveValue('10/08/2026');
  await expect(input(page, 'Hasta')).toHaveAttribute('aria-invalid', 'true');
  expect(requests).toEqual([]);

  await input(page, 'Hasta').fill('25/08/2026');
  await expect.poll(() => requests).toEqual([{ desde: '2026-08-20', hasta: '2026-08-25' }]);
  await trigger(page, 'Hasta').focus();
  await page.keyboard.press('Enter');
  const panel = calendar(page, 'Hasta');
  await expect(panel).toBeVisible();
  await expect(day(panel, '19 de agosto de 2026')).toBeDisabled();
  const selectedDay = day(panel, '25 de agosto de 2026');
  await expect(selectedDay).toBeFocused();
  await selectedDay.press('ArrowLeft');
  await expect(day(panel, '24 de agosto de 2026')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(panel).toBeHidden();
  await expect(trigger(page, 'Hasta')).toBeFocused();
  await expect(input(page, 'Hasta')).toHaveValue('24/08/2026');
  await expect.poll(() => requests.at(-1)).toEqual({ desde: '2026-08-20', hasta: '2026-08-24' });

  const startPanel = await openCalendar(page, 'Desde');
  await expect(day(startPanel, '25 de agosto de 2026')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(startPanel).toBeHidden();
  await expect(trigger(page, 'Desde')).toBeFocused();
});

test('calendario navega por mes y año, limpia y usa el día local en Hoy', async ({ page, context }) => {
  const requests = await prepare(page, context);
  await page.goto('/caja?desde=2026-08-01&hasta=2026-09-30&externo=1');
  await expect.poll(() => requests).toHaveLength(1);

  const panel = await openCalendar(page, 'Desde');
  await panel.getByRole('button', { name: 'Mes anterior', exact: true }).click();
  await expect(panel.getByRole('grid')).toHaveAccessibleName(/julio.*2026/i);
  await panel.getByRole('button', { name: 'Mes siguiente', exact: true }).click();
  await expect(panel.getByRole('grid')).toHaveAccessibleName(/agosto.*2026/i);
  await panel.getByRole('combobox', { name: 'Año', exact: true }).selectOption('2024');
  await panel.getByRole('combobox', { name: 'Mes', exact: true }).selectOption('1');
  await day(panel, '29 de febrero de 2024').click();
  await expect(panel).toBeHidden();
  await expect(trigger(page, 'Desde')).toBeFocused();
  await expect(input(page, 'Desde')).toHaveValue('29/02/2024');
  await expect.poll(() => requests.at(-1)).toEqual({ desde: '2024-02-29', hasta: '2026-09-30' });

  const endPanel = await openCalendar(page, 'Hasta');
  await endPanel.getByRole('button', { name: 'Limpiar fecha', exact: true }).click();
  await expect(endPanel).toBeHidden();
  await expect(input(page, 'Hasta')).toHaveValue('');
  await expect.poll(() => requests.at(-1)).toEqual({ desde: '2024-02-29', hasta: null });

  await openCalendar(page, 'Hasta');
  await endPanel.getByRole('button', { name: 'Hoy', exact: true }).click();
  await expect(input(page, 'Hasta')).toHaveValue('18/09/2026');
  await expect.poll(() => requests.at(-1)).toEqual({ desde: '2024-02-29', hasta: localToday });
  expect(paramsOf(page).get('externo')).toBe('1');
});

test('Reparación bloquea una fecha imposible antes del ingreso rápido y envía fechas ISO al corregir', async ({ page, context }) => {
  await prepare(page, context);
  const mutations: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (['POST', 'PUT'].includes(request.method()) && path.startsWith('/api/reparaciones')) {
      mutations.push({ method: request.method(), path, body: request.postDataJSON() as Record<string, unknown> });
    }
  });
  await page.goto('/reparaciones?nuevo=1');
  const modal = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
  await modal.getByLabel(/^nombre/i).fill('Ana');
  await modal.getByLabel(/teléfono/i).fill('1155550000');
  await modal.getByLabel(/^marca/i).fill('Motorola');
  await modal.getByLabel(/^modelo/i).fill('Moto G84');
  await modal.getByLabel(/problema/i).fill('Revisar pantalla');
  await expect(input(page, 'Fecha de ingreso')).toHaveValue('18/09/2026');
  await input(page, 'Fecha de ingreso').fill('31/02/2024');
  await input(page, 'Entrega estimada').fill('29/02/2024');
  await modal.getByRole('button', { name: 'Crear reparación', exact: true }).click();
  await expect(input(page, 'Fecha de ingreso')).toHaveAttribute('aria-invalid', 'true');
  await expect(input(page, 'Fecha de ingreso')).toBeFocused();
  expect(mutations).toEqual([]);

  await input(page, 'Fecha de ingreso').fill('28/02/2024');
  await modal.getByRole('button', { name: 'Crear reparación', exact: true }).click();
  await expect(page).toHaveURL(/\/reparaciones\/999$/);
  expect(mutations.map(({ method, path }) => ({ method, path }))).toEqual([
    { method: 'POST', path: '/api/reparaciones/ingreso-rapido' },
    { method: 'PUT', path: '/api/reparaciones/999' },
  ]);
  expect(mutations[1].body).toMatchObject({ fechaIngreso: '2024-02-28', fechaEstimadaEntrega: '2024-02-29' });
});

test('Escape durante la carga del calendario vuelve al botón y mantiene abierto el formulario', async ({ page, context }) => {
  await prepare(page, context);
  let releaseCalendar: () => void = () => undefined;
  let markCalendarRequested: () => void = () => undefined;
  const calendarRequested = new Promise<void>((resolve) => { markCalendarRequested = resolve; });
  const calendarResponse = new Promise<void>((resolve) => { releaseCalendar = resolve; });
  await page.route(/\/src\/components\/DateCalendar\.tsx(?:\?|$)/, async (route) => {
    markCalendarRequested();
    await calendarResponse;
    await route.continue();
  });
  await page.goto('/reparaciones?nuevo=1');
  const modal = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
  await expect(modal).toBeVisible();

  try {
    await input(page, 'Fecha de ingreso').focus();
    await page.keyboard.press('Alt+ArrowDown');
    await calendarRequested;
    const panel = calendar(page, 'Fecha de ingreso');
    await expect(panel.getByRole('status')).toHaveText('Cargando calendario…');
    await expect(panel.getByRole('button', { name: 'Cerrar calendario', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(modal).toBeVisible();
    await expect(trigger(page, 'Fecha de ingreso')).toBeFocused();
    await expect(page.getByRole('dialog', { name: '¿Descartar los cambios?', exact: true })).toHaveCount(0);
  } finally {
    releaseCalendar();
  }

  const loadedPanel = await openCalendar(page, 'Fecha de ingreso');
  await loadedPanel.getByRole('button', { name: 'Cerrar calendario', exact: true }).click();
  await expect(loadedPanel).toBeHidden();
  await expect(modal).toBeVisible();
});

for (const viewport of [
  { width: 320, height: 568, theme: 'light' },
  { width: 390, height: 844, theme: 'dark' },
  { width: 1280, height: 800, theme: 'light' },
  { width: 1440, height: 900, theme: 'dark' },
] as const) {
  test(`calendario ${viewport.width}px ${viewport.theme}: visible dentro del modal y Escape conserva la reparación`, async ({ page, context }) => {
    await page.setViewportSize(viewport);
    await prepare(page, context, viewport.theme);
    await page.goto('/reparaciones?nuevo=1');
    const modal = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
    await expect(modal).toBeVisible();
    await input(page, 'Entrega estimada').scrollIntoViewIfNeeded();
    const panel = await openCalendar(page, 'Entrega estimada');
    await expectCalendarWithinViewport(page, panel);
    await capture(page, `reparacion-${viewport.width}-${viewport.theme}-calendario`);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(modal).toBeVisible();
    await expect(trigger(page, 'Entrega estimada')).toBeFocused();
    await expect(page.getByRole('dialog', { name: '¿Descartar los cambios?', exact: true })).toHaveCount(0);

    await openCalendar(page, 'Entrega estimada');
    await day(panel, '21 de septiembre de 2026').click();
    await expect(panel).toBeHidden();
    await expect(input(page, 'Entrega estimada')).toHaveValue('21/09/2026');
    await expect(trigger(page, 'Entrega estimada')).toBeFocused();
    await expect(modal).toBeVisible();

    await openCalendar(page, 'Entrega estimada');
    await panel.getByRole('button', { name: 'Cerrar calendario', exact: true }).click();
    await expect(panel).toBeHidden();
    await expect(input(page, 'Entrega estimada')).toHaveValue('21/09/2026');
    await expect(trigger(page, 'Entrega estimada')).toBeFocused();

    // La misma pieza se presenta fuera del modal, con límites y tema idénticos.
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('dialog', { name: '¿Descartar los cambios?', exact: true })
      .getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await expect(modal).toBeHidden();
    await page.goto('/caja?desde=2026-09-01&hasta=2026-09-30');
    const cajaPanel = await openCalendar(page, 'Hasta');
    await expectCalendarWithinViewport(page, cajaPanel);
    await capture(page, `cobros-${viewport.width}-${viewport.theme}-calendario`);
  });
}
