import { test, expect } from '@playwright/test';
import { mockApi, futureToken } from './helpers';

test('reset password: cambia la contraseña desde el link del email y vuelve al login', async ({ page }) => {
  let body: unknown;
  await page.route('**/api/auth/password/reset', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, json: {} });
  });

  await page.goto('/reset-password?token=tok-123');
  await page.getByLabel('Nueva contraseña').fill('nueva123');
  await page.getByLabel('Repetila').fill('nueva123');
  await page.getByRole('button', { name: /cambiar contraseña/i }).click();

  await expect(page).toHaveURL(/\/login/);
  expect(body).toEqual({ token: 'tok-123', nuevaPassword: 'nueva123' });
});

test('reset password: valida que las contraseñas coincidan sin llamar al backend', async ({ page }) => {
  await page.goto('/reset-password?token=tok-123');
  await page.getByLabel('Nueva contraseña').fill('nueva123');
  await page.getByLabel('Repetila').fill('otra999');
  await page.getByRole('button', { name: /cambiar contraseña/i }).click();
  await expect(page.getByText(/no coinciden/i)).toBeVisible();
});

test('verificar email: token válido muestra éxito', async ({ page }) => {
  await page.route('**/api/auth/verificar-email', (route) => route.fulfill({ status: 200, json: {} }));
  await page.goto('/verificar-email?token=tok-ok');
  await page.getByRole('button', { name: /confirmar mi email/i }).click();
  await expect(page.getByText(/email verificado/i)).toBeVisible();
});

test('verificar email: token vencido ofrece reenviar', async ({ page }) => {
  await page.route('**/api/auth/verificar-email', (route) =>
    route.fulfill({ status: 400, json: { message: 'El link no es válido o ya venció' } })
  );
  let reenviado: unknown;
  await page.route('**/api/auth/verificar-email/reenviar', async (route) => {
    reenviado = route.request().postDataJSON();
    await route.fulfill({ status: 200, json: {} });
  });

  await page.goto('/verificar-email?token=tok-viejo');
  await page.getByRole('button', { name: /confirmar mi email/i }).click();
  await expect(page.getByText(/no es válido o venció/i)).toBeVisible();
  await page.getByLabel('Email').fill('juan@taller.com');
  await page.getByRole('button', { name: /reenviar email/i }).click();
  await expect(page.getByText(/te reenviamos el email/i)).toBeVisible();
  expect(reenviado).toEqual({ email: 'juan@taller.com' });
});

test('banner de email sin verificar: aparece tras login y permite reenviar', async ({ page }) => {
  await mockApi(page);
  // Pisar el login del mock: este test necesita emailVerificado en false
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      json: { token: futureToken(), type: 'Bearer', email: 'admin@mvgr.com', emailVerificado: false },
    })
  );

  await page.goto('/login');
  await page.getByPlaceholder('tecnico@mitaller.com').fill('admin@mvgr.com');
  await page.getByPlaceholder('••••••').fill('admin1234');
  await page.getByRole('button', { name: /ingresar/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/confirmá tu email/i)).toBeVisible();

  await page.route('**/api/auth/verificar-email/reenviar', (route) => route.fulfill({ status: 200, json: {} }));
  await page.getByRole('button', { name: /^reenviar$/i }).click();
  await expect(page.getByText(/te reenviamos el email/i)).toBeVisible();
});

test('login: tiene el link de olvidé mi contraseña y la pantalla responde', async ({ page }) => {
  await page.route('**/api/auth/password/olvide', (route) => route.fulfill({ status: 200, json: {} }));

  await page.goto('/login');
  await page.getByRole('link', { name: /olvidaste tu contraseña/i }).click();
  await expect(page).toHaveURL(/\/olvide-password/);

  await page.getByLabel('Email').fill('juan@taller.com');
  await page.getByRole('button', { name: /enviarme el link/i }).click();
  await expect(page.getByText(/revisá tu casilla/i)).toBeVisible();
});
