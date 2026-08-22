const DEFAULT_RETRY_AFTER_SECONDS = 60;

type ErrorResponse = {
  status?: number;
  headers?: unknown;
};
const responseFrom = (error: unknown): ErrorResponse | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  return (error as { response?: ErrorResponse }).response;
};

const headerValue = (headers: unknown, name: string): unknown => {
  if (!headers || typeof headers !== 'object') return undefined;

  const getter = (headers as { get?: (key: string) => unknown }).get;
  if (typeof getter === 'function') {
    const value = getter.call(headers, name);
    if (value != null) return value;
  }

  const values = headers as Record<string, unknown>;
  return values[name] ?? values[name.toLowerCase()] ?? values[name.toUpperCase()];
};

export const getHttpStatus = (error: unknown): number | undefined => responseFrom(error)?.status;

export const parseRetryAfter = (value: unknown, nowMs = Date.now()): number | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;

  const text = String(raw).trim();
  if (!text) return null;

  const seconds = Number(text);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const retryAt = Date.parse(text);
  if (Number.isNaN(retryAt)) return null;
  return Math.max(0, Math.ceil((retryAt - nowMs) / 1000));
};

/**
 * Devuelve la espera indicada por un 429. Si el servidor omite o rompe el
 * header, aplica una pausa conservadora para evitar un loop de reintentos.
 */
export const getRetryAfterSeconds = (
  error: unknown,
  nowMs = Date.now(),
  fallbackSeconds = DEFAULT_RETRY_AFTER_SECONDS,
): number | null => {
  const response = responseFrom(error);
  if (response?.status !== 429) return null;

  const parsed = parseRetryAfter(headerValue(response.headers, 'retry-after'), nowMs);
  return parsed ?? fallbackSeconds;
};
