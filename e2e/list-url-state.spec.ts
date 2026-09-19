import { expect, test, type Page } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const CLIENTES = Array.from({ length: 25 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    nombre: `Cliente ${String(id).padStart(2, '0')}`,
    apellido: 'Prueba',
    telefono: `110000${String(id).padStart(4, '0')}`,
    email: null,
    direccion: null,
    equiposCount: 1,
    reparacionesCount: 1,
    ultimaVisita: '2026-08-20',
  };
});

const REPARACIONES = Array.from({ length: 25 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    equipoId: id,
    descripcionProblema: `Falla de prueba ${id}`,
    estado: 'INGRESADO',
    precioEstimado: 10_000 + id,
    precioFinal: null,
    fechaIngreso: `2026-08-${String((index % 20) + 1).padStart(2, '0')}`,
    fechaEstimadaEntrega: null,
    fechaEntrega: null,
    numeroOrden: `ORD-2026-${String(id).padStart(4, '0')}`,
    total: 10_000 + id,
    cobrado: 0,
    saldo: 10_000 + id,
    estadoPago: 'SIN_COBRAR',
    equipoMarca: 'Motorola',
    equipoModelo: `G${id}`,
    clienteNombre: `Cliente ${id}`,
    clienteApellido: 'Prueba',
  };
});

const paramsOf = (page: Page) => page.evaluate(() => (
  Object.fromEntries(new URLSearchParams(window.location.search))
));

test.beforeEach(async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, {
    clientes: CLIENTES,
    reparaciones: REPARACIONES,
  });
});

