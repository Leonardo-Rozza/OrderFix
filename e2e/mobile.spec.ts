import { test, expect, type Locator, type Page } from '@playwright/test';
import { futureToken, mockApi, seedAuth } from './helpers';

const PRO_SUSCRIPCION = {
  plan: 'PRO',
  estado: 'ACTIVA',
  fechaInicio: '2026-01-01',
  fechaFinTrial: null,
  proximoCobro: null,
  reparacionesEsteMes: 1,
  limiteReparacionesMes: null,
  funciones: { inventario: true, cobros: true, empleadosMultiples: true },
};

const CLIENTE = {
  id: 1,
  nombre: 'Ana',
  apellido: 'Gómez',
  telefono: '1155550000',
  email: 'ana@example.com',
  direccion: 'Calle 123',
  equiposCount: 1,
  reparacionesCount: 1,
  ultimaVisita: '2026-08-01',
};

const EQUIPO = {
  id: 1,
  marca: 'Apple',
  modelo: 'iPhone 13',
  imei: null,
  color: 'Negro',
  descripcion: null,
  clienteId: 1,
  clienteNombre: 'Ana',
  clienteApellido: 'Gómez',
  clienteTelefono: '1155550000',
  reparacionesCount: 1,
};

const ARTICULO = {
  id: 1,
  nombre: 'Pantalla de prueba',
  descripcion: 'OLED',
  sku: 'P-001',
  precio: 50_000,
  costo: 30_000,
  stock: 4,
  stockMinimo: 1,
  activo: true,
  stockBajo: false,
};

const REPARACION_ACTIVA = {
  id: 1,
  equipoId: 1,
  descripcionProblema: 'Pantalla rota',
  estado: 'EN_PROCESO',
  precioEstimado: 50_000,
  precioFinal: null,
  fechaIngreso: '2026-08-01',
  fechaEstimadaEntrega: '2026-08-05',
  fechaEntrega: null,
  numeroOrden: 'ORD-2026-0001',
  equipoMarca: 'Apple',
  equipoModelo: 'iPhone 13',
  clienteId: 1,
  clienteNombre: 'Ana',
  clienteApellido: 'Gómez',
  clienteTelefono: '1155550000',
  total: 50_000,
  cobrado: 10_000,
  saldo: 40_000,
  excedente: 0,
  requiereRevision: false,
  estadoPago: 'PARCIAL',
};

const SMOKE_DATA = {
  suscripcion: PRO_SUSCRIPCION,
  clientes: [CLIENTE],
  equipos: [EQUIPO],
  articulos: [ARTICULO],
  reparaciones: [REPARACION_ACTIVA],
  repuestosReparacion: [],
  presupuestos: [],
  usuarios: [
    { id: 1, username: 'Admin', email: 'admin@mvgr.com', role: 'ADMIN', active: true },
  ],
  cobros: {
    total: 50_000,
    cobrado: 10_000,
    saldo: 40_000,
    excedente: 0,
    requiereRevision: false,
    pagado: false,
    cobros: [],
  },
};

const expectNoHorizontalOverflow = async (page: Page) => {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
};

const editableMetrics = async (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !element.closest('[hidden], [aria-hidden="true"]');
      if (!visible) return [];
      return [{
        tag: element.tagName.toLowerCase(),
        id: element.id,
        type: element.getAttribute('type'),
        name: element.getAttribute('aria-label') ?? element.getAttribute('name') ?? element.id,
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        height: rect.height,
        width: rect.width,
      }];
    }),
  );

