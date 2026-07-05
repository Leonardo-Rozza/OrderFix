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

  // El botón está tanto en el Dashboard como en Planes
  await page.goto('/dashboard');
  const botonDash = page.getByRole('button', { name: /exportar a excel/i });
  await expect(botonDash).toBeVisible();

  const dl1 = page.waitForEvent('download');
  await botonDash.click();
  expect((await dl1).suggestedFilename()).toBe('ordenfix-export-2026-07-05.xlsx');

  await page.goto('/planes');
  const botonPlanes = page.getByRole('button', { name: /exportar a excel/i });
  await expect(botonPlanes).toBeVisible();

  const dl2 = page.waitForEvent('download');
  await botonPlanes.click();
  expect((await dl2).suggestedFilename()).toBe('ordenfix-export-2026-07-05.xlsx');
});
