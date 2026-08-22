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

  // SessionGate valida /suscripcion antes de montar el layout privado.
  // Esperamos ese límite para no enviar Tab mientras todavía está el loader.
  const skip = page.getByRole('link', { name: /saltar al contenido/i });
  await expect(page.locator('#contenido')).toBeAttached();
  await expect(skip).toBeAttached();
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#contenido')).toBeFocused();
});

test('a11y: confirmar eliminación reemplaza la ficha sin apilar diálogos', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, {
    clientes: [
      {
        id: 1,
        nombre: 'Ana',
        apellido: 'Gómez',
        telefono: '1155550000',
        email: 'ana@example.com',
        direccion: null,
        equiposCount: 0,
        reparacionesCount: 0,
        ultimaVisita: '2026-08-01',
      },
    ],
  });

  await page.goto('/clientes');
  await page.getByRole('button', { name: /ver ficha de ana gómez/i }).click();
  await expect(page.getByRole('dialog', { name: 'Ficha de cliente' })).toBeVisible();

  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: 'Eliminar cliente' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: 'Ficha de cliente' })).toBeVisible();
});
