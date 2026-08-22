import { describe, expect, it } from 'vitest';
import { sanitizeSentryPayload, toSafeSentryError } from './sentry';

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
});
