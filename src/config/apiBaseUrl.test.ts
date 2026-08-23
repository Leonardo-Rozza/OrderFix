import { describe, expect, it } from 'vitest';
import { ApiBaseUrlConfigError, resolveApiBaseUrl } from './apiBaseUrl';

const expectConfigError = (callback: () => unknown, code: ApiBaseUrlConfigError['code']) => {
  try {
    callback();
    expect.fail('La configuración debía fallar');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiBaseUrlConfigError);
    expect(error).toMatchObject({ code });
  }
};

describe('resolveApiBaseUrl', () => {
  it('conserva localhost como fallback únicamente en desarrollo', () => {
    expect(resolveApiBaseUrl({}, { development: true })).toBe('http://localhost:8080/api');
  });

  it('exige una URL explícita fuera de desarrollo', () => {
    expectConfigError(
      () => resolveApiBaseUrl({}, { development: false }),
      'API_URL_MISSING'
    );
  });

  it.each([
    ['HTTP', 'http://api.ordenfix.com', 'API_URL_HTTPS_REQUIRED'],
    ['localhost', 'https://localhost:8080', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['localhost con punto final', 'https://localhost.', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['host sin dominio público', 'https://api', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['label DNS con guion inicial', 'https://-bad.com', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['label DNS vacío', 'https://a..com', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['dominio home.arpa', 'https://foo.home.arpa', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['dominio localdomain', 'https://api.localdomain', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['IP privada', 'https://192.168.1.20', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['IP pública literal', 'https://8.8.8.8', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['IPv6 mapeada', 'https://[::ffff:127.0.0.1]', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['dominio de ejemplo', 'https://api.example.com', 'API_URL_PUBLIC_HOST_REQUIRED'],
    ['credenciales', 'https://usuario:secreto@api.ordenfix.com', 'API_URL_INVALID'],
    ['query', 'https://api.ordenfix.com?token=secreto', 'API_URL_INVALID'],
  ])('rechaza %s en producción sin filtrar el valor', (_case, value, code) => {
    try {
      resolveApiBaseUrl({ VITE_API_BASE_URL: value }, { development: false });
      expect.fail('La configuración insegura debía fallar');
    } catch (error) {
      expect(error).toMatchObject({ code });
      expect(String(error)).not.toContain('secreto');
      expect(String(error)).not.toContain(value);
    }
  });

  it('normaliza el sufijo /api una sola vez', () => {
    expect(
      resolveApiBaseUrl(
        { VITE_API_BASE_URL: 'https://api.ordenfix.com/api/' },
        { development: false }
      )
    ).toBe('https://api.ordenfix.com/api');
  });

  it('permite el alias legado sólo cuando coincide con la URL canónica', () => {
    expect(
      resolveApiBaseUrl(
        {
          VITE_API_BASE_URL: 'https://api.ordenfix.com',
          VITE_API_URL: 'https://api.ordenfix.com/api',
        },
        { development: false }
      )
    ).toBe('https://api.ordenfix.com/api');

    expectConfigError(
      () =>
      resolveApiBaseUrl(
        {
          VITE_API_BASE_URL: 'https://api.ordenfix.com',
          VITE_API_URL: 'https://otra-api.ordenfix.com',
        },
        { development: false }
      ),
      'API_URL_CONFLICT'
    );
  });

  it('canonicaliza el punto final del FQDN', () => {
    expect(
      resolveApiBaseUrl(
        {
          VITE_API_BASE_URL: 'https://api.ordenfix.com.',
          VITE_API_URL: 'https://api.ordenfix.com/api',
        },
        { development: false }
      )
    ).toBe('https://api.ordenfix.com/api');
  });
});
