import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import type { AuthResponse, Perfil } from '../src/types';

const api = new URL(process.env.ORDENFIX_EXPORT_E2E_API_URL!).origin;
const runId = process.env.ORDENFIX_EXPORT_E2E_RUN_ID!;
const report = process.env.ORDENFIX_EXPORT_E2E_REPORT!;
interface Account { email: string; password: string; cliente: string; viewport: 'desktop' | 'mobile-320' }
const parsed: unknown = JSON.parse(process.env.ORDENFIX_EXPORT_E2E_ACCOUNTS_JSON!);
if (!Array.isArray(parsed) || parsed.length !== 2 || parsed.some((value: unknown) => {
  if (!value || typeof value !== 'object') return true;
  const account = value as Account;
  return typeof account.email !== 'string' || typeof account.password !== 'string' || typeof account.cliente !== 'string'
    || !account.email || !account.password || !account.cliente || !['desktop', 'mobile-320'].includes(account.viewport);
}) || new Set(parsed.map((value: Account) => value.viewport)).size !== 2) {
  throw new Error('El laboratorio requiere dos cuentas sintéticas, una por viewport.');
}
const accounts = parsed as Account[];

/** Lector sólo para las muestras del gate: directorio central ZIP, sin extraer rutas al disco. */
const zipEntries = (bytes: Buffer): Map<string, Buffer> => {
  if (bytes.length < 22 || bytes.length > 64 * 1024 * 1024) throw new Error('ZIP del laboratorio fuera de límites.');
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) { end = offset; break; }
  }
  if (end < 0) throw new Error('No se encontró el directorio del ZIP.');
  const count = bytes.readUInt16LE(end + 10);
  let cursor = bytes.readUInt32LE(end + 16);
  if (count < 1 || count > 1024 || bytes.readUInt16LE(end + 4) !== 0 || bytes.readUInt16LE(end + 6) !== 0
    || cursor + bytes.readUInt32LE(end + 12) !== end) throw new Error('Directorio ZIP no permitido en el laboratorio.');
  const entries = new Map<string, Buffer>();
  let total = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Entrada ZIP inválida.');
    const flags = bytes.readUInt16LE(cursor + 8), method = bytes.readUInt16LE(cursor + 10);
    const size = bytes.readUInt32LE(cursor + 24), compressed = bytes.readUInt32LE(cursor + 20);
    const nameLength = bytes.readUInt16LE(cursor + 28), extraLength = bytes.readUInt16LE(cursor + 30), commentLength = bytes.readUInt16LE(cursor + 32);
    const local = bytes.readUInt32LE(cursor + 42);
    if (cursor + 46 + nameLength + extraLength + commentLength > end || local + 30 > bytes.length
      || bytes.readUInt32LE(local) !== 0x04034b50 || flags & 1 || ![0, 8].includes(method)
      || size > 32 * 1024 * 1024 || (total += size) > 64 * 1024 * 1024) throw new Error('Archivo ZIP no permitido.');
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    if (start + compressed > bytes.length || entries.has(name)) throw new Error('Archivo ZIP duplicado o truncado.');
    const content = method === 0 ? bytes.subarray(start, start + compressed)
      : inflateRawSync(bytes.subarray(start, start + compressed), { maxOutputLength: 32 * 1024 * 1024 });
    if (content.length !== size) throw new Error('Tamaño ZIP inesperado.');
    entries.set(name, content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== end) throw new Error('Directorio ZIP incompleto.');
  return entries;
};
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const matches = (url: string, path: string) => url === `${api}${path}`;

