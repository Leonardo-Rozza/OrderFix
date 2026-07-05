import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

test('export: el ADMIN descarga el Excel de sus datos desde Planes', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);

  // Mock del endpoint binario del backend (§4.14)
  await page.route('**/api/export/excel', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': 'attachment; filename="ordenfix-export-2026-07-05.xlsx"',
      },
      body: Buffer.from('PK\x03\x04 fake xlsx'),
    })
  );

  await page.goto('/planes');

  const boton = page.getByRole('button', { name: /exportar a excel/i });
  await expect(boton).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await boton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('ordenfix-export-2026-07-05.xlsx');
});
