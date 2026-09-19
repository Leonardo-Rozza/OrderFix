import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, type Request, type TestInfo } from '@playwright/test';
import type { RegistrationAcceptance, RegistrationRequirements } from '../src/api/registrationConsent';
import type { AuthResponse, Perfil } from '../src/types';

export const api = new URL(process.env.ORDENFIX_REGISTRATION_E2E_API_URL!).origin;
const runId = process.env.ORDENFIX_REGISTRATION_E2E_RUN_ID!;
const report = process.env.ORDENFIX_REGISTRATION_E2E_REPORT!;
export const password = 'Clave-sintetica-E2E-123';
export type Attempt = {
  key: string;
  body: { email: string; requiredSetRevision: string; aceptacionesLegales: RegistrationAcceptance[] };
};
type Evidence = {
  case: 'created' | 'replayed' | 'blocked' | 'employees'; project: string; email: string;
  employee?: { id: number; email: string }; client?: { id: number }; ownerId?: number; otherOwnerId?: number;
  requiredSetRevision?: string; acceptances?: RegistrationAcceptance[]; idempotencyKey?: string;
} | {
  case: 'repair-approved' | 'repair-rejected'; project: string; email: string;
  ownerId: number; clientId: number; equipmentId: number; repairId: number; budgetId: number; trackingCode: string;
} | {
  case: 'collections'; project: string; email: string;
  requiredSetRevision: string; acceptances: RegistrationAcceptance[]; idempotencyKey: string;
  ownerId: number; employee: { id: number; email: string }; otherOwnerId: number;
  clientId: number; equipmentId: number; repairId: number; originalCobroId: number; correctedCobroId: number;
};

export const matches = (url: string, path: string) => url === `${api}${path}`;
export const emailFor = (kind: string, info: TestInfo) => `${kind}-${info.project.name}-${runId}@ordenfix-e2e.test`;
export const saveEvidence = (entry: Evidence) => {
  // Un worker y reporte exclusivo de esta ejecución: no almacena password ni JWT.
  const previous: Evidence[] = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) : [];
  writeFileSync(report, JSON.stringify([...previous, entry], null, 2));
};
export const observeAttempt = (request: Request): Attempt => {
  expect(request.headers().authorization).toBeUndefined();
  const key = request.headers()['idempotency-key'];
  expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  return { key, body: request.postDataJSON() };
};
export const fill = async (page: Page, email: string) => {
  await page.getByLabel('Nombre del taller', { exact: true }).fill('Laboratorio OrdenFix');
  await page.getByLabel('Tu nombre', { exact: true }).fill('Prueba local');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
};
export const openAndConfirm = async (page: Page, email: string): Promise<RegistrationRequirements> => {
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
export const verifySession = (page: Page, email: string) => {
  // Estos GET nacen del frontend y atraviesan JWT, tenant, CORS y servicios reales.
  const profile = page.waitForResponse((response) => matches(response.url(), '/api/perfil'));
  const operationalRequests: string[] = [];
  const observe = (request: Request) => {
    if (matches(request.url(), '/api/suscripcion') || matches(request.url(), '/api/dashboard')) {
      operationalRequests.push(new URL(request.url()).pathname);
    }
  };
  page.on('request', observe);
  return async () => {
    try {
      await expect(page).toHaveURL(/\/dashboard$/);
      const pendingProfile = await profile;
      expect(pendingProfile.status()).toBe(200);
      expect(await pendingProfile.json()).toMatchObject({
        usuario: { email, role: 'ADMIN', emailVerificado: false }, taller: { nombre: 'Laboratorio OrdenFix' },
      });
      await expect(page.getByText('Vista previa', { exact: true })).toBeVisible();
      expect(operationalRequests).toEqual([]);
      const subscription = page.waitForResponse((response) => matches(response.url(), '/api/suscripcion'));
      const dashboard = page.waitForResponse((response) => matches(response.url(), '/api/dashboard'));
      await confirmMailboxEmail(page, email);
      for (const response of await Promise.all([subscription, dashboard])) {
        expect(response.status()).toBe(200);
        expect(response.request().headers().authorization).toMatch(/^Bearer /);
      }
      await expect(page.getByRole('heading', { name: /Hola, Prueba local/ })).toBeVisible();
    } finally {
      page.off('request', observe);
    }
  };
};

const confirmMailboxEmail = async (page: Page, email: string) => {
  const directory = process.env.ORDENFIX_REGISTRATION_E2E_MAILBOX;
  if (!directory) throw new Error('Falta el buzón efímero de verificación del harness.');
  const mailbox = join(directory, `${Buffer.from(email).toString('base64url')}.txt`);
  await expect.poll(() => existsSync(mailbox), { message: 'El correo de verificación debe llegar al buzón efímero.' }).toBe(true);
  const verificationToken = readFileSync(mailbox, 'utf8').trim();
  expect(verificationToken.length > 0).toBe(true);
  await page.goto(`/verificar-email?token=${encodeURIComponent(verificationToken)}`);
  const verified = page.waitForResponse((response) => matches(response.url(), '/api/auth/verificar-email') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar mi email', exact: true }).click();
  expect((await verified).status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Email verificado/ })).toBeVisible();
  const profile = page.waitForResponse((response) => matches(response.url(), '/api/perfil') && response.request().method() === 'GET');
  await page.getByRole('link', { name: 'Ir a OrdenFix', exact: true }).click();
  const response = await profile;
  expect(response.status()).toBe(200);
  const identity = await response.json() as Perfil;
  expect(identity.usuario).toMatchObject({ email, emailVerificado: true });
  await expect(page).toHaveURL(/\/dashboard$/);
  return identity;
};
export const verifyAttempt = (attempt: Attempt, snapshot: RegistrationRequirements) => {
  expect(attempt.body.requiredSetRevision).toBe(snapshot.requiredSetRevision);
  expect(attempt.body.aceptacionesLegales).toEqual(snapshot.requisitos.filter((item) => item.requerido).map((item) => ({
    requisitoVersionId: item.id, tipoActo: item.tipoActo, afirmacionSha256: item.afirmacionSha256,
    documentos: item.documentos.map((document) => ({ documentoVersionId: document.id, sha256: document.sha256 })), confirmado: true,
  })));
};
export const verifyNoAttemptStorage = async (page: Page, key: string) => {
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain(password);
  expect(storage).not.toContain(key);
};

