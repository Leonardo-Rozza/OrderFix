import * as Sentry from '@sentry/react';
import { describe, expect, it, vi } from 'vitest';
import { captureError, initSentry, sanitizeSentryPayload, toSafeSentryError } from './sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

const trackingCode = 'synthetic-tracking-secret-42';
const trackingPath = `/seguimiento/${trackingCode}`;
const trackingRepresentations = [
  trackingPath,
  trackingPath.replaceAll('/', '\\/'),
  trackingPath.replaceAll('/', '\\\\/'),
  encodeURIComponent(trackingPath),
  encodeURIComponent(trackingPath).replaceAll('%2F', '%2f'),
  `/seguimiento/${encodeURIComponent('synthetic tracking secret')}`,
];

describe('sanitizeSentryPayload', () => {
  it('filtra credenciales anidadas y el body JSON serializado de Axios', () => {
    const original = {
      request: {
        pinDesbloqueo: '1234',
        nested: {
          patronDesbloqueo: 'L invertida',
          password: 'clave-admin',
          'contraseña-confirmacion': 'clave-admin',
          observaciones: 'sin tapa',
        },
      },
      config: {
        data: JSON.stringify({ pinDesbloqueo: '9999', descripcionProblema: 'No carga' }),
        headers: {
          Authorization: 'Bearer token-super-secreto',
          Cookie: 'session=abc',
          'Set-Cookie': 'refresh=xyz',
        },
      },
      message: 'payload patronDesbloqueo=Z con Bearer jwt.visible.firma y continuar',
    };

    const sanitized = sanitizeSentryPayload(original);

    expect(sanitized.request.pinDesbloqueo).toBe('[Filtered]');
    expect(sanitized.request.nested.patronDesbloqueo).toBe('[Filtered]');
    expect(sanitized.request.nested.password).toBe('[Filtered]');
    expect(sanitized.request.nested['contraseña-confirmacion']).toBe('[Filtered]');
    expect(sanitized.request.nested.observaciones).toBe('sin tapa');
    expect(sanitized.config.data).not.toContain('9999');
    expect(sanitized.config.headers.Authorization).toBe('[Filtered]');
    expect(sanitized.config.headers.Cookie).toBe('[Filtered]');
    expect(sanitized.config.headers['Set-Cookie']).toBe('[Filtered]');
    expect(sanitized.message).not.toContain('patronDesbloqueo=Z');
    expect(sanitized.message).not.toContain('jwt.visible.firma');
    expect(original.request.pinDesbloqueo).toBe('1234');
  });

  it('filtra contraseña y pruebas de exportación en body, headers y breadcrumbs', () => {
    const source = { config: {
      url: '/cuenta/reauthenticaciones', data: JSON.stringify({ passwordActual: 'clave-exportacion' }),
      headers: { 'X-Reauth-Token': 'prueba-exportacion' },
    }, response: { reauthToken: 'prueba-exportacion' }, message: 'X-Reauth-Token=prueba-exportacion' };
    const clean = sanitizeSentryPayload(source);
    expect(JSON.stringify(clean)).not.toMatch(/clave-exportacion|prueba-exportacion/);
    expect(clean.config.url).toBe('/cuenta/reauthenticaciones');
  });

  it('preserva el resto del evento y soporta referencias repetidas', () => {
    const shared = { estado: 'EN_PROCESO', pinDesbloqueo: '0000' };
    const sanitized = sanitizeSentryPayload({ first: shared, second: shared });

    expect(sanitized.first).toBe(sanitized.second);
    expect(sanitized.first).toEqual({ estado: 'EN_PROCESO', pinDesbloqueo: '[Filtered]' });
  });

  it('convierte AxiosError a un Error nuevo sin body ni headers crudos', () => {
    const original = Object.assign(
      new Error('Falló Authorization=Bearer token-crudo'),
      {
        config: {
          data: JSON.stringify({ password: 'admin123' }),
          headers: { Authorization: 'Bearer token-crudo', Cookie: 'session=abc' },
        },
        response: { status: 500 },
      },
    );

    const safe = toSafeSentryError(original);

    expect(safe).not.toBe(original);
    expect(safe.message).not.toContain('token-crudo');
    expect(safe).not.toHaveProperty('config');
    expect(safe).not.toHaveProperty('response');
  });

  it.each(['codigoSeguimiento', 'CODIGO_SEGUIMIENTO', 'código-seguimiento']) (
    'redacts a nested tracking bearer secret in the %s field', (key) => {
      const original = { response: { data: [{ [key]: trackingCode, estado: 'COMPLETADO' }] } };

      const sanitized = sanitizeSentryPayload(original);

      expect(sanitized.response.data[0][key]).toBe('[Filtered]');
      expect(sanitized.response.data[0].estado).toBe('COMPLETADO');
      expect(original.response.data[0][key]).toBe(trackingCode);
    },
  );

  it.each([
    JSON.stringify({ codigoSeguimiento: trackingCode, estado: 'COMPLETADO' }),
    JSON.stringify(JSON.stringify({ codigoSeguimiento: trackingCode, estado: 'COMPLETADO' })),
    `codigoSeguimiento=${trackingCode} status=500`,
    `'codigoSeguimiento': '${trackingCode}', estado=COMPLETADO`,
  ])('redacts serialized tracking fields while retaining safe diagnostics: %s', (data) => {
    const sanitized = sanitizeSentryPayload({ request: { data } });

    expect(sanitized.request.data).not.toContain(trackingCode);
    expect(sanitized.request.data).toContain('[Filtered]');
    expect(sanitized.request.data).toMatch(/COMPLETADO|status=500/);
  });

  it.each(trackingRepresentations)('redacts a tracking URL representation: %s', (url) => {
    const original = {
      request: { url: `https://frontend.invalid${url}?estado=COMPLETADO` },
      contexts: { trace: { data: { url } } },
      breadcrumbs: [{ category: 'http', data: { url, status_code: 500 } }],
      transaction: `GET ${url}`,
      message: `Failed at ${url} after 42ms`,
    };

    const sanitized = sanitizeSentryPayload(original);

    expect(JSON.stringify(sanitized)).not.toMatch(/synthetic|tracking%20secret/);
    expect(sanitized.message).toContain('[Filtered]');
    expect(sanitized.message).toContain('after 42ms');
    expect(sanitized.request.url).toContain('?estado=COMPLETADO');
    expect(sanitized.breadcrumbs[0].data.status_code).toBe(500);
    expect(original.contexts.trace.data.url).toBe(url);
  });

  it('preserves encoded query and fragment diagnostics after removing the tracking segment', () => {
    const url = encodeURIComponent(`https://frontend.invalid${trackingPath}?estado=COMPLETADO#details`);
    const sanitized = sanitizeSentryPayload({ url });

    expect(sanitized.url).not.toContain(trackingCode);
    expect(sanitized.url).toContain('%3Festado%3DCOMPLETADO%23details');
  });

  it('preserves non-tracking URLs, shared references and cycles', () => {
    const shared = { url: '/reparaciones/42', codigoSeguimiento: trackingCode };
    const original: { first: typeof shared; second: typeof shared; self?: unknown } = {
      first: shared,
      second: shared,
    };
    original.self = original;

    const sanitized = sanitizeSentryPayload(original);

    expect(sanitized.first).toBe(sanitized.second);
    expect(sanitized.self).toBe(sanitized);
    expect(sanitized.first).toEqual({ url: '/reparaciones/42', codigoSeguimiento: '[Filtered]' });
    expect(original.first.codigoSeguimiento).toBe(trackingCode);
  });

  it('sanitizes Error message, name and stack without retaining private Error metadata', () => {
    const original = Object.assign(new Error(`GET ${trackingPath} returned HTTP 500`), {
      name: `RequestError codigoSeguimiento=${trackingCode}`,
      stack: `RequestError at https://frontend.invalid${trackingPath}\n    at repair.ts:42:3`,
      config: { data: { codigoSeguimiento: trackingCode } },
    });

    const sanitized = toSafeSentryError(original);

    expect([sanitized.message, sanitized.name, sanitized.stack].join('\n')).not.toContain(trackingCode);
    expect(sanitized.message).toContain('HTTP 500');
    expect(sanitized.stack).toContain('repair.ts:42:3');
    expect(sanitized).not.toHaveProperty('config');
    expect(original.message).toContain(trackingCode);
  });

  it('filters tracking secrets through each registered telemetry hook without sending', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://synthetic@telemetry.invalid/1');
    try {
      initSentry();
      const options = vi.mocked(Sentry.init).mock.calls.at(-1)?.[0];
      const source = {
        request: { url: trackingPath },
        message: `codigoSeguimiento=${trackingCode}`,
        extra: { codigoSeguimiento: trackingCode },
      };
      const hooks = [options?.beforeSend, options?.beforeBreadcrumb, options?.beforeSendTransaction];

      hooks.forEach((hook) => {
        expect(hook).toBeTypeOf('function');
        const sanitized = (hook as (event: typeof source, hint: object) => unknown)(source, {});
        expect(JSON.stringify(sanitized)).not.toContain(trackingCode);
        expect(JSON.stringify(sanitized)).toContain('[Filtered]');
      });
      expect(Sentry.captureException).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('captures only a sanitized diagnostic Error, not the original tracking URL', () => {
    captureError(new Error(`Request failed for ${trackingPath}`));

    const captured = vi.mocked(Sentry.captureException).mock.calls.at(-1)?.[0] as Error;
    expect(captured.message).toContain('[Filtered]');
    expect(captured.message).not.toContain(trackingCode);
  });
});
