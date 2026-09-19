import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test('seguimiento público: el nombre completo del taller se ajusta sin desbordar', async ({ page }) => {
  const taller = 'ServicioTecnico'.repeat(9).slice(0, 120);
  await mockApi(page, {
    seguimiento: {
      codigo: 'ABC123',
      estado: 'PRESUPUESTADO',
      marca: 'Samsung',
      modelo: 'S21',
      taller,
      fechaIngreso: '2026-09-01',
      fechaEstimadaEntrega: null,
      presupuesto: {
        id: 1, reparacionId: 1, estado: 'PENDIENTE', tipo: 'ORIGINAL',
        items: [{ descripcion: 'Reparación de pantalla', cantidad: 1, precioUnitario: 12000 }],
        total: 12000, observaciones: null, fechaRespuesta: null, createdAt: '2026-09-01T12:00:00',
      },
    },
  });

  await page.goto('/seguimiento/ABC123');
  await expect(page.getByRole('heading', { name: 'Samsung S21' })).toBeVisible();
  const nombre = page.getByText(taller, { exact: true });
  await expect(nombre).toBeVisible();
  await expect(page.getByRole('button', { name: /aprobar presupuesto/i })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const geometry = await nombre.evaluate((element) => {
    const text = document.createRange();
    text.selectNodeContents(element);
    const container = element.getBoundingClientRect();
    return {
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      textFits: Array.from(text.getClientRects()).every((rect) => (
        rect.left >= container.left - 1 && rect.right <= container.right + 1
      )),
    };
  });
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.textFits).toBe(true);
  const trackingCode = page.getByRole('term').filter({ hasText: 'Código de seguimiento' }).locator('..');
  await expect(trackingCode.getByRole('definition')).toHaveText('ABC123');
  const codeFits = await trackingCode.evaluate((element) => {
    const container = element.getBoundingClientRect();
    return Array.from(element.children).every((child) => {
      const rect = child.getBoundingClientRect();
      return rect.left >= container.left - 1 && rect.right <= container.right + 1;
    });
  });
  expect(codeFits).toBe(true);
});
