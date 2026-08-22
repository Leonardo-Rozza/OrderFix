import { describe, expect, it } from 'vitest';
import { getExportFilename } from './export.mutations';

describe('getExportFilename', () => {
  it('respeta el filename entre comillas enviado por el backend', () => {
    expect(
      getExportFilename('attachment; filename="ordenfix-export-2042-03-04.xlsx"'),
    ).toBe('ordenfix-export-2042-03-04.xlsx');
  });

  it('decodifica filename* cuando el backend usa RFC 5987', () => {
    expect(
      getExportFilename("attachment; filename*=UTF-8''ordenfix%20completo.xlsx"),
    ).toBe('ordenfix completo.xlsx');
  });

  it('genera el fallback con el día local y no con el día UTC', () => {
    const localDate = {
      getFullYear: () => 2026,
      getMonth: () => 6,
      getDate: () => 5,
      toISOString: () => '2026-07-06T02:30:00.000Z',
    } as Date;

    expect(getExportFilename(undefined, localDate)).toBe('ordenfix-export-2026-07-05.xlsx');
  });
});
