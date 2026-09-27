import { expect, test, type BrowserContext, type Page, type Request } from '@playwright/test';
import type { AuthResponse, CajaResumen, Cobro, CobrosReparacion, IngresoRapidoResponse, Perfil, Reparacion, Usuario } from '../src/types';
import {
  api, authenticated, emailFor, login, matches, noHorizontalOverflow, observeAttempt, openAndConfirm,
  password, saveEvidence, verifyAttempt, verifyNoAttemptStorage, verifySession,
} from './helpers';
import { verifySummaryDocuments } from './resumen';

const registerCollection = async (page: Page, token: string, repairId: number, monto: number, referencia: string, observaciones: string) => {
  await page.getByRole('region', { name: 'Cobros', exact: true }).getByRole('button', { name: 'Registrar cobro', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Registrar cobro', exact: true });
  await expect(modal.getByText('Registrá un pago que el taller ya recibió por fuera de OrdenFix. Esta carga no procesa ni verifica el pago.', { exact: true })).toBeVisible();
  await modal.getByLabel(/^Monto\s*\*?$/).fill(String(monto));
  await modal.getByLabel('Método', { exact: true }).selectOption('TRANSFERENCIA');
  await modal.getByLabel('Referencia (opcional)', { exact: true }).fill(referencia);
  await modal.getByLabel('Observaciones internas (opcional)', { exact: true }).fill(observaciones);
  await noHorizontalOverflow(page);
  const responsePromise = page.waitForResponse((response) => matches(response.url(), `/api/reparaciones/${repairId}/cobros`) && response.request().method() === 'POST');
  await modal.getByRole('button', { name: 'Registrar cobro', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  expect(response.request().headers().authorization === `Bearer ${token}`).toBe(true);
  expect(response.request().postDataJSON()).toEqual({
    monto, metodo: 'TRANSFERENCIA', referencia, observaciones,
    operacionId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
  });
  const collection = await response.json() as Cobro;
  expect(Number.isSafeInteger(collection.id) && collection.id > 0).toBe(true);
  expect(collection).toMatchObject({
    reparacionId: repairId, monto, metodo: 'TRANSFERENCIA', referencia, observaciones,
    estado: 'ACTIVO', anuladoAt: null, anuladoPorNombre: null, motivoAnulacion: null,
  });
  await expect(modal).not.toBeVisible();
  return collection;
};

test('empleado registra cobros externos y titular anula y corrige con historial', async ({ page, browser }, info) => {
  const email = emailFor('collections', info);
  const employeeEmail = emailFor('cobro-user', info);
  const contexts: BrowserContext[] = [];
  const isolatedPage = async () => {
    const context = await browser.newContext({ ...info.project.use, baseURL: info.project.use.baseURL });
    contexts.push(context);
    return context.newPage();
  };
  const observed: { side: string; origin: string; path: string; method: string }[] = [];
  const listeners: { context: BrowserContext; listener: (request: Request) => void }[] = [];

  try {
    const snapshot = await openAndConfirm(page, email);
    const verifyOwnerSession = verifySession(page, email);
    const registrationPromise = page.waitForResponse((response) => matches(response.url(), '/api/auth/register') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Crear taller', exact: true }).click();
    const registration = await registrationPromise;
    expect(registration.status()).toBe(201);
    const attempt = observeAttempt(registration.request());
    verifyAttempt(attempt, snapshot);
    const owner = await registration.json() as AuthResponse;
    await verifyOwnerSession();
    await verifyNoAttemptStorage(page, attempt.key);
    const profile = await authenticated<Perfil>(page, owner.token, '/api/perfil');
    expect(profile.status).toBe(200);
    expect(profile.body.usuario).toMatchObject({ email, role: 'ADMIN' });
    const ownerId = profile.body.usuario.id;
    expect(Number.isSafeInteger(ownerId) && ownerId > 0).toBe(true);
    const subscription = await authenticated(page, owner.token, '/api/suscripcion');
    expect(subscription.status).toBe(200);
    expect(subscription.body).toMatchObject({ plan: 'FREE', estado: 'TRIAL', funciones: { cobros: true, empleadosMultiples: true } });

    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Nuevo empleado', exact: true }).click();
    const employeeModal = page.getByRole('dialog', { name: 'Nuevo empleado', exact: true });
    await employeeModal.getByLabel(/^Usuario\s*\*?$/).fill('Empleado cobros');
    await employeeModal.getByLabel(/^Email\s*\*?$/).fill(employeeEmail);
    await employeeModal.getByLabel(/^Contraseña\s*\*?$/).fill(password);
    const employeePromise = page.waitForResponse((response) => matches(response.url(), '/api/usuarios') && response.request().method() === 'POST');
    await employeeModal.getByRole('button', { name: 'Crear empleado', exact: true }).click();
    const employeeResponse = await employeePromise;
    expect(employeeResponse.status()).toBe(201);
    const employee = await employeeResponse.json() as Usuario;
    expect(employee).toMatchObject({ username: 'Empleado cobros', email: employeeEmail, role: 'USER', active: true });
    expect(Number.isSafeInteger(employee.id) && employee.id > 0 && employee.id !== ownerId).toBe(true);
    await expect(employeeModal).not.toBeVisible();

    await page.goto('/reparaciones?nuevo=1');
    const repairModal = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
    await repairModal.getByLabel(/^Nombre\s*\*?$/).fill('Cliente cobros');
    await repairModal.getByLabel('Apellido', { exact: true }).fill('Prueba local');
    await repairModal.getByLabel(/^Teléfono\s*\*?$/).fill(info.project.name === 'desktop' ? '1155000401' : '1155000402');
    await repairModal.getByLabel(/^Marca\s*\*?$/).fill('Motorola');
    await repairModal.getByLabel(/^Modelo\s*\*?$/).fill('G31');
    await repairModal.getByLabel(/^Problema reportado\s*\*?$/).fill('No carga');
    await repairModal.getByLabel('Precio estimado', { exact: true }).fill('50000');
    await noHorizontalOverflow(page);
    const repairPromise = page.waitForResponse((response) => matches(response.url(), '/api/reparaciones/ingreso-rapido') && response.request().method() === 'POST');
    await repairModal.getByRole('button', { name: 'Crear reparación', exact: true }).click();
    const repairResponse = await repairPromise;
    expect(repairResponse.status()).toBe(201);
    const created = await repairResponse.json() as IngresoRapidoResponse;
    const repairId = created.reparacion.id;
    const clientId = created.clienteId;
    const equipmentId = created.equipoId;
    for (const id of [repairId, clientId, equipmentId]) expect(Number.isSafeInteger(id) && id > 0).toBe(true);
    expect(created.clienteNuevo).toBe(true);
    const repairPath = `/api/reparaciones/${repairId}`;
    const collectionsPath = `${repairPath}/cobros`;
    await expect(page).toHaveURL(new RegExp(`/reparaciones/${repairId}$`));
    await expect(repairModal).not.toBeVisible();
    for (const state of ['EN_PROCESO', 'COMPLETADO', 'ENTREGADO']) {
      const statePromise = page.waitForResponse((response) => matches(response.url(), `${repairPath}/estado`) && response.request().method() === 'PATCH');
      await page.getByLabel('Cambiar estado', { exact: true }).selectOption(state);
      const changed = await statePromise;
      expect(changed.status()).toBe(200);
      expect(await changed.json()).toMatchObject({ estado: state, total: 50000, cobrado: 0, saldo: 50000, estadoPago: 'SIN_COBRAR' });
      await expect(page.getByLabel('Cambiar estado', { exact: true })).toHaveValue(state);
      await expect(page.getByLabel('Cambiar estado', { exact: true })).toBeEnabled();
    }
    const deliveredBeforeCollections = await authenticated<Reparacion>(page, owner.token, repairPath);
    expect(deliveredBeforeCollections.status).toBe(200);
    expect(deliveredBeforeCollections.body).toMatchObject({ estado: 'ENTREGADO', cobrado: 0, saldo: 50000, fechaConformidadEntrega: expect.any(String) });
    const emptyCollections = await authenticated<CobrosReparacion>(page, owner.token, collectionsPath);
    expect(emptyCollections.status).toBe(200);
    expect(emptyCollections.body).toMatchObject({ total: 50000, cobrado: 0, saldo: 50000, cobros: [] });

    const employeePage = await isolatedPage();
    const employeeSession = await login(employeePage, employeeEmail);
    expect(employeeSession.profile.usuario).toMatchObject({ id: employee.id, role: 'USER' });
    expect(employeeSession.profile.taller.id).toBe(profile.body.taller.id);
    const otherPage = await isolatedPage();
    const other = await login(otherPage, 'browser-baseline@ordenfix-e2e.test', 'Browser-baseline-synthetic-123');
    const otherOwnerId = other.profile.usuario.id;
    expect(other.profile.usuario.role).toBe('ADMIN');
    expect(Number.isSafeInteger(otherOwnerId) && otherOwnerId > 0 && otherOwnerId !== ownerId).toBe(true);
    expect(other.profile.taller.id).not.toBe(profile.body.taller.id);
    const otherSubscription = await authenticated(otherPage, other.token, '/api/suscripcion');
    expect(otherSubscription.status).toBe(200);
    expect(otherSubscription.body).toMatchObject({ plan: 'PRO', funciones: { cobros: true } });
    expect((await authenticated(otherPage, other.token, '/api/caja')).status).toBe(200);

    // Setup y sesiones ya concluyeron. El tramo observado permite únicamente
    // altas y anulaciones manuales canónicas, incluidos los intentos rechazados.
    for (const [side, context] of [['owner', page.context()], ['employee', employeePage.context()], ['other', otherPage.context()]] as const) {
      const listener = (request: Request) => {
        const url = new URL(request.url());
        observed.push({ side, origin: url.origin, path: url.pathname, method: request.method() });
      };
      context.on('request', listener);
      listeners.push({ context, listener });
    }
    await employeePage.goto(`/reparaciones/${repairId}`);
    const employeeCollections = employeePage.getByRole('region', { name: 'Cobros', exact: true });
    await expect(employeeCollections.getByRole('button', { name: 'Registrar cobro', exact: true })).toBeEnabled();
    const ownBefore = await authenticated<CobrosReparacion>(employeePage, employeeSession.token, collectionsPath);
    expect(ownBefore.status).toBe(200);
    expect(ownBefore.body).toMatchObject({ total: 50000, cobrado: 0, saldo: 50000, cobros: [] });
    const original = await registerCollection(employeePage, employeeSession.token, repairId, 50000, 'EXTERNO-50000', 'Carga manual inicial');
    const originalCobroId = original.id;
    const annulPath = `${collectionsPath}/${originalCobroId}/anulacion`;
    await expect(employeeCollections.getByText('Cobro completo registrado', { exact: true })).toBeVisible();
    await expect(employeeCollections.getByRole('button', { name: /^Anular cobro/ })).toHaveCount(0);
    const paid = await authenticated<CobrosReparacion>(employeePage, employeeSession.token, collectionsPath);
    expect(paid.status).toBe(200);
    expect(paid.body).toMatchObject({ total: 50000, cobrado: 50000, saldo: 0, pagado: true });
    expect(paid.body.cobros).toHaveLength(1);
    expect(paid.body.cobros[0]).toMatchObject({ id: originalCobroId, monto: 50000, estado: 'ACTIVO', referencia: 'EXTERNO-50000' });
    const paidRepair = await authenticated<Reparacion>(employeePage, employeeSession.token, repairPath);
    expect(paidRepair.status).toBe(200);
    expect(paidRepair.body).toMatchObject({ estado: 'ENTREGADO', cobrado: 50000, saldo: 0, estadoPago: 'PAGADO' });
    await noHorizontalOverflow(employeePage);

    expect((await authenticated(employeePage, employeeSession.token, annulPath, 'POST', { motivo: 'Intento empleado' })).status).toBe(403);
    expect((await authenticated(otherPage, other.token, collectionsPath)).status).toBe(404);
    expect((await authenticated(otherPage, other.token, annulPath, 'POST', { motivo: 'Intento ajeno' })).status).toBe(404);
    const unchanged = await authenticated<CobrosReparacion>(employeePage, employeeSession.token, collectionsPath);
    expect(unchanged.status).toBe(200);
    expect(unchanged.body).toEqual(paid.body);

    await page.reload();
    const ownerCollections = page.getByRole('region', { name: 'Cobros', exact: true });
    await ownerCollections.getByRole('button', { name: /^Anular cobro de/ }).click();
    const annulModal = page.getByRole('dialog', { name: 'Anular cobro', exact: true });
    await expect(annulModal.getByText('El movimiento se conservará en el historial de la orden.', { exact: false })).toBeVisible();
    await annulModal.getByLabel(/^Motivo de anulación\s*\*?$/).fill('Importe cargado incorrectamente');
    await noHorizontalOverflow(page);
    const annulPromise = page.waitForResponse((response) => matches(response.url(), annulPath) && response.request().method() === 'POST');
    await annulModal.getByRole('button', { name: 'Anular cobro', exact: true }).click();
    const annulledResponse = await annulPromise;
    expect(annulledResponse.status()).toBe(200);
    expect(annulledResponse.request().headers().authorization === `Bearer ${owner.token}`).toBe(true);
    expect(annulledResponse.request().postDataJSON()).toEqual({ motivo: 'Importe cargado incorrectamente' });
    expect(await annulledResponse.json()).toMatchObject({
      id: originalCobroId, monto: 50000, referencia: 'EXTERNO-50000', estado: 'ANULADO',
      anuladoAt: expect.any(String), anuladoPorNombre: 'Prueba local', motivoAnulacion: 'Importe cargado incorrectamente',
    });
    await expect(annulModal).not.toBeVisible();
    const annulled = await authenticated<CobrosReparacion>(page, owner.token, collectionsPath);
    expect(annulled.status).toBe(200);
    expect(annulled.body).toMatchObject({ total: 50000, cobrado: 0, saldo: 50000, pagado: false });
    expect(annulled.body.cobros).toHaveLength(1);
    const annulledOriginal = annulled.body.cobros[0];
    expect(annulledOriginal).toMatchObject({
      id: originalCobroId, monto: 50000, referencia: 'EXTERNO-50000', estado: 'ANULADO',
      anuladoAt: expect.any(String), anuladoPorNombre: 'Prueba local', motivoAnulacion: 'Importe cargado incorrectamente',
    });
    const repeat = await authenticated(page, owner.token, annulPath, 'POST', { motivo: 'Intento repetido' });
    expect(repeat.status).toBe(409);
    expect(repeat.body).toMatchObject({ code: 'COBRO_YA_ANULADO' });
    // Ambos snapshots provienen de GET persistidos, con la misma precisión de PG.
    const afterRepeat = await authenticated<CobrosReparacion>(page, owner.token, collectionsPath);
    expect(afterRepeat.status).toBe(200);
    expect(afterRepeat.body).toEqual(annulled.body);

    const corrected = await registerCollection(page, owner.token, repairId, 30000, 'EXTERNO-30000', 'Importe corregido');
    const correctedCobroId = corrected.id;
    expect(correctedCobroId).not.toBe(originalCobroId);
    const finalCollections = await authenticated<CobrosReparacion>(page, owner.token, collectionsPath);
    expect(finalCollections.status).toBe(200);
    expect(finalCollections.body).toMatchObject({ total: 50000, cobrado: 30000, saldo: 20000, pagado: false });
    expect(finalCollections.body.cobros).toHaveLength(2);
    expect(finalCollections.body.cobros.find((collection) => collection.id === originalCobroId)).toEqual(annulledOriginal);
    expect(finalCollections.body.cobros.find((collection) => collection.id === correctedCobroId)).toMatchObject({
      monto: 30000, metodo: 'TRANSFERENCIA', referencia: 'EXTERNO-30000', observaciones: 'Importe corregido', estado: 'ACTIVO',
    });
    const finalRepair = await authenticated<Reparacion>(page, owner.token, repairPath);
    expect(finalRepair.status).toBe(200);
    expect(finalRepair.body).toMatchObject({
      estado: 'ENTREGADO', total: 50000, cobrado: 30000, saldo: 20000, estadoPago: 'PARCIAL',
      fechaConformidadEntrega: deliveredBeforeCollections.body.fechaConformidadEntrega,
    });
    for (const viewer of [page, employeePage]) {
      if (viewer === employeePage) await viewer.reload();
      const region = viewer.getByRole('region', { name: 'Cobros', exact: true });
      const originalRow = region.getByText('EXTERNO-50000', { exact: true }).locator('xpath=../../..');
      const correctedRow = region.getByText('EXTERNO-30000', { exact: true }).locator('xpath=../../..');
      await expect(originalRow.getByText('Anulado', { exact: true })).toBeVisible();
      await expect(originalRow).toContainText(/50\.000/);
      await expect(originalRow).toContainText('Importe cargado incorrectamente');
      await expect(originalRow).toContainText('Prueba local');
      await expect(correctedRow).toContainText(/30\.000/);
      await expect(correctedRow.getByText('Anulado', { exact: true })).toHaveCount(0);
      await expect(region.getByText('Cobro completo registrado', { exact: true })).toHaveCount(0);
      await expect(region.getByRole('button', { name: /^Anular cobro/ })).toHaveCount(viewer === page ? 1 : 0);
      await expect(viewer.getByLabel('Cambiar estado', { exact: true })).toHaveValue('ENTREGADO');
      await noHorizontalOverflow(viewer);
    }

    const originalDate = annulledOriginal.fecha.slice(0, 10);
    const correctedDate = finalCollections.body.cobros.find((collection) => collection.id === correctedCobroId)!.fecha.slice(0, 10);
    expect(originalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(correctedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const desde = [originalDate, correctedDate].sort()[0];
    const hasta = [originalDate, correctedDate].sort()[1];
    const cajaPromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.origin === api && url.pathname === '/api/caja' && url.searchParams.get('desde') === desde
        && url.searchParams.get('hasta') === hasta && response.request().method() === 'GET';
    });
    await page.goto(`/caja?desde=${desde}&hasta=${hasta}`);
    const cajaResponse = await cajaPromise;
    expect(cajaResponse.status()).toBe(200);
    const caja = await cajaResponse.json() as CajaResumen;
    expect(caja).toMatchObject({ desde, hasta, totalCobrado: 30000, cantidad: 1, porMetodo: { TRANSFERENCIA: 30000 } });
    expect(caja.cobros).toHaveLength(1);
    expect(caja.cobros[0]).toMatchObject({ id: correctedCobroId, reparacionId: repairId, monto: 30000, referencia: 'EXTERNO-30000', estado: 'ACTIVO' });
    await expect(page.getByRole('textbox', { name: 'Desde', exact: true })).toHaveValue(desde.split('-').reverse().join('/'));
    await expect(page.getByRole('textbox', { name: 'Hasta', exact: true })).toHaveValue(hasta.split('-').reverse().join('/'));
    const cajaRegion = page.getByRole('region', { name: 'Cobros registrados', exact: true });
    await expect(cajaRegion.getByText('EXTERNO-30000', { exact: true })).toBeVisible();
    await expect(cajaRegion.getByText('EXTERNO-50000', { exact: true })).toHaveCount(0);
    const scopeNote = page.getByRole('note', { name: 'Qué muestra Cobros', exact: true });
    await expect(scopeNote).toContainText('No es un balance contable');
    await expect(scopeNote).toContainText('ni confirma acreditaciones reales');
    await noHorizontalOverflow(page);

    const anonymousPage = await isolatedPage();
    const anonymousContext = anonymousPage.context();
    const observeAnonymous = (request: Request) => {
      const url = new URL(request.url());
      observed.push({ side: 'anonymous', origin: url.origin, path: url.pathname, method: request.method() });
    };
    anonymousContext.on('request', observeAnonymous);
    listeners.push({ context: anonymousContext, listener: observeAnonymous });
    const documentsStart = observed.length;
    expect(observed.filter((request) => request.path.endsWith('/resumen-digital'))).toEqual([]);
    await verifySummaryDocuments({
      owner: { page, token: owner.token }, employee: { page: employeePage, token: employeeSession.token },
      other: { page: otherPage, token: other.token }, anonymousPage, repair: finalRepair.body,
      activeCobro: finalCollections.body.cobros.find((collection) => collection.id === correctedCobroId)!,
    });
    const documentRequests = observed.slice(documentsStart);
    expect(documentRequests.filter((request) => /\/(?:recibo|qr)(?:\/|$)/i.test(request.path))).toEqual([]);

    expect(observed.filter((request) => !['GET', 'HEAD', 'OPTIONS'].includes(request.method))).toEqual([
      { side: 'employee', origin: api, path: collectionsPath, method: 'POST' },
      { side: 'employee', origin: api, path: annulPath, method: 'POST' },
      { side: 'other', origin: api, path: annulPath, method: 'POST' },
      { side: 'owner', origin: api, path: annulPath, method: 'POST' },
      { side: 'owner', origin: api, path: annulPath, method: 'POST' },
      { side: 'owner', origin: api, path: collectionsPath, method: 'POST' },
    ]);
    expect(observed.filter((request) => request.path.startsWith('/api/') && /\/(?:pagos|checkout)(?:\/|$)/i.test(request.path))).toEqual([]);
    expect(observed.filter((request) => /mercadopago|paypal|stripe/i.test(request.origin))).toEqual([]);
    saveEvidence({
      case: 'collections', project: info.project.name, email,
      requiredSetRevision: attempt.body.requiredSetRevision, acceptances: attempt.body.aceptacionesLegales, idempotencyKey: attempt.key,
      ownerId, employee: { id: employee.id, email: employeeEmail }, otherOwnerId,
      clientId, equipmentId, repairId, originalCobroId, correctedCobroId,
    });
  } finally {
    for (const { context, listener } of listeners) context.off('request', listener);
    await Promise.all(contexts.map((context) => context.close()));
  }
});