test('Clientes conserva búsqueda y orden sin crear una entrada por tecla', async ({ page }) => {
  await page.goto('/dashboard');
  await page.goto('/clientes?page=1');

  await expect(page.getByRole('button', { name: 'Ver ficha de Cliente 21 Prueba' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar clientes' }).fill('Cliente 02');

  await expect.poll(() => paramsOf(page)).toMatchObject({ q: 'Cliente 02' });
  expect(await paramsOf(page)).not.toHaveProperty('page');
  await expect(page.getByRole('button', { name: 'Ver ficha de Cliente 02 Prueba' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Ordenar' }).selectOption('id,desc');
  await expect.poll(() => paramsOf(page)).toMatchObject({
    q: 'Cliente 02',
    sort: 'id,desc',
  });

  await page.reload();
  await expect(page.getByRole('searchbox', { name: 'Buscar clientes' })).toHaveValue('Cliente 02');
  await expect(page.getByRole('combobox', { name: 'Ordenar' })).toHaveValue('id,desc');

  await page.goBack();
  await expect(page.getByRole('searchbox', { name: 'Buscar clientes' })).toHaveValue('Cliente 02');
  await expect(page.getByRole('combobox', { name: 'Ordenar' })).toHaveValue('nombre,asc');

  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('Reparaciones vuelve desde el detalle al recorte exacto del listado', async ({ page }) => {
  await page.goto('/reparaciones?vista=list&estado=INGRESADO&page=1&sort=fechaIngreso%2Cdesc');

  await expect(page.getByRole('button', { name: 'Lista' })).toHaveClass(/bg-surface/);
  await expect(page.getByRole('button', { name: /^Ingresado/ })).toHaveClass(/bg-primary/);
  await expect(page.getByRole('combobox', { name: 'Ordenar' })).toHaveValue('fechaIngreso,desc');

  const originalUrl = page.url();
  await page.getByRole('button', { name: /^Abrir reparación/ }).first().click();
  await expect(page).toHaveURL(/\/reparaciones\/\d+$/);

  await page.goBack();
  await expect(page).toHaveURL(originalUrl);
  await expect(page.getByRole('button', { name: 'Lista' })).toHaveClass(/bg-surface/);
  await expect(page.getByRole('button', { name: /^Ingresado/ })).toHaveClass(/bg-primary/);
  await expect(page.getByRole('combobox', { name: 'Ordenar' })).toHaveValue('fechaIngreso,desc');

  await page.getByRole('button', { name: 'Etapas', exact: true }).click();
  await expect.poll(() => paramsOf(page)).toMatchObject({
    estado: 'INGRESADO',
    page: '1',
    sort: 'fechaIngreso,desc',
    vista: 'board',
  });
  const phases = page.getByRole('group', { name: 'Etapas de reparación', exact: true });
  await phases.getByRole('button', { name: /^En trabajo\b/ }).click();
  await expect.poll(() => paramsOf(page)).toMatchObject({ etapa: 'EN_TRABAJO', vista: 'board', estado: 'INGRESADO' });
  await expect(page.getByTestId('col-INGRESADO')).toHaveCount(0);
  await expect(page.getByTestId('col-EN_PROCESO')).toBeVisible();
  await page.reload();
  await expect(phases.getByRole('button', { name: /^En trabajo\b/ })).toHaveAttribute('aria-pressed', 'true');

  await page.goBack();
  await expect(phases.getByRole('button', { name: /^Ingreso\b/ })).toHaveAttribute('aria-pressed', 'true');

  await page.goBack();
  await expect(page.getByRole('button', { name: 'Lista' })).toHaveClass(/bg-surface/);
});

test('parámetros inválidos se limpian sin borrar parámetros ajenos', async ({ page }) => {
  await page.goto('/reparaciones?vista=grid&etapa=DESCONOCIDA&estado=DESCONOCIDO&page=-1&sort=DROP&nuevo=0&externo=1');

  await expect.poll(() => paramsOf(page)).toEqual({ externo: '1' });
  await expect(page.getByRole('button', { name: 'Etapas', exact: true })).toHaveClass(/bg-surface/);
  await expect(page.getByRole('dialog', { name: 'Nueva reparación' })).toHaveCount(0);

  await page.goto('/caja?desde=2026-02-30&hasta=fecha&externo=1');
  await expect.poll(() => paramsOf(page)).toEqual({ externo: '1' });
  await expect(page.getByRole('textbox', { name: 'Desde', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'Hasta', exact: true })).toHaveValue('');
});

test('Cobros recorre el rango con Back/Forward y Hoy sin cambiar /caja', async ({ page }) => {
  await page.goto('/caja?externo=1');

  await expect(page.getByRole('heading', { name: 'Cobros', exact: true })).toBeVisible();

  await page.getByRole('textbox', { name: 'Desde', exact: true }).fill('01/08/2026');
  await expect.poll(() => paramsOf(page)).toMatchObject({ externo: '1', desde: '2026-08-01' });
  await page.getByRole('textbox', { name: 'Hasta', exact: true }).fill('15/08/2026');
  await expect.poll(() => paramsOf(page)).toEqual({
    externo: '1',
    desde: '2026-08-01',
    hasta: '2026-08-15',
  });

  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Desde', exact: true })).toHaveValue('01/08/2026');
  await expect(page.getByRole('textbox', { name: 'Hasta', exact: true })).toHaveValue('');
  await page.goForward();
  await expect(page.getByRole('textbox', { name: 'Hasta', exact: true })).toHaveValue('15/08/2026');

  await page.getByRole('button', { name: 'Hoy' }).click();
  await expect.poll(() => paramsOf(page)).toEqual({ externo: '1' });

  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Desde', exact: true })).toHaveValue('01/08/2026');
  await expect(page.getByRole('textbox', { name: 'Hasta', exact: true })).toHaveValue('15/08/2026');
});

test('alta por nuevo=1 reemplaza la entrada y Atrás no reabre el formulario', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Nueva reparación', exact: true }).click();
  await expect(page).toHaveURL(/\/reparaciones\?nuevo=1$/);

  const form = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
  await form.getByLabel(/^nombre/i).fill('Juan');
  await form.getByLabel(/teléfono/i).fill('1155551234');
  await form.getByLabel(/^marca/i).fill('Apple');
  await form.getByLabel(/^modelo/i).fill('iPhone 12');
  await form.getByLabel(/problema/i).fill('Pantalla rota');
  await form.getByRole('button', { name: /crear reparación/i }).click();

  await expect(page).toHaveURL(/\/reparaciones\/999$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('dialog', { name: 'Nueva reparación' })).toHaveCount(0);
});

test('cerrar nuevo=1 conserva el resto del estado navegable', async ({ page }) => {
  await page.goto('/reparaciones?nuevo=1&vista=list&estado=INGRESADO&q=Motorola&sort=estado%2Casc&externo=1');

  const form = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
  await expect(form).toBeVisible();
  await form.getByRole('button', { name: 'Cerrar', exact: true }).click();

  await expect(form).toBeHidden();
  await expect.poll(() => paramsOf(page)).toEqual({
    vista: 'list',
    estado: 'INGRESADO',
    q: 'Motorola',
    sort: 'estado,asc',
    externo: '1',
  });
});
