import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test('seguimiento público: se ve sin estar logueado', async ({ page }) => {
  await mockApi(page); // sin seedAuth: simula un cliente sin sesión

  await page.goto('/seguimiento/ABC123');

  await expect(page.getByRole('heading', { name: /apple iphone 13/i })).toBeVisible();
  await expect(page.getByText('MVGR Reparaciones')).toBeVisible();
  await expect(page.getByText('ABC123')).toBeVisible();
  // No debe redirigir al login
  await expect(page).toHaveURL(/\/seguimiento\/ABC123/);
});
