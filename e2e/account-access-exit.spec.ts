import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { futureToken } from './helpers';

const exitPath = '/api/cuenta/baja-acceso';
const confirmation = 'Entiendo que se desactivará mi acceso y se cerrarán mis sesiones.';
const action = 'Confirmar baja de mi acceso';
const password = '  Contraseña personal exacta  ';

// La recarga posterior a la baja debe conservar el logout, sin sembrar otra sesión.
const seedOnce = async (context: BrowserContext, role: 'ADMIN' | 'USER') => {
  const token = futureToken(`ROLE_${role}`);
  await context.addInitScript(({ token, role }) => {
    if (sessionStorage.getItem('account-exit-session-seeded')) return;
    sessionStorage.setItem('account-exit-session-seeded', 'true');
    localStorage.setItem('ordenfix-auth', JSON.stringify({ version: 0, state: {
      token, email: role === 'USER' ? 'tecnica@taller.test' : 'titular@taller.test', isAuthenticated: true,
    } }));
  }, { token, role });
  return token;
};

const mockAccount = async (
  page: Page,
  role: 'ADMIN' | 'USER',
  token: string,
  onExit: Parameters<Page['route']>[1],
) => {
  const seen: string[] = [];
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    seen.push(`${request.method()} ${path}`);
    expect(request.headers().authorization).toBe(`Bearer ${token}`);
    if (path === exitPath) return onExit(route, request);
    expect(request.method()).toBe('GET');
    if (path === '/api/perfil') return route.fulfill({ json: {
      usuario: { id: role === 'USER' ? 2 : 1, username: role === 'USER' ? 'Beatriz Técnica' : 'Ana Titular',
        email: role === 'USER' ? 'tecnica@taller.test' : 'titular@taller.test', role, emailVerificado: true },
      taller: { id: 1, nombre: 'Taller de celulares del barrio', telefono: null },
    } });
    if (path === '/api/aceptaciones-legales') return route.fulfill({ json: {
      content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
    } });
    return route.fulfill({ status: 503, json: { message: 'Solicitud inesperada en Cuenta' } });
  });
  return seen;
};

const fillExit = async (page: Page) => {
  await page.getByLabel('Contraseña actual', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: confirmation }).check();
};

const expectLoggedOut = async (page: Page) => {
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toContainText('Tu acceso fue desactivado');
  await expect(page.getByText('Beatriz Técnica', { exact: true })).toHaveCount(0);
  const stored = await page.evaluate(() => ({
    auth: JSON.parse(localStorage.getItem('ordenfix-auth') ?? '{}'),
    local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage),
  }));
  expect(stored.auth.state).toMatchObject({ token: null, email: null, isAuthenticated: false });
  expect(stored.local).not.toContain(password);
  expect(stored.session).not.toContain(password);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/cuenta/baja-acceso');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: action })).toHaveCount(0);
};

