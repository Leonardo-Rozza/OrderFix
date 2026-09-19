import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test('seguimiento público: se ve sin estar logueado', async ({ page }) => {
  await mockApi(page); // sin seedAuth: simula un cliente sin sesión

  await page.goto('/seguimiento/ABC123');

  await expect(page.getByRole('heading', { name: /apple iphone 13/i })).toBeVisible();
  await expect(page.getByText('MVGR Reparaciones')).toBeVisible();
  const trackingCode = page.getByRole('term').filter({ hasText: 'Código de seguimiento' }).locator('..');
  await expect(trackingCode.getByRole('definition')).toHaveText('ABC123');
  // Muestra el presupuesto pendiente con opción de aprobar
  await expect(page.getByRole('button', { name: /aprobar presupuesto/i })).toBeVisible();
  // No debe redirigir al login
  await expect(page).toHaveURL(/\/seguimiento\/ABC123/);
});
