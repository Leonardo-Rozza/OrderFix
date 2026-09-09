import { expect, test, type Page, type Request } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import type { AuthResponse, IngresoRapidoResponse, Perfil, Reparacion } from '../src/types';
import type { PhotoIntent, PhotoRequirements, PrivatePhoto } from '../src/api/repairPhotos';

const api = new URL(process.env.ORDENFIX_PHOTOS_E2E_API_URL!).origin;
const runId = process.env.ORDENFIX_PHOTOS_E2E_RUN_ID!;
const report = process.env.ORDENFIX_PHOTOS_E2E_REPORT!;
const accounts = JSON.parse(process.env.ORDENFIX_PHOTOS_E2E_ACCOUNTS_JSON!) as Record<string, {
  ownerEmail: string; employeeEmail: string; otherEmail: string; equipmentId: number; equipmentLabel: string;
}>;
const password = 'Clave-sintetica-E2E-123';
const matches = (url: string, path: string) => url === `${api}${path}`;
const fits = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
const save = (entry: object) => {
  const entries = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) as unknown[] : [];
  writeFileSync(report, JSON.stringify([...entries, { runId, ...entry }]));
};

// A generated 8x8 RGB PNG: synthetic bytes, no user image or external fixture.
const crc32 = (bytes: Buffer) => {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};
const header = Buffer.alloc(13); header.writeUInt32BE(8); header.writeUInt32BE(8, 4); header[8] = 8; header[9] = 2;
const pixels = Buffer.concat(Array.from({ length: 8 }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(24, 127)])));
const image = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
const sha256 = createHash('sha256').update(image).digest('hex');

const login = async (page: Page, email: string) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  const loginPromise = page.waitForResponse((response) => matches(response.url(), '/api/auth/login') && response.request().method() === 'POST');
  const profilePromise = page.waitForResponse((response) => matches(response.url(), '/api/perfil') && response.request().method() === 'GET');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const [response, profileResponse] = await Promise.all([loginPromise, profilePromise]);
  expect(response.status()).toBe(200); expect(profileResponse.status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
  const session = await response.json() as AuthResponse;
  const profile = await profileResponse.json() as Perfil;
  expect(profile.usuario.email).toBe(email);
  return { token: session.token, profile };
};

const read = async (page: Page, path: string, token?: string) => page.evaluate(async ({ url, token }) => {
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
  const bytes = await response.arrayBuffer();
  return {
    status: response.status, size: bytes.byteLength, contentType: response.headers.get('content-type'),
    cache: response.headers.get('cache-control'),
    sha256: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join(''),
  };
}, { url: `${api}${path}`, token });

