export interface ApiBaseUrlEnvironment {
  VITE_API_BASE_URL?: string;
  VITE_API_URL?: string;
}

export interface ApiBaseUrlOptions {
  development: boolean;
}

export class ApiBaseUrlConfigError extends Error {
  public readonly code:
    | 'API_URL_MISSING'
    | 'API_URL_CONFLICT'
    | 'API_URL_INVALID'
    | 'API_URL_HTTPS_REQUIRED'
    | 'API_URL_PUBLIC_HOST_REQUIRED';

  constructor(
    code:
      | 'API_URL_MISSING'
      | 'API_URL_CONFLICT'
      | 'API_URL_INVALID'
      | 'API_URL_HTTPS_REQUIRED'
      | 'API_URL_PUBLIC_HOST_REQUIRED',
    message: string
  ) {
    super(message);
    this.code = code;
    this.name = 'ApiBaseUrlConfigError';
  }
}

const DEV_FALLBACK = 'http://localhost:8080';

const trimValue = (value: string | undefined) => value?.trim() || undefined;

const isPrivateIpv4 = (hostname: string) => {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return false;

  const [first = -1, second = -1] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
};

const isNonPublicHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/, '');
  const isIpv6 = normalized.includes(':');
  const isIpLiteral = isIpv6 || /^\d+(?:\.\d+){3}$/.test(normalized);
  const labels = normalized.split('.');
  const hasValidDnsLabels =
    normalized.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    ) &&
    !/^\d+$/.test(labels.at(-1) ?? '');
  return (
    isIpLiteral ||
    !hasValidDnsLabels ||
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('::ffff:') ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.invalid') ||
    normalized.endsWith('.test') ||
    normalized.endsWith('.example') ||
    normalized.endsWith('.home.arpa') ||
    normalized.endsWith('.arpa') ||
    normalized.endsWith('.onion') ||
    normalized.endsWith('.alt') ||
    normalized.endsWith('.lan') ||
    normalized.endsWith('.home') ||
    normalized.endsWith('.corp') ||
    normalized.endsWith('.localdomain') ||
    ['example.com', 'example.org', 'example.net'].some(
      (domain) => normalized === domain || normalized.endsWith(`.${domain}`)
    ) ||
    (isIpv6 && normalized.startsWith('fc')) ||
    (isIpv6 && normalized.startsWith('fd')) ||
    (isIpv6 && normalized.startsWith('fe8')) ||
    (isIpv6 && normalized.startsWith('fe9')) ||
    (isIpv6 && normalized.startsWith('fea')) ||
    (isIpv6 && normalized.startsWith('feb')) ||
    isPrivateIpv4(normalized)
  );
};

const parseBaseUrl = (rawValue: string, production: boolean) => {
  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    throw new ApiBaseUrlConfigError(
      'API_URL_INVALID',
      'La URL de API configurada no es una URL absoluta válida.'
    );
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new ApiBaseUrlConfigError(
      'API_URL_INVALID',
      'La URL de API debe ser absoluta y no puede incluir credenciales, query ni fragmento.'
    );
  }

  if (production && url.protocol !== 'https:') {
    throw new ApiBaseUrlConfigError(
      'API_URL_HTTPS_REQUIRED',
      'La URL de API de producción debe usar HTTPS.'
    );
  }

  if (production && isNonPublicHostname(url.hostname)) {
    throw new ApiBaseUrlConfigError(
      'API_URL_PUBLIC_HOST_REQUIRED',
      'La URL de API de producción debe usar un host público.'
    );
  }

  url.hostname = url.hostname.replace(/\.+$/, '');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url;
};

const comparableUrl = (url: URL) => {
  const copy = new URL(url);
  copy.pathname = copy.pathname.replace(/\/api\/?$/, '').replace(/\/+$/, '') || '/';
  return copy.toString();
};

const withApiPath = (url: URL) => {
  const copy = new URL(url);
  const path = copy.pathname.replace(/\/+$/, '');
  copy.pathname = /\/api$/.test(path) ? path : `${path}/api`;
  return copy.toString().replace(/\/$/, '');
};

/**
 * Resuelve una única base para todos los clientes HTTP. En desarrollo conserva
 * el fallback local; fuera de desarrollo falla de forma segura y sin incluir el
 * valor inválido en el mensaje de error.
 */
export const resolveApiBaseUrl = (
  environment: ApiBaseUrlEnvironment,
  options: ApiBaseUrlOptions
) => {
  const primary = trimValue(environment.VITE_API_BASE_URL);
  const legacy = trimValue(environment.VITE_API_URL);
  const production = !options.development;

  if (!primary && !legacy && production) {
    throw new ApiBaseUrlConfigError(
      'API_URL_MISSING',
      'Falta configurar VITE_API_BASE_URL para ejecutar OrdenFix fuera de desarrollo.'
    );
  }

  const selected = primary ?? legacy ?? DEV_FALLBACK;
  const parsed = parseBaseUrl(selected, production);

  if (primary && legacy) {
    const primaryUrl = parseBaseUrl(primary, production);
    const legacyUrl = parseBaseUrl(legacy, production);
    if (comparableUrl(primaryUrl) !== comparableUrl(legacyUrl)) {
      throw new ApiBaseUrlConfigError(
        'API_URL_CONFLICT',
        'VITE_API_BASE_URL y VITE_API_URL apuntan a destinos diferentes.'
      );
    }
  }

  return withApiPath(parsed);
};
