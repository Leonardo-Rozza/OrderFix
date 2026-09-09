import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { test, expect, type Page, type Request, type TestInfo } from '@playwright/test';
import type { RegistrationAcceptance, RegistrationRequirements } from '../src/api/registrationConsent';

const api = new URL(process.env.ORDENFIX_REGISTRATION_E2E_API_URL!).origin;
const runId = process.env.ORDENFIX_REGISTRATION_E2E_RUN_ID!;
const report = process.env.ORDENFIX_REGISTRATION_E2E_REPORT!;
const password = 'Clave-sintetica-E2E-123';
type Attempt = {
  key: string;
  body: { email: string; requiredSetRevision: string; aceptacionesLegales: RegistrationAcceptance[] };
};
type Evidence = {
  case: 'created' | 'replayed' | 'blocked'; project: string; email: string;
  requiredSetRevision?: string; acceptances?: RegistrationAcceptance[]; idempotencyKey?: string;
};

const matches = (url: string, path: string) => url === `${api}${path}`;
const emailFor = (kind: string, info: TestInfo) => `${kind}-${info.project.name}-${runId}@ordenfix-e2e.test`;
const saveEvidence = (entry: Evidence) => {
  // Un worker y reporte exclusivo de esta ejecución: no almacena password ni JWT.
  const previous: Evidence[] = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) : [];
  writeFileSync(report, JSON.stringify([...previous, entry], null, 2));
};
const observeAttempt = (request: Request): Attempt => {
  expect(request.headers().authorization).toBeUndefined();
  const key = request.headers()['idempotency-key'];
  expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  return { key, body: request.postDataJSON() };
};
const fill = async (page: Page, email: string) => {
  await page.getByLabel('Nombre del taller', { exact: true }).fill('Laboratorio OrdenFix');
  await page.getByLabel('Tu nombre', { exact: true }).fill('Prueba local');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
};
const openAndConfirm = async (page: Page, email: string): Promise<RegistrationRequirements> => {
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === api && url.pathname === '/api/public/requisitos-legales' && response.request().method() === 'GET';
  });
  await page.goto('/register');
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.request().headers().authorization).toBeUndefined();
  const snapshot = await response.json() as RegistrationRequirements;
  expect(snapshot).toMatchObject({ contexto: 'REGISTRO', locale: 'es-AR', requiredSetRevision: expect.stringMatching(/^sha256:[0-9a-f]{64}$/) });
  expect(snapshot.requisitos.some((requirement) => requirement.requerido)).toBe(true);
  await fill(page, email);
  await expect(page.getByRole('button', { name: 'Crear taller', exact: true })).toBeDisabled();
  for (const requirement of snapshot.requisitos) {
    const checkbox = page.getByRole('checkbox', { name: `${requirement.afirmacion} (${requirement.requerido ? 'obligatoria' : 'opcional'})`, exact: true });
    await expect(checkbox).not.toBeChecked();
    const group = checkbox.locator('xpath=../..');
    for (const document of requirement.documentos) {
      const summary = group.locator('summary').filter({ hasText: `Leer ${document.titulo} · versión ${document.version}` });
      await summary.click();
      const region = summary.locator('..').getByRole('region', { name: document.titulo, exact: true });
      await expect(region).toBeVisible();
      expect(await region.textContent()).toBe(document.contenidoMarkdown);
    }
    if (requirement.requerido) await checkbox.check();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  return snapshot;
};
const verifySession = (page: Page, email: string) => {
  // Estos GET nacen del frontend y atraviesan JWT, tenant, CORS y servicios reales.
  const profile = page.waitForResponse((response) => matches(response.url(), '/api/perfil'));
  const subscription = page.waitForResponse((response) => matches(response.url(), '/api/suscripcion'));
  const dashboard = page.waitForResponse((response) => matches(response.url(), '/api/dashboard'));
  return async () => {
    await expect(page).toHaveURL(/\/dashboard$/);
    const responses = await Promise.all([profile, subscription, dashboard]);
    for (const response of responses) {
      expect(response.status()).toBe(200);
      expect(response.request().headers().authorization).toMatch(/^Bearer /);
    }
    expect(await responses[0].json()).toMatchObject({ usuario: { email, role: 'ADMIN' }, taller: { nombre: 'Laboratorio OrdenFix' } });
    await expect(page.getByRole('heading', { name: /Hola, Prueba local/ })).toBeVisible();
  };
};
const verifyAttempt = (attempt: Attempt, snapshot: RegistrationRequirements) => {
  expect(attempt.body.requiredSetRevision).toBe(snapshot.requiredSetRevision);
  expect(attempt.body.aceptacionesLegales).toEqual(snapshot.requisitos.filter((item) => item.requerido).map((item) => ({
    requisitoVersionId: item.id, tipoActo: item.tipoActo, afirmacionSha256: item.afirmacionSha256,
    documentos: item.documentos.map((document) => ({ documentoVersionId: document.id, sha256: document.sha256 })), confirmado: true,
  })));
};
const verifyNoAttemptStorage = async (page: Page, key: string) => {
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain(password);
  expect(storage).not.toContain(key);
};

