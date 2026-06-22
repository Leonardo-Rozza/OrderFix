import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

test('a11y: el modal se cierra con Escape', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);

  await page.goto('/reparaciones?nuevo=1');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('a11y: el skip link enfoca el contenido principal', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);

  await page.goto('/dashboard');

  // El primer Tab cae en el skip link (visualmente oculto hasta el foco)
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /saltar al contenido/i });
  await expect(skip).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#contenido')).toBeFocused();
});
