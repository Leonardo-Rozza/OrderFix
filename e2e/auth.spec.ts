import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test('login: ingresa y llega al dashboard', async ({ page }) => {
  await mockApi(page);

  await page.goto('/login');
  await page.getByPlaceholder('tecnico@mitaller.com').fill('admin@mvgr.com');
  await page.getByPlaceholder('••••••').fill('admin1234');
  await page.getByRole('button', { name: /ingresar/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/hola, admin/i)).toBeVisible();
});

test('login inválido: muestra error y no navega', async ({ page }) => {
  await page.route('http://localhost:8080/api/auth/login', (route) =>
    route.fulfill({ status: 401, json: { message: 'Email o contraseña incorrectos' } })
  );

  await page.goto('/login');
  await page.getByPlaceholder('tecnico@mitaller.com').fill('admin@mvgr.com');
  await page.getByPlaceholder('••••••').fill('malísima');
  await page.getByRole('button', { name: /ingresar/i }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/incorrect/i)).toBeVisible();
});
