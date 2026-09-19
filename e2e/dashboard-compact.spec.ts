import { mkdirSync } from 'node:fs';
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const stateLabels = [
  ['INGRESADO', 'Ingresado'], ['EN_DIAGNOSTICO', 'En diagnóstico'],
  ['PRESUPUESTADO', 'Presupuestado'], ['ESPERANDO_ADICIONAL', 'Esperando adicional'],
  ['EN_PROCESO', 'En proceso'], ['ESPERANDO_REPUESTO', 'Esperando repuesto'],
  ['NO_REPARABLE', 'No reparable'], ['COMPLETADO', 'Completado'],
  ['LISTO_SIN_REPARAR', 'Listo sin reparar'], ['ENTREGADO', 'Entregado'],
  ['ABANDONADO', 'Abandonado'], ['CANCELADO', 'Cancelado'],
] as const;
const phaseLabels = ['Ingreso', 'Diagnóstico', 'Aprobación', 'En trabajo', 'Listo', 'Cerradas'];
const repairs = [
  {
    id: 41, equipoId: 41, numeroOrden: 'ORD-2026-0041', equipoMarca: 'Motorola', equipoModelo: 'Moto G84',
    clienteNombre: 'Ana', clienteApellido: 'Prueba', descripcionProblema: 'Revisar conector de carga',
    estado: 'EN_PROCESO', fechaIngreso: '2026-09-18', precioEstimado: 35000, precioFinal: 35000,
    total: 35000, saldo: 35000, excedente: 0, requiereRevision: false, estadoPago: 'SIN_COBRAR',
  },
  {
    id: 42, equipoId: 42, numeroOrden: 'ORD-2026-0042', equipoMarca: 'Samsung', equipoModelo: 'Galaxy A35',
    clienteNombre: 'Luis', clienteApellido: 'Prueba', descripcionProblema: 'Diagnosticar pantalla',
    estado: 'INGRESADO', fechaIngreso: '2026-09-18', precioEstimado: null, precioFinal: null,
    total: null, saldo: 0, excedente: 0, requiereRevision: false, estadoPago: null,
  },
];
const scenarios = {
  empty: { counts: {}, phases: [0, 0, 0, 0, 0, 0], total: 0, ready: 0, month: 0, active: 0 },
  few: {
    counts: { INGRESADO: 1, EN_PROCESO: 2, COMPLETADO: 1 },
    phases: [1, 0, 0, 2, 1, 0], total: 4, ready: 1, month: 4, active: 4,
  },
  many: {
    counts: {
      INGRESADO: 21, EN_DIAGNOSTICO: 12, PRESUPUESTADO: 5, ESPERANDO_ADICIONAL: 3,
      EN_PROCESO: 31, ESPERANDO_REPUESTO: 10, NO_REPARABLE: 2, COMPLETADO: 7,
      LISTO_SIN_REPARAR: 4, ENTREGADO: 1300, ABANDONADO: 2, CANCELADO: 1,
    },
    phases: [21, 12, 8, 43, 11, 1303], total: 1398, ready: 7, month: 18, active: 95,
  },
};
type Scenario = keyof typeof scenarios;

async function prepare(page: Page, context: BrowserContext, scenario: Scenario, theme: 'light' | 'dark') {
  await context.addInitScript((selected) => localStorage.setItem('ordenfix-theme', selected), theme);
  await seedAuth(context, undefined, 'maya@synthetic.invalid');
  await mockApi(page, {
    perfil: {
      usuario: { id: 1, username: 'Maya', email: 'maya@synthetic.invalid', role: 'ADMIN', emailVerificado: true },
      taller: { id: 1, nombre: 'Taller de prueba', telefono: null },
    },
    clientes: scenario === 'empty' ? [] : [{ id: 1, nombre: 'Ana', apellido: 'Prueba', telefono: '1155550000' }],
    reparaciones: scenario === 'empty' ? [] : repairs,
  });
  const data = scenarios[scenario];
  await page.route('**/api/dashboard', (route) => route.fulfill({ json: {
    reparacionesPorEstado: data.counts, totalReparaciones: data.total,
    equiposListos: data.ready, reparacionesEsteMes: data.month, articulosStockBajo: 0,
    ultimasReparaciones: scenario === 'empty' ? [] : repairs,
    plan: 'FREE', estadoSuscripcion: 'TRIAL', limiteReparacionesMes: null,
  } }));
  await page.goto('/dashboard');
  const panel = page.getByRole('region', { name: 'Reparaciones por estado', exact: true });
  await expect(panel.getByRole('button', { name: 'Ver todos los estados', exact: true })).toHaveAttribute('aria-expanded', 'false');
  const indicators = page.getByRole('region', { name: 'Indicadores del taller' });
  await expect(indicators).toHaveAttribute('aria-busy', 'false');
  for (const [label, value] of [
    ['Reparaciones activas', data.active], ['Equipos sin retirar', data.ready],
    ['Reparaciones del mes', data.month], ['Clientes', scenario === 'empty' ? 0 : 1],
  ] as const) {
    const card = indicators.getByText(label, { exact: true }).locator('..').locator('..');
    await expect(card.getByText(String(value), { exact: true })).toBeVisible();
  }
  await page.evaluate(() => document.fonts.ready);
  return panel;
}