test('Cuenta: ZIP y Excel reales del propio taller con nueva confirmación en cada descarga', async ({ page, context, request }, info) => {
  const account = accounts.find((value) => value.viewport === info.project.name)!;
  const login = await request.post(`${api}/api/auth/login`, { data: { email: account.email, password: account.password } });
  expect(login.status()).toBe(200);
  const session = await login.json() as AuthResponse;
  expect(typeof session.token).toBe('string');
  // Sesión emitida por el backend real para la fixture; nunca se inventa una firma.
  await context.addInitScript(({ token, email }) => {
    localStorage.setItem('ordenfix-auth', JSON.stringify({
      state: { token, email, emailVerificado: true, isAuthenticated: true }, version: 0,
    }));
  }, { token: session.token, email: account.email });

  const requests: Array<{ path: string; method: string; proofPresent: boolean }> = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.origin === api && /^\/api\/(?:exportaciones|export\/excel|cuenta\/reauthenticaciones)/.test(url.pathname)) {
      expect(url.search).toBe('');
      requests.push({ path: url.pathname, method: req.method(), proofPresent: !!req.headers()['x-reauth-token'] });
    }
  });
  const profilePromise = page.waitForResponse((response) => matches(response.url(), '/api/perfil') && response.request().method() === 'GET');
  await page.goto('/cuenta/exportacion');
  const profileResponse = await profilePromise;
  expect(profileResponse.status()).toBe(200);
  const profile = await profileResponse.json() as Perfil;
  expect(profile.usuario.email).toBe(account.email);
  expect(profile.usuario.role).toBe('ADMIN');
  await expect(page.getByRole('button', { name: 'Solicitar respaldo ZIP', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Solicitar respaldo ZIP', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Contraseña actual', { exact: false }).fill(account.password);
  const creationPromise = page.waitForResponse((response) => matches(response.url(), '/api/exportaciones') && response.request().method() === 'POST');
  const grantPromise = page.waitForResponse((response) => matches(response.url(), '/api/cuenta/reauthenticaciones') && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Confirmar solicitud' }).click();
  expect((await grantPromise).status()).toBe(200);
  const creation = await creationPromise;
  expect(creation.status()).toBe(202);
  const job = await creation.json() as { id: string; estado: string };
  expect(job.id).toMatch(/^[a-f0-9-]{36}$/);
  await expect(page.getByText('Tu respaldo está listo', { exact: true })).toBeVisible({ timeout: 45_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // La recarga recupera el trabajo propio desde PostgreSQL, sin ID/proof en storage.
  await page.reload();
  await expect(page.getByText('Tu respaldo está listo', { exact: true })).toBeVisible();
  expect(requests.filter((value) => value.path === '/api/exportaciones' && value.method === 'POST')).toHaveLength(1);
  await page.getByRole('button', { name: 'Descargar respaldo ZIP', exact: true }).click();
  await expect(dialog.getByLabel('Contraseña actual', { exact: false })).toHaveValue('');
  await dialog.getByLabel('Contraseña actual', { exact: false }).fill(account.password);
  const zipResponsePromise = page.waitForResponse((response) => matches(response.url(), `/api/exportaciones/${job.id}/archivo`));
  const zipDownloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Confirmar descarga' }).click();
  const zipResponse = await zipResponsePromise;
  expect(zipResponse.status()).toBe(200);
  expect(zipResponse.headers()['content-type']).toContain('application/zip');
  expect(zipResponse.headers()['cache-control']).toContain('no-store');
  const zipDownload = await zipDownloadPromise;
  expect(zipDownload.suggestedFilename()).toMatch(/\.zip$/);
  const directory = dirname(report);
  mkdirSync(directory, { recursive: true });
  const zipPath = join(directory, `${runId}.${account.viewport}.zip`);
  const excelPath = join(directory, `${runId}.${account.viewport}.xlsx`);
  expect(existsSync(zipPath)).toBe(false); expect(existsSync(excelPath)).toBe(false);
  await zipDownload.saveAs(zipPath); chmodSync(zipPath, 0o600);
  const zipBytes = readFileSync(zipPath);
  expect(zipBytes.subarray(0, 4).toString('hex')).toBe('504b0304');
  const entries = zipEntries(zipBytes);
  expect(entries.has('manifest.json')).toBe(true);
  expect(entries.has('datos/clientes.json')).toBe(true);
  const clients: unknown = JSON.parse(entries.get('datos/clientes.json')!.toString('utf8'));
  expect(Array.isArray(clients)).toBe(true);
  const clientsText = JSON.stringify(clients);
  expect(clientsText).toContain(account.cliente);
  for (const foreign of accounts.filter((value) => value.viewport !== account.viewport)) expect(clientsText).not.toContain(foreign.cliente);
  const manifest = JSON.parse(entries.get('manifest.json')!.toString('utf8')) as { exportacion_integral_completa: boolean; archivos: Array<{ ruta: string; sha256: string; bytes: number }> };
  expect(manifest.exportacion_integral_completa).toBe(true);
  for (const file of manifest.archivos) {
    const bytes = entries.get(file.ruta);
    expect(bytes).toBeDefined();
    expect(bytes!.length).toBe(file.bytes);
    expect(sha256(bytes!)).toBe(file.sha256);
  }

  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Descargar reporte Excel', exact: true }).click();
  await expect(dialog.getByLabel('Contraseña actual', { exact: false })).toHaveValue('');
  await dialog.getByLabel('Contraseña actual', { exact: false }).fill(account.password);
  const excelResponsePromise = page.waitForResponse((response) => matches(response.url(), '/api/export/excel') && response.request().method() === 'POST');
  const excelDownloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Confirmar descarga' }).click();
  const excelResponse = await excelResponsePromise;
  expect(excelResponse.status()).toBe(200);
  expect(excelResponse.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  expect(excelResponse.headers()['cache-control']).toContain('no-store');
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toMatch(/\.xlsx$/);
  await excelDownload.saveAs(excelPath); chmodSync(excelPath, 0o600);
  const excelBytes = readFileSync(excelPath);
  expect(excelBytes.subarray(0, 4).toString('hex')).toBe('504b0304');
  const excel = zipEntries(excelBytes);
  expect(excel.has('xl/workbook.xml')).toBe(true);
  const strings = excel.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
  expect(strings).toContain(account.cliente);
  for (const foreign of accounts.filter((value) => value.viewport !== account.viewport)) expect(strings).not.toContain(foreign.cliente);
  await expect(dialog).toHaveCount(0);
  expect(requests.filter((value) => value.path === '/api/cuenta/reauthenticaciones' && value.method === 'POST')).toHaveLength(3);
  expect(requests.filter((value) => value.path.endsWith('/archivo') || value.path === '/api/export/excel'))
    .toEqual([{ path: `/api/exportaciones/${job.id}/archivo`, method: 'POST', proofPresent: true },
      { path: '/api/export/excel', method: 'POST', proofPresent: true }]);
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain(account.password); expect(storage).not.toContain(job.id);
  expect(storage).not.toMatch(/reauthToken|X-Reauth-Token/);
  const entry = { runId, viewport: account.viewport, jobId: job.id, zipPath, excelPath,
    zipSha256: sha256(zipBytes), excelSha256: sha256(excelBytes),
    zipContentType: zipResponse.headers()['content-type'], excelContentType: excelResponse.headers()['content-type'],
    ownCustomerIncluded: true, foreignCustomersExcluded: true };
  const previous: Array<{ runId: string }> = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) : [];
  if (previous.some((item) => item.runId !== runId)) throw new Error('El reporte pertenece a otro laboratorio.');
  writeFileSync(report, JSON.stringify([...previous, entry], null, 2), { mode: 0o600 });
});
