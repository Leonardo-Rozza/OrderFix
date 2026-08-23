export type SearchParamsNormalizer = (params: URLSearchParams) => void;

export function setCanonicalSearchParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
  defaultValue?: string,
): void {
  if (value === undefined || value === defaultValue) {
    params.delete(key);
    return;
  }

  params.set(key, value);
}

export function normalizeSearchQueryParam(params: URLSearchParams, key = 'q'): string {
  const value = params.getAll(key)[0];

  if (value === undefined || value.trim() === '') {
    params.delete(key);
    return '';
  }

  setCanonicalSearchParam(params, key, value);
  return value;
}

export function normalizeNonNegativeIntegerParam(
  params: URLSearchParams,
  key: string,
  defaultValue = 0,
): number {
  if (!Number.isSafeInteger(defaultValue) || defaultValue < 0) {
    throw new RangeError('defaultValue debe ser un entero seguro no negativo');
  }

  const value = params.getAll(key)[0];
  const isCanonicalDecimal = value !== undefined && /^(?:0|[1-9]\d*)$/.test(value);
  const parsedValue = isCanonicalDecimal ? Number(value) : Number.NaN;
  const normalizedValue = Number.isSafeInteger(parsedValue) ? parsedValue : defaultValue;

  setCanonicalSearchParam(params, key, String(normalizedValue), String(defaultValue));
  return normalizedValue;
}

export function normalizeEnumParam<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  defaultValue: T,
): T {
  const value = params.getAll(key)[0];
  const normalizedValue = value !== undefined && allowed.includes(value as T) ? (value as T) : defaultValue;

  setCanonicalSearchParam(params, key, normalizedValue, defaultValue);
  return normalizedValue;
}

export function normalizeFlagParam(params: URLSearchParams, key: string, trueValue = '1'): boolean {
  const enabled = params.getAll(key)[0] === trueValue;

  setCanonicalSearchParam(params, key, enabled ? trueValue : undefined);
  return enabled;
}

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1) return false;

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

  return day <= daysByMonth[month - 1];
}

export function normalizeIsoDateParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.getAll(key)[0];
  const normalizedValue = value !== undefined && isIsoDate(value) ? value : undefined;

  setCanonicalSearchParam(params, key, normalizedValue);
  return normalizedValue;
}

export function composeSearchParamsNormalizers(
  ...normalizers: readonly SearchParamsNormalizer[]
): SearchParamsNormalizer {
  return (params) => {
    for (const normalize of normalizers) normalize(params);
  };
}
