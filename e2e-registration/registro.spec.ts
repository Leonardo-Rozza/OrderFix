import { createHash } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { futureToken, mockApi } from '../e2e/helpers';

const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const revision = (version: number) => `sha256:${digest(`revision de prueba ${version}`)}`;
const statement = 'Acepto las condiciones de uso de OrdenFix.';
const requirements = (version = 1) => {
  const markdown = `# Condiciones de prueba ${version}\n\nTexto de prueba para leer antes de confirmar.`;
  return {
    contexto: 'REGISTRO', locale: 'es-AR', requiredSetRevision: revision(version),
    requisitos: [{
      id: '12345678-1234-1234-1234-123456789abc', contexto: 'REGISTRO', tipoActo: 'ACEPTACION',
      afirmacion: statement, afirmacionSha256: digest(statement), requerido: true,
      documentos: [{
        id: '23456789-2345-2345-2345-23456789abcd', tipo: 'TERMINOS_SERVICIO',
        version: `${version}.0`, titulo: 'Condiciones de prueba', contenidoMarkdown: markdown,
        sha256: digest(markdown), vigenteDesde: '2026-09-08T00:00:00Z', estado: 'VIGENTE', locale: 'es-AR',
      }],
    }],
  };
};

const fillRegistration = async (page: Page) => {
  await page.getByLabel('Nombre del taller', { exact: true }).fill('Taller de prueba');
  await page.getByLabel('Tu nombre', { exact: true }).fill('Ana');
  await page.getByLabel('Email', { exact: true }).fill('ana@taller-prueba.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('Clave-de-prueba-123');
};

test('lee condiciones y reintenta el mismo registro tras un 503 sin perder las confirmaciones', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/public/requisitos-legales?**', (route) => route.fulfill({ json: requirements() }));
  const attempts: { key: string | undefined; body: Record<string, unknown> }[] = [];
  await page.route('**/api/auth/register', async (route) => {
    attempts.push({ key: route.request().headers()['idempotency-key'], body: route.request().postDataJSON() });
    await route.fulfill(attempts.length === 1
      ? { status: 503, json: { code: 'CONTRATO_LEGAL_NO_DISPONIBLE', message: 'No disponible.' } }
      : { status: 201, json: { token: futureToken(), type: 'Bearer', email: 'ana@taller-prueba.test', emailVerificado: false } });
  });
  await page.goto('/register');
  await fillRegistration(page);
  const checkbox = page.getByRole('checkbox', { name: statement });
  await expect(checkbox).not.toBeChecked();
  const submit = page.getByRole('button', { name: 'Crear taller', exact: true });
  await expect(submit).toBeDisabled();
  await page.locator('summary').filter({ hasText: 'Condiciones de prueba' }).click();
  await expect(page.getByText(/Texto de prueba para leer antes de confirmar/)).toBeVisible();
  await checkbox.check();
  await submit.click();
  await expect.poll(() => attempts.length).toBe(1);
  await expect(submit).toBeEnabled();
  await expect(checkbox).toBeChecked();
  await submit.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(attempts).toHaveLength(2);
  expect(attempts[0].key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(attempts[1]).toEqual(attempts[0]);
  expect(attempts[0].body.requiredSetRevision).toBe(revision(1));
  expect(attempts[0].body.aceptacionesLegales).toMatchObject([{ confirmado: true, tipoActo: 'ACEPTACION' }]);
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain('Clave-de-prueba-123');
  expect(storage).not.toContain(attempts[0].key!);
});

test('una revisión nueva conserva los datos y exige confirmar de nuevo con otra clave', async ({ page }) => {
  await mockApi(page);
  let version = 1;
  await page.route('**/api/public/requisitos-legales?**', (route) => route.fulfill({ json: requirements(version) }));
  const attempts: { key: string | undefined; body: Record<string, unknown> }[] = [];
  await page.route('**/api/auth/register', async (route) => {
    attempts.push({ key: route.request().headers()['idempotency-key'], body: route.request().postDataJSON() });
    version = 2;
    await route.fulfill(attempts.length === 1
      ? { status: 409, json: { code: 'DOCUMENTOS_LEGALES_DESACTUALIZADOS', details: { submittedRevision: revision(1), requisitosActuales: requirements(2) } } }
      : { status: 201, json: { token: futureToken(), type: 'Bearer', email: 'ana@taller-prueba.test', emailVerificado: false } });
  });
  await page.goto('/register');
  await fillRegistration(page);
  const checkbox = page.getByRole('checkbox', { name: statement });
  await checkbox.check();
  const submit = page.getByRole('button', { name: 'Crear taller', exact: true });
  await submit.click();
  await expect(checkbox).not.toBeChecked();
  await expect(submit).toBeDisabled();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('ana@taller-prueba.test');
  await checkbox.check();
  await submit.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(attempts).toHaveLength(2);
  expect(attempts[1].key).not.toBe(attempts[0].key);
  expect(attempts[1].body.requiredSetRevision).toBe(revision(2));
});

test('un catálogo no disponible impide registrar y no degrada al alta legacy', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/public/requisitos-legales?**', (route) => route.fulfill({ status: 503, json: { code: 'CONTRATO_LEGAL_NO_DISPONIBLE' } }));
  let registrations = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/register') registrations++;
  });
  await page.goto('/register');
  await fillRegistration(page);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear taller', exact: true })).toBeDisabled();
  expect(registrations).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
