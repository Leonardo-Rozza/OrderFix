import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const DISCARD_TITLE = '¿Descartar los cambios?';

const expectInsideVisualViewport = async (page: Page, dialog: Locator) => {
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;

    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      viewportTop,
      viewportRight: viewportLeft + viewportWidth,
      viewportBottom: viewportTop + viewportHeight,
      viewportLeft,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    };
  });

  expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewportTop - 1);
  expect(geometry.left).toBeGreaterThanOrEqual(geometry.viewportLeft - 1);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportRight + 1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);

  const buttons = await dialog.getByRole('button').evaluateAll((elements) => (
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        name: element.textContent?.trim() ?? '',
        height: rect.height,
        width: rect.width,
      };
    })
  ));

  expect(buttons).toHaveLength(2);
  for (const button of buttons) {
    expect(Math.round(button.height), `botón “${button.name}” debe medir al menos 44px de alto`).toBeGreaterThanOrEqual(44);
    expect(Math.round(button.width), `botón “${button.name}” debe medir al menos 44px de ancho`).toBeGreaterThanOrEqual(44);
  }

  await expect(page.locator('[role="dialog"]')).toHaveCount(1);
};

test('cliente: el descarte es accesible y seguro en el viewport móvil', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { clientes: [] });
  await page.goto('/clientes');

  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  const customerDialog = page.getByRole('dialog', { name: 'Nuevo cliente', exact: true });
  const nameInput = customerDialog.getByLabel('Nombre');
  await nameInput.fill('Cambio sin guardar');

  const closeButton = customerDialog.getByRole('button', { name: 'Cerrar', exact: true });
  await closeButton.click();

  const discardDialog = page.getByRole('dialog', { name: DISCARD_TITLE, exact: true });
  const baseLayer = page.locator('[data-modal-layer="base"]');
  const continueButton = discardDialog.getByRole('button', { name: 'Seguir editando', exact: true });

  await expect(discardDialog).toBeVisible();
  await expectInsideVisualViewport(page, discardDialog);
  await expect(baseLayer).toHaveAttribute('data-modal-suspended', 'true');
  await expect(baseLayer).toHaveAttribute('aria-hidden', 'true');
  await expect(baseLayer).toHaveAttribute('inert', '');
  await expect(baseLayer.locator('[role="dialog"]')).toHaveCount(0);
  await expect(continueButton).toBeFocused();

  await continueButton.click();

  await expect(discardDialog).toBeHidden();
  await expect(customerDialog).toBeVisible();
  await expect(nameInput).toHaveValue('Cambio sin guardar');
  await expect(closeButton).toBeFocused();
  await expect(baseLayer).not.toHaveAttribute('aria-hidden', 'true');
  await expect(baseLayer).not.toHaveAttribute('inert', '');

  const cancelButton = customerDialog.getByRole('button', { name: 'Cancelar', exact: true });
  await cancelButton.click();
  await discardDialog.getByRole('button', { name: 'Descartar cambios', exact: true }).click();

  await expect(page.locator('[data-modal-layer="base"]')).toHaveCount(0);
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
});