test('crea una cuenta con las condiciones leídas e ingresa con una sesión real', async ({ page }, info) => {
  const email = emailFor('created', info);
  const snapshot = await openAndConfirm(page, email);
  const session = verifySession(page, email);
  const registration = page.waitForResponse((response) => matches(response.url(), '/api/auth/register') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Crear taller', exact: true }).click();
  const response = await registration;
  expect(response.status()).toBe(201);
  expect(response.headers()['cache-control']).toBe('no-store');
  const attempt = observeAttempt(response.request());
  verifyAttempt(attempt, snapshot);
  await session();
  await verifyNoAttemptStorage(page, attempt.key);
  saveEvidence({ case: 'created', project: info.project.name, email, requiredSetRevision: snapshot.requiredSetRevision,
    acceptances: attempt.body.aceptacionesLegales, idempotencyKey: attempt.key });
});

test('recupera el alta después de perder una respuesta real 201', async ({ page }, info) => {
  const email = emailFor('replayed', info);
  const attempts: Attempt[] = [];
  let discardedStatus: number | undefined;
  await page.route(`${api}/api/auth/register`, async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    attempts.push(observeAttempt(route.request()));
    if (attempts.length === 1) {
      // El servidor confirma el alta. Se descarta únicamente su respuesta al navegador.
      const response = await route.fetch({ maxRetries: 0 });
      discardedStatus = response.status();
      await response.dispose();
      await route.abort('failed');
    } else await route.continue();
  });
  const snapshot = await openAndConfirm(page, email);
  const submit = page.getByRole('button', { name: 'Crear taller', exact: true });
  await submit.click();
  await expect(page.getByRole('alert').filter({ hasText: 'No pudimos confirmar el resultado del registro.' })).toBeVisible();
  expect(discardedStatus).toBe(201);
  await expect(submit).toBeEnabled();
  const session = verifySession(page, email);
  const replay = page.waitForResponse((response) => matches(response.url(), '/api/auth/register') && response.request().method() === 'POST');
  await submit.click();
  expect((await replay).status()).toBe(201);
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  verifyAttempt(attempts[0], snapshot);
  await session();
  await verifyNoAttemptStorage(page, attempts[0].key);
  saveEvidence({ case: 'replayed', project: info.project.name, email, requiredSetRevision: snapshot.requiredSetRevision,
    acceptances: attempts[0].body.aceptacionesLegales, idempotencyKey: attempts[0].key });
});

test('un fallo de red al leer condiciones bloquea el registro sin fallback', async ({ page }, info) => {
  const email = emailFor('blocked', info);
  let registrations = 0;
  let failedReads = 0;
  page.on('request', (request) => { if (matches(request.url(), '/api/auth/register') && request.method() === 'POST') registrations++; });
  await page.route(`${api}/api/public/requisitos-legales?**`, async (route) => { failedReads++; await route.abort('failed'); });
  await page.goto('/register');
  await fill(page, email);
  await expect(page.getByRole('alert').filter({ hasText: 'No pudimos cargar las condiciones.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear taller', exact: true })).toBeDisabled();
  expect(failedReads).toBeGreaterThan(0);
  expect(registrations).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  saveEvidence({ case: 'blocked', project: info.project.name, email });
});
