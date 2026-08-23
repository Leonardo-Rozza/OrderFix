import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const setup = async (page: Page, context: BrowserContext) => {
  await seedAuth(context);
  await mockApi(page);
};

const openDirtyCliente = async (page: Page) => {
  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();

  const form = page.getByRole('dialog', { name: 'Nuevo cliente', exact: true });
  const nombre = form.getByRole('textbox', { name: 'Nombre', exact: true });
  await expect(form).toBeVisible();
  await nombre.fill('Cambio sin guardar');

  return { form, nombre };
};

const discardDialog = (page: Page) => page.getByRole('dialog', {
  name: '¿Descartar los cambios?',
  exact: true,
});

const expectDiscardAndContinue = async (
  page: Page,
  nombre: Locator,
  expectedFocus?: Locator,
) => {
  const dialog = discardDialog(page);
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(dialog.getByText('Los datos que modificaste todavía no se guardaron.')).toBeVisible();

  const continueEditing = dialog.getByRole('button', { name: 'Seguir editando', exact: true });
  await expect(continueEditing).toBeFocused();
  await continueEditing.click();

  await expect(dialog).toBeHidden();
  await expect(nombre).toHaveValue('Cambio sin guardar');
  if (expectedFocus) await expect(expectedFocus).toBeFocused();
};

test('cliente: Cancelar, cerrar, Escape y backdrop convergen en el descarte', async ({
  page,
  context,
}) => {
  await setup(page, context);
  await page.goto('/clientes');

  const { form, nombre } = await openDirtyCliente(page);

  const cancel = form.getByRole('button', { name: 'Cancelar', exact: true });
  await cancel.click();
  await expectDiscardAndContinue(page, nombre, cancel);

  const close = form.getByRole('button', { name: 'Cerrar', exact: true });
  await close.click();
  await expectDiscardAndContinue(page, nombre);

  await nombre.focus();
  await page.keyboard.press('Escape');
  await expectDiscardAndContinue(page, nombre, nombre);

  await nombre.focus();
  const backdrop = page.locator('[data-modal-layer="base"] > [aria-hidden="true"]');
  await expect(backdrop).toBeVisible();
  await backdrop.click({ position: { x: 8, y: 8 } });

  const dialog = discardDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Descartar cambios', exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(form).toBeHidden();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('cliente: history.back queda bloqueado hasta confirmar el descarte', async ({
  page,
  context,
}) => {
  await setup(page, context);
  await page.goto('/dashboard');
  await page.locator('aside').getByRole('link', { name: 'Clientes', exact: true }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  await openDirtyCliente(page);
  await page.evaluate(() => window.history.back());

  const dialog = discardDialog(page);
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/clientes$/);
  await expect(page.locator('#nombre')).toHaveValue('Cambio sin guardar');

  await dialog.getByRole('button', { name: 'Descartar cambios', exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(dialog).toBeHidden();
});

test('cliente: un guardado exitoso cierra sin pedir descarte', async ({ page, context }) => {
  await setup(page, context);
  await page.route((url) => (
    url.origin === 'http://localhost:8080'
    && url.pathname.endsWith('/api/clientes')
  ), async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({
      status: 201,
      json: {
        id: 77,
        equiposCount: 0,
        reparacionesCount: 0,
        ultimaVisita: null,
        ...body,
      },
    });
  });
  await page.goto('/clientes');

  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Nuevo cliente', exact: true });
  await form.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Ada');
  await form.getByRole('textbox', { name: 'Apellido', exact: true }).fill('Lovelace');
  await form.getByRole('textbox', { name: 'Teléfono', exact: true }).fill('1144556677');

  const created = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST'
      && url.pathname.endsWith('/api/clientes')
      && response.status() === 201;
  });
  await form.getByRole('button', { name: 'Crear cliente', exact: true }).click();
  await created;

  await expect(form).toBeHidden();
  await expect(discardDialog(page)).toHaveCount(0);
  await expect(page.getByText('Cliente creado correctamente', { exact: true })).toBeVisible();
});

test('cliente: un guardado pendiente congela el formulario hasta completarse', async ({
  page,
  context,
}) => {
  await setup(page, context);
  let releasePost: (() => void) | undefined;
  const pendingPost = new Promise<void>((resolve) => {
    releasePost = resolve;
  });
  let postCount = 0;
  let postBody: Record<string, unknown> | undefined;

  await page.route((url) => (
    url.origin === 'http://localhost:8080'
    && url.pathname.endsWith('/api/clientes')
  ), async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    postCount += 1;
    postBody = route.request().postDataJSON() as Record<string, unknown>;
    await pendingPost;
    return route.fulfill({
      status: 201,
      json: {
        id: 78,
        equiposCount: 0,
        reparacionesCount: 0,
        ultimaVisita: null,
        ...postBody,
      },
    });
  });
  await page.goto('/clientes');

  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Nuevo cliente', exact: true });
  const nombre = form.getByRole('textbox', { name: 'Nombre', exact: true });
  await nombre.fill('Ada');
  await form.getByRole('textbox', { name: 'Apellido', exact: true }).fill('Lovelace');
  await form.getByRole('textbox', { name: 'Teléfono', exact: true }).fill('1144556677');

  const started = page.waitForRequest((request) => (
    request.method() === 'POST'
    && new URL(request.url()).pathname.endsWith('/api/clientes')
  ));
  const completed = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && new URL(response.url()).pathname.endsWith('/api/clientes')
    && response.status() === 201
  ));
  await form.getByRole('button', { name: 'Crear cliente', exact: true }).click();
  await started;

  await expect(form.locator('#cliente-form')).toHaveAttribute('aria-busy', 'true');
  await expect(form.locator('fieldset')).toHaveAttribute('disabled', '');
  await expect(nombre).toBeDisabled();
  await expect(form.getByRole('button', { name: 'Cerrar', exact: true })).toBeDisabled();
  await expect(form.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled();
  await expect(form.getByRole('button', { name: 'Guardando…', exact: true })).toBeDisabled();

  releasePost?.();
  await completed;

  expect(postCount).toBe(1);
  expect(postBody).toMatchObject({ nombre: 'Ada', apellido: 'Lovelace', telefono: '1144556677' });
  await expect(form).toBeHidden();
  await expect(discardDialog(page)).toHaveCount(0);
  await expect(page.locator('[data-modal-layer="base"]')).toHaveCount(0);
});

