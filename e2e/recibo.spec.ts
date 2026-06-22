import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const recibo = {
  reparacionId: 1,
  fecha: '2026-06-22T10:00:00',
  tallerTelefono: '+54 11 5555-1234',
  clienteNombre: 'Ana',
  clienteApellido: 'Gómez',
  clienteTelefono: '1155550000',
  equipoMarca: 'Apple',
  equipoModelo: 'iPhone 13',
  descripcionProblema: 'Pantalla rota',
  repuestos: [{ nombre: 'Módulo de pantalla', cantidad: 1, subtotal: 45000 }],
  manoDeObra: 10000,
  totalRepuestos: 45000,
  total: 55000,
  cobrado: 55000,
  saldo: 0,
  pagado: true,
};

test('recibo: muestra el detalle imprimible de la orden', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { recibo });

  await page.goto('/reparaciones/1/recibo');

  await expect(page.getByText('Orden #1')).toBeVisible();
  await expect(page.getByText('Módulo de pantalla')).toBeVisible();
  await expect(page.getByText('Apple iPhone 13')).toBeVisible();
  await expect(page.getByText('✓ Pagado')).toBeVisible();
  await expect(page.getByRole('button', { name: /imprimir/i })).toBeVisible();
});
