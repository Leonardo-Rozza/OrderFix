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

test('identidad móvil: el perfil remoto falla cerrado y se recupera con texto largo sin overflow', async ({ page, context }) => {
  const emailPrefix = 'administracioncentralreparacionesordenfixsucursaleszonanorte2026';
  const fallbackEmail = `${emailPrefix}@ordenfix.com`;
  let perfilRequests = 0;
  let profileAvailable = false;
  let operationalRequests = 0;

  await seedAuth(context, futureToken('ROLE_USER'), fallbackEmail);
  await mockApi(page);
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path === '/api/dashboard' || path === '/api/suscripcion') operationalRequests++;
  });
  await page.route('http://localhost:8080/api/perfil', async (route) => {
    perfilRequests += 1;
    if (!profileAvailable) return route.fulfill({ status: 500, json: { message: 'Perfil temporalmente no disponible' } });
    return route.fulfill({ json: {
      accesoTaller: 'OPERATIVE',
      usuario: { id: 1, username: emailPrefix, email: fallbackEmail, role: 'USER' },
      taller: { id: 1, nombre: 'Taller recuperado', telefono: null },
    } });
  });

  await page.goto('/dashboard');

  await expect(page.getByText('No pudimos validar tu sesión')).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toHaveCount(0);
  expect(operationalRequests).toBe(0);
  await expectNoHorizontalOverflow(page);
  const retry = page.getByRole('button', { name: 'Reintentar', exact: true });
  await expect(retry).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  const requestsBeforeRetry = perfilRequests;
  profileAvailable = true;
  await retry.click();
  await expect.poll(() => perfilRequests).toBeGreaterThan(requestsBeforeRetry);

  const heading = page.getByRole('heading', { name: `Hola, ${emailPrefix} 👋` });
  await expect(heading).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Esto es lo que pasa hoy en Taller recuperado.')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const headingMetrics = await heading.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(headingMetrics.scrollWidth).toBeLessThanOrEqual(headingMetrics.clientWidth);

  await expect(page.getByText('No pudimos validar tu sesión')).toHaveCount(0);
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
      page.getByRole('button', { name: 'Registrar cobro', exact: true }),
      { title: 'Registrar cobro', cta: 'Registrar cobro' },
    );
    await openAuditAndClose(
      page,
      page.getByRole('button', { name: 'Reclamo en garantía', exact: true }),
      { title: /^Reclamo en garantía · /, cta: 'Crear reclamo' },
    );
  });
});

test('detalle con excedente: prioriza la revisión sin overflow y bloquea Registrar cobro', async ({ page, context }) => {
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
        estado: 'ACTIVO',
        anuladoAt: null,
        anuladoPorNombre: null,
        motivoAnulacion: null,
      }],
    },
  });

  await page.goto('/reparaciones/1');

  const seccion = page.getByRole('region', { name: 'Cobros' });
  await expect(seccion.getByText('Excedente a revisar', { exact: true })).toBeVisible();
  await expect(seccion.getByRole('alert')).toContainText('excedente histórico');
  await expect(seccion.getByRole('button', { name: 'Registrar cobro', exact: true })).toBeDisabled();
  await expect(seccion.getByText(/Referencia:/)).toContainText(referenciaLarga);
  await expectNoHorizontalOverflow(page);

  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth < 640) {
    const headerTargets = await editableMetrics(
      seccion,
      'a[href*="/resumen"], button[title*="excedente"]',
    );
    expect(headerTargets).toHaveLength(2);
    headerTargets.forEach(expectTouchSized);
  }
});

