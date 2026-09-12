import { toLocalDateInputValue } from '../../utils/date';

const decodeFilename = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Resuelve nombres `filename` y RFC 5987 (`filename*`) del backend. */
export const getExportFilename = (
  contentDisposition: string | undefined,
  today = new Date(),
  extension: 'xlsx' | 'zip' = 'xlsx',
): string => {
  const encoded = contentDisposition?.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1]?.trim();

  const regular = contentDisposition?.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  const candidate = encoded ? decodeFilename(encoded.replace(/^"|"$/g, '')) : regular?.[1] ?? regular?.[2];
  if (candidate && candidate.length <= 180 && !/[\\/]/.test(candidate)
    && Array.from(candidate).every((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    && candidate.toLowerCase().endsWith(`.${extension}`)) return candidate;
  return `ordenfix-export-${toLocalDateInputValue(today)}.${extension}`;
};
