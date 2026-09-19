import { test, expect, type Page, type TestInfo, type Locator } from '@playwright/test';
import { futureToken, mockApi, seedAuth } from './helpers';

const clientes = [
  { id: 1, nombre: 'María de los Ángeles', apellido: 'Fernández de la Fuente', telefono: '+54 9 11 5555 1234', email: 'maria.fernandez.delafuente@synthetic.invalid', equiposCount: 12, reparacionesCount: 145, ultimaVisita: '2026-09-12' },
  { id: 2, nombre: 'Alex', apellido: 'Gómez', telefono: '1155550001', email: null, equiposCount: 0, reparacionesCount: 0, ultimaVisita: null },
];
const reparacion = {
  id: 1, equipoId: 1, numeroOrden: 'ORD-2026-0001',
  equipoMarca: 'Samsung', equipoModelo: 'Galaxy S24 Ultra edición especial',
  clienteNombre: clientes[0].nombre, clienteApellido: clientes[0].apellido,
  descripcionProblema: 'No enciende después de una caída; revisar pantalla y conector de carga',
  estado: 'ESPERANDO_REPUESTO', total: 1234567, precioEstimado: 900000, precioFinal: 1234567,
  estadoPago: 'PARCIAL', saldo: 1234567, excedente: 0, requiereRevision: false,
};
const stats = {
  totalReparaciones: 3, equiposListos: 1, reparacionesEsteMes: 3, articulosStockBajo: 0,
  reparacionesPorEstado: { ESPERANDO_REPUESTO: 1, COMPLETADO: 1, INGRESADO: 1 },
  ultimasReparaciones: [
    reparacion,
    { ...reparacion, id: 2, numeroOrden: 'ORD-2026-0002', equipoMarca: 'Motorola', equipoModelo: 'Edge 50', estado: 'COMPLETADO', total: 40000, precioFinal: 40000, saldo: 0, excedente: 10000, requiereRevision: true, estadoPago: 'PAGADO' },
    { ...reparacion, id: 3, numeroOrden: 'ORD-2026-0003', equipoMarca: 'Apple', equipoModelo: 'iPhone 13', estado: 'INGRESADO', total: null, precioFinal: null, precioEstimado: null, saldo: 0, estadoPago: null },
  ],
};

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function expectUnclipped(locator: Locator) {
  await expect(locator).toBeVisible();
  const size = await locator.evaluate((element) => ({
    width: element.clientWidth, contentWidth: element.scrollWidth,
    height: element.clientHeight, contentHeight: element.scrollHeight,
  }));
  expect(size.contentWidth).toBeLessThanOrEqual(size.width + 1);
  expect(size.contentHeight).toBeLessThanOrEqual(size.height + 1);
}

