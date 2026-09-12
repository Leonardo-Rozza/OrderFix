import { test, expect } from '@playwright/test';
import { futureToken, mockApi, seedAuth } from './helpers';

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
  await expect(botonDash).toHaveAttribute('title', 'Descargar clientes, órdenes, cobros y presupuestos del taller');

  const dl1 = page.waitForEvent('download');
  await botonDash.click();
  expect((await dl1).suggestedFilename()).toBe(expectedFilename);

  await page.goto('/planes');
  const botonPlanes = page.getByRole('button', { name: /exportar a excel/i });
  await expect(botonPlanes).toHaveCount(0);
});

test('export: el empleado no tiene la acción de descarga', async ({ page, context }) => {
  await seedAuth(context, futureToken('ROLE_USER'), 'empleado@taller.invalid');
  await mockApi(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /buen|hola|inicio/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /exportar a excel/i })).toHaveCount(0);
});

test('export: un error JSON binario informa una sola vez y permite reintentar', async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page);
  await page.route('**/api/export/excel', (route) => route.fulfill({
    status: 409,
    json: { message: 'No se pudo preparar el archivo. Volvé a intentar.' },
  }));
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /exportar a excel/i }).click();

  await expect(page.getByText('No se pudo preparar el archivo. Volvé a intentar.', { exact: true })).toHaveCount(1);
  await expect(page.getByText('No se pudo obtener la información.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /exportar a excel/i })).toBeEnabled();
});