const controlDescription = (control: Awaited<ReturnType<typeof editableMetrics>>[number]) =>
  `${control.tag}${control.id ? `#${control.id}` : ''}${control.type ? `[type=${control.type}]` : ''}${
    control.name ? ` (${control.name})` : ''
  }`;

const expectTouchSized = (control: Awaited<ReturnType<typeof editableMetrics>>[number]) => {
  const description = controlDescription(control);
  expect(Math.round(control.height), `${description} debe medir al menos 44px de alto`).toBeGreaterThanOrEqual(44);
};

const expectEditableControls = async (dialog: Locator) => {
  const selector =
    'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]), textarea, select';
  const controls = await dialog.locator(selector).evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !element.closest('[hidden], [aria-hidden="true"]');
      if (!visible) return [];
      return [{
        tag: element.tagName.toLowerCase(),
        id: element.id,
        type: element.getAttribute('type'),
        name: element.getAttribute('aria-label') ?? element.getAttribute('name') ?? element.id,
        fontSize: Number.parseFloat(style.fontSize),
        height: rect.height,
        width: rect.width,
      }];
    }),
  );

  expect(controls.length, 'el formulario debe exponer al menos un campo editable visible').toBeGreaterThan(0);
  for (const control of controls) {
    expectTouchSized(control);
    expect(control.fontSize, `${controlDescription(control)} debe usar texto de 16px para evitar zoom`).toBeGreaterThanOrEqual(16);
  }
};

const expectDialogButtons = async (dialog: Locator) => {
  const buttons = await dialog.locator('button').evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !element.closest('[hidden], [aria-hidden="true"]');
      if (!visible) return [];
      return [{
        name: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '',
        height: rect.height,
        width: rect.width,
      }];
    }),
  );

  expect(buttons.length, 'el diálogo debe exponer acciones visibles').toBeGreaterThan(0);
  for (const button of buttons) {
    expect(Math.round(button.height), `botón “${button.name}” debe medir al menos 44px de alto`).toBeGreaterThanOrEqual(44);
    expect(Math.round(button.width), `botón “${button.name}” debe medir al menos 44px de ancho`).toBeGreaterThanOrEqual(44);
  }
};

interface DialogAudit {
  title: string | RegExp;
  cta: string | RegExp;
}

const expectMobileDialog = async (page: Page, { title, cta }: DialogAudit) => {
  const dialog = page.getByRole('dialog', { name: title, exact: typeof title === 'string' });
  await expect(dialog).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const body = element.querySelector<HTMLElement>('[data-modal-body]');
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      viewportHeight: innerHeight,
      viewportWidth: innerWidth,
      panelClientWidth: element.clientWidth,
      panelScrollWidth: element.scrollWidth,
      bodyClientWidth: body?.clientWidth ?? 0,
      bodyScrollWidth: body?.scrollWidth ?? 0,
    };
  });

  expect(geometry.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.panelScrollWidth).toBeLessThanOrEqual(geometry.panelClientWidth + 1);
  expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(geometry.bodyClientWidth + 1);
  await expectNoHorizontalOverflow(page);

  await expectEditableControls(dialog);
  await expectDialogButtons(dialog);

  const primaryAction = dialog.getByRole('button', { name: cta, exact: typeof cta === 'string' });
  await expect(primaryAction).toBeVisible();
  await expect(primaryAction).toBeEnabled();
  const actionBox = await primaryAction.boundingBox();
  expect(actionBox, 'el CTA debe tener una caja visible').not.toBeNull();
  expect(actionBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(actionBox?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((actionBox?.x ?? 0) + (actionBox?.width ?? 0)).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect((actionBox?.y ?? 0) + (actionBox?.height ?? 0)).toBeLessThanOrEqual(geometry.viewportHeight + 1);

  return dialog;
};

const closeDialog = async (dialog: Locator, expectDiscard = false) => {
  const page = dialog.page();
  const baseLayer = page.locator('[data-modal-layer="base"]');
  const discardDialog = page.getByRole('dialog', {
    name: '¿Descartar los cambios?',
    exact: true,
  });

  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();

  if (expectDiscard) {
    await expect(discardDialog).toBeVisible();
    await discardDialog.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
  }

  await expect(discardDialog).toHaveCount(0);
  await expect(baseLayer).toHaveCount(0);
};

const openAuditAndClose = async (page: Page, trigger: Locator, audit: DialogAudit) => {
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = await expectMobileDialog(page, audit);
  await closeDialog(dialog);
};

test('identidad móvil: conserva el taller accesible, no desborda y usa objetivos táctiles', async ({ page, context }) => {
  const tallerLargo = 'Servicio Técnico Integral del Centro, Zona Norte, Zona Sur, Parque Industrial y todas sus Sucursales Asociadas de la Región Metropolitana';
  await seedAuth(context);
  await mockApi(page, {
    perfil: {
      usuario: {
        id: 9,
        username: 'Juan Pérez',
        email: 'cuenta.distinta@ordenfix.com',
        role: 'USER',
      },
      taller: {
        id: 4,
        nombre: tallerLargo,
        telefono: '1155550011',
      },
    },
  });

  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Hola, Juan Pérez 👋' })).toBeVisible();
  const tallerNavbar = page.locator('header').getByTitle(tallerLargo);
  await expect(tallerNavbar).toBeVisible();
  await expect(tallerNavbar).toHaveAttribute('aria-label', `Taller: ${tallerLargo}`);
  await expect(page.locator('header').getByRole('link', {
    name: `OrdenFix — Taller ${tallerLargo} — Ir al inicio`,
  })).toBeVisible();

  const truncation = await tallerNavbar.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(truncation.scrollWidth).toBeGreaterThan(truncation.clientWidth);
  await expectNoHorizontalOverflow(page);

  for (const buttonName of ['Activar modo oscuro', 'Cerrar sesión']) {
    const box = await page.getByRole('button', { name: buttonName }).boundingBox();
    expect(box, `${buttonName} debe tener una caja visible`).not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('identidad móvil: un perfil fallido degrada a un email largo sin provocar overflow', async ({ page, context }) => {
  const emailPrefix = 'administracioncentralreparacionesordenfixsucursaleszonanorte2026';
  const fallbackEmail = `${emailPrefix}@ordenfix.com`;
  let perfilRequests = 0;

  await seedAuth(context, futureToken('ROLE_USER'), fallbackEmail);
  await mockApi(page);
  await page.route('http://localhost:8080/api/perfil', async (route) => {
    perfilRequests += 1;
    await route.fulfill({ status: 500, json: { message: 'Perfil temporalmente no disponible' } });
  });

  await page.goto('/dashboard');

  const heading = page.getByRole('heading', { name: `Hola, ${emailPrefix} 👋` });
  await expect(heading).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Esto es lo que pasa hoy en Mi taller.')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const headingMetrics = await heading.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(headingMetrics.scrollWidth).toBeLessThanOrEqual(headingMetrics.clientWidth);

  const retry = page.getByRole('button', { name: 'Reintentar perfil' });
  await expect(retry).toBeVisible();
  const requestsBeforeRetry = perfilRequests;
  await retry.click();
  await expect.poll(() => perfilRequests).toBeGreaterThan(requestsBeforeRetry);
});

test('smoke móvil: todos los formularios críticos respetan viewport, controles y CTA', async ({ page, context }) => {
  test.slow();
  await seedAuth(context);
  await mockApi(page, SMOKE_DATA);

  await test.step('Cliente', async () => {
    await page.goto('/clientes');
    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Nuevo cliente', exact: true }),
      { title: 'Nuevo cliente', cta: 'Crear cliente' },
    );
  });

  await test.step('Equipo', async () => {
    await page.goto('/equipos');
    await page.getByRole('button', { name: 'Nuevo equipo', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo equipo', exact: true });
    await dialog.getByLabel(/^cliente/i).click();
    await dialog.getByRole('option', { name: /ana gómez/i }).click();
    await expectMobileDialog(page, { title: 'Nuevo equipo', cta: 'Crear equipo' });
    await closeDialog(dialog, true);
  });

  await test.step('Artículo y ajuste de stock', async () => {
    await page.goto('/inventario');
    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Nuevo artículo', exact: true }),
      { title: 'Nuevo artículo', cta: 'Crear artículo' },
    );
    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Ajustar stock', exact: true }),
      { title: /^Ajustar stock · Pantalla de prueba$/, cta: 'Aplicar ajuste' },
    );
  });

  await test.step('Repuesto global', async () => {
    await page.goto('/repuestos');
    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Nuevo repuesto', exact: true }),
      { title: 'Nuevo repuesto', cta: 'Crear repuesto' },
    );
  });

  await test.step('Usuario', async () => {
    await page.goto('/usuarios');
    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Nuevo empleado', exact: true }),
      { title: 'Nuevo empleado', cta: 'Crear empleado' },
    );
  });

  await test.step('Formularios desde el detalle de reparación', async () => {
    await page.goto('/reparaciones/1');
    await expect(page.getByText('ORD-2026-0001', { exact: true }).first()).toBeVisible();

    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Agregar', exact: true }),
      { title: 'Nuevo repuesto', cta: 'Crear repuesto' },
    );
    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Nuevo', exact: true }),
      { title: 'Nuevo presupuesto', cta: 'Crear presupuesto' },
    );
    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Cobrar', exact: true }),
      { title: 'Registrar cobro', cta: 'Registrar cobro' },
    );
    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Reclamo en garantía', exact: true }),
      { title: /^Reclamo en garantía · /, cta: 'Crear reclamo' },
    );
  });
});

test('detalle con excedente: prioriza la revisión sin overflow y bloquea Cobrar', async ({ page, context }) => {
  await seedAuth(context);
  const referenciaLarga = `OP-${'9'.repeat(117)}`;
  await mockApi(page, {
    ...SMOKE_DATA,
    reparacionDetalle: {
      ...REPARACION_ACTIVA,
      cobrado: 60_000,
      saldo: 0,
      excedente: 10_000,
      requiereRevision: true,
      estadoPago: 'PAGADO',
    },
    cobros: {
      total: 50_000,
      cobrado: 60_000,
      saldo: 0,
      excedente: 10_000,
      requiereRevision: true,
      pagado: true,
      cobros: [{
        id: 1,
        reparacionId: 1,
        monto: 60_000,
        metodo: 'TRANSFERENCIA',
        referencia: referenciaLarga,
        observaciones: 'Carga histórica',
        fecha: '2026-08-01T12:00:00',
      }],
    },
  });

  await page.goto('/reparaciones/1');

  const seccion = page.getByRole('region', { name: 'Cobros' });
  await expect(seccion.getByText('Excedente a revisar', { exact: true })).toBeVisible();
  await expect(seccion.getByRole('alert')).toContainText('excedente histórico');
  await expect(seccion.getByRole('button', { name: 'Cobrar', exact: true })).toBeDisabled();
  await expect(seccion.getByText(/Referencia:/)).toContainText(referenciaLarga);
  await expectNoHorizontalOverflow(page);

  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth < 640) {
    const headerTargets = await editableMetrics(
      seccion,
      'a[href*="/recibo"], button[title*="excedente"]',
    );
    expect(headerTargets).toHaveLength(2);
    headerTargets.forEach(expectTouchSized);
  }
});

test('registro: controles táctiles sin zoom ni overflow horizontal', async ({ page }) => {
  await page.goto('/register');

  await expectNoHorizontalOverflow(page);
  const controls = await editableMetrics(page, 'input, button[type="submit"]');
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    expectTouchSized(control);
  }
  for (const input of controls.filter((control) => control.tag === 'input')) {
    expect(input.fontSize, `${controlDescription(input)} debe usar texto de 16px para evitar zoom`).toBeGreaterThanOrEqual(16);
  }
});

test('modal de reparación: queda dentro del viewport y mantiene el CTA visible', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);
  await page.goto('/reparaciones?nuevo=1');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, width: rect.width, viewportHeight: innerHeight, viewportWidth: innerWidth };
  });

  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth);
  await expectNoHorizontalOverflow(page);

  const submit = page.getByRole('button', { name: /crear reparación/i });
  await expect(submit).toBeVisible();
  const submitBox = await submit.boundingBox();
  expect(submitBox).not.toBeNull();
  expect((submitBox?.y ?? 0) + (submitBox?.height ?? 0)).toBeLessThanOrEqual(geometry.viewportHeight);

  // También validar los campos de la sección colapsable, no los nodos ocultos
  // de un <details> cerrado (su bounding box es 0 por definición).
  await page.getByText('Detalles de ingreso (opcional)', { exact: true }).click();
  const fields = await editableMetrics(page, '[role="dialog"] input:not([type="checkbox"]):not([type="file"]), [role="dialog"] textarea, [role="dialog"] select');
  for (const field of fields) {
    expect(field.fontSize, `${controlDescription(field)} debe usar texto de 16px para evitar zoom`).toBeGreaterThanOrEqual(16);
    expectTouchSized(field);
  }

  await page.getByLabel(/^Nombre/).fill('Ana');
  await page.getByLabel(/^Teléfono/).fill('1155550000');
  await page.getByLabel(/^Marca/).fill('Apple');
  await page.getByLabel(/^Modelo/).fill('iPhone 13');
  await page.getByLabel(/^Problema reportado/).fill('No enciende');
  const garantia = page.getByLabel('Garantía (días)');
  await garantia.fill('0');
  await page.getByText('Detalles de ingreso (opcional)', { exact: true }).click();
  await submit.click();
  await expect(page.getByText('Mín. 1', { exact: true })).toBeVisible();
  await expect(garantia).toBeFocused();
});

test('combobox remoto: pagina dentro del modal y restaura el foco al cerrar', async ({ page, context }) => {
  await seedAuth(context);
  const equipos = Array.from({ length: 21 }, (_, index) => ({
    id: index + 1,
    // La fuente ordena por id desc: el id 1 queda realmente en la página 2.
    marca: index === 0 ? 'Motorola' : 'Marca',
    modelo: index === 0 ? 'Edge 50' : `Modelo ${index + 1}`,
    imei: null,
    color: null,
    descripcion: null,
    clienteId: 1,
    clienteNombre: 'Ana',
    clienteApellido: 'Gómez',
  }));
  await mockApi(page, {
    equipos,
  });
  await page.goto('/reparaciones?nuevo=1');

  const dialog = page.getByRole('dialog');
  await page.getByRole('button', { name: /elegir equipo existente/i }).click();
  const trigger = page.getByLabel(/^equipo/i);
  const firstPage = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/api/equipos')
      && url.searchParams.get('page') === '0'
      && url.searchParams.get('size') === '20';
  });
  await trigger.click();
  await firstPage;

  const search = page.getByRole('combobox', { name: 'Buscar equipo' });
  const listbox = page.getByRole('listbox');
  const loadMore = page.getByRole('button', { name: 'Cargar más', exact: true });
  await expect(search).toBeVisible();
  await expect(search).toBeFocused();
  await expect(loadMore).toBeVisible();
  await expect(loadMore).toBeInViewport();

  const popoverMetrics = await listbox.locator('..').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: window.visualViewport?.width ?? innerWidth,
      viewportHeight: window.visualViewport?.height ?? innerHeight,
    };
  });
  expect(popoverMetrics.left).toBeGreaterThanOrEqual(7);
  expect(popoverMetrics.right).toBeLessThanOrEqual(popoverMetrics.viewportWidth - 7);
  expect(popoverMetrics.top).toBeGreaterThanOrEqual(0);
  expect(popoverMetrics.bottom).toBeLessThanOrEqual(popoverMetrics.viewportHeight + 1);

  const listMetrics = await listbox.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(listMetrics.scrollHeight).toBeGreaterThan(listMetrics.clientHeight);

  await search.press('Tab');
  await expect(loadMore).toBeFocused();
  const secondPage = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/api/equipos') && url.searchParams.get('page') === '1';
  });
  await loadMore.press('Enter');
  await secondPage;

  await page.getByRole('option', { name: /motorola edge 50/i }).click();
  await expect(trigger).toHaveText(/motorola edge 50/i);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(search).toBeFocused();

  await search.press('Escape');
  await expect(search).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(dialog).toBeVisible();

  await closeDialog(dialog, true);
});

test('listados: búsquedas usables y páginas sin overflow', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, {
    suscripcion: {
      plan: 'PRO',
      estado: 'ACTIVA',
      reparacionesEsteMes: 0,
      limiteReparacionesMes: null,
      funciones: { inventario: true, cobros: true, empleadosMultiples: true },
    },
  });

  for (const path of ['/clientes', '/equipos', '/reparaciones', '/repuestos', '/inventario']) {
    await page.goto(path);
    await expectNoHorizontalOverflow(page);
    const search = page.locator('input[placeholder^="Buscar"]');
    await expect(search).toBeVisible();
    const metrics = await search.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, fontSize: Number.parseFloat(getComputedStyle(element).fontSize) };
    });
    // Chromium puede devolver 43.99999px por redondeo subpixel para `min-h-11`.
    expect(Math.round(metrics.height)).toBeGreaterThanOrEqual(44);
    expect(metrics.fontSize).toBeGreaterThanOrEqual(16);
  }
});

test('acciones de inventario y repuestos quedan visibles y son táctiles', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, {
    suscripcion: {
      plan: 'PRO',
      estado: 'ACTIVA',
      reparacionesEsteMes: 0,
      limiteReparacionesMes: null,
      funciones: { inventario: true, cobros: true, empleadosMultiples: true },
    },
    articulos: [
      {
        id: 1,
        nombre: 'Pantalla de prueba',
        sku: 'P-001',
        precio: 50000,
        costo: 30000,
        stock: 4,
        stockMinimo: 1,
        stockBajo: false,
      },
    ],
    repuestos: [
      {
        id: 2,
        nombre: 'Pin de carga',
        descripcion: 'Original',
        precio: 15000,
        reparacionId: null,
      },
    ],
  });

  await page.goto('/inventario');
  await expectNoHorizontalOverflow(page);
  for (const name of ['Ajustar stock', 'Editar', 'Eliminar']) {
    const action = page.getByRole('button', { name, exact: true });
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44);
  }

  await page.goto('/repuestos');
  await expectNoHorizontalOverflow(page);
  for (const name of ['Editar', 'Eliminar']) {
    const action = page.getByRole('button', { name, exact: true });
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44);
  }
});
