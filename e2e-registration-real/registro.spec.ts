import { test, expect } from '@playwright/test';
import type { AuthResponse } from '../src/types';
import type { AccountLegalHistoryPage } from '../src/api/accountLegal';
import { api, emailFor, fill, matches, observeAttempt, openAndConfirm, openOwnLegalHistory, saveEvidence, storedTokenMatches,
  verifyAttempt, verifyNoAttemptStorage, verifyPasswordRecovery, verifyRegistrationHistory, verifySession, type Attempt } from './helpers';

test('crea una cuenta con las condiciones leídas e ingresa con una sesión real', async ({ page }, info) => {
  const email = emailFor('created', info);
  const snapshot = await openAndConfirm(page, email);
  let token = '';
  let pendingHistory: AccountLegalHistoryPage | undefined;
  let ownerId: number | undefined;
  let legalHistoryAcceptanceIds: string[] = [];
  const session = verifySession(page, email, async () => {
    const account = await openOwnLegalHistory(page, token, { email, role: 'ADMIN', emailVerificado: false });
    await expect(page.getByRole('button', { name: 'Ya lo confirmé', exact: true })).toBeVisible();
    pendingHistory = account.history;
    ownerId = account.profile.usuario.id;
    legalHistoryAcceptanceIds = await verifyRegistrationHistory(page, account.history, snapshot);
    expect(await storedTokenMatches(page, token)).toBe(true);
  });
  const registration = page.waitForResponse((response) => matches(response.url(), '/api/auth/register') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Crear taller', exact: true }).click();
  const response = await registration;
  expect(response.status()).toBe(201);
  expect(response.headers()['cache-control']).toBe('no-store');
  token = (await response.json() as AuthResponse).token;
  expect(typeof token === 'string' && token.length > 0).toBe(true);
  const attempt = observeAttempt(response.request());
  verifyAttempt(attempt, snapshot);
  await session();
  const verifiedAccount = await openOwnLegalHistory(page, token, { id: ownerId, email, role: 'ADMIN', emailVerificado: true });
  await expect(page.getByRole('button', { name: 'Ya lo confirmé', exact: true })).toHaveCount(0);
  expect(pendingHistory).toBeDefined();
  expect(verifiedAccount.history).toEqual(pendingHistory);
  expect(await verifyRegistrationHistory(page, verifiedAccount.history, snapshot)).toEqual(legalHistoryAcceptanceIds);
  expect(await storedTokenMatches(page, token)).toBe(true);
  await verifyNoAttemptStorage(page, attempt.key);
  const recovery = await verifyPasswordRecovery(page, email, token, emailFor('reset-missing', info));
  saveEvidence({ case: 'created', project: info.project.name, email, requiredSetRevision: snapshot.requiredSetRevision,
    acceptances: attempt.body.aceptacionesLegales, idempotencyKey: attempt.key, legalHistoryAcceptanceIds, recovery });
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