// API simulada: acredita navegación, contrato y limpieza del navegador; no la revocación del servidor.
for (const width of [1280, 320]) {
  test(`baja propia del empleado en ${width}px: confirmación y cierre sólo después del 204`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: width === 320 ? 680 : 900 });
    const token = await seedOnce(context, 'USER');
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const bodies: unknown[] = [];
    const requests = await mockAccount(page, 'USER', token, async (route) => {
      expect(route.request().method()).toBe('POST');
      bodies.push(route.request().postDataJSON());
      await pending;
      return route.fulfill({ status: 204, headers: { 'Cache-Control': 'private, no-store' } });
    });
    await page.goto('/cuenta');
    await page.getByRole('link', { name: 'Dar de baja mi acceso', exact: true }).click();
    await expect(page).toHaveURL(/\/cuenta\/baja-acceso$/);
    await expect(page.getByText(/no elimina tus datos personales ni cierra el taller/i)).toBeVisible();
    await expect(page.getByText(/Las reparaciones y la evidencia asociada se conservarán/i)).toBeVisible();
    const checkbox = page.getByRole('checkbox', { name: confirmation });
    await expect(checkbox).not.toBeChecked();
    await page.getByLabel('Contraseña actual', { exact: true }).fill(password);
    await expect(page.getByRole('button', { name: action })).toBeDisabled();
    await checkbox.check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`baja-propia-${width}.png`) });
    await page.getByRole('button', { name: action }).click();
    await expect.poll(() => bodies.length).toBe(1);
    await expect(page.getByLabel('Contraseña actual', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Contraseña actual', { exact: true })).toBeDisabled();
    await expect(page).toHaveURL(/\/cuenta\/baja-acceso$/);
    await expect(page.getByText(/Tu acceso fue desactivado/)).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ordenfix-auth')!).state.isAuthenticated)).toBe(true);
    await page.locator('form').evaluate((form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(bodies).toEqual([{ passwordActual: password, confirmado: true }]);
    release();
    await expectLoggedOut(page);
    expect(requests.filter((request) => request.includes('/suscripcion'))).toEqual([]);
    expect(bodies).toHaveLength(1);
  });
}

test('el titular no puede dar de baja su acceso con la operación del empleado', async ({ page, context }) => {
  const token = await seedOnce(context, 'ADMIN');
  let posts = 0;
  const requests = await mockAccount(page, 'ADMIN', token, async (route) => {
    posts++;
    return route.fulfill({ status: 403, json: {} });
  });
  await page.goto('/cuenta/baja-acceso');
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole('heading', { name: 'Tu cuenta' })).toBeVisible();
  await expect(page.getByLabel('Contraseña actual', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Dar de baja mi acceso', exact: true })).toHaveCount(0);
  expect(posts).toBe(0);
  expect(requests.filter((request) => request.includes('/suscripcion'))).toEqual([]);
});

test('contraseña errónea, pausa y resultado incierto permiten reintento explícito sin afirmar una baja', async ({ page, context }) => {
  const token = await seedOnce(context, 'USER');
  const bodies: unknown[] = [];
  const statuses = [400, 429, 503, 204];
  const requests = await mockAccount(page, 'USER', token, async (route) => {
    bodies.push(route.request().postDataJSON());
    const status = statuses[bodies.length - 1];
    if (status === 204) return route.fulfill({ status, headers: { 'Cache-Control': 'private, no-store' } });
    return route.fulfill({ status, headers: status === 429 ? {
      'Retry-After': '1', 'Access-Control-Expose-Headers': 'Retry-After',
    } : {}, json: {
      status, code: status === 400 ? 'PASSWORD_ACTUAL_INVALIDA' : 'TEMPORALMENTE_NO_DISPONIBLE',
      message: 'Mensaje contractual del servidor',
    } });
  });
  await page.goto('/cuenta/baja-acceso');
  await fillExit(page);
  await page.getByRole('button', { name: action }).click();
  await expect(page.getByRole('alert')).toContainText(/contraseña/i);
  await expect(page.getByLabel('Contraseña actual', { exact: true })).toHaveValue('');
  await expect(page).toHaveURL(/\/cuenta\/baja-acceso$/);
  expect(bodies).toHaveLength(1);

  await fillExit(page);
  await page.getByRole('button', { name: action }).click();
  await expect(page.getByRole('button', { name: /Reintentá en/ })).toBeDisabled();
  expect(bodies).toHaveLength(2);
  await expect(page.getByRole('button', { name: action })).toBeVisible({ timeout: 3000 });
  await fillExit(page);
  await page.getByRole('button', { name: action }).click();
  await expect(page.getByRole('alert')).toContainText(/No pudimos confirmar/i);
  await expect(page.getByText(/Tu acceso fue desactivado/)).toHaveCount(0);
  await expect(page.getByLabel('Contraseña actual', { exact: true })).toHaveValue('');
  expect(bodies).toHaveLength(3);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ordenfix-auth')!).state.isAuthenticated)).toBe(true);

  await fillExit(page);
  await page.getByRole('button', { name: action }).click();
  await expectLoggedOut(page);
  expect(bodies).toEqual(statuses.map(() => ({ passwordActual: password, confirmado: true })));
  expect(requests.filter((request) => request.includes('/suscripcion'))).toEqual([]);
});
