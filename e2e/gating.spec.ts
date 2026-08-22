import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const suscripcionFree = {
  plan: 'FREE',
  estado: 'ACTIVA',
  fechaInicio: null,
  fechaFinTrial: null,
  proximoCobro: null,
  reparacionesEsteMes: 0,
  limiteReparacionesMes: 25,
  funciones: { inventario: false, cobros: false, empleadosMultiples: false },
};

test('gating PRO: Inventario muestra el bloqueo y lleva a planes', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { suscripcion: suscripcionFree });

  await page.goto('/inventario');

  // Pantalla de upsell en lugar del listado
  await expect(page.getByRole('heading', { name: /inventario es una función pro/i })).toBeVisible();
  // No se debe ver el botón de alta del inventario real
  await expect(page.getByRole('button', { name: /nuevo artículo/i })).toHaveCount(0);

  await page.getByRole('button', { name: /ver planes pro/i }).click();
  await expect(page).toHaveURL(/\/planes/);
});

test('gating PRO: Caja muestra el bloqueo PRO', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { suscripcion: suscripcionFree });

  await page.goto('/caja');

  await expect(page.getByRole('heading', { name: /caja es una función pro/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /ver planes pro/i })).toBeVisible();
});

test('gating TRIAL: habilita la experiencia PRO aunque el plan nominal sea FREE', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);

  await page.goto('/inventario');
  await expect(page.getByRole('button', { name: /nuevo artículo/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /inventario es una función pro/i })).toHaveCount(0);

  await page.goto('/caja');
  await expect(page.getByText(/total cobrado/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /caja es una función pro/i })).toHaveCount(0);
});
