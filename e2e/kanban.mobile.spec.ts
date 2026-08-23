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

test('kanban incremental: cabe, pagina y conserva acciones alternativas al drag en móvil', async ({
  page,
  context,
}) => {
  await seedAuth(context);
  await mockApi(page, { reparaciones: reparacionesIngresadas });

  await page.goto('/reparaciones');

  const board = page.getByRole('region', { name: 'Tablero de reparaciones', exact: true });
  const ingresado = page.getByTestId('col-INGRESADO');
  const ingresoHeading = board.getByRole('heading', { name: 'Ingreso', exact: true });
  const firstPhase = ingresoHeading.locator(
    'xpath=ancestor::*[.//*[@data-testid="col-INGRESADO"]][1]',
  );
  const loadMore = ingresado.getByRole('button', {
    name: 'Cargar 20 reparaciones más en Ingresado',
    exact: true,
  });

  await expect(board).toBeVisible();
  await expect(ingresoHeading).toBeVisible();
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

  const phaseGeometry = await firstPhase.evaluate((element) => {
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
  expect(boardGeometry.scrollWidth, 'el tablero debe conservar su scroll horizontal interno').toBeGreaterThan(
    boardGeometry.clientWidth,
  );

  await loadMore.click();

  await expect(ingresado.getByText('40 de 42 visibles', { exact: true })).toBeVisible();
  await expect(ingresado.locator('[data-testid^="card-"]')).toHaveCount(40);

  const loadedCard = ingresado.getByTestId('card-22');
  await expect(loadedCard.getByRole('button', { name: /Abrir reparación ORD-2026-0022/ })).toBeVisible();
  await expect(loadedCard.getByRole('button', { name: 'Avanzar', exact: true })).toBeVisible();

  const finalDocumentWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalDocumentWidth.scrollWidth, 'la carga no debe crear overflow documental').toBeLessThanOrEqual(
    finalDocumentWidth.clientWidth + 1,
  );
});