test('cliente: un error de API conserva el borrador y mantiene activo el guard', async ({
  page,
  context,
}) => {
  await setup(page, context);
  await page.route((url) => (
    url.origin === 'http://localhost:8080'
    && url.pathname.endsWith('/api/clientes')
  ), async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 500, json: { message: 'Falla temporal' } });
  });
  await page.goto('/clientes');

  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Nuevo cliente', exact: true });
  const nombre = form.getByRole('textbox', { name: 'Nombre', exact: true });
  await nombre.fill('Ada');
  await form.getByRole('textbox', { name: 'Apellido', exact: true }).fill('Lovelace');
  await form.getByRole('textbox', { name: 'Teléfono', exact: true }).fill('1144556677');

  const failed = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST'
      && url.pathname.endsWith('/api/clientes')
      && response.status() === 500;
  });
  await form.getByRole('button', { name: 'Crear cliente', exact: true }).click();
  await failed;

  await expect(form.getByRole('button', { name: 'Crear cliente', exact: true })).toBeEnabled();
  await expect(nombre).toHaveValue('Ada');
  await form.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(discardDialog(page)).toBeVisible();
  await discardDialog(page).getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await expect(nombre).toHaveValue('Ada');
});

test('reparación rápida: Back descarta hacia Dashboard sin competir con ?nuevo=1', async ({
  page,
  context,
}) => {
  await setup(page, context);
  await page.goto('/dashboard');

  await page.getByRole('button', { name: 'Nueva reparación', exact: true }).click();
  await expect(page).toHaveURL(/\/reparaciones\?nuevo=1$/);

  const form = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
  await form.getByRole('textbox', { name: 'Problema reportado', exact: true }).fill('Cambio sin guardar');

  await page.evaluate(() => window.history.back());
  const dialog = discardDialog(page);
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/reparaciones\?nuevo=1$/);

  await dialog.getByRole('button', { name: 'Descartar cambios', exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible();
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(form).toBeHidden();
  await expect(dialog).toBeHidden();
});

test('reparación parcial: avisa que la orden existe sin exponer credenciales', async ({
  page,
  context,
}) => {
  await setup(page, context);
  await page.route((url) => (
    url.origin === 'http://localhost:8080'
    && /\/api\/reparaciones\/999$/.test(url.pathname)
  ), async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    return route.fulfill({ status: 500, json: { message: 'Falla temporal' } });
  });
  await page.goto('/reparaciones?nuevo=1');

  const form = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
  await form.getByLabel(/^Nombre/).fill('Ana');
  await form.getByLabel(/^Teléfono/).fill('1155550000');
  await form.getByLabel(/^Marca/).fill('Apple');
  await form.getByLabel(/^Modelo/).fill('iPhone 13');
  await form.getByLabel(/^Problema reportado/).fill('No enciende');
  await form.getByText('Detalles de ingreso (opcional)', { exact: true }).click();
  const patron = form.locator('#patronDesbloqueo');
  await patron.fill('SECRETO-NO-MOSTRAR');

  const failedDetails = page.waitForResponse((response) => (
    response.request().method() === 'PUT'
    && /\/api\/reparaciones\/999$/.test(new URL(response.url()).pathname)
    && response.status() === 500
  ));
  await form.getByRole('button', { name: 'Crear reparación', exact: true }).click();
  await failedDetails;
  await expect(form.getByRole('button', { name: 'Reintentar detalles', exact: true })).toBeEnabled();

  await form.getByRole('button', { name: 'Cerrar y completar después', exact: true }).click();
  const dialog = discardDialog(page);
  await expect(dialog).toContainText('La orden ya existe y no se va a eliminar ni duplicar.');
  await expect(dialog).toContainText('Sólo se descartarán los detalles locales');
  await expect(dialog).not.toContainText('SECRETO-NO-MOSTRAR');
  await expect(dialog.getByRole('button', { name: 'Cerrar y completar después', exact: true }))
    .toBeVisible();

  await dialog.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await expect(patron).toHaveValue('SECRETO-NO-MOSTRAR');
  await form.getByRole('button', { name: 'Cerrar y completar después', exact: true }).click();
  await dialog.getByRole('button', { name: 'Cerrar y completar después', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-modal-layer="base"]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/reparaciones$/);
});
