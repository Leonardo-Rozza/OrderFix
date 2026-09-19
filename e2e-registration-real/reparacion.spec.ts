import { expect, test, type BrowserContext, type Page, type Request } from '@playwright/test';
import type { EstadoReparacion, IngresoRapidoResponse, Presupuesto, Reparacion, Seguimiento, Suscripcion } from '../src/types';
import { api, authenticated, emailFor, login, matches, noHorizontalOverflow, saveEvidence } from './helpers';

type ObservedRequest = {
  side: 'owner' | 'public'; origin: string; path: string; method: string; hasAuthorization: boolean;
};

const unpaid = {
  precioEstimado: 50000, precioFinal: null, total: 50000, cobrado: 0, saldo: 50000, estadoPago: 'SIN_COBRAR',
};

const noCollectionsUi = async (page: Page) => {
  await expect(page.getByRole('region', { name: 'Cobros', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Registrar cobro', exact: true })).toHaveCount(0);
};

for (const action of ['aprobar', 'rechazar'] as const) {
  const approved = action === 'aprobar';
  const expectedBudgetState = approved ? 'APROBADO' : 'RECHAZADO';
  const expectedRepairState = approved ? 'EN_PROCESO' : 'LISTO_SIN_REPARAR';

  test(`FREE entrega una reparación con presupuesto ${approved ? 'aprobado' : 'rechazado'} sin cobros`, async ({ page, browser }, info) => {
    const email = emailFor('repair-free', info);
    const session = await login(page, email);
    expect(session.profile).toMatchObject({
      usuario: { username: 'Titular reparaciones', email, role: 'ADMIN' }, taller: { nombre: 'Taller sin cobros' },
    });
    const ownerId = session.profile.usuario.id;
    expect(Number.isSafeInteger(ownerId) && ownerId > 0).toBe(true);

    // El login ya terminó; desde aquí se observan todas las solicitudes de ambos
    // contextos, conservando sólo ruta/método y presencia de autenticación.
    const requests: ObservedRequest[] = [];
    const observe = (side: ObservedRequest['side']) => (request: Request) => {
      const url = new URL(request.url());
      requests.push({
        side, origin: url.origin, path: url.pathname, method: request.method(),
        hasAuthorization: request.headers().authorization !== undefined,
      });
    };
    const observeOwner = observe('owner');
    const observePublic = observe('public');
    page.context().on('request', observeOwner);
    let publicContext: BrowserContext | undefined;

    try {
      const subscription = await authenticated<Suscripcion>(page, session.token, '/api/suscripcion');
      expect(subscription.status).toBe(200);
      expect(subscription.body).toMatchObject({
        plan: 'FREE', estado: 'ACTIVA', funciones: { cobros: false }, limiteReparacionesMes: 25,
      });
      const previousCount = subscription.body.reparacionesEsteMes;
      expect(Number.isSafeInteger(previousCount) && previousCount >= 0 && previousCount < 25).toBe(true);
      const phone = info.project.name === 'desktop'
        ? (approved ? '1155000201' : '1155000202')
        : (approved ? '1155000301' : '1155000302');

      await page.goto('/reparaciones?nuevo=1');
      const repairModal = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
      await repairModal.getByLabel(/^Nombre/).fill('Cliente recorrido');
      await repairModal.getByLabel('Apellido', { exact: true }).fill('Prueba local');
      await repairModal.getByLabel(/^Teléfono/).fill(phone);
      await repairModal.getByLabel(/^Marca/).fill('Motorola');
      await repairModal.getByLabel(/^Modelo/).fill('G31');
      await repairModal.getByLabel(/^Problema reportado/).fill('No carga');
      await repairModal.getByLabel('Precio estimado', { exact: true }).fill('50000');
      await noHorizontalOverflow(page);
      const creationPromise = page.waitForResponse((response) => matches(response.url(), '/api/reparaciones/ingreso-rapido') && response.request().method() === 'POST');
      await repairModal.getByRole('button', { name: 'Crear reparación', exact: true }).click();
      const creation = await creationPromise;
      expect(creation.status()).toBe(201);
      expect(creation.request().postDataJSON()).toEqual({
        clienteNombre: 'Cliente recorrido', clienteApellido: 'Prueba local', clienteTelefono: phone,
        equipoMarca: 'Motorola', equipoModelo: 'G31', descripcionProblema: 'No carga', precioEstimado: 50000,
      });
      const created = await creation.json() as IngresoRapidoResponse;
      const repairId = created.reparacion.id;
      const clientId = created.clienteId;
      const equipmentId = created.equipoId;
      for (const id of [repairId, clientId, equipmentId]) expect(Number.isSafeInteger(id) && id > 0).toBe(true);
      expect(created.clienteNuevo).toBe(true);
      expect(created.reparacion).toMatchObject({
        id: repairId, equipoId: equipmentId, estado: 'INGRESADO', descripcionProblema: 'No carga', ...unpaid,
      });
      const trackingCode = created.reparacion.codigoSeguimiento;
      if (!trackingCode) throw new Error('La reparación creada no tiene código de seguimiento');
      await expect(page).toHaveURL(new RegExp(`/reparaciones/${repairId}$`));
      await expect(repairModal).not.toBeVisible();
      await expect(page.getByLabel('Cambiar estado', { exact: true })).toHaveValue('INGRESADO');
      await noCollectionsUi(page);
      await noHorizontalOverflow(page);

      const budgets = page.getByRole('region', { name: 'Presupuestos', exact: true });
      await budgets.getByRole('button', { name: 'Nuevo', exact: true }).click();
      const budgetModal = page.getByRole('dialog', { name: 'Nuevo presupuesto', exact: true });
      await budgetModal.getByLabel('Detalle', { exact: true }).fill('Reparacion de carga');
      await expect(budgetModal.getByLabel('Cantidad', { exact: true })).toHaveValue('1');
      await budgetModal.getByLabel('Precio unitario', { exact: true }).fill('50000');
      await expect(budgetModal.getByLabel('Tipo de ítem', { exact: true })).toHaveValue('MANO_DE_OBRA');
      await expect(budgetModal.getByLabel('Tipo', { exact: true })).toHaveValue('ORIGINAL');
      await expect(budgetModal.getByLabel('Validez (días)', { exact: true })).toHaveValue('7');
      await noHorizontalOverflow(page);
      const budgetPath = `/api/reparaciones/${repairId}/presupuestos`;
      const budgetPromise = page.waitForResponse((response) => matches(response.url(), budgetPath) && response.request().method() === 'POST');
      await budgetModal.getByRole('button', { name: 'Crear presupuesto', exact: true }).click();
      const budgetResponse = await budgetPromise;
      expect(budgetResponse.status()).toBe(201);
      expect(budgetResponse.request().postDataJSON()).toEqual({
        items: [{ descripcion: 'Reparacion de carga', cantidad: 1, precioUnitario: 50000, tipoItem: 'MANO_DE_OBRA' }],
        tipo: 'ORIGINAL', validezDias: 7,
      });
      const budget = await budgetResponse.json() as Presupuesto;
      const budgetId = budget.id;
      expect(Number.isSafeInteger(budgetId) && budgetId > 0).toBe(true);
      expect(budget).toMatchObject({
        reparacionId: repairId, estado: 'PENDIENTE', tipo: 'ORIGINAL', total: 50000,
        manoDeObraTotal: 50000, repuestosTotal: 0, validezDias: 7, observaciones: null,
      });
      await expect(budgetModal).not.toBeVisible();
      await expect(page.getByLabel('Cambiar estado', { exact: true })).toHaveValue('PRESUPUESTADO');
      await noCollectionsUi(page);

      const trackingLink = page.getByRole('link', { name: 'Ver página →', exact: true });
      const href = await trackingLink.getAttribute('href');
      expect(href).toBe(`/seguimiento/${trackingCode}`);
      const trackingUrl = new URL(href!, page.url());
      expect(trackingUrl.origin).toBe(new URL(page.url()).origin);
      publicContext = await browser.newContext({ ...info.project.use, baseURL: info.project.use.baseURL });
      publicContext.on('request', observePublic);
      const publicPage = await publicContext.newPage();
      const trackingPath = `/api/seguimiento/${trackingCode}`;
      const trackingPromise = publicPage.waitForResponse((response) => matches(response.url(), trackingPath) && response.request().method() === 'GET');
      await publicPage.goto(trackingUrl.href);
      const trackingResponse = await trackingPromise;
      expect(trackingResponse.status()).toBe(200);
      expect(trackingResponse.request().headers().authorization).toBeUndefined();
      expect(await trackingResponse.json()).toMatchObject({
        codigo: trackingCode, estado: 'PRESUPUESTADO', marca: 'Motorola', modelo: 'G31', taller: 'Taller sin cobros',
        presupuesto: { id: budgetId, estado: 'PENDIENTE', total: 50000 },
      });
      expect(await publicPage.evaluate(() => !JSON.parse(localStorage.getItem('ordenfix-auth') ?? '{}').state?.token)).toBe(true);
      await expect(publicPage.getByRole('heading', { name: 'Motorola G31', exact: true })).toBeVisible();
      await noHorizontalOverflow(publicPage);
      const answerPath = `${trackingPath}/presupuesto/${action}`;
      const answerPromise = publicPage.waitForResponse((response) => matches(response.url(), answerPath) && response.request().method() === 'POST');
      const answeredTrackingPromise = publicPage.waitForResponse((response) => matches(response.url(), trackingPath) && response.request().method() === 'GET');
      await publicPage.getByRole('button', { name: approved ? 'Aprobar presupuesto' : 'Rechazar', exact: true }).click();
      const answer = await answerPromise;
      expect(answer.status()).toBe(200);
      expect(answer.request().headers().authorization).toBeUndefined();
      const answeredTracking = await answeredTrackingPromise;
      expect(answeredTracking.status()).toBe(200);
      expect(await answeredTracking.json()).toMatchObject({
        codigo: trackingCode, estado: expectedRepairState,
        presupuesto: { id: budgetId, estado: expectedBudgetState, total: 50000 },
      });
      await expect(publicPage.getByRole('button', { name: 'Aprobar presupuesto', exact: true })).toHaveCount(0);
      await expect(publicPage.getByRole('button', { name: 'Rechazar', exact: true })).toHaveCount(0);
      await noHorizontalOverflow(publicPage);

      // La respuesta pública ocurrió en otro contexto: la ficha se vuelve a leer
      // del servidor antes de ejecutar las transiciones permitidas desde la UI.
      const repairPath = `/api/reparaciones/${repairId}`;
      const refreshedPromise = page.waitForResponse((response) => matches(response.url(), repairPath) && response.request().method() === 'GET');
      await page.reload();
      const refreshed = await refreshedPromise;
      expect(refreshed.status()).toBe(200);
      expect(await refreshed.json()).toMatchObject({ id: repairId, estado: expectedRepairState, ...unpaid });
      await expect(page.getByLabel('Cambiar estado', { exact: true })).toHaveValue(expectedRepairState);
      await noCollectionsUi(page);
      const transitions: EstadoReparacion[] = approved ? ['COMPLETADO', 'ENTREGADO'] : ['ENTREGADO'];
      for (const state of transitions) {
        const fromStages = state === transitions[0];
        if (fromStages) {
          const phase = approved ? 'EN_TRABAJO' : 'LISTO';
          await page.goto(`/reparaciones?vista=board&etapa=${phase}&q=${phone}`);
          const card = page.getByTestId(`col-${expectedRepairState}`).getByTestId(`card-${repairId}`);
          await expect(card).toBeVisible();
          await expect(page.getByRole('searchbox', { name: 'Buscar reparaciones', exact: true })).toHaveValue(phone);
          await noHorizontalOverflow(page);
          await card.getByRole('button', { name: /^Cambiar estado de / }).click();
          await page.getByRole('dialog', { name: 'Cambiar estado', exact: true })
            .getByRole('combobox', { name: 'Nuevo estado', exact: true }).selectOption(state);
        }
        const statePromise = page.waitForResponse((response) => matches(response.url(), `${repairPath}/estado`) && response.request().method() === 'PATCH');
        if (fromStages) {
          await page.getByRole('dialog', { name: 'Cambiar estado', exact: true })
            .getByRole('button', { name: 'Guardar estado', exact: true }).click();
        } else {
          await page.getByLabel('Cambiar estado', { exact: true }).selectOption(state);
        }
        const changed = await statePromise;
        expect(changed.status()).toBe(200);
        expect(changed.request().postDataJSON()).toEqual({ estado: state });
        expect(await changed.json()).toMatchObject({ id: repairId, estado: state, ...unpaid });
        if (fromStages) {
          await expect(page.getByRole('dialog', { name: 'Cambiar estado', exact: true })).toBeHidden();
          const phases = page.getByRole('group', { name: 'Etapas de reparación', exact: true });
          await expect(phases.getByRole('button', { name: approved ? /^En trabajo:/ : /^Listo:/ }))
            .toHaveAttribute('aria-pressed', 'true');
          await page.getByRole('status').getByRole('button', {
            name: state === 'COMPLETADO' ? 'Ver Listo' : 'Ver Cerradas', exact: true,
          }).click();
          await page.getByTestId(`col-${state}`).getByTestId(`card-${repairId}`)
            .getByRole('button', { name: /^Abrir reparación / }).click();
          await expect(page).toHaveURL(new RegExp(`/reparaciones/${repairId}$`));
        }
        await expect(page.getByLabel('Cambiar estado', { exact: true })).toHaveValue(state);
        await expect(page.getByLabel('Cambiar estado', { exact: true })).toBeEnabled();
        await noCollectionsUi(page);
        await noHorizontalOverflow(page);
      }

      const delivered = await authenticated<Reparacion>(page, session.token, repairPath);
      expect(delivered.status).toBe(200);
      expect(delivered.body).toMatchObject({
        id: repairId, equipoId: equipmentId, clienteId: clientId, estado: 'ENTREGADO',
        garantiaDias: 90, fechaConformidadEntrega: expect.any(String),
        garantiaInicio: expect.any(String), garantiaFin: expect.any(String), ...unpaid,
      });
      const finalSubscription = await authenticated<Suscripcion>(page, session.token, '/api/suscripcion');
      expect(finalSubscription.status).toBe(200);
      expect(finalSubscription.body).toMatchObject({
        plan: 'FREE', estado: 'ACTIVA', funciones: { cobros: false }, limiteReparacionesMes: 25,
        reparacionesEsteMes: previousCount + 1,
      });
      const finalTrackingPromise = publicPage.waitForResponse((response) => matches(response.url(), trackingPath) && response.request().method() === 'GET');
      await publicPage.reload();
      const finalTracking = await finalTrackingPromise;
      expect(finalTracking.status()).toBe(200);
      expect(await finalTracking.json() as Seguimiento).toMatchObject({
        codigo: trackingCode, estado: 'ENTREGADO', presupuesto: { id: budgetId, estado: expectedBudgetState, total: 50000 },
      });
      await expect(publicPage.getByRole('heading', { name: 'Motorola G31', exact: true })).toBeVisible();
      await noHorizontalOverflow(publicPage);

      const writes = requests.filter((request) => !['GET', 'HEAD', 'OPTIONS'].includes(request.method));
      expect(writes.map(({ side, origin, path, method }) => ({ side, origin, path, method }))).toEqual([
        { side: 'owner', origin: api, path: '/api/reparaciones/ingreso-rapido', method: 'POST' },
        { side: 'owner', origin: api, path: budgetPath, method: 'POST' },
        { side: 'public', origin: api, path: answerPath, method: 'POST' },
        ...transitions.map(() => ({ side: 'owner', origin: api, path: `${repairPath}/estado`, method: 'PATCH' })),
      ]);
      expect(requests.filter((request) => request.path.startsWith('/api/') && /\/(?:cobros|pagos|checkout)(?:\/|$)/i.test(request.path))).toEqual([]);
      expect(requests.filter((request) => /mercadopago|paypal|stripe/i.test(request.origin))).toEqual([]);
      expect(requests.filter((request) => request.side === 'public' && request.origin === api && request.hasAuthorization)).toEqual([]);
      expect(writes.filter((request) => request.side === 'owner').every((request) => request.hasAuthorization)).toBe(true);

      saveEvidence({
        case: approved ? 'repair-approved' : 'repair-rejected', project: info.project.name, email,
        ownerId, clientId, equipmentId, repairId, budgetId, trackingCode,
      });
    } finally {
      page.context().off('request', observeOwner);
      publicContext?.off('request', observePublic);
      await publicContext?.close();
    }
  });
}
