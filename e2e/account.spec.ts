import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { futureToken, seedAuth } from './helpers';

const id = '10000000-0000-4000-8000-000000000001';
const markdown = '# Condiciones de la cuenta\n\nEsta es la versión histórica consultada.\n\n<script>window.documentoEjecutado = true</script>';
const sha256 = createHash('sha256').update(markdown).digest('hex');
const reference = { documentoVersionId: id, tipo: 'TERMINOS_USUARIO', version: '2026-08',
  titulo: 'Condiciones de uso', sha256 };
const document = { id, tipo: reference.tipo, version: reference.version, titulo: reference.titulo,
  contenidoMarkdown: markdown, sha256, vigenteDesde: '2026-08-01T00:00:00Z', estado: 'REEMPLAZADA', locale: 'es-AR' };
const history = {
  content: [{ id: '20000000-0000-4000-8000-000000000001', requisitoVersionId: '30000000-0000-4000-8000-000000000001',
    contexto: 'REGISTRO', tipoActo: 'ACEPTACION', afirmacion: 'Acepto las condiciones para usar mi cuenta.',
    afirmacionSha256: 'a'.repeat(64), documentos: [reference], aceptadoEn: '2026-08-03T15:00:00Z' }],
  page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
};

// Navegador real y API simulada: no acredita habilitación ni datos de staging.
for (const role of ['ADMIN', 'USER'] as const) {
  for (const width of [1280, 320]) {
    test(`Cuenta ${role} en ${width}px: historial exacto y contactos honestos`, async ({ page, context }, testInfo) => {
      await page.setViewportSize({ width, height: width === 320 ? 680 : 900 });
      const token = futureToken(`ROLE_${role}`);
      await seedAuth(context, token);
      const requests: string[] = [];
      let historyCalls = 0;
      let documentCalls = 0;
      await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        requests.push(`${request.method()} ${url.pathname}`);
        expect(request.method()).toBe('GET');
        if (url.pathname === '/api/perfil') {
          expect(request.headers().authorization).toBe(`Bearer ${token}`);
          return route.fulfill({ json: {
            usuario: { id: role === 'ADMIN' ? 1 : 2, username: role === 'ADMIN' ? 'Ana Titular' : 'Beatriz Técnica',
              email: 'cuenta.personal.con.un.nombre.largo@taller-prueba.test', role },
            taller: { id: 1, nombre: 'Taller de reparación de celulares del barrio', telefono: '+54 11 5555 0000' },
          } });
        }
        if (url.pathname === '/api/aceptaciones-legales') {
          expect(request.headers().authorization).toBe(`Bearer ${token}`);
          expect([...url.searchParams.keys()].sort()).toEqual(['page', 'size']);
          expect(url.searchParams.get('page')).toBe('0');
          expect(url.searchParams.get('size')).toBe('20');
          // Un lector no habilitado no debe presentarse como historial vacío.
          if (++historyCalls === 1) return route.fulfill({ status: role === 'ADMIN' ? 404 : 403, json: {} });
          return route.fulfill({ json: history });
        }
        if (url.pathname === `/api/public/documentos-legales/${id}`) {
          expect(request.headers().authorization).toBeUndefined();
          expect(url.search).toBe('');
          documentCalls++;
          return route.fulfill({ json: document });
        }
        return route.fulfill({ status: 500, json: { message: 'Solicitud inesperada en Cuenta' } });
      });

      await page.goto('/cuenta');
      await expect(page.getByRole('heading', { name: 'Tu cuenta' })).toBeVisible();
      await expect(page.getByText(/No pudimos consultar tu historial legal/)).toBeVisible();
      await expect(page.getByText('No hay registros legales para tu usuario.')).toHaveCount(0);
      await expect(page.locator('main').getByText('cuenta.personal.con.un.nombre.largo@taller-prueba.test', { exact: true })).toBeVisible();
      await expect(page.locator('main').getByText(role === 'ADMIN' ? 'Titular del taller' : 'Empleado', { exact: true })).toBeVisible();
      await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
      if (role === 'USER') await expect(page.getByText(/Para pedir la baja de tu propio acceso/)).toBeVisible();
      await expect(page.getByRole('button', { name: /Cerrar taller|Exportar datos|Solicitar baja/i })).toHaveCount(0);

      await page.getByRole('button', { name: 'Reintentar historial' }).click();
      await expect(page.getByRole('heading', { name: 'Aceptación · Registro de cuenta' })).toBeVisible();
      expect(documentCalls).toBe(0);
      await page.getByRole('button', { name: 'Leer Condiciones de uso · versión 2026-08' }).click();
      const reader = page.getByRole('region', { name: 'Condiciones de uso · versión 2026-08' });
      await expect(reader).toBeVisible();
      await expect(reader).toContainText('Esta es la versión histórica consultada.');
      await expect(page.getByText('Versión reemplazada · Versión 2026-08')).toBeVisible();
      expect(await page.evaluate(() => 'documentoEjecutado' in window)).toBe(false);
      await expect(page.getByRole('button', { name: 'Siguiente', exact: true })).toBeDisabled();
      // StrictMode de Vite puede cancelar y repetir el GET del montaje inicial.
      // Todas las lecturas pasan por la ruta exacta y el cliente público arriba.
      expect(documentCalls).toBeGreaterThan(0);
      expect(requests.filter((request) => request.includes('/suscripcion'))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await reader.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await reader.screenshot({ path: testInfo.outputPath(`documento-${role}-${width}.png`) });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath(`cuenta-${role}-${width}.png`) });

      if (width === 320) {
        const more = page.getByRole('button', { name: 'Más', exact: true });
        await expect(more).toHaveAttribute('aria-current', 'page');
        await more.click();
        await expect(page.getByRole('dialog').getByRole('link', { name: 'Cuenta', exact: true })).toHaveAttribute('aria-current', 'page');
        await page.keyboard.press('Escape');
      } else {
        await expect(page.locator('aside').getByRole('link', { name: 'Cuenta', exact: true })).toHaveAttribute('aria-current', 'page');
      }
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('region', { name: 'Condiciones de uso · versión 2026-08' })).toHaveCount(0);
    });
  }
}

test('un fallo comercial deja un acceso a Cuenta que valida el perfil', async ({ page, context }) => {
  await seedAuth(context);
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/perfil') return route.fulfill({ json: {
      usuario: { id: 1, username: 'Ana', email: 'ana@taller.test', role: 'ADMIN' },
      taller: { id: 1, nombre: 'Taller Uno', telefono: null },
    } });
    if (path === '/api/aceptaciones-legales') return route.fulfill({ json: {
      content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
    } });
    return route.fulfill({ status: 503, json: {} });
  });
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Ir a Cuenta y privacidad' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole('heading', { name: 'Tu cuenta' })).toBeVisible();
  await expect(page.getByText('No hay registros legales para tu usuario.')).toBeVisible();
});