for (const mode of ['nuevo', 'existente'] as const) {
  test(`fotos privadas en alta ${mode}: consentimiento, reintento y borrado`, async ({ page, browser }, info) => {
    const account = accounts[info.project.name];
    const actor = await login(page, mode === 'nuevo' ? account.ownerEmail : account.employeeEmail);
    expect(actor.profile.usuario.role).toBe(mode === 'nuevo' ? 'ADMIN' : 'USER');
    const requests: { origin: string; path: string; method: string }[] = [];
    const observe = (request: Request) => {
      const url = new URL(request.url());
      requests.push({ origin: url.origin, path: url.pathname, method: request.method() });
    };
    page.context().on('request', observe);
    const peer = await browser.newContext({ ...info.project.use, baseURL: info.project.use.baseURL });
    const foreign = await browser.newContext({ ...info.project.use, baseURL: info.project.use.baseURL });
    try {
      await page.goto('/reparaciones?nuevo=1');
      const modal = page.getByRole('dialog', { name: 'Nueva reparación', exact: true });
      if (mode === 'nuevo') {
        await modal.getByLabel(/^Nombre\s*\*?$/).fill('Cliente fotos');
        await modal.getByLabel(/^Teléfono\s*\*?$/).fill(info.project.name === 'desktop' ? '1155000801' : '1155000802');
        await modal.getByLabel(/^Marca\s*\*?$/).fill('Motorola');
        await modal.getByLabel(/^Modelo\s*\*?$/).fill('G31');
      } else {
        await modal.getByRole('button', { name: 'Elegir equipo existente', exact: true }).click();
        await modal.getByRole('button', { name: 'Equipo', exact: true }).click();
        await page.getByLabel('Buscar equipo', { exact: true }).fill(account.equipmentLabel.split(' ')[0]);
        await page.getByRole('option').filter({ hasText: account.equipmentLabel }).first().click();
      }
      await modal.getByLabel(/^Problema reportado\s*\*?$/).fill('Evidencia sintética de ingreso');
      await modal.getByText('Detalles de ingreso (opcional)', { exact: true }).click();
      await modal.getByLabel('Fotos del ingreso', { exact: true }).setInputFiles({ name: 'foto-sintetica.png', mimeType: 'image/png', buffer: image });
      await expect(modal.getByAltText('Foto local 1', { exact: true })).toBeVisible();
      expect(requests.filter((request) => /(?:cargas-foto|requisitos-fotos|cloudinary)/.test(request.path + request.origin))).toEqual([]);
      await fits(page);

      const creationPath = mode === 'nuevo' ? '/api/reparaciones/ingreso-rapido' : '/api/reparaciones';
      const creationPromise = page.waitForResponse((response) => matches(response.url(), creationPath) && response.request().method() === 'POST');
      const requirementsPromise = page.waitForResponse((response) => /\/requisitos-fotos$/.test(response.url()));
      await modal.getByRole('button', { name: 'Crear reparación', exact: true }).click();
      const creation = await creationPromise;
      expect(creation.status()).toBe(201);
      expect(creation.request().postDataJSON()).not.toHaveProperty('fotos');
      const created = await creation.json() as IngresoRapidoResponse | Reparacion;
      const repair = 'reparacion' in created ? created.reparacion : created;
      const repairId = repair.id;
      if (mode === 'existente') expect(repair.equipoId).toBe(account.equipmentId);
      const requirementsResponse = await requirementsPromise;
      expect(requirementsResponse.status()).toBe(200);
      const requirements = await requirementsResponse.json() as PhotoRequirements;
      expect(requirements.requisitos.some((item) => item.contexto === 'ATESTACION_FOTOS')).toBe(true);
      const panel = page.getByRole('region', { name: 'Confirmar fotos privadas', exact: true });
      const confirm = panel.getByRole('button', { name: 'Confirmar y guardar fotos', exact: true });
      await expect(confirm).toBeDisabled();
      expect(requests.filter((request) => request.path.includes('/cargas-foto'))).toEqual([]);
      for (const checkbox of await panel.getByRole('checkbox').all()) await checkbox.check();
      await fits(page);
      const intentionPath = `/api/reparaciones/${repairId}/cargas-foto`;
      const intentPromise = page.waitForResponse((response) => matches(response.url(), intentionPath) && response.request().method() === 'POST');
      const failurePromise = page.waitForResponse((response) => response.url().startsWith(`${api}${intentionPath}/`)
        && response.url().endsWith('/contenido') && response.request().method() === 'PUT');
      await confirm.click();
      const intentResponse = await intentPromise;
      expect(intentResponse.status()).toBe(201);
      const intent = await intentResponse.json() as PhotoIntent;
      const payload = intentResponse.request().postDataJSON();
      expect(payload).toMatchObject({ mimeType: 'image/png', bytes: image.length, sha256,
        requiredSetRevision: requirements.requiredSetRevision,
        atestacion: { tipo: 'AUTORIZACION_DATOS_CLIENTE', alcances: ['FOTOS'], confirmada: true } });
      expect(Object.keys(intent).sort()).toEqual(['estado', 'expiresAt', 'id', 'upload']);
      expect(intent.upload).toEqual({ method: 'PUT', url: `${intentionPath}/${intent.id}/contenido` });
      expect((await failurePromise).status()).toBe(503);
      await expect(panel.getByRole('alert')).toContainText('La orden se conserva');
      const finishPath = `${intentionPath}/${intent.id}/finalizaciones`;
      const finishPromise = page.waitForResponse((response) => matches(response.url(), finishPath) && response.request().method() === 'POST');
      await panel.getByRole('button', { name: 'Reintentar fotos', exact: true }).click();
      const finished = await finishPromise;
      expect(finished.status()).toBe(201);
      const photo = await finished.json() as PrivatePhoto;
      expect(photo).toMatchObject({ id: intent.id, momento: 'INGRESO', bytes: image.length, sha256, mimeType: 'image/png' });
      expect(Object.keys(photo).sort()).toEqual(['bytes', 'createdAt', 'id', 'mimeType', 'momento', 'sha256']);
      await expect(page).toHaveURL(new RegExp(`/reparaciones/${repairId}$`));
      expect(requests.filter((request) => request.path === creationPath && request.method === 'POST')).toHaveLength(1);
      expect(requests.filter((request) => request.path === intentionPath && request.method === 'POST')).toHaveLength(1);
      const contentPath = `/api/reparaciones/${repairId}/fotos/${photo.id}/contenido`;
      const ownRead = await read(page, contentPath, actor.token);
      expect(ownRead).toMatchObject({ status: 200, size: image.length, sha256 });
      expect(ownRead.cache).toContain('no-store');
      expect(ownRead.contentType).toContain('image/png');
      const photoRegion = page.getByRole('region', { name: 'Fotos privadas', exact: true });
      await photoRegion.getByRole('button', { name: 'Ver fotos privadas', exact: true }).click();
      await photoRegion.getByRole('button', { name: 'Ver foto', exact: true }).click();
      await expect(photoRegion.getByAltText('Foto privada del ingreso')).toBeVisible();
      expect(await photoRegion.getByAltText('Foto privada del ingreso').getAttribute('src')).toMatch(/^blob:/);

      const peerPage = await peer.newPage();
      const peerActor = await login(peerPage, mode === 'nuevo' ? account.employeeEmail : account.ownerEmail);
      expect(peerActor.profile.taller.id).toBe(actor.profile.taller.id);
      const peerRead = await read(peerPage, contentPath, peerActor.token);
      expect(peerRead).toMatchObject({ status: 200, size: image.length, sha256 });
      const foreignPage = await foreign.newPage();
      const other = await login(foreignPage, account.otherEmail);
      expect(other.profile.taller.id).not.toBe(actor.profile.taller.id);
      const foreignRead = await read(foreignPage, contentPath, other.token);
      expect(foreignRead.status).toBe(404);
      const anonymousRead = await read(foreignPage, contentPath);
      expect(anonymousRead.status).toBe(403);

      await peerPage.goto(`/reparaciones/${repairId}`);
      const peerPhotos = peerPage.getByRole('region', { name: 'Fotos privadas', exact: true });
      await peerPhotos.getByRole('button', { name: 'Ver fotos privadas', exact: true }).click();
      await peerPhotos.getByRole('button', { name: 'Ver foto', exact: true }).click();
      await expect(peerPhotos.getByAltText('Foto privada del ingreso')).toBeVisible();
      await fits(peerPage);
      await peerPhotos.getByRole('button', { name: 'Eliminar foto', exact: true }).click();
      const deletePromise = peerPage.waitForResponse((response) => matches(response.url(), `/api/reparaciones/${repairId}/fotos/${photo.id}`)
        && response.request().method() === 'DELETE');
      await peerPhotos.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
      expect((await deletePromise).status()).toBe(204);
      await expect(peerPhotos.getByAltText('Foto privada del ingreso')).toHaveCount(0);
      expect((await read(page, contentPath, actor.token)).status).toBe(404);
      expect(requests.filter((request) => /cloudinary|mercadopago|stripe/i.test(request.origin))).toEqual([]);
      save({ project: info.project.name, scenario: mode, repairId, equipmentId: repair.equipoId,
        actorId: actor.profile.usuario.id, actorRole: actor.profile.usuario.role, workshopId: actor.profile.taller.id,
        peerId: peerActor.profile.usuario.id, foreignId: other.profile.usuario.id, photoId: photo.id,
        bytes: image.length, sha256, uploadFailure: 503, finalized: 201, deleted: 204,
        ownRead: ownRead.status, peerRead: peerRead.status, foreignRead: foreignRead.status, anonymousRead: anonymousRead.status });
    } finally {
      page.context().off('request', observe);
      await peer.close(); await foreign.close();
    }
  });
}
