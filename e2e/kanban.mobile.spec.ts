import { expect, test } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const reparacionesIngresadas = Array.from({ length: 42 }, (_, index) => {
  const id = index + 1;

  return {
    id,
    equipoId: 100 + id,
    descripcionProblema: `Falla de prueba ${id}`,
    estado: 'INGRESADO',
    precioEstimado: 1_000 + id,
    precioFinal: null,
    fechaIngreso: null,
    fechaEstimadaEntrega: null,
    fechaEntrega: null,
    numeroOrden: `ORD-2026-${String(id).padStart(4, '0')}`,
    equipoMarca: 'Marca',
    equipoModelo: `Equipo ${id}`,
    clienteId: 5,
    clienteNombre: 'Ana',
    clienteApellido: 'Gómez',
    clienteTelefono: '1155550000',
  };
});

test('etapas en móvil: vista explícita, sin scroll horizontal, carga incremental y acciones de estado', async ({
  page,
  context,
}) => {
  await seedAuth(context);
  await mockApi(page, { reparaciones: reparacionesIngresadas });

  await page.goto('/reparaciones?vista=board');

  const board = page.getByRole('region', { name: 'Reparaciones por etapas', exact: true });
  const ingresado = page.getByTestId('col-INGRESADO');
  const phases = page.getByRole('group', { name: 'Etapas de reparación', exact: true });
  const loadMore = ingresado.getByRole('button', {
    name: 'Cargar 20 reparaciones más en Ingresado',
    exact: true,
  });

  await expect(board).toBeVisible();
  await expect(phases.getByRole('button')).toHaveCount(6);
  await expect(phases.getByRole('button', { name: /^Ingreso\b/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/reparaciones\?vista=board$/);
  await expect(ingresado.getByText('20 de 42 visibles', { exact: true })).toBeVisible();
  await loadMore.scrollIntoViewIfNeeded();
  await expect(loadMore).toBeInViewport();
  await expect(loadMore).toHaveText('Cargar 20 más');

  const geometry = await page.evaluate(() => ({
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(geometry.documentScrollWidth, 'el documento no debe desbordar horizontalmente').toBeLessThanOrEqual(
    geometry.documentClientWidth + 1,
  );

  const phaseGeometry = await ingresado.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width };
  });
  expect(phaseGeometry.left, 'la primera fase debe empezar dentro del viewport').toBeGreaterThanOrEqual(-1);
  expect(phaseGeometry.right, 'la primera fase debe entrar completa').toBeLessThanOrEqual(
    geometry.viewportWidth + 1,
  );
  expect(phaseGeometry.width, 'la primera fase no debe ser más ancha que el viewport').toBeLessThanOrEqual(
    geometry.viewportWidth,
  );

  const buttonGeometry = await loadMore.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      height: Math.round(rect.height),
    };
  });
  expect(buttonGeometry.left, 'el botón debe empezar dentro del viewport').toBeGreaterThanOrEqual(-1);
  expect(buttonGeometry.right, 'el botón debe terminar dentro del viewport').toBeLessThanOrEqual(
    geometry.viewportWidth + 1,
  );
  expect(buttonGeometry.height, 'el botón debe ofrecer al menos 44 px táctiles').toBeGreaterThanOrEqual(44);

  const boardGeometry = await board.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(boardGeometry.scrollWidth, 'las etapas no necesitan scroll horizontal interno').toBeLessThanOrEqual(
    boardGeometry.clientWidth + 1,
  );

  await loadMore.click();

  await expect(ingresado.getByText('40 de 42 visibles', { exact: true })).toBeVisible();
  await expect(ingresado.locator('[data-testid^="card-"]')).toHaveCount(40);

  const loadedCard = ingresado.getByTestId('card-22');
  await expect(loadedCard.getByRole('button', { name: /Abrir reparación ORD-2026-0022/ })).toBeVisible();
  await expect(loadedCard.getByRole('button', { name: 'Avanzar', exact: true })).toBeVisible();
  await expect(loadedCard.getByRole('button', { name: 'Cambiar estado de ORD-2026-0022', exact: true })).toBeVisible();

  const finalDocumentWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalDocumentWidth.scrollWidth, 'la carga no debe crear overflow documental').toBeLessThanOrEqual(
    finalDocumentWidth.clientWidth + 1,
  );
});