test('anulación de cobro: motivo auditable y responsive sin borrar la historia', async ({ page, context }) => {
  await seedAuth(context);
  const motivoHistorico = `Duplicado-${'motivo'.repeat(35)}`;
  await mockApi(page, {
    ...SMOKE_DATA,
    cobros: {
      total: 50_000,
      cobrado: 10_000,
      saldo: 40_000,
      excedente: 0,
      requiereRevision: false,
      pagado: false,
      cobros: [{
        id: 10,
        reparacionId: 1,
        monto: 10_000,
        metodo: 'TRANSFERENCIA',
        referencia: 'OP-ACTIVA',
        observaciones: 'Seña',
        fecha: '2026-08-20T10:00:00',
        estado: 'ACTIVO',
        anuladoAt: null,
        anuladoPorNombre: null,
        motivoAnulacion: null,
      }, {
        id: 11,
        reparacionId: 1,
        monto: 5_000,
        metodo: 'EFECTIVO',
        referencia: null,
        observaciones: null,
        fecha: '2026-08-19T10:00:00',
        estado: 'ANULADO',
        anuladoAt: '2026-08-21T12:00:00',
        anuladoPorNombre: 'Administrador con un nombre deliberadamente largo para probar el ajuste',
        motivoAnulacion: motivoHistorico,
      }],
    },
  });

  await page.goto('/reparaciones/1');

  const seccion = page.getByRole('region', { name: 'Cobros' });
  await expect(seccion.getByText('Anulado', { exact: true })).toBeVisible();
  await expect(seccion.getByText(`Motivo: ${motivoHistorico}`)).toBeVisible();
  const acciones = seccion.getByRole('button', { name: /Anular cobro de.*10\.000/i });
  await expect(acciones).toHaveCount(1);
  if ((page.viewportSize()?.width ?? 0) < 640) {
    const [accion] = await editableMetrics(seccion, 'button[title="Anular cobro"]');
    expectTouchSized(accion);
  }
  await expectNoHorizontalOverflow(page);

  await acciones.click();
  const dialog = await expectMobileDialog(page, { title: 'Anular cobro', cta: 'Anular cobro' });
  const motivo = dialog.getByLabel('Motivo de anulación');
  await expect(motivo).toBeFocused();
  await motivo.fill('  Corrección por carga duplicada  ');

  const anulacionRequest = page.waitForRequest((request) => (
    request.method() === 'POST'
    && new URL(request.url()).pathname.endsWith('/api/reparaciones/1/cobros/10/anulacion')
  ));
  await dialog.getByRole('button', { name: 'Anular cobro', exact: true }).click();
  const request = await anulacionRequest;
  expect(request.postDataJSON()).toEqual({ motivo: 'Corrección por carga duplicada' });

  await expect(dialog).toHaveCount(0);
  await expect(seccion.getByText('Motivo: Corrección por carga duplicada')).toBeVisible();
  await expect(seccion.getByText('Cobrado').locator('..')).toContainText('$ 0');
  await expect(seccion.getByText('Pendiente de cobro').locator('..')).toContainText('$ 50.000');
  await expectNoHorizontalOverflow(page);
});