async function expectPhases(panel: Locator, scenario: Scenario) {
  for (const [index, label] of phaseLabels.entries()) {
    const term = panel.getByRole('term').filter({ hasText: new RegExp(`^${label}$`) });
    await expect(term).toBeVisible();
    await expect(term.locator('..').getByRole('definition')).toHaveText(String(scenarios[scenario].phases[index]));
  }
}

async function expectGeometry(page: Page, fitsVertically: boolean) {
  const geometry = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, viewportWidth: window.innerWidth,
    height: document.documentElement.scrollHeight, viewportHeight: window.innerHeight,
  }));
  expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  if (fitsVertically) expect(geometry.height).toBeLessThanOrEqual(geometry.viewportHeight + 1);
}

async function capture(page: Page, name: string) {
  mkdirSync('docs/evidence/2026-09-18-stage3', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `docs/evidence/2026-09-18-stage3/${name}.png`, fullPage: true, animations: 'disabled' });
}

async function expandWithKeyboard(panel: Locator, page: Page, scenario: Scenario) {
  const expand = panel.getByRole('button', { name: 'Ver todos los estados', exact: true });
  const controlledId = await expand.getAttribute('aria-controls');
  expect(controlledId).toBeTruthy();
  await expand.focus();
  await expand.press('Enter');
  const collapse = panel.getByRole('button', { name: 'Ver menos', exact: true });
  await expect(collapse).toBeFocused();
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`[id="${controlledId}"]`)).toBeVisible();
  await expect(panel.getByRole('link')).toHaveCount(12);
  for (const [state, label] of stateLabels) {
    const link = panel.getByRole('link').filter({ has: page.getByText(label, { exact: true }) });
    await expect(link).toHaveAttribute('href', `/reparaciones?vista=list&estado=${state}`);
    const counts: Partial<Record<string, number>> = scenarios[scenario].counts;
    await expect(link.getByText(String(counts[state] ?? 0), { exact: true })).toBeVisible();
  }
  await collapse.press('Tab');
  await expect(panel.getByRole('link').filter({ has: page.getByText('Ingresado', { exact: true }) })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(collapse).toBeFocused();
  await expectPhases(panel, scenario);
  return collapse;
}

for (const viewport of [
  { width: 1280, height: 800, theme: 'light' },
  { width: 1440, height: 900, theme: 'dark' },
] as const) {
  test(`dashboard vacío compacto ${viewport.width}×${viewport.height} ${viewport.theme}`, async ({ page, context }) => {
    await page.setViewportSize(viewport);
    const panel = await prepare(page, context, 'empty', viewport.theme);
    await expectPhases(panel, 'empty');
    await expect(panel.getByRole('link')).toHaveCount(0);
    await expect(page.getByText('Todavía no hay reparaciones', { exact: true })).toHaveCount(1);
    await expectGeometry(page, true);
    await capture(page, `vacio-${viewport.width}-${viewport.theme}-contraido`);

    const collapse = await expandWithKeyboard(panel, page, 'empty');
    await capture(page, `vacio-${viewport.width}-${viewport.theme}-expandido`);
    await collapse.press(' ');
    await expect(panel.getByRole('button', { name: 'Ver todos los estados', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await expect(panel.getByRole('link')).toHaveCount(0);
    await expectGeometry(page, true);
  });
}

for (const variant of [
  { width: 1280, height: 800, theme: 'light', scenario: 'few' },
  { width: 1440, height: 900, theme: 'dark', scenario: 'many' },
  { width: 320, height: 568, theme: 'light', scenario: 'few' },
  { width: 390, height: 844, theme: 'dark', scenario: 'many' },
] as const) {
  test(`dashboard ${variant.scenario} ${variant.width}px ${variant.theme}: conteos y acceso al estado exacto`, async ({ page, context }) => {
    await page.setViewportSize(variant);
    const panel = await prepare(page, context, variant.scenario, variant.theme);
    await expectPhases(panel, variant.scenario);
    await expect(panel.getByRole('link')).toHaveCount(0);
    await expect(page.getByText('Todavía no hay reparaciones', { exact: true })).toHaveCount(0);
    await expectGeometry(page, false);
    await capture(page, `${variant.scenario}-${variant.width}-${variant.theme}-contraido`);

    await expandWithKeyboard(panel, page, variant.scenario);
    await expectGeometry(page, false);
    await capture(page, `${variant.scenario}-${variant.width}-${variant.theme}-expandido`);
    const authBefore = await page.evaluate(() => localStorage.getItem('ordenfix-auth'));
    const listRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === '/api/reparaciones' && url.searchParams.get('estado') === 'EN_PROCESO';
    });
    await panel.getByRole('link').filter({ has: page.getByText('En proceso', { exact: true }) }).click();
    expect((await listRequest).method()).toBe('GET');
    await expect(page).toHaveURL(/\/reparaciones\?vista=list&estado=EN_PROCESO$/);
    await expect(page.getByRole('combobox', { name: 'Ordenar', exact: true })).toBeVisible();
    if (variant.width < 640) {
      await expect(page.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue('EN_PROCESO');
    }
    await expect(page.getByRole('button', { name: 'Abrir reparación ORD-2026-0041 — Motorola Moto G84', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir reparación ORD-2026-0042 — Samsung Galaxy A35', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('ordenfix-auth'))).toBe(authBefore);
    await expectGeometry(page, false);
  });
}