for (const variant of [
  { width: 320, theme: 'light', role: 'ADMIN' },
  { width: 390, theme: 'dark', role: 'USER' },
  { width: 1280, theme: 'light', role: 'ADMIN' },
  { width: 1280, theme: 'dark', role: 'USER' },
] as const) {
  test(`Inicio y Clientes: ${variant.width}px ${variant.theme} ${variant.role}`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: variant.width, height: 900 });
    await context.addInitScript((theme) => localStorage.setItem('ordenfix-theme', theme), variant.theme);
    await seedAuth(context, futureToken(`ROLE_${variant.role}`));
    await mockApi(page, {
      clientes,
      perfil: {
        usuario: { id: 1, username: 'Alex', email: 'alex@synthetic.invalid', role: variant.role, emailVerificado: true },
        taller: { id: 1, nombre: 'Taller de prueba', telefono: '1155550000' },
      },
      suscripcion: {
        plan: 'FREE', estado: 'ACTIVA', reparacionesEsteMes: 3, limiteReparacionesMes: 25,
        funciones: { inventario: false, cobros: false, empleadosMultiples: false },
      },
    });
    await page.route('**/api/dashboard', (route) => route.fulfill({ json: stats }));

    await page.goto('/');
    const row = page.getByRole('button', { name: /Abrir reparación ORD-2026-0001/ });
    await expect(row).toBeVisible();
    await expect(row.getByText('Esperando repuesto', { exact: true })).toBeVisible();
    await expect(row.getByText(/Pendiente de cobro.*1\.234\.567/)).toBeVisible();
    await expect(row.getByText(/^\$\s*1\.234\.567$/)).toBeVisible();
    if (variant.width < 640) {
      await expectUnclipped(row.getByText(/María de los Ángeles Fernández de la Fuente/));
    } else {
      const amount = await row.getByText(/^\$\s*1\.234\.567$/).evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
      }));
      expect(amount.height).toBeLessThanOrEqual(amount.lineHeight + 1);
    }
    await expect(page.getByRole('button', { name: /Abrir reparación ORD-2026-0002/ }).getByText(/Excedente a revisar.*10\.000/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Abrir reparación ORD-2026-0003/ })).not.toContainText(/Pendiente de cobro|Cobro completo registrado/);
    await expect(page.getByRole('link', { name: 'Exportar a Excel' })).toHaveCount(variant.role === 'ADMIN' ? 1 : 0);
    await expectNoOverflow(page);
    await capture(page, testInfo, 'inicio');
    await row.focus();
    await expect(row).toBeFocused();
    await row.press('Enter');
    await expect(page).toHaveURL(/\/reparaciones\/1$/);

    await page.goto('/clientes');
    const clientRow = page.getByRole('button', { name: /Ver ficha de María/ });
    await expect(clientRow).toBeVisible();
    if (variant.width < 640) {
      await expectUnclipped(clientRow.getByText(`${clientes[0].nombre} ${clientes[0].apellido}`, { exact: true }));
      await expect(clientRow.getByText('12 equipos', { exact: true })).toBeVisible();
      await expect(clientRow.getByText('145 reparaciones', { exact: true })).toBeVisible();
      await expect(clientRow.getByText(/Última visita:.*2026/)).toBeVisible();
    }
    expect(await clientRow.getByText(clientes[0].telefono, { exact: true }).evaluateAll((nodes) =>
      nodes.filter((node) => node.getClientRects().length > 0).length)).toBe(1);
    await expectNoOverflow(page);
    await capture(page, testInfo, 'clientes');
    await clientRow.focus();
    await expect(clientRow).toBeFocused();
    await clientRow.press(' ');
    const ficha = page.getByRole('dialog', { name: 'Ficha de cliente' });
    await expect(ficha).toBeVisible();
    await expect(ficha.getByRole('button', { name: 'Editar datos' })).toBeVisible();
    await expect(ficha.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(variant.role === 'ADMIN' ? 1 : 0);
    await ficha.press('Escape');
    await expect(ficha).toBeHidden();
    await expect(clientRow).toBeFocused();
  });
}

for (const screen of ['inicio', 'clientes'] as const) {
  test(`${screen}: carga, error y vacío conservan reintento y acción de alta`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: screen === 'inicio' ? 320 : 390, height: 844 });
    await context.addInitScript((theme) => localStorage.setItem('ordenfix-theme', theme), screen === 'inicio' ? 'light' : 'dark');
    await seedAuth(context);
    await mockApi(page);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let mode: 'error' | 'empty' = 'error';
    await page.route(`**/api/${screen === 'inicio' ? 'dashboard' : 'clientes'}*`, async (route) => {
      await pending;
      return mode === 'error'
        ? route.fulfill({ status: 500, json: { message: 'Fallo sintético' } })
        : route.fulfill({ json: screen === 'inicio'
          ? { ...stats, totalReparaciones: 0, equiposListos: 0, reparacionesEsteMes: 0, reparacionesPorEstado: {}, ultimasReparaciones: [] }
          : { content: [], page: { number: 0, size: 20, totalElements: 0, totalPages: 0 } } });
    });
    await page.goto(screen === 'inicio' ? '/' : '/clientes');
    const loading = screen === 'inicio'
      ? page.getByRole('region', { name: 'Indicadores del taller' })
      : page.getByRole('region', { name: 'Listado de clientes' });
    try {
      await expect(loading).toHaveAttribute('aria-busy', 'true');
      await expect(page.getByText(screen === 'inicio' ? 'Todavía no hay reparaciones' : 'Sin clientes', { exact: true })).toHaveCount(0);
      await capture(page, testInfo, 'carga');
    } finally {
      release();
    }
    await expect(page.getByText(screen === 'inicio' ? 'No pudimos cargar los ingresos recientes.' : 'No pudimos cargar los clientes.', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Fallo sintético', { exact: true })).toHaveCount(0);
    await expectNoOverflow(page);
    await capture(page, testInfo, 'error');
    mode = 'empty';
    await page.getByRole('button', { name: 'Reintentar', exact: true }).first().click();
    await expect(page.getByText(screen === 'inicio' ? 'Todavía no hay reparaciones' : 'Sin clientes', { exact: true })).toBeVisible();
    await expect(loading).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('button', { name: screen === 'inicio' ? 'Nueva reparación' : 'Nuevo cliente', exact: true })).toBeVisible();
    await expectNoOverflow(page);
    await capture(page, testInfo, 'vacio');
  });
}