test('datos para cobrar: configura referencias y QR autenticado sin overflow', async ({ page, context }) => {
  await seedAuth(context);
  const aliasInicial = `taller.${'alias'.repeat(20)}`;
  const entidadLarga = `Billetera-${'digital'.repeat(15)}`;
  await mockApi(page, {
    ...SMOKE_DATA,
    datosCobro: {
      alias: aliasInicial,
      titular: 'Servicio Técnico Integral del Centro y todas sus sucursales asociadas',
      entidad: entidadLarga,
      mostrarEnResumen: true,
      qrDisponible: true,
      qrVersion: 'sha-e2e-inicial',
    },
  });

  await page.goto('/caja');

  const alcance = page.getByRole('note', { name: 'Qué muestra Cobros' });
  await expect(alcance).toContainText('registrados manualmente');
  await expect(alcance).toContainText('cuenta bancaria o billetera');
  await expect(alcance).toContainText('egresos, gastos ni comisiones');
  const card = page.getByRole('region', { name: 'Datos para cobrar' });
  await expect(card.getByText(aliasInicial)).toBeVisible();
  await expect(card.getByText(entidadLarga)).toBeVisible();
  await expect(card.getByText(/no accede a tu cuenta ni confirma/i)).toBeVisible();
  await expect(card.getByAltText('QR de cobro configurado por el taller')).toHaveAttribute('src', /^blob:/);
  await expectNoHorizontalOverflow(page);

  const configure = card.getByRole('button', { name: 'Configurar' });
  if ((page.viewportSize()?.width ?? 0) < 640) {
    const [metrics] = await editableMetrics(page, 'section[aria-label="Datos para cobrar"] button');
    expectTouchSized(metrics);
  }
  await configure.click();

  const rawDialog = page.getByRole('dialog', { name: 'Configurar datos para cobrar' });
  const alias = rawDialog.getByLabel('Alias');
  await expect(alias).toBeFocused();
  const aliasNuevo = `nuevo.${'cobro'.repeat(20)}`;
  await alias.fill(`  ${aliasNuevo}  `);
  await rawDialog.locator('input[type="file"]').setInputFiles({
    name: 'qr-nuevo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  const dialog = await expectMobileDialog(page, {
    title: 'Configurar datos para cobrar',
    cta: 'Guardar cambios',
  });
  await expect(dialog.getByAltText('Vista previa del nuevo QR de cobro')).toHaveAttribute('src', /^blob:/);

  const metadataRequest = page.waitForRequest((request) => (
    request.method() === 'PUT'
    && new URL(request.url()).pathname.endsWith('/api/taller/datos-cobro')
  ));
  const qrRequest = page.waitForRequest((request) => (
    request.method() === 'PUT'
    && new URL(request.url()).pathname.endsWith('/api/taller/datos-cobro/qr')
  ));
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  const [metadata, qr] = await Promise.all([metadataRequest, qrRequest]);

  expect(metadata.postDataJSON()).toMatchObject({ alias: aliasNuevo, mostrarEnResumen: true });
  expect(qr.headers()['content-type']).toContain('multipart/form-data; boundary=');
  expect(qr.postData()).toContain('name="file"');
  expect(qr.postData()).toContain('filename="qr-nuevo.png"');
  await expect(dialog).toHaveCount(0);
  await expect(card.getByText(aliasNuevo)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('resumen digital: adapta columnas, textos largos, montos y QR sin overflow', async ({ page, context }) => {
  await seedAuth(context);
  const tallerLargo = `Servicio-Técnico-${'SucursalCentral'.repeat(8)}`;
  const clienteLargo = `Ana-${'NombreCompuesto'.repeat(6)}`;
  const modeloLargo = `Modelo-${'EdiciónInternacional'.repeat(6)}`;
  const repuestoLargo = `Módulo-${'PantallaOriginal'.repeat(7)}`;
  const referenciaLarga = `OP-${'9'.repeat(117)}`;
  const aliasLargo = `ordenfix.${'alias'.repeat(20)}`;
  const leyenda = 'Documento informativo. No es factura ni comprobante fiscal y no reemplaza los emitidos por ARCA.';

  await mockApi(page, {
    resumenDigital: {
      reparacionId: 1,
      numeroOrden: 'ORD-2026-0001',
      codigoSeguimiento: 'ABC123',
      fecha: '2026-08-23T10:15:00',
      estado: 'COMPLETADO',
      taller: { nombre: tallerLargo, telefono: '+54 11 5555-1234' },
      cliente: { nombre: clienteLargo, apellido: 'Gómez', telefono: '1155550000' },
      equipo: {
        marca: 'FabricanteInternacional',
        modelo: modeloLargo,
        descripcionProblema: `No-enciende-${'diagnóstico'.repeat(12)}`,
      },
      detalle: {
        repuestos: [{
          nombre: repuestoLargo,
          cantidad: 99,
          precioUnitario: 9_876_543_210.98,
          subtotal: 977_777_777_887.02,
        }],
        manoDeObra: 12_345_678_901.23,
        totalRepuestos: 977_777_777_887.02,
      },
      importes: {
        total: 990_123_456_788.25,
        cobrado: 900_000_000_000,
        saldo: 90_123_456_788.25,
        excedente: 0,
        requiereRevision: false,
        pagado: false,
      },
      pagos: [{
        fecha: '2026-08-22T12:30:00',
        monto: 900_000_000_000,
        metodo: 'TRANSFERENCIA',
        referencia: referenciaLarga,
      }],
      datosCobro: {
        alias: aliasLargo,
        titular: tallerLargo,
        entidad: `Billetera-${'digital'.repeat(15)}`,
        qrDisponible: true,
        qrVersion: 'sha-resumen-mobile',
      },
      documentoFiscal: false,
      leyenda,
      tallerNombre: tallerLargo,
      tallerTelefono: '+54 11 5555-1234',
      clienteNombre: clienteLargo,
      clienteApellido: 'Gómez',
      clienteTelefono: '1155550000',
      equipoMarca: 'FabricanteInternacional',
      equipoModelo: modeloLargo,
      descripcionProblema: `No-enciende-${'diagnóstico'.repeat(12)}`,
      repuestos: [{
        nombre: repuestoLargo,
        cantidad: 99,
        precioUnitario: 9_876_543_210.98,
        subtotal: 977_777_777_887.02,
      }],
      manoDeObra: 12_345_678_901.23,
      totalRepuestos: 977_777_777_887.02,
      total: 990_123_456_788.25,
      cobrado: 900_000_000_000,
      saldo: 90_123_456_788.25,
      excedente: 0,
      requiereRevision: false,
      pagado: false,
    },
    datosCobro: {
      alias: aliasLargo,
      titular: tallerLargo,
      entidad: `Billetera-${'digital'.repeat(15)}`,
      mostrarEnResumen: true,
      qrDisponible: true,
      qrVersion: 'sha-resumen-mobile',
    },
  });

  await page.goto('/reparaciones/1/resumen');

  await expect(page.getByRole('heading', { name: 'Resumen digital de la orden' })).toBeVisible();
  await expect(page.getByText(tallerLargo).first()).toBeVisible();
  await expect(page.getByText(`Referencia: ${referenciaLarga}`)).toBeVisible();
  await expect(page.getByText(aliasLargo)).toBeVisible();
  await expect(page.getByAltText('QR para pagar la orden ORD-2026-0001')).toHaveAttribute('src', /^blob:/);
  await expect(page.getByRole('note', { name: 'Documento informativo' })).toContainText('ARCA');
  await expect(page.getByRole('button', { name: /imprimir/i })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  const personCards = page
    .getByRole('region', { name: 'Cliente y equipo' })
    .locator(':scope > div > div');
  await expect(personCards).toHaveCount(2);
  const boxes = await personCards.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width };
  }));
  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth < 640) {
    expect(Math.abs(boxes[0].left - boxes[1].left)).toBeLessThanOrEqual(1);
    expect(boxes[1].top).toBeGreaterThan(boxes[0].top);
    const [back] = await editableMetrics(page, 'a[href="/reparaciones/1"]');
    expectTouchSized(back);
  } else {
    expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThanOrEqual(1);
    expect(boxes[1].left).toBeGreaterThan(boxes[0].left + boxes[0].width - 1);
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