export const noHorizontalOverflow = async (page: Page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
};

export const storedTokenMatches = (page: Page, token: string) => page.evaluate((expected) => {
  const stored = JSON.parse(localStorage.getItem('ordenfix-auth') ?? '{}');
  return stored.state?.token === expected;
}, token);

// Fetch del navegador conserva CORS y el JWT original: los rechazos no pasan por
// el interceptor que podría cerrar la sesión y falsear el siguiente control.
export const authenticated = async <T = unknown>(page: Page, token: string, path: string, method = 'GET', body?: unknown) => {
  return page.evaluate(async (input) => {
    const response = await fetch(input.url, {
      method: input.method,
      headers: {
        Authorization: `Bearer ${input.token}`,
        ...(input.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
    });
    const text = await response.text();
    return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
  }, { url: `${api}${path}`, token, method, body });
};

export const login = async (page: Page, email: string, credentials = password) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(credentials);
  const responsePromise = page.waitForResponse((response) => matches(response.url(), '/api/auth/login') && response.request().method() === 'POST');
  const profilePromise = page.waitForResponse((response) => matches(response.url(), '/api/perfil') && response.request().method() === 'GET');
  const subscriptionPromise = page.waitForResponse((response) => matches(response.url(), '/api/suscripcion') && response.request().method() === 'GET');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const [response, profile] = await Promise.all([responsePromise, profilePromise]);
  expect(response.status()).toBe(200);
  expect(profile.status()).toBe(200);
  const session = await response.json() as AuthResponse;
  expect(typeof session.token === 'string' && session.token.length > 0).toBe(true);
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await storedTokenMatches(page, session.token)).toBe(true);
  let identity = await profile.json() as Perfil;
  expect(identity.usuario.email).toBe(email);
  if (!identity.usuario.emailVerificado) {
    await expect(page.getByText('Vista previa', { exact: true })).toBeVisible();
    identity = await confirmMailboxEmail(page, email);
  }
  expect(identity.usuario.emailVerificado).toBe(true);
  expect((await subscriptionPromise).status()).toBe(200);
  expect(await storedTokenMatches(page, session.token)).toBe(true);
  await noHorizontalOverflow(page);
  return { token: session.token, profile: identity };
};
