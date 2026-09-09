import { expect, type Page } from '@playwright/test';
import type { Cobro, Reparacion, ResumenDigital } from '../src/types';
import { api, authenticated, matches, noHorizontalOverflow } from './helpers';

type Session = { page: Page; token: string };
type SummaryJourney = {
  owner: Session; employee: Session; other: Session; anonymousPage: Page;
  repair: Reparacion; activeCobro: Cobro;
};

const legend = 'Documento informativo. No es factura ni comprobante fiscal y no reemplaza los emitidos por ARCA.';

export const verifySummaryDocuments = async ({ owner, employee, other, anonymousPage, repair, activeCobro }: SummaryJourney) => {
  const repairPath = `/reparaciones/${repair.id}`;
  const summaryPath = `/api/reparaciones/${repair.id}/resumen-digital`;
  const trackingCode = repair.codigoSeguimiento;
  if (!trackingCode) throw new Error('La orden no tiene código de seguimiento');
  expect(repair.numeroOrden).toEqual(expect.any(String));
  expect(repair.clienteTelefono).toEqual(expect.any(String));
  expect(activeCobro).toMatchObject({
    reparacionId: repair.id, estado: 'ACTIVO', monto: 30000, metodo: 'TRANSFERENCIA', referencia: 'EXTERNO-30000',
  });

  // Igualdad estricta en toda la proyección: los aliases legacy permitidos son
  // explícitos y ningún objeto de pago puede añadir IDs, observaciones o auditoría.
  const expected = {
    numeroOrden: repair.numeroOrden, codigoSeguimiento: trackingCode, fecha: expect.any(String), estado: 'ENTREGADO',
    taller: { nombre: 'Laboratorio OrdenFix', telefono: null },
    cliente: { nombre: 'Cliente cobros', apellido: 'Prueba local', telefono: repair.clienteTelefono },
    equipo: { marca: 'Motorola', modelo: 'G31', descripcionProblema: 'No carga' },
    detalle: { repuestos: [], manoDeObra: 50000, totalRepuestos: 0 },
    importes: { total: 50000, cobrado: 30000, saldo: 20000, excedente: 0, requiereRevision: false, pagado: false },
    pagos: [{ fecha: activeCobro.fecha, monto: 30000, metodo: 'TRANSFERENCIA', referencia: 'EXTERNO-30000' }],
    datosCobro: null, documentoFiscal: false, leyenda: legend,
    reparacionId: repair.id, tallerNombre: 'Laboratorio OrdenFix', tallerTelefono: null,
    clienteNombre: 'Cliente cobros', clienteApellido: 'Prueba local', clienteTelefono: repair.clienteTelefono,
    equipoMarca: 'Motorola', equipoModelo: 'G31', descripcionProblema: 'No carga',
    repuestos: [], manoDeObra: 50000, totalRepuestos: 0,
    total: 50000, cobrado: 30000, saldo: 20000, excedente: 0, requiereRevision: false, pagado: false,
  };
  let ownerSummary: ResumenDigital | undefined;
  for (const session of [owner, employee]) {
    await session.page.goto(repairPath);
    await expect(session.page.getByLabel('Cambiar estado', { exact: true })).toHaveValue('ENTREGADO');
    const link = session.page.getByRole('link', { name: 'Resumen digital', exact: true });
    await expect(link).toHaveAttribute('href', `${repairPath}/resumen`);
    await expect(link).not.toHaveAttribute('aria-disabled', 'true');
    const responsePromise = session.page.waitForResponse((response) => matches(response.url(), summaryPath) && response.request().method() === 'GET');
    await link.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.request().headers().authorization === `Bearer ${session.token}`).toBe(true);
    const summary = await response.json() as ResumenDigital;
    expect(summary).toStrictEqual(expected);
    expect(Number.isFinite(Date.parse(summary.fecha))).toBe(true);
    if (session === owner) ownerSummary = summary;
    else expect(summary).toStrictEqual(ownerSummary);
    await expect(session.page).toHaveURL(new RegExp(`${repairPath}/resumen$`));
    await expect(session.page.getByRole('heading', { name: 'Resumen digital de la orden', exact: true })).toBeVisible();
    const amounts = session.page.getByRole('region', { name: 'Importes', exact: true });
    for (const [label, amount] of [['Total', '50.000'], ['Cobrado', '30.000'], ['Pendiente de cobro', '20.000']]) {
      await expect(amounts.getByText(label, { exact: true }).locator('..')).toContainText(amount);
    }
    const payments = session.page.getByRole('region', { name: 'Cobros registrados', exact: true });
    await expect(payments.getByText('EXTERNO-30000', { exact: true })).toBeVisible();
    await expect(payments).toContainText('No incluyen observaciones internas ni confirman acreditaciones bancarias.');
    await expect(session.page.getByRole('note', { name: 'Documento informativo', exact: true }).getByText(legend, { exact: true })).toBeVisible();
    await expect(session.page.getByRole('button', { name: /imprimir/i })).toHaveCount(0);
    await expect(session.page.getByRole('region', { name: 'Datos para cobrar', exact: true })).toHaveCount(0);
    await expect(session.page.getByRole('img', { name: /QR para pagar/ })).toHaveCount(0);
    const visibleDocument = await session.page.locator('article').innerText();
    for (const privateValue of ['Carga manual inicial', 'Importe corregido', 'Importe cargado incorrectamente', 'EXTERNO-50000']) {
      expect(JSON.stringify(summary)).not.toContain(privateValue);
      expect(visibleDocument).not.toContain(privateValue);
    }
    await noHorizontalOverflow(session.page);
    const back = session.page.getByRole('link', { name: '← Volver a la orden', exact: true });
    await expect(back).toHaveAttribute('href', repairPath);
    await back.click();
    await expect(session.page).toHaveURL(new RegExp(`${repairPath}$`));
    await expect(session.page.getByLabel('Cambiar estado', { exact: true })).toHaveValue('ENTREGADO');
  }

  // El mismo ADMIN ajeno mantiene sesión y capacidad: el 404 prueba pertenencia.
  expect((await authenticated(other.page, other.token, '/api/perfil')).status).toBe(200);
  const otherSubscription = await authenticated(other.page, other.token, '/api/suscripcion');
  expect(otherSubscription.status).toBe(200);
  expect(otherSubscription.body).toMatchObject({ funciones: { cobros: true } });
  expect((await authenticated(other.page, other.token, summaryPath)).status).toBe(404);

  await anonymousPage.goto(`${repairPath}/resumen`);
  await expect(anonymousPage).toHaveURL(/\/login$/);
  await expect(anonymousPage.getByRole('heading', { name: 'Iniciá sesión', exact: true })).toBeVisible();
  await expect(anonymousPage.getByRole('heading', { name: 'Resumen digital de la orden', exact: true })).toHaveCount(0);
  expect(await anonymousPage.evaluate(() => !JSON.parse(localStorage.getItem('ordenfix-auth') ?? '{}').state?.token)).toBe(true);
  const forbiddenPromise = anonymousPage.waitForResponse((response) => matches(response.url(), summaryPath) && response.request().method() === 'GET');
  const anonymousStatus = await anonymousPage.evaluate(async (url) => (await fetch(url, { credentials: 'omit' })).status, `${api}${summaryPath}`);
  const forbidden = await forbiddenPromise;
  // El fallback de seguridad existente responde 403 al anónimo, sin un entrypoint propio.
  expect(anonymousStatus).toBe(403);
  expect(forbidden.status()).toBe(403);
  expect(forbidden.request().headers().authorization).toBeUndefined();
  await noHorizontalOverflow(anonymousPage);

  const publicPath = `/api/seguimiento/${trackingCode}`;
  const trackingPromise = anonymousPage.waitForResponse((response) => matches(response.url(), publicPath) && response.request().method() === 'GET');
  await anonymousPage.goto(`/seguimiento/${trackingCode}`);
  const tracking = await trackingPromise;
  expect(tracking.status()).toBe(200);
  expect(tracking.request().headers().authorization).toBeUndefined();
  expect(await tracking.json()).toStrictEqual({
    codigo: trackingCode, estado: 'ENTREGADO', marca: 'Motorola', modelo: 'G31', taller: 'Laboratorio OrdenFix',
    fechaIngreso: repair.fechaIngreso, fechaEstimadaEntrega: repair.fechaEstimadaEntrega, presupuesto: null,
  });
  await expect(anonymousPage.getByRole('heading', { name: 'Motorola G31', exact: true })).toBeVisible();
  await expect(anonymousPage.getByText('Cliente cobros', { exact: false })).toHaveCount(0);
  await expect(anonymousPage.getByRole('img', { name: /Foto/ })).toHaveCount(0);
  await noHorizontalOverflow(anonymousPage);
};
