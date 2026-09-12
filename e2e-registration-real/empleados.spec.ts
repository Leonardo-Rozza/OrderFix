import { expect, test, type BrowserContext, type Request } from '@playwright/test';
import type { AuthResponse, Cliente, Perfil, Usuario } from '../src/types';
import {
  api, authenticated, emailFor, login, matches, noHorizontalOverflow, observeAttempt, openAndConfirm, password, saveEvidence, storedTokenMatches,
  verifyAttempt, verifyNoAttemptStorage, verifySession,
} from './helpers';

test('el titular administra empleados y USER opera sólo dentro de su taller', async ({ page, browser }, info) => {
  const email = emailFor('employees', info);
  const employeeEmail = emailFor('employee', info);
  const contexts: BrowserContext[] = [];
  const isolatedPage = async () => {
    const context = await browser.newContext({ ...info.project.use, baseURL: info.project.use.baseURL });
    contexts.push(context);
    return context.newPage();
  };

  try {
    const snapshot = await openAndConfirm(page, email);
    const verifyOwnerSession = verifySession(page, email);
    const registrationPromise = page.waitForResponse((response) => matches(response.url(), '/api/auth/register') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Crear taller', exact: true }).click();
    const registration = await registrationPromise;
    expect(registration.status()).toBe(201);
    expect(registration.headers()['cache-control']).toContain('no-store');
    const attempt = observeAttempt(registration.request());
    verifyAttempt(attempt, snapshot);
    await verifyOwnerSession();
    await verifyNoAttemptStorage(page, attempt.key);
    const ownerSession = await registration.json() as AuthResponse;
    expect(typeof ownerSession.token === 'string' && ownerSession.token.length > 0).toBe(true);
    expect(await storedTokenMatches(page, ownerSession.token)).toBe(true);
    const ownerProfile = await authenticated<Perfil>(page, ownerSession.token, '/api/perfil');
    expect(ownerProfile.status).toBe(200);
    expect(ownerProfile.body.usuario).toMatchObject({ email, role: 'ADMIN' });
    const ownerId = ownerProfile.body.usuario.id;
    expect(Number.isSafeInteger(ownerId) && ownerId > 0).toBe(true);
    const subscription = await authenticated(page, ownerSession.token, '/api/suscripcion');
    expect(subscription.status).toBe(200);
    expect(subscription.body).toMatchObject({ estado: 'TRIAL', funciones: { empleadosMultiples: true } });

    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Nuevo empleado', exact: true }).click();
    const employeeModal = page.getByRole('dialog', { name: 'Nuevo empleado', exact: true });
    await employeeModal.getByLabel(/^Usuario/).fill('Empleado local');
    await employeeModal.getByLabel(/^Email/).fill(employeeEmail);
    await employeeModal.getByLabel(/^Contraseña/).fill(password);
    await noHorizontalOverflow(page);
    const employeePromise = page.waitForResponse((response) => matches(response.url(), '/api/usuarios') && response.request().method() === 'POST');
    await employeeModal.getByRole('button', { name: 'Crear empleado', exact: true }).click();
    const employeeResponse = await employeePromise;
    expect(employeeResponse.status()).toBe(201);
    expect(employeeResponse.request().postDataJSON()).toMatchObject({ username: 'Empleado local', email: employeeEmail, role: 'USER' });
    const employee = await employeeResponse.json() as Usuario;
    expect(employee).toMatchObject({ username: 'Empleado local', email: employeeEmail, role: 'USER', active: true });
    expect(Number.isSafeInteger(employee.id) && employee.id > 0 && employee.id !== ownerId).toBe(true);
    await expect(employeeModal).not.toBeVisible();
    await expect(page.getByText(employeeEmail, { exact: true })).toBeVisible();
    await noHorizontalOverflow(page);

    const employeePage = await isolatedPage();
    const employeeSession = await login(employeePage, employeeEmail);
    expect(employeeSession.profile.usuario).toMatchObject({ id: employee.id, role: 'USER' });
    expect(employeeSession.profile.taller.id).toBe(ownerProfile.body.taller.id);
    let automaticUsersRequests = 0;
    const observeUsers = (request: Request) => {
      if (matches(request.url(), '/api/usuarios') && request.method() === 'GET') automaticUsersRequests += 1;
    };
    employeePage.on('request', observeUsers);
    await employeePage.goto('/usuarios');
    await expect(employeePage.getByText('Solo para administradores', { exact: true })).toBeVisible();
    await expect(employeePage.getByText('No tenés permisos para gestionar empleados.', { exact: true })).toBeVisible();
    await expect(employeePage.getByRole('button', { name: 'Nuevo empleado', exact: true })).toHaveCount(0);
    // Una lectura autenticada real confirma que la pantalla no es un rechazo de sesión.
    expect((await authenticated(employeePage, employeeSession.token, '/api/perfil')).status).toBe(200);
    expect(automaticUsersRequests).toBe(0);
    employeePage.off('request', observeUsers);
    await noHorizontalOverflow(employeePage);

    const clientInput = {
      nombre: 'Cliente empleado', apellido: 'Prueba local',
      telefono: info.project.name === 'desktop' ? '1155000101' : '1155000102',
    };
    await employeePage.goto('/clientes');
    await employeePage.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
    const clientModal = employeePage.getByRole('dialog', { name: 'Nuevo cliente', exact: true });
    await clientModal.getByLabel(/^Nombre/).fill(clientInput.nombre);
    await clientModal.getByLabel(/^Apellido/).fill(clientInput.apellido);
    await clientModal.getByLabel(/^Teléfono/).fill(clientInput.telefono);
    await noHorizontalOverflow(employeePage);
    const clientPromise = employeePage.waitForResponse((response) => matches(response.url(), '/api/clientes') && response.request().method() === 'POST');
    await clientModal.getByRole('button', { name: 'Crear cliente', exact: true }).click();
    const clientResponse = await clientPromise;
    expect(clientResponse.status()).toBe(200);
    const client = await clientResponse.json() as Cliente;
    expect(client).toMatchObject({ ...clientInput, email: null, direccion: null });
    expect(Number.isSafeInteger(client.id) && client.id > 0).toBe(true);
    await expect(clientModal).not.toBeVisible();
    await noHorizontalOverflow(employeePage);
    const ownClient = await authenticated<Cliente>(employeePage, employeeSession.token, `/api/clientes/${client.id}`);
    expect(ownClient.status).toBe(200);
    expect(ownClient.body).toMatchObject({ id: client.id, ...clientInput, email: null, direccion: null });

    expect((await authenticated(employeePage, employeeSession.token, '/api/usuarios')).status).toBe(403);
    expect((await authenticated(employeePage, employeeSession.token, `/api/usuarios/${ownerId}`, 'PATCH', { active: false })).status).toBe(403);
    expect((await authenticated(employeePage, employeeSession.token, `/api/clientes/${client.id}`, 'DELETE')).status).toBe(403);
    const roleChange = await authenticated(page, ownerSession.token, `/api/usuarios/${employee.id}`, 'PATCH', { role: 'ADMIN' });
    expect(roleChange.status).toBe(400);
    expect(roleChange.body).toMatchObject({ code: 'ROL_USUARIO_INMUTABLE' });

    const otherPage = await isolatedPage();
    const other = await login(otherPage, 'browser-baseline@ordenfix-e2e.test', 'Browser-baseline-synthetic-123');
    expect(other.profile.usuario.role).toBe('ADMIN');
    const otherOwnerId = other.profile.usuario.id;
    expect(Number.isSafeInteger(otherOwnerId) && otherOwnerId > 0 && otherOwnerId !== ownerId).toBe(true);
    expect(other.profile.taller.id).not.toBe(ownerProfile.body.taller.id);
    // Controles positivos con el mismo token excluyen 401/402 y un baseline inutilizable.
    expect((await authenticated(otherPage, other.token, '/api/usuarios')).status).toBe(200);
    expect((await authenticated(otherPage, other.token, '/api/clientes')).status).toBe(200);
    expect((await authenticated(otherPage, other.token, `/api/usuarios/${employee.id}`)).status).toBe(404);
    expect((await authenticated(otherPage, other.token, `/api/usuarios/${employee.id}`, 'PATCH', { active: false })).status).toBe(404);
    expect((await authenticated(otherPage, other.token, `/api/clientes/${client.id}`)).status).toBe(404);
    expect((await authenticated(otherPage, other.token, `/api/clientes/${client.id}`, 'PUT', { ...clientInput, nombre: 'Cambio ajeno rechazado' })).status).toBe(404);

    const unchanged = await authenticated<Cliente>(employeePage, employeeSession.token, `/api/clientes/${client.id}`);
    expect(unchanged.status).toBe(200);
    expect(unchanged.body).toEqual(ownClient.body);
    const employeeStillActive = await authenticated<Usuario>(page, ownerSession.token, `/api/usuarios/${employee.id}`);
    expect(employeeStillActive.status).toBe(200);
    expect(employeeStillActive.body).toMatchObject({ role: 'USER', active: true });

    const disabledPromise = page.waitForResponse((response) => matches(response.url(), `/api/usuarios/${employee.id}`) && response.request().method() === 'PATCH');
    await page.getByTitle('Desactivar', { exact: true }).click();
    const disabled = await disabledPromise;
    expect(disabled.status()).toBe(200);
    expect(await disabled.json()).toMatchObject({ id: employee.id, role: 'USER', active: false });
    await expect(page.getByRole('button', { name: 'Inactivo', exact: true })).toBeVisible();
    await noHorizontalOverflow(page);
    expect((await authenticated(employeePage, employeeSession.token, '/api/clientes')).status).toBe(403);
    const ownerClient = await authenticated<Cliente>(page, ownerSession.token, `/api/clientes/${client.id}`);
    expect(ownerClient.status).toBe(200);
    expect(ownerClient.body).toEqual(ownClient.body);

    const rejectedPage = await isolatedPage();
    await rejectedPage.goto('/login');
    await rejectedPage.getByLabel('Email', { exact: true }).fill(employeeEmail);
    await rejectedPage.getByLabel('Contraseña', { exact: true }).fill(password);
    const rejectedPromise = rejectedPage.waitForResponse((response) => matches(response.url(), '/api/auth/login') && response.request().method() === 'POST');
    await rejectedPage.getByRole('button', { name: 'Ingresar', exact: true }).click();
    expect((await rejectedPromise).status()).toBe(401);
    await expect(rejectedPage).toHaveURL(/\/login$/);
    await expect(rejectedPage.getByText('Usuario o contraseña incorrectos', { exact: true })).toBeVisible();
    await noHorizontalOverflow(rejectedPage);

    // El titular vuelve a habilitar al empleado para ensayar la baja voluntaria
    // desde dos sesiones nuevas y reales, conservando los controles anteriores.
    const enabledPromise = page.waitForResponse((response) => matches(response.url(), `/api/usuarios/${employee.id}`) && response.request().method() === 'PATCH');
    await page.getByTitle('Activar', { exact: true }).click();
    const enabled = await enabledPromise;
    expect(enabled.status()).toBe(200);
    expect(await enabled.json()).toMatchObject({ id: employee.id, role: 'USER', active: true });
    await expect(page.getByTitle('Desactivar', { exact: true })).toBeVisible();

    const exitPage = await isolatedPage();
    const exitSession = await login(exitPage, employeeEmail);
    const secondEmployeePage = await isolatedPage();
    const secondEmployeeSession = await login(secondEmployeePage, employeeEmail);
    expect(exitSession.token !== secondEmployeeSession.token).toBe(true);
    expect(exitSession.profile.usuario).toMatchObject({ id: employee.id, role: 'USER' });
    expect(secondEmployeeSession.profile).toEqual(exitSession.profile);
    expect((await authenticated(exitPage, exitSession.token, '/api/export/excel')).status).toBe(403);
    const anonymousExport = await exitPage.evaluate(async (url) => (await fetch(url)).status, `${api}/api/export/excel`);
    expect(anonymousExport).toBe(403);

    await exitPage.goto('/cuenta');
    await expect(exitPage.getByRole('heading', { name: 'Tu cuenta', exact: true })).toBeVisible();
    const employeePrivacy = exitPage.getByRole('region', { name: 'Privacidad, datos y baja', exact: true });
    await expect(employeePrivacy.getByText('Las solicitudes sobre tus datos personales todavía no se gestionan desde la app.', { exact: true })).toBeVisible();
    await expect(employeePrivacy.getByText('Contacto todavía no disponible.', { exact: true })).toHaveCount(3);
    await expect(employeePrivacy.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(employeePrivacy.getByRole('button', { name: /enviar|solicitar|exportar|cerrar/i })).toHaveCount(0);
    await expect(employeePrivacy.getByText(/^(Solicitud enviada|Solicitud registrada|Taller cerrado)/)).toHaveCount(0);
    await noHorizontalOverflow(exitPage);

    await page.goto('/cuenta/baja-acceso');
    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(page.getByRole('heading', { name: 'Tu cuenta', exact: true })).toBeVisible();
    await expect(page.getByLabel('Contraseña actual', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Dar de baja mi acceso', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Confirmar baja de mi acceso', exact: true })).toHaveCount(0);
    const ownerPrivacy = page.getByRole('region', { name: 'Privacidad, datos y baja', exact: true });
    await expect(ownerPrivacy.getByText(/El cierre del taller y la exportación integral todavía no están disponibles/)).toBeVisible();
    await expect(ownerPrivacy.getByText('Contacto todavía no disponible.', { exact: true })).toHaveCount(3);
    await expect(ownerPrivacy.locator('a[href^="mailto:"]')).toHaveCount(0);
    expect((await authenticated(page, ownerSession.token, '/api/cuenta/baja-acceso', 'POST', { passwordActual: password, confirmado: true })).status).toBe(403);
    expect((await authenticated(page, ownerSession.token, '/api/perfil')).body).toEqual(ownerProfile.body);
    await noHorizontalOverflow(page);

    await employeePrivacy.getByRole('link', { name: 'Dar de baja mi acceso', exact: true }).click();
    await expect(exitPage).toHaveURL(/\/cuenta\/baja-acceso$/);
    await expect(exitPage.getByRole('heading', { name: 'Dar de baja mi acceso', exact: true })).toBeVisible();
    await expect(exitPage.getByText(/Esta acción no elimina tus datos personales ni cierra el taller/)).toBeVisible();
    const currentPassword = exitPage.getByLabel('Contraseña actual', { exact: true });
    const confirmation = exitPage.getByRole('checkbox', { name: 'Entiendo que se desactivará mi acceso y se cerrarán mis sesiones.', exact: true });
    const confirmExit = exitPage.getByRole('button', { name: 'Confirmar baja de mi acceso', exact: true });
    await expect(confirmExit).toBeDisabled();
    const incorrectPassword = 'Clave-incorrecta-sintetica-E2E-123';
    await currentPassword.fill(incorrectPassword);
    await confirmation.check();
    await noHorizontalOverflow(exitPage);
    const incorrectPromise = exitPage.waitForResponse((response) => matches(response.url(), '/api/cuenta/baja-acceso') && response.request().method() === 'POST');
    await confirmExit.click();
    const incorrect = await incorrectPromise;
    expect(incorrect.status()).toBe(400);
    expect(incorrect.headers()['cache-control']).toContain('no-store');
    expect(await incorrect.json()).toMatchObject({ code: 'PASSWORD_ACTUAL_INVALIDA' });
    await expect(exitPage.getByRole('alert')).toHaveText('La contraseña actual no es correcta. Volvé a ingresarla.');
    await expect(currentPassword).toHaveValue('');
    await expect(confirmation).not.toBeChecked();
    await expect(confirmExit).toBeDisabled();
    expect((await authenticated(exitPage, exitSession.token, '/api/perfil')).status).toBe(200);
    expect((await authenticated(secondEmployeePage, secondEmployeeSession.token, '/api/perfil')).status).toBe(200);
    const activeAfterIncorrect = await authenticated<Usuario>(page, ownerSession.token, `/api/usuarios/${employee.id}`);
    expect(activeAfterIncorrect.status).toBe(200);
    expect(activeAfterIncorrect.body).toEqual(employeeStillActive.body);
    const unchangedAfterIncorrect = await authenticated<Cliente>(exitPage, exitSession.token, `/api/clientes/${client.id}`);
    expect(unchangedAfterIncorrect.status).toBe(200);
    expect(unchangedAfterIncorrect.body).toEqual(ownClient.body);
    const noCredentialsStored = async () => {
      const storage = await exitPage.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
      // Si falla, el diagnóstico muestra sólo un booleano, nunca storage/JWT.
      expect(storage.includes(password)).toBe(false);
      expect(storage.includes(incorrectPassword)).toBe(false);
    };
    await noCredentialsStored();

    await currentPassword.fill(password);
    await confirmation.check();
    const exitPromise = exitPage.waitForResponse((response) => matches(response.url(), '/api/cuenta/baja-acceso') && response.request().method() === 'POST');
    await confirmExit.click();
    const deactivated = await exitPromise;
    expect(deactivated.status()).toBe(204);
    expect(deactivated.headers()['cache-control']).toContain('no-store');
    expect((await deactivated.body()).byteLength).toBe(0);
    const exitBody = deactivated.request().postDataJSON();
    expect(Object.keys(exitBody).sort()).toEqual(['confirmado', 'passwordActual']);
    expect(exitBody.confirmado).toBe(true);
    await expect(exitPage).toHaveURL(/\/login$/);
    await expect(exitPage.getByRole('status')).toHaveText('Tu acceso fue desactivado. Tus sesiones anteriores ya no permiten ingresar.');
    await expect(exitPage.getByLabel('Contraseña', { exact: true })).toHaveValue('');
    expect(await storedTokenMatches(exitPage, exitSession.token)).toBe(false);
    await noCredentialsStored();
    await exitPage.reload();
    await expect(exitPage).toHaveURL(/\/login$/);
    await expect(exitPage.getByRole('status')).toHaveText('Tu acceso fue desactivado. Tus sesiones anteriores ya no permiten ingresar.');
    await expect(exitPage.getByLabel('Contraseña', { exact: true })).toHaveValue('');
    expect(await exitPage.evaluate(() => JSON.parse(localStorage.getItem('ordenfix-auth') ?? '{}').state?.isAuthenticated)).toBe(false);
    await noCredentialsStored();
    await noHorizontalOverflow(exitPage);

    // El filtro JWT descarta el principal revocado: estas rutas privadas
    // conservan el 403 del entry point, mientras el login inactivo devuelve 401.
    for (const session of [exitSession, secondEmployeeSession]) {
      expect((await authenticated(exitPage, session.token, '/api/perfil')).status).toBe(403);
      expect((await authenticated(exitPage, session.token, '/api/clientes')).status).toBe(403);
    }
    await secondEmployeePage.goto('/cuenta');
    await expect(secondEmployeePage).toHaveURL(/\/login$/);
    // El interceptor navega a un documento nuevo: la URL puede cambiar antes
    // de que su formulario esté montado y permita leer el almacenamiento.
    await expect(secondEmployeePage.getByRole('heading', { name: 'Iniciá sesión', exact: true })).toBeVisible();
    await expect(secondEmployeePage.getByLabel('Email', { exact: true })).toBeVisible();
    expect(await storedTokenMatches(secondEmployeePage, secondEmployeeSession.token)).toBe(false);
    await secondEmployeePage.reload();
    await expect(secondEmployeePage).toHaveURL(/\/login$/);
    await expect(secondEmployeePage.getByLabel('Email', { exact: true })).toBeVisible();
    expect(await secondEmployeePage.evaluate(() => JSON.parse(localStorage.getItem('ordenfix-auth') ?? '{}').state?.isAuthenticated)).toBe(false);
    await secondEmployeePage.getByLabel('Email', { exact: true }).fill(employeeEmail);
    await secondEmployeePage.getByLabel('Contraseña', { exact: true }).fill(password);
    const inactiveLoginPromise = secondEmployeePage.waitForResponse((response) => matches(response.url(), '/api/auth/login') && response.request().method() === 'POST');
    await secondEmployeePage.getByRole('button', { name: 'Ingresar', exact: true }).click();
    expect((await inactiveLoginPromise).status()).toBe(401);
    await expect(secondEmployeePage.getByText('Usuario o contraseña incorrectos', { exact: true })).toBeVisible();

    const ownerAfterExit = await authenticated<Perfil>(page, ownerSession.token, '/api/perfil');
    expect(ownerAfterExit.status).toBe(200);
    expect(ownerAfterExit.body).toEqual(ownerProfile.body);
    const finalEmployee = await authenticated<Usuario>(page, ownerSession.token, `/api/usuarios/${employee.id}`);
    expect(finalEmployee.status).toBe(200);
    expect(finalEmployee.body).toEqual({ ...employeeStillActive.body, active: false });
    const finalClient = await authenticated<Cliente>(page, ownerSession.token, `/api/clientes/${client.id}`);
    expect(finalClient.status).toBe(200);
    expect(finalClient.body).toEqual(ownClient.body);
    const otherAfterExit = await authenticated<Perfil>(otherPage, other.token, '/api/perfil');
    expect(otherAfterExit.status).toBe(200);
    expect(otherAfterExit.body).toEqual(other.profile);
    expect((await authenticated(otherPage, other.token, '/api/usuarios')).status).toBe(200);
    expect((await authenticated(otherPage, other.token, '/api/clientes')).status).toBe(200);
    expect((await authenticated(otherPage, other.token, `/api/clientes/${client.id}`)).status).toBe(404);

    // Es la descarga operativa existente. El harness verifica sus cuatro hojas
    // contra PostgreSQL; no acredita una exportación integral de datos personales.
    await page.goto('/dashboard');
    const exportPromise = page.waitForResponse((response) => matches(response.url(), '/api/export/excel') && response.request().method() === 'GET');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar a Excel', exact: true }).click();
    const [exportResponse, download] = await Promise.all([exportPromise, downloadPromise]);
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(download.suggestedFilename()).toMatch(/^ordenfix-export-\d{4}-\d{2}-\d{2}\.xlsx$/);
    await download.saveAs(`${process.env.ORDENFIX_REGISTRATION_E2E_REPORT}.${info.project.name}.xlsx`);
    expect(await download.failure()).toBeNull();
    await noHorizontalOverflow(page);

    saveEvidence({
      case: 'employees', project: info.project.name, email,
      requiredSetRevision: attempt.body.requiredSetRevision,
      acceptances: attempt.body.aceptacionesLegales, idempotencyKey: attempt.key,
      employee: { id: employee.id, email: employeeEmail }, client: { id: client.id }, ownerId, otherOwnerId,
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
