import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { defaultPerfil, futureToken, mockApi, seedAuth } from './helpers';

interface ApiRequest {
  method: string;
  url: URL;
  authorization: string | undefined;
}

async function preparePendingSession(page: Page, context: BrowserContext) {
  const token = futureToken();
  await seedAuth(context, token, defaultPerfil.usuario.email);
  await mockApi(page, {
    caja: {
      desde: '2026-09-01', hasta: '2026-09-19',
      totalCobrado: 0, cantidad: 0, porMetodo: {}, cobros: [],
    },
  });

  let verified = false;
  let profileReads = 0;
  const requests: ApiRequest[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      requests.push({ method: request.method(), url, authorization: request.headers().authorization });
    }
  });
  await page.route('**/api/perfil', (route) => {
    profileReads++;
    return route.fulfill({ json: {
      ...defaultPerfil,
      usuario: { ...defaultPerfil.usuario, emailVerificado: verified },
    } });
  });

  return {
    token,
    requests,
    confirmProfile: async () => {
      const previousReads = profileReads;
      verified = true;
      await page.getByRole('button', { name: 'Ya lo confirmé', exact: true }).click();
      await expect.poll(() => profileReads).toBeGreaterThan(previousReads);
      await expect(page.getByText('Vista previa', { exact: true })).toHaveCount(0);
    },
  };
}

async function expectSameSession(page: Page, token: string) {
  expect(await page.evaluate((expectedToken) => {
    const session = JSON.parse(localStorage.getItem('ordenfix-auth') ?? '{}').state;
    return session?.isAuthenticated === true && session?.token === expectedToken;
  }, token)).toBe(true);
}

async function expectPreviewOnly(page: Page, requests: ApiRequest[], token: string) {
  await expect(page.getByText('Vista previa', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ya lo confirmé', exact: true })).toBeEnabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.map(({ method, url }) => `${method} ${url.pathname}`))
    .toEqual(requests.map(() => 'GET /api/perfil'));
  await expectSameSession(page, token);
}

for (const width of [1280, 320]) {
  test(`email y reparación nueva en ${width}px: conserva la URL y abre el formulario sólo tras confirmar`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 800 });
    const session = await preparePendingSession(page, context);

    await page.goto('/reparaciones?nuevo=1');
    await expectPreviewOnly(page, session.requests, session.token);
    await expect(page.getByRole('button', { name: 'Nueva reparación', exact: true })).toBeDisabled();
    await expect(page.getByRole('textbox', { name: 'Fecha de ingreso', exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/\/reparaciones\?nuevo=1$/);

    // La respuesta nueva del perfil habilita la misma intención de ingreso;
    // no se reescribe el store ni se navega para saltar el guard.
    await session.confirmProfile();
    const form = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
    await expect(form).toBeVisible();
    await expect(form.getByRole('textbox', { name: 'Fecha de ingreso', exact: true }))
      .toHaveValue(/^\d{2}\/\d{2}\/\d{4}$/);
    await expect(form.getByRole('button', { name: 'Abrir calendario: Fecha de ingreso', exact: true })).toBeEnabled();
    await expect.poll(() => session.requests.some(({ url }) => url.pathname === '/api/reparaciones')).toBe(true);
    await expect(page).toHaveURL(/\/reparaciones\?nuevo=1$/);
    await expectSameSession(page, session.token);
    expect(session.requests.every(({ method, authorization }) => method === 'GET' && authorization === `Bearer ${session.token}`)).toBe(true);
  });

  test(`email y Cobros en ${width}px: conserva el rango ISO sin consultarlo hasta confirmar`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 800 });
    const session = await preparePendingSession(page, context);

    await page.goto('/caja?desde=2026-09-01&hasta=2026-09-19');
    await expectPreviewOnly(page, session.requests, session.token);
    await expect(page.getByRole('button', { name: 'Registrar cobro', exact: true })).toBeDisabled();
    await expect(page.getByRole('textbox', { name: 'Desde', exact: true })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Hasta', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir calendario: Desde', exact: true })).toHaveCount(0);

    await session.confirmProfile();
    await expect(page.getByRole('textbox', { name: 'Desde', exact: true })).toHaveValue('01/09/2026');
    await expect(page.getByRole('textbox', { name: 'Hasta', exact: true })).toHaveValue('19/09/2026');
    await expect(page.getByRole('button', { name: 'Abrir calendario: Desde', exact: true })).toBeEnabled();
    await expect(page.getByText('Sin cobros en el período', { exact: true })).toBeVisible();
    const cajaRequests = () => session.requests.filter(({ url }) => url.pathname === '/api/caja');
    await expect.poll(() => cajaRequests().length).toBeGreaterThan(0);
    for (const { method, url } of cajaRequests()) {
      expect(method).toBe('GET');
      expect(Object.fromEntries(url.searchParams)).toEqual({ desde: '2026-09-01', hasta: '2026-09-19' });
    }
    await expect(page).toHaveURL(/\/caja\?desde=2026-09-01&hasta=2026-09-19$/);
    await expectSameSession(page, session.token);
    expect(session.requests.every(({ method, authorization }) => method === 'GET' && authorization === `Bearer ${session.token}`)).toBe(true);
  });
}
