import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const PRO_SUSCRIPCION = {
  plan: 'PRO',
  estado: 'ACTIVA',
  fechaInicio: '2026-01-01',
  fechaFinTrial: null,
  proximoCobro: null,
  reparacionesEsteMes: 1,
  limiteReparacionesMes: null,
  funciones: { inventario: true, cobros: true, empleadosMultiples: true },
};

const expectInsideViewport = async (locator: Locator, label: string) => {
  const geometry = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });

  expect(geometry.top, `${label} debe comenzar dentro del viewport`).toBeGreaterThanOrEqual(-1);
  expect(geometry.left, `${label} debe comenzar dentro del viewport`).toBeGreaterThanOrEqual(-1);
  expect(geometry.right, `${label} debe terminar dentro del viewport`).toBeLessThanOrEqual(
    geometry.viewportWidth + 1,
  );
  expect(geometry.bottom, `${label} debe terminar dentro del viewport`).toBeLessThanOrEqual(
    geometry.viewportHeight + 1,
  );
  expect(geometry.scrollWidth, `${label} no debe tener overflow horizontal`).toBeLessThanOrEqual(
    geometry.clientWidth + 1,
  );
};

const expectNoDocumentOverflow = async (page: Page) => {
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(geometry.scrollWidth, 'la página no debe tener overflow horizontal').toBeLessThanOrEqual(
    geometry.clientWidth + 1,
  );
};

const expectTouchTargets = async (container: Locator, selector: string, label: string) => {
  const targets = await container.locator(selector).evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !element.closest('[hidden], [aria-hidden="true"]');

      if (!visible) return [];

      return [{
        name: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.tagName,
        height: rect.height,
        width: rect.width,
      }];
    }),
  );

  expect(targets.length, `${label} debe exponer targets táctiles visibles`).toBeGreaterThan(0);
  for (const target of targets) {
    expect(Math.round(target.height), `${label}: “${target.name}” debe medir al menos 44px de alto`).toBeGreaterThanOrEqual(44);
    expect(Math.round(target.width), `${label}: “${target.name}” debe medir al menos 44px de ancho`).toBeGreaterThanOrEqual(44);
  }
};

test('navegación móvil: cinco destinos, bandeja accesible y herramientas secundarias', async ({
  page,
  context,
}) => {
  await seedAuth(context);
  await mockApi(page, { suscripcion: PRO_SUSCRIPCION });

  await page.goto('/dashboard');
  await expect(page.locator('#contenido')).toBeAttached();

  const moreButton = page.getByRole('button', { name: 'Más', exact: true });
  const bottomNav = page
    .getByRole('navigation', { name: 'Principal', exact: true })
    .filter({ has: moreButton });

  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole('link')).toHaveCount(4);
  await expect(bottomNav.getByRole('button', { name: 'Más', exact: true })).toHaveCount(1);
  await expect(bottomNav.locator(':scope > a, :scope > button')).toHaveCount(5);

  for (const path of ['/dashboard', '/reparaciones', '/clientes', '/equipos']) {
    await expect(bottomNav.locator(`a[href="${path}"]`), `falta el destino primario ${path}`).toHaveCount(1);
  }
  await expect(bottomNav.locator('a[href="/planes"]')).toHaveCount(0);
  await expect(moreButton).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(moreButton).toHaveAttribute('aria-expanded', 'false');

  await expectInsideViewport(bottomNav, 'la barra inferior');
  await expectTouchTargets(bottomNav, ':scope > a, :scope > button', 'la barra inferior');
  await expectNoDocumentOverflow(page);

  // Safari móvil no enfoca botones por un tap. Abrimos con teclado para validar
  // explícitamente el origen de foco y su restauración al cerrar con Escape.
  await moreButton.focus();
  await expect(moreButton).toBeFocused();
  await moreButton.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Más herramientas', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(moreButton).toHaveAttribute('aria-expanded', 'true');

  for (const destination of ['Repuestos', 'Plan', 'Empleados', 'Cobros', 'Inventario']) {
    await expect(dialog.getByRole('link', { name: destination, exact: true })).toBeVisible();
  }
  await expect(dialog.getByRole('link', { name: 'Reportes', exact: true })).toHaveCount(0);

  await expectInsideViewport(dialog, 'la bandeja Más herramientas');
  await expectTouchTargets(dialog, 'a[href], button', 'la bandeja Más herramientas');
  await expectNoDocumentOverflow(page);

  const focusIsInsideDialog = await dialog.evaluate((element) => element.contains(document.activeElement));
  expect(focusIsInsideDialog, 'al abrir, el foco debe ingresar al diálogo').toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(moreButton).toHaveAttribute('aria-expanded', 'false');
  await expect(moreButton).toBeFocused();

  await moreButton.click();
  const cobrosLink = dialog.getByRole('link', { name: 'Cobros', exact: true });
  await expect(cobrosLink).toHaveAttribute('href', '/caja');
  await cobrosLink.click();

  await expect(page).toHaveURL(/\/caja$/);
  await expect(page.getByRole('note', { name: 'Qué muestra Cobros' })).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(moreButton).toHaveAttribute('aria-current', 'page');
  await expectNoDocumentOverflow(page);

  await moreButton.click();
  await dialog.getByRole('link', { name: 'Inventario', exact: true }).click();

  await expect(page).toHaveURL(/\/inventario$/);
  await expect(page.getByRole('searchbox', { name: 'Buscar inventario', exact: true })).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(moreButton).toHaveAttribute('aria-current', 'page');
  await expectNoDocumentOverflow(page);
});
