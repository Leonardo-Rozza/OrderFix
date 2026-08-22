import { describe, expect, it } from 'vitest';
import { getHttpStatus, getRetryAfterSeconds, parseRetryAfter } from './retryAfter';

describe('Retry-After', () => {
  it('interpreta segundos y fechas HTTP', () => {
    const now = Date.parse('2026-08-20T12:00:00Z');

    expect(parseRetryAfter('12', now)).toBe(12);
    expect(parseRetryAfter('Thu, 20 Aug 2026 12:00:09 GMT', now)).toBe(9);
  });

  it('lee headers Axios sin importar su representación', () => {
    expect(getRetryAfterSeconds({ response: { status: 429, headers: { 'retry-after': '7' } } })).toBe(7);
    expect(
      getRetryAfterSeconds({ response: { status: 429, headers: { get: () => '11' } } }),
    ).toBe(11);
  });

  it('aplica fallback solo para respuestas 429', () => {
    expect(getRetryAfterSeconds({ response: { status: 429, headers: {} } })).toBe(60);
    expect(getRetryAfterSeconds({ response: { status: 500, headers: {} } })).toBeNull();
    expect(getHttpStatus({ response: { status: 404 } })).toBe(404);
  });
});
