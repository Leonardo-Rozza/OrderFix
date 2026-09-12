import { test, expect } from '@playwright/test';
import { defaultPerfil, futureToken, mockApi, seedAuth } from './helpers';

const id = '10000000-0000-4000-8000-000000000001';
const status = { id, estado: 'READY', expiresAt: '2042-01-01T00:00:00Z', reused: false };
const password = 'solo-prueba-exportacion';
const emptyHistory = { content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } };

for (const width of [1280, 320]) {
  test(`exportación protegida ADMIN ${width}px: ZIP, recuperación y Excel con confirmaciones nuevas`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: width === 320 ? 680 : 900 });
    await page.clock.install();
    await context.addInitScript(() => localStorage.setItem('ordenfix-theme', 'light'));
    await seedAuth(context); await mockApi(page);
    let requested = false, ready = false, polls = 0, grants = 0, zipDownloads = 0, excelDownloads = 0;
    const proofs: string[] = [];
    const purposes: string[] = [];
    await page.route('**/api/aceptaciones-legales?*', (route) => route.fulfill({ json: emptyHistory }));
    await page.route('**/api/exportaciones/actual', (route) => route.fulfill({ json: {
      habilitada: true, exportacion: requested ? { ...status, estado: ready ? 'READY' : 'QUEUED' } : null,
    } }));
    await page.route('**/api/cuenta/reauthenticaciones', async (route) => {
      const request = route.request();
      expect(request.method()).toBe('POST');
      expect(new URL(request.url()).search).toBe('');
      const body = request.postDataJSON();
      expect(body.passwordActual).toBe(password);
      purposes.push(body.proposito);
      const proof = String.fromCharCode(97 + grants++).repeat(43);
      proofs.push(proof);
      await route.fulfill({ json: { reauthToken: proof, proposito: body.proposito, expiresAt: status.expiresAt } });
    });
    await page.route('**/api/exportaciones', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-reauth-token']).toBe(proofs.at(-1));
      expect(route.request().headers()['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/);
      requested = true;
      await route.fulfill({ status: 202, json: { ...status, estado: 'QUEUED' } });
    });
    await page.route(`**/api/exportaciones/${id}`, (route) => {
      polls++; ready = true;
      return route.fulfill({ json: status });
    });
    await page.route(`**/api/exportaciones/${id}/archivo`, (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-reauth-token']).toBe(proofs.at(-1));
      zipDownloads++;
      return route.fulfill({ headers: { 'content-type': 'application/zip',
        'content-disposition': 'attachment; filename="ordenfix-respaldo.zip"',
        'access-control-expose-headers': 'Content-Disposition' }, body: Buffer.from('PK\x03\x04 ZIP sintético') });
    });
    await page.route('**/api/export/excel', (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-reauth-token']).toBe(proofs.at(-1));
      excelDownloads++;
      return route.fulfill({ headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': 'attachment; filename="ordenfix-reporte.xlsx"',
        'access-control-expose-headers': 'Content-Disposition' }, body: Buffer.from('PK\x03\x04 Excel sintético') });
    });

    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Exportar a Excel', exact: true }).click();
    await expect(page).toHaveURL(/\/cuenta\/exportacion#excel$/);
    await expect(page.getByRole('button', { name: 'Solicitar respaldo ZIP', exact: true })).toBeVisible();
    expect(grants).toBe(0); expect(excelDownloads).toBe(0);
    await page.getByRole('button', { name: 'Solicitar respaldo ZIP', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Contraseña actual', { exact: false })).toHaveValue('');
    await dialog.getByLabel('Contraseña actual', { exact: false }).fill(password);
    await dialog.getByRole('button', { name: 'Confirmar solicitud' }).click();
    await expect(page.getByText('Solicitud recibida', { exact: true })).toBeVisible();
    await page.clock.runFor(15_100);
    await expect(page.getByText('Tu respaldo está listo', { exact: true })).toBeVisible();
    await expect(page.getByText('Solicitud recibida. Podés consultar el avance en esta pantalla.', { exact: true })).toHaveCount(0);
    expect(polls).toBe(1);
    await page.clock.runFor(45_000);
    expect(polls).toBe(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`exportacion-${width}.png`), fullPage: true, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Recuperación sólo por el servidor; no se guarda el ID de la solicitud.
    await page.reload();
    await expect(page.getByText('Tu respaldo está listo', { exact: true })).toBeVisible();
    expect(grants).toBe(1);
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.getByRole('button', { name: 'Descargar respaldo ZIP', exact: true }).click();
      await expect(dialog.getByLabel('Contraseña actual', { exact: false })).toHaveValue('');
      if (attempt === 0) await dialog.screenshot({ path: testInfo.outputPath(`confirmacion-${width}.png`), animations: 'disabled' });
      await dialog.getByLabel('Contraseña actual', { exact: false }).fill(password);
      const download = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Confirmar descarga' }).click();
      expect((await download).suggestedFilename()).toBe('ordenfix-respaldo.zip');
      await expect(dialog).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Descargar reporte Excel' }).click();
    await dialog.getByLabel('Contraseña actual', { exact: false }).fill(password);
    const excel = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Confirmar descarga' }).click();
    expect((await excel).suggestedFilename()).toBe('ordenfix-reporte.xlsx');
    await expect(dialog).toHaveCount(0);
    expect(purposes).toEqual(['EXPORTAR', 'DESCARGAR_EXPORTACION', 'DESCARGAR_EXPORTACION', 'DESCARGAR_EXPORTACION']);
    expect(new Set(proofs).size).toBe(4); expect(zipDownloads).toBe(2); expect(excelDownloads).toBe(1);
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    for (const secret of [password, ...proofs, id]) { expect(storage).not.toContain(secret); expect(page.url()).not.toContain(secret); }
    await expect(page.locator('a[download]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.evaluate(() => window.scrollTo(0, 0));
    // Captura el tema final, fuera de la transición de color.
    await page.screenshot({ path: testInfo.outputPath(`exportacion-oscuro-${width}.png`), fullPage: true, animations: 'disabled' });
  });
}

test('exportación: empleado no ve acceso ni consulta rutas administrativas', async ({ page, context }) => {
  await seedAuth(context, futureToken('ROLE_USER'), 'empleado@taller.test'); await mockApi(page);
  await page.route('**/api/perfil', (route) => route.fulfill({ json: {
    ...defaultPerfil, usuario: { ...defaultPerfil.usuario, role: 'USER' },
  } }));
  await page.route('**/api/aceptaciones-legales?*', (route) => route.fulfill({ json: emptyHistory }));
  const calls: string[] = [];
  page.on('request', (request) => { if (/\/api\/(exportaciones|export\/excel|cuenta\/reauthenticaciones)/.test(request.url())) calls.push(request.url()); });
  await page.goto('/cuenta/exportacion');
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole('heading', { name: 'Tu cuenta' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Exportar datos' })).toHaveCount(0);
  expect(calls).toEqual([]);
});

test('exportación: ZIP apagado y error binario Excel no causan una descarga ni avisos duplicados', async ({ page, context }) => {
  await seedAuth(context); await mockApi(page);
  await page.route('**/api/exportaciones/actual', (route) => route.fulfill({ json: { habilitada: false, exportacion: null } }));
  await page.route('**/api/cuenta/reauthenticaciones', (route) => route.fulfill({ json: {
    reauthToken: 'a'.repeat(43), proposito: 'DESCARGAR_EXPORTACION', expiresAt: status.expiresAt,
  } }));
  await page.route('**/api/export/excel', (route) => route.fulfill({ status: 409,
    json: { code: 'EXPORTACION_NO_DISPONIBLE', message: 'Detalle interno no presentado' } }));
  let downloads = 0; page.on('download', () => { downloads++; });
  await page.goto('/cuenta/exportacion');
  await expect(page.getByText(/respaldos ZIP todavía no está habilitada/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Solicitar respaldo ZIP' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Descargar reporte Excel' }).click();
  await page.getByLabel('Contraseña actual', { exact: false }).fill(password);
  await page.getByRole('button', { name: 'Confirmar descarga' }).click();
  await expect(page.getByText('El archivo ya no está disponible para descargar. Consultá su estado antes de continuar.')).toHaveCount(1);
  await expect(page.getByLabel('Contraseña actual', { exact: false })).toHaveValue('');
  await expect(page.getByText('Detalle interno no presentado')).toHaveCount(0);
  expect(downloads).toBe(0);
});

test('exportación: polling sólo visible y pendiente; un fallo detiene los reintentos', async ({ page, context }) => {
  await page.clock.install();
  await seedAuth(context); await mockApi(page);
  await page.route('**/api/exportaciones/actual', (route) => route.fulfill({ json: {
    habilitada: true, exportacion: { ...status, estado: 'RUNNING' },
  } }));
  let polls = 0;
  await page.route(`**/api/exportaciones/${id}`, (route) => {
    polls++; return route.fulfill({ status: 503, json: { code: 'EXPORTACION_NO_DISPONIBLE' } });
  });
  await page.goto('/cuenta/exportacion');
  await expect(page.getByText('Preparando tu respaldo', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(45_000);
  expect(polls).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(15_100);
  await expect(page.getByRole('alert')).toContainText('La exportación no está disponible');
  expect(polls).toBe(1);
  await page.clock.runFor(60_000);
  expect(polls).toBe(1);
});
