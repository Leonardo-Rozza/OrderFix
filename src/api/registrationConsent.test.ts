import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { API, server } from '../test/server';
import { authStore } from '../store/auth.store';
import { getRetryAfterSeconds } from '../utils/retryAfter';
import { createRegistrationAttempt, getRegistrationRequirements, parseRegistrationRequirements, registrationConsentMode, registrationRetryError } from './registrationConsent';

const requirements = () => ({
  contexto: 'REGISTRO', locale: 'es-AR', requiredSetRevision: `sha256:${'a'.repeat(64)}`,
  requisitos: [{
    id: '557a8ce8-c72e-4088-a6b5-e2b0f775eb98', contexto: 'REGISTRO', tipoActo: 'ACEPTACION',
    afirmacion: 'Acepto los términos.', afirmacionSha256: 'b'.repeat(64), requerido: true,
    documentos: [{ id: '77aa2a48-af19-4f80-92bb-d9f220c166d1', tipo: 'TERMINOS_SERVICIO', version: '2026.1',
      titulo: 'Términos', contenidoMarkdown: '# Términos\n\nTexto completo.', sha256: 'c'.repeat(64),
      vigenteDesde: '2026-09-01T03:00:00Z', estado: 'VIGENTE', locale: 'es-AR' }],
  }],
});

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('registro: contrato de consentimiento', () => {
  it.each([undefined, 'false'])('mantiene legacy sólo con flag %s', (value) => {
    vi.stubEnv('VITE_REGISTRATION_CONSENT', value);
    expect(registrationConsentMode()).toBe('legacy');
  });
  it('activa únicamente el literal true', () => {
    vi.stubEnv('VITE_REGISTRATION_CONSENT', 'true');
    expect(registrationConsentMode()).toBe('consent');
  });
  it.each(['', 'TRUE', ' true ', '1', 'flase'])('flag inválido %s no habilita legacy', (value) => {
    vi.stubEnv('VITE_REGISTRATION_CONSENT', value);
    expect(registrationConsentMode()).toBe('invalid');
  });

  it('consulta el perfil público exacto sin Bearer ni ETag manual', async () => {
    authStore.getState().login('sesion-anterior', 'anterior@test.com');
    let seen = false;
    server.use(http.get(`${API}/public/requisitos-legales`, ({ request }) => {
      expect(new URL(request.url).searchParams.toString()).toBe('contexto=REGISTRO&locale=es-AR');
      expect(request.headers.get('authorization')).toBeNull();
      expect(request.headers.get('if-none-match')).toBeNull();
      seen = true;
      return HttpResponse.json(requirements());
    }));
    expect(await getRegistrationRequirements(new AbortController().signal)).toEqual(requirements());
    expect(seen).toBe(true);
  });

  it.each(['context', 'locale', 'revision', 'empty', 'optional-only', 'no-document', 'retired', 'digest', 'duplicate'])('rechaza set no utilizable: %s', (failure) => {
    const value = requirements();
    if (failure === 'context') value.contexto = 'USO_CONTINUADO';
    if (failure === 'locale') value.locale = 'es';
    if (failure === 'revision') value.requiredSetRevision = 'revision-secreta';
    if (failure === 'empty') value.requisitos = [];
    if (failure === 'optional-only') value.requisitos[0].requerido = false;
    if (failure === 'no-document') value.requisitos[0].documentos = [];
    if (failure === 'retired') value.requisitos[0].documentos[0].estado = 'RETIRADA';
    if (failure === 'digest') value.requisitos[0].afirmacionSha256 = 'DIGEST';
    if (failure === 'duplicate') value.requisitos.push(value.requisitos[0]);
    expect(() => parseRegistrationRequirements(value)).toThrow('No pudimos verificar las condiciones de registro.');
  });

  it('no confirma obligatorios implícitamente y reenvía sólo los actos marcados con sus digests originales', () => {
    const value = requirements();
    value.requisitos.push({ ...value.requisitos[0], id: 'bb7a8ce8-c72e-4088-a6b5-e2b0f775eb98', requerido: false });
    const snapshot = parseRegistrationRequirements(value);
    const registration = { nombreTaller: 'Taller', nombreAdmin: 'Ana', email: 'ana@test.com', password: '  password  ' };
    expect(() => createRegistrationAttempt(registration, snapshot, new Set())).toThrow('Revisá y confirmá');
    const attempt = createRegistrationAttempt(registration, snapshot, new Set([snapshot.requisitos[0].id]));
    expect(attempt.idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(attempt.payload).toEqual({ ...registration, requiredSetRevision: value.requiredSetRevision,
      aceptacionesLegales: [{ requisitoVersionId: value.requisitos[0].id, tipoActo: 'ACEPTACION',
        afirmacionSha256: 'b'.repeat(64), documentos: [{ documentoVersionId: value.requisitos[0].documentos[0].id,
          sha256: 'c'.repeat(64) }], confirmado: true }] });
    value.requisitos[0].documentos[0].sha256 = 'd'.repeat(64);
    expect(attempt.payload.aceptacionesLegales[0].documentos[0].sha256).toBe('c'.repeat(64));
  });

  it('adapta sólo in-progress 409, respetando Retry-After y usando un segundo si falta', () => {
    const error = { response: { status: 409, data: { code: 'IDEMPOTENCY_EN_PROGRESO' }, headers: { 'retry-after': '3' } } };
    expect(getRetryAfterSeconds(error)).toBeNull();
    expect(getRetryAfterSeconds(registrationRetryError(error))).toBe(3);
    expect(getRetryAfterSeconds(registrationRetryError({ response: { ...error.response, headers: {} } }))).toBe(1);
    const other = { response: { ...error.response, data: { code: 'IDEMPOTENCY_KEY_REUTILIZADA' } } };
    expect(registrationRetryError(other)).toBe(other);
  });
});
