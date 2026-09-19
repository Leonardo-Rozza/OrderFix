import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, type Request, type TestInfo } from '@playwright/test';
import type { RegistrationAcceptance, RegistrationRequirements } from '../src/api/registrationConsent';
import type { AccountLegalHistoryPage } from '../src/api/accountLegal';
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
  legalHistoryAcceptanceIds?: string[]; employeeLegalHistoryTotal?: 0;
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
export const verifySession = (page: Page, email: string, beforeEmailConfirmation?: () => Promise<void>) => {
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
      if (beforeEmailConfirmation) {
        await beforeEmailConfirmation();
        await page.goto('/dashboard');
        await expect(page.getByText('Vista previa', { exact: true })).toBeVisible();
        expect(operationalRequests).toEqual([]);
      }
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

/** Cuenta usa el JWT real y consulta exclusivamente el historial del principal. */
export const openOwnLegalHistory = async (
  page: Page, token: string,
  expectedUser: Pick<Perfil['usuario'], 'email' | 'role' | 'emailVerificado'> & { id?: number },
  options: { navigateInApp?: boolean } = {},
) => {
  const observed: string[] = [];
  const observe = (request: Request) => {
    const url = new URL(request.url());
    if (url.origin === api) observed.push(`${request.method()} ${url.pathname}`);
  };
  page.on('request', observe);
  try {
    const profilePromise = page.waitForResponse((response) => matches(response.url(), '/api/perfil') && response.request().method() === 'GET');
    const historyPromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.origin === api && url.pathname === '/api/aceptaciones-legales' && response.request().method() === 'GET';
    });
    if (options.navigateInApp) {
      if ((page.viewportSize()?.width ?? 1280) >= 1024) {
        await page.locator('aside').getByRole('link', { name: 'Cuenta', exact: true }).click();
      } else {
        await page.getByRole('button', { name: 'Más', exact: true }).click();
        await page.getByRole('dialog', { name: 'Más herramientas', exact: true })
          .getByRole('link', { name: 'Cuenta', exact: true }).click();
      }
    } else await page.goto('/cuenta');
    const [profileResponse, historyResponse] = await Promise.all([profilePromise, historyPromise]);
    expect(profileResponse.status()).toBe(200);
    const profile = await profileResponse.json() as Perfil;
    expect(profile.usuario).toMatchObject(expectedUser);
    expect(Number.isSafeInteger(profile.usuario.id) && profile.usuario.id > 0).toBe(true);
    expect(historyResponse.status()).toBe(200);
    expect(historyResponse.headers()['cache-control']).toBe('private, no-store');
    expect(historyResponse.headers().etag).toBeUndefined();
    expect(historyResponse.request().headers().authorization === `Bearer ${token}`).toBe(true);
    expect(Object.fromEntries(new URL(historyResponse.url()).searchParams)).toEqual({ page: '0', size: '20' });
    const history = await historyResponse.json() as AccountLegalHistoryPage;
    await expect(page.getByRole('heading', { name: 'Tu cuenta', exact: true })).toBeVisible();
    const section = page.getByRole('region', { name: 'Tu historial legal', exact: true });
    await expect(section.getByText('Cargando tu historial legal…', { exact: true })).toHaveCount(0);
    await expect(section.getByRole('alert')).toHaveCount(0);
    expect(observed.every((request) => ['GET /api/perfil', 'GET /api/aceptaciones-legales'].includes(request))).toBe(true);
    expect(await storedTokenMatches(page, token)).toBe(true);
    await noHorizontalOverflow(page);
    return { profile, history };
  } finally {
    page.off('request', observe);
  }
};

/** Coteja todos los actos/documentos leídos con el snapshot realmente enviado al registrar. */
export const verifyRegistrationHistory = async (
  page: Page, history: AccountLegalHistoryPage, snapshot: RegistrationRequirements,
): Promise<string[]> => {
  const required = snapshot.requisitos.filter((requirement) => requirement.requerido);
  expect(required.length).toBeLessThanOrEqual(20);
  expect(history.page).toEqual({ size: 20, number: 0, totalElements: required.length, totalPages: 1 });
  expect(history.content.map((act) => act.requisitoVersionId).sort()).toEqual(required.map((requirement) => requirement.id).sort());
  const section = page.getByRole('region', { name: 'Tu historial legal', exact: true });
  await expect(section.locator('article')).toHaveCount(required.length);
  const labels = { ACEPTACION: 'Aceptación', LECTURA: 'Lectura', DECLARACION: 'Declaración' };
  for (const requirement of required) {
    const act = history.content.find((item) => item.requisitoVersionId === requirement.id)!;
    const expectedReferences = requirement.documentos.map((document) => ({
      documentoVersionId: document.id, tipo: document.tipo, version: document.version, titulo: document.titulo, sha256: document.sha256,
    })).sort((left, right) => left.documentoVersionId.localeCompare(right.documentoVersionId));
    expect({ ...act, documentos: [...act.documentos].sort((left, right) => left.documentoVersionId.localeCompare(right.documentoVersionId)) }).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
      requisitoVersionId: requirement.id, contexto: 'REGISTRO', tipoActo: requirement.tipoActo,
      afirmacion: requirement.afirmacion, afirmacionSha256: requirement.afirmacionSha256,
      documentos: expectedReferences, aceptadoEn: expect.any(String),
    });
    expect(Number.isFinite(Date.parse(act.aceptadoEn))).toBe(true);
    const article = section.locator('article').filter({ has: page.getByText(requirement.afirmacion, { exact: true }) });
    await expect(article.getByRole('heading', { name: `${labels[requirement.tipoActo]} · Registro de cuenta`, exact: true })).toBeVisible();
    await expect(article.locator('time')).toHaveAttribute('datetime', act.aceptadoEn);
    for (const document of requirement.documentos) {
      const responsePromise = page.waitForResponse((response) => matches(response.url(), `/api/public/documentos-legales/${document.id}`) && response.request().method() === 'GET');
      await article.getByRole('button', { name: `Leer ${document.titulo} · versión ${document.version}`, exact: true }).click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      expect(response.request().headers().authorization).toBeUndefined();
      expect(await response.json()).toEqual(document);
      const reader = article.getByRole('region', { name: `${document.titulo} · versión ${document.version}`, exact: true });
      await expect(reader).toBeVisible();
      expect(await reader.textContent()).toBe(document.contenidoMarkdown);
      await noHorizontalOverflow(page);
      await article.getByRole('button', { name: `Cerrar ${document.titulo} · versión ${document.version}`, exact: true }).click();
      await expect(reader).toHaveCount(0);
    }
  }
  const ids = history.content.map((act) => act.id).sort();
  expect(new Set(ids).size).toBe(ids.length);
  return ids;
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

export const login = async (page: Page, email: string, credentials = password, options: { reuseLoginPage?: boolean } = {}) => {
  if (options.reuseLoginPage) await expect(page).toHaveURL(/\/login$/);
  else await page.goto('/login');
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
