import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { defaultPerfil, futureToken, mockApi, seedAuth } from './helpers';

for (const width of [1280, 320]) {
  test(`email pendiente en ${width}px: vista previa sin datos operativos hasta confirmar el perfil`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 800 });
    const token = futureToken();
    await seedAuth(context, token, 'ana@taller-prueba.invalid');
    await mockApi(page);
    let verified = false;
    const requests: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith('/api/')) requests.push(`${request.method()} ${path}`);
    });
    await page.route('**/api/perfil', (route) => route.fulfill({ json: {
      ...defaultPerfil,
      usuario: { ...defaultPerfil.usuario, username: 'Ana Técnica', email: 'ana@taller-prueba.invalid', emailVerificado: verified },
      taller: { ...defaultPerfil.taller, nombre: 'Taller de prueba' },
    } }));

    const assertPreview = async () => {
      await expect(page.getByText('Vista previa', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ya lo confirmé', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
      expect(await page.evaluate((expectedToken) => {
        const session = JSON.parse(localStorage.getItem('ordenfix-auth') ?? '{}').state;
        return session?.isAuthenticated === true && session?.token === expectedToken;
      }, token)).toBe(true);
      expect(requests.filter((request) => request !== 'GET /api/perfil')).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    };

    await page.goto('/reparaciones');
    await assertPreview();
    mkdirSync('docs/evidence/2026-09-18-stage1', { recursive: true });
    await page.screenshot({ path: `docs/evidence/2026-09-18-stage1/preview-reparaciones-${width}.png`, fullPage: true, animations: 'disabled' });
    const navigation = width === 1280 ? page.locator('aside nav') : page.locator('nav[aria-label="Principal"]').last();
    await expect(navigation.getByRole('link', { name: 'Reparaciones', exact: true })).toBeVisible();
    await navigation.getByRole('link', { name: 'Clientes', exact: true }).click();
    await expect(page).toHaveURL(/\/clientes$/);
    await assertPreview();

    // Las URLs directas deben pasar por la misma frontera que la navegación.
    for (const path of ['/clientes', '/cuenta/exportacion', '/reparaciones']) {
      await page.goto(path);
      await assertPreview();
    }
    expect(requests.length).toBeGreaterThan(0);

    // El backend pasa a confirmado; el mismo token se conserva y sólo entonces
    // se montan las consultas de la sección que el usuario estaba recorriendo.
    verified = true;
    await page.getByRole('button', { name: 'Ya lo confirmé', exact: true }).click();
    await expect(page.getByText('Vista previa', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Nueva reparación/ })).toBeVisible();
    await expect.poll(() => requests.some((request) => request === 'GET /api/reparaciones')).toBe(true);
    expect(await page.evaluate((expectedToken) => {
      const session = JSON.parse(localStorage.getItem('ordenfix-auth') ?? '{}').state;
      return session?.isAuthenticated === true && session?.token === expectedToken;
    }, token)).toBe(true);
  });
}
