import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test('seguimiento público: aprobar presupuesto cambia el estado a Aprobado', async ({ page }) => {
  await mockApi(page); // sin sesión: es un cliente del taller
  const escrituras: string[] = [];
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
      escrituras.push(new URL(request.url()).pathname);
    }
  });

  await page.goto('/seguimiento/ABC123');

  // El presupuesto pendiente ofrece aprobar/rechazar
  const aprobar = page.getByRole('button', { name: /aprobar presupuesto/i });
  await expect(aprobar).toBeVisible();

  const reqPromise = page.waitForRequest(
    (r) => /\/seguimiento\/ABC123\/presupuesto\/aprobar$/.test(r.url()) && r.method() === 'POST'
  );
  await aprobar.click();
  await reqPromise;

  // Tras aprobar (refetch), el badge pasa a "Aprobado" y desaparecen los botones
  // (exact: true para no chocar con el toast "¡Presupuesto aprobado!")
  await expect(page.getByText('Aprobado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /aprobar presupuesto/i })).toBeHidden();
  await expect(page.getByRole('button', { name: /^rechazar$/i })).toBeHidden();
  // La aceptación sólo registra la respuesta: no carga cobros ni inicia un checkout.
  expect(escrituras).toEqual(['/api/seguimiento/ABC123/presupuesto/aprobar']);
});

test('seguimiento público: rechazar presupuesto cambia el estado a Rechazado', async ({ page }) => {
  await mockApi(page);

  await page.goto('/seguimiento/ABC123');

  const rechazar = page.getByRole('button', { name: /^rechazar$/i });
  await expect(rechazar).toBeVisible();

  const reqPromise = page.waitForRequest(
    (r) => /\/seguimiento\/ABC123\/presupuesto\/rechazar$/.test(r.url()) && r.method() === 'POST'
  );
  await rechazar.click();
  await reqPromise;

  await expect(page.getByText('Rechazado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /aprobar presupuesto/i })).toBeHidden();
});
