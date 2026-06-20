import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

const reparacion = {
  id: 1,
  equipoId: 10,
  descripcionProblema: 'No carga',
  estado: 'INGRESADO',
  precioEstimado: 1000,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
  equipoMarca: 'Apple',
  equipoModelo: 'iPhone',
  clienteId: 5,
  clienteNombre: 'Ana',
  clienteApellido: 'Gómez',
  clienteTelefono: '1',
};

test('kanban: arrastrar una tarjeta dispara el cambio de estado (drag & drop)', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { reparaciones: [reparacion] });

  await page.goto('/reparaciones');

  // Arranca en la columna "Ingresado"
  await expect(page.getByTestId('col-INGRESADO').getByTestId('card-1')).toBeVisible();

  const card = page.getByTestId('card-1');
  const destino = page.getByTestId('col-EN_PROCESO');

  const patchPromise = page.waitForRequest(
    (r) => /\/reparaciones\/1\/estado$/.test(r.url()) && r.method() === 'PATCH'
  );

  // HTML5 drag & drop: dispatch manual con un DataTransfer compartido
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await card.dispatchEvent('dragstart', { dataTransfer });
  await destino.dispatchEvent('dragover', { dataTransfer });
  await destino.dispatchEvent('drop', { dataTransfer });

  const patch = await patchPromise;
  expect(patch.postDataJSON()).toEqual({ estado: 'EN_PROCESO' });
});
