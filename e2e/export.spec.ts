import { test, expect } from '@playwright/test';
import { mockApi, seedAuth } from './helpers';

test('export: el ADMIN descarga el Excel desde Dashboard y no lo ve en Plan', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);

  const expectedFilename = 'ordenfix-export-2042-03-04.xlsx';

  // Mock del endpoint binario del backend (§4.14)
  await page.route('**/api/export/excel', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="${expectedFilename}"`,
        // Content-Disposition no es un response header CORS "simple": sin
        // exponerlo, el navegador obliga al front a usar su fallback local.
        'access-control-expose-headers': 'Content-Disposition',
      },
      body: Buffer.from('PK\x03\x04 fake xlsx'),
    })
  );

  await page.goto('/dashboard');
  const botonDash = page.getByRole('button', { name: /exportar a excel/i });
  await expect(botonDash).toBeVisible();

  const dl1 = page.waitForEvent('download');
  await botonDash.click();
  expect((await dl1).suggestedFilename()).toBe(expectedFilename);

  await page.goto('/planes');
  const botonPlanes = page.getByRole('button', { name: /exportar a excel/i });
  await expect(botonPlanes).toHaveCount(0);
});
