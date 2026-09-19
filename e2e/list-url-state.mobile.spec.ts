import { expect, test, type Page } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const CLIENTE = {
  id: 1,
  nombre: 'Ana',
  apellido: 'Gómez',
  telefono: '1155550000',
  email: 'ana@example.com',
  direccion: null,
  equiposCount: 1,
  reparacionesCount: 1,
  ultimaVisita: '2026-08-01',
};

const REPARACION = {
  id: 7,
  equipoId: 3,
  descripcionProblema: 'No enciende',
  estado: 'INGRESADO',
  precioEstimado: 25_000,
  precioFinal: null,
  fechaIngreso: '2026-08-20',
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
  numeroOrden: 'ORD-2026-0007',
  equipoMarca: 'Apple',
  equipoModelo: 'iPhone 13',
  clienteId: 1,
  clienteNombre: 'Ana',
  clienteApellido: 'Gómez',
  clienteTelefono: '1155550000',
};

const expectClientesDeepLink = async (page: Page) => {
  await expect(page).toHaveURL(/\/clientes\?q=Ana&sort=id%2Cdesc$/);
  await expect(page.getByRole('searchbox', { name: 'Buscar clientes', exact: true })).toHaveValue('Ana');
  await expect(page.getByRole('combobox')).toHaveValue('id,desc');
  await expect(page.getByRole('button', { name: 'Ver ficha de Ana Gómez', exact: true })).toBeVisible();
};

const expectReparacionesDeepLink = async (page: Page) => {
  await expect(page).toHaveURL(/\/reparaciones\?vista=list&estado=INGRESADO$/);
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveClass(/bg-surface/);
  await expect(page.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue('INGRESADO');
  await expect(page.getByRole('combobox', { name: 'Ordenar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', {
    name: 'Abrir reparación ORD-2026-0007 — Apple iPhone 13',
    exact: true,
  })).toBeVisible();
};

test('los deep links de listados se hidratan y sobreviven recargas en móvil', async ({
  page,
  context,
}) => {
  await seedAuth(context);
  await mockApi(page, {
    clientes: [CLIENTE],
    reparaciones: [REPARACION],
  });

  await page.goto('/clientes?q=Ana&sort=id%2Cdesc');
  await expectClientesDeepLink(page);
  await page.reload();
  await expectClientesDeepLink(page);

  await page.goto('/reparaciones?vista=list&estado=INGRESADO');
  await expectReparacionesDeepLink(page);
  await page.reload();
  await expectReparacionesDeepLink(page);
});

test('móvil inicia en Lista y conserva Etapas explícita, la etapa y su historial al recargar o redimensionar', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { reparaciones: [REPARACION] });
  await page.goto('/reparaciones?externo=1');
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveClass(/bg-surface/);
  await expect(page.getByRole('region', { name: 'Reparaciones por etapas', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Abrir reparación ORD-2026-0007 — Apple iPhone 13', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Etapas', exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('vista')).toBe('board');
  const phases = page.getByRole('group', { name: 'Etapas de reparación', exact: true });
  await expect(phases.getByRole('button', { name: /^Ingreso\b/ })).toHaveAttribute('aria-pressed', 'true');
  await phases.getByRole('button', { name: /^En trabajo\b/ }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('etapa')).toBe('EN_TRABAJO');
  await expect(page.getByTestId('col-INGRESADO')).toHaveCount(0);
  for (const state of ['EN_PROCESO', 'ESPERANDO_REPUESTO', 'NO_REPARABLE']) {
    await expect(page.getByTestId(`col-${state}`)).toBeVisible();
  }
  await page.reload();
  await expect(phases.getByRole('button', { name: /^En trabajo\b/ })).toHaveAttribute('aria-pressed', 'true');
  expect(new URL(page.url()).searchParams.get('vista')).toBe('board');
  expect(new URL(page.url()).searchParams.get('externo')).toBe('1');

  const mobileViewport = page.viewportSize()!;
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(phases.getByRole('button', { name: /^En trabajo\b/ })).toHaveAttribute('aria-pressed', 'true');
  await page.setViewportSize(mobileViewport);
  await expect(page.getByRole('region', { name: 'Reparaciones por etapas', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('vista')).toBe('board');

  await page.goBack();
  await expect(phases.getByRole('button', { name: /^Ingreso\b/ })).toHaveAttribute('aria-pressed', 'true');
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveClass(/bg-surface/);
  await page.goForward();
  await page.goForward();
  await expect(phases.getByRole('button', { name: /^En trabajo\b/ })).toHaveAttribute('aria-pressed', 'true');
});
