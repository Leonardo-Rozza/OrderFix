import { expect, test, type BrowserContext, type Request } from '@playwright/test';
import type { AuthResponse, Cliente, Perfil, Usuario } from '../src/types';
import {
  authenticated, emailFor, login, matches, noHorizontalOverflow, observeAttempt, openAndConfirm, password, saveEvidence, storedTokenMatches,
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
