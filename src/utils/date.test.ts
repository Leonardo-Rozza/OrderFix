import { describe, expect, it } from 'vitest';
import { toLocalDateInputValue } from './date';

describe('toLocalDateInputValue', () => {
  it('usa el día del calendario local aunque el equivalente UTC sea otro día', () => {
    const localDate = {
      getFullYear: () => 2026,
      getMonth: () => 6,
      getDate: () => 5,
      toISOString: () => '2026-07-06T02:30:00.000Z',
    } as Date;

    expect(toLocalDateInputValue(localDate)).toBe('2026-07-05');
  });

  it('completa mes y día con cero', () => {
    const localDate = new Date(2026, 0, 9, 12);

    expect(toLocalDateInputValue(localDate)).toBe('2026-01-09');
  });
});
