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
  await expect(page.getByRole('button', { name: /^Ingresado(?: · \d+)?$/ })).toHaveClass(/bg-primary/);
  await expect(page.getByRole('combobox')).toBeVisible();
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
