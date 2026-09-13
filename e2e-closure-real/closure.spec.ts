import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const api = new URL(process.env.ORDENFIX_CLOSURE_E2E_API_URL!).origin;
const runId = process.env.ORDENFIX_CLOSURE_E2E_RUN_ID!;
const report = process.env.ORDENFIX_CLOSURE_E2E_REPORT!;
interface Account { email: string; password: string; employee: string; viewport: string; jobId: string }
const input: unknown = JSON.parse(process.env.ORDENFIX_CLOSURE_E2E_ACCOUNTS_JSON!);
if (!Array.isArray(input) || input.length !== 2 || input.some((value: unknown) => {
  if (!value || typeof value !== 'object') return true;
  const account = value as Account;
  return !['email', 'password', 'employee', 'viewport', 'jobId'].every((key) => typeof account[key as keyof Account] === 'string')
    || !['desktop', 'mobile-320'].includes(account.viewport);
})) throw new Error('Se requieren dos cuentas del laboratorio efímero de cierre.');
const accounts = input as Account[];
const matches = (url: string, path: string) => url === `${api}/api${path}`;
const login = async (page: Page, account: Account): Promise<string> => {
  await expect(page.getByRole('heading', { name: 'Iniciá sesión', exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password);
  const response = page.waitForResponse((res) => matches(res.url(), '/auth/login') && res.request().method() === 'POST');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const completed = await response;
  expect(completed.status()).toBe(200);
  const data = await completed.json() as { token: string };
  expect(data.token).toBeTruthy();
  return data.token;
};
const fillConfirmation = async (page: Page, password: string, purpose: 'CERRAR' | 'RESTAURAR') => {
  await page.getByLabel('Contraseña actual', { exact: true }).fill(password);
  await page.getByLabel(`Escribí ${purpose} MI TALLER`, { exact: true }).fill(`${purpose} MI TALLER`);
};

test('titular: cerrar, volver a ingresar, descargar un ZIP previo y restaurar con HTTP y PostgreSQL reales', async ({ page, request }, info) => {
  const account = accounts.find((value) => value.viewport === info.project.name)!;
  expect(account).toBeDefined();
  const paths: Array<{ path: string; method: string }> = [];
  const proofs: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.origin !== api) return;
    paths.push({ path: url.pathname, method: req.method() });
    if (url.pathname.startsWith('/api/cuenta/cierre')) expect(url.search).toBe('');
    const proof = req.headers()['x-reauth-token'];
    if (proof) proofs.push(proof);
  });
  await page.goto('/login');
  const old = await login(page, account);
  await page.waitForURL('**/dashboard');
  await page.goto('/cuenta/cierre');
  await expect(page.getByRole('heading', { name: 'El taller está abierto', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: join(dirname(report), `${account.viewport}-open.png`), fullPage: true });

  // Password rejection is a known failure: it does not change the account or start a command.
  await fillConfirmation(page, 'wrong-password', 'CERRAR');
  const rejected = page.waitForResponse((res) => matches(res.url(), '/cuenta/cierre/reauthenticaciones'));
  await page.getByRole('button', { name: 'Confirmar cierre del taller', exact: true }).click();
  expect((await rejected).status()).toBe(400);
  await expect(page.getByRole('alert')).toContainText('contraseña');
  await expect(page.getByLabel('Contraseña actual', { exact: true })).toHaveValue('');
  expect(paths.filter((value) => value.path === '/api/cuenta/cierre/operaciones')).toHaveLength(0);

  await fillConfirmation(page, account.password, 'CERRAR');
  const closeResponse = page.waitForResponse((res) => matches(res.url(), '/cuenta/cierre/operaciones'));
  await page.getByRole('button', { name: 'Confirmar cierre del taller', exact: true }).click();
  const closed = await closeResponse;
  expect(closed.status()).toBe(200);
  expect(closed.headers()['cache-control']).toContain('no-store');
  const close = await closed.json() as { operacionId: string; referencia: string; estadoResultante: string; reversibleHasta: string };
  expect(close.estadoResultante).toBe('RESTRINGIDO');
  expect(close.operacionId).toBe(close.referencia);
  await page.waitForURL('**/login');
  await expect(page.getByRole('status').filter({ hasText: 'El cierre fue confirmado' })).toBeVisible();
  const restricted = await login(page, account);
  await page.waitForURL('**/cuenta/cierre');
  await expect(page.getByRole('heading', { name: 'El taller tiene acceso restringido', exact: true })).toBeVisible();
  await expect(page.getByText(close.referencia, { exact: true }).first()).toBeVisible();
  await expect(page.locator('a[href="/dashboard"]')).toHaveCount(0);
  await expect(page.locator('a[href="/reparaciones"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: join(dirname(report), `${account.viewport}-restricted.png`), fullPage: true });
  expect((await request.get(`${api}/api/cuenta/cierre`, { headers: { Authorization: `Bearer ${old}` } })).status()).toBe(401);
  expect((await request.get(`${api}/api/reparaciones`, { headers: { Authorization: `Bearer ${restricted}` } })).status()).toBe(423);
  expect((await request.post(`${api}/api/auth/login`, { data: { email: account.employee, password: account.password } })).status()).toBe(401);

  const restrictedStart = paths.length;
  await page.getByRole('link', { name: 'Consultar respaldos', exact: true }).click();
  await expect(page.getByText('Tu respaldo está listo', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Solicitar respaldo ZIP', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Descargar reporte Excel', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Descargar respaldo ZIP', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Contraseña actual', { exact: false }).fill(account.password);
  const downloadResponse = page.waitForResponse((res) => matches(res.url(), `/exportaciones/${account.jobId}/archivo`));
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Confirmar descarga', exact: true }).click();
  const archive = await downloadResponse;
  expect(archive.status()).toBe(200);
  expect(archive.headers()['content-type']).toContain('application/zip');
  expect(archive.headers()['cache-control']).toContain('no-store');
  const artifact = await download;
  const zip = join(dirname(report), `${account.viewport}-restricted.zip`);
  await artifact.saveAs(zip);
  expect(readFileSync(zip).subarray(0, 4).toString('hex')).toBe('504b0304');
  expect(paths.slice(restrictedStart).some((value) => value.path === '/api/suscripcion')).toBe(false);

  await page.goto('/cuenta/cierre');
  await expect(page.getByRole('heading', { name: 'El taller tiene acceso restringido', exact: true })).toBeVisible();
  await fillConfirmation(page, account.password, 'RESTAURAR');
  const restoreResponse = page.waitForResponse((res) => matches(res.url(), '/cuenta/cierre/operaciones'));
  await page.getByRole('button', { name: 'Confirmar restauración', exact: true }).click();
  const restoredResponse = await restoreResponse;
  expect(restoredResponse.status()).toBe(200);
  const restored = await restoredResponse.json() as { operacionId: string; referencia: string; estadoResultante: string; reversibleHasta: string };
  expect(restored.estadoResultante).toBe('ABIERTO'); expect(restored.referencia).toBe(close.referencia);
  expect(restored.reversibleHasta).toBe(close.reversibleHasta);
  await page.waitForURL('**/login');
  const reopened = await login(page, account);
  await page.waitForURL('**/cuenta/cierre');
  await expect(page.getByRole('heading', { name: 'El taller está abierto', exact: true })).toBeVisible();
  await expect(page.getByText('Restauración del acceso', { exact: true })).toBeVisible();
  const fresh = await request.get(`${api}/api/cuenta/cierre`, { headers: { Authorization: `Bearer ${reopened}` } });
  expect(fresh.status()).toBe(200);
  const state = await fresh.json() as { estado: string; ultimaOperacion: { operacionId: string } };
  expect(state.estado).toBe('ABIERTO'); expect(state.ultimaOperacion.operacionId).toBe(restored.operacionId);
  expect((await request.get(`${api}/api/cuenta/cierre`, { headers: { Authorization: `Bearer ${restricted}` } })).status()).toBe(401);
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain(account.password); expect(storage).not.toContain(close.referencia); expect(storage).not.toContain(account.jobId);
  for (const proof of proofs) expect(storage).not.toContain(proof);
  expect(paths.filter((value) => value.path === '/api/cuenta/cierre/operaciones' && value.method === 'POST')).toHaveLength(2);
  const previous: Array<{ runId: string }> = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) : [];
  if (previous.some((value) => value.runId !== runId)) throw new Error('Reporte de otro laboratorio.');
  writeFileSync(report, JSON.stringify([...previous, { runId, viewport: account.viewport, reference: close.referencia,
    restoreOperation: restored.operacionId, jobId: account.jobId, restrictedZipDownloaded: true,
    oldSessionsRejected: true, operationalRoutesBlocked: true, stateRecoveredFromServer: true }], null, 2), { mode: 0o600 });
});
