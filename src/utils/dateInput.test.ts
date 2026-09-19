import { describe, expect, it } from 'vitest';
import { dateInputError, formatCalendarDate, formatDateInput, normalizeDateInput, parseCalendarDate } from './dateInput';

describe('parseCalendarDate', () => {
  it.each([
    ['2024-02-29', 2024, 2, 29],
    ['2000-02-29', 2000, 2, 29],
    ['2400-02-29', 2400, 2, 29],
    ['2026-04-30', 2026, 4, 30],
    ['2026-12-31', 2026, 12, 31],
    ['0001-01-01', 1, 1, 1],
    ['0004-02-29', 4, 2, 29],
    ['0099-12-31', 99, 12, 31],
    ['0100-01-01', 100, 1, 1],
    ['9999-12-31', 9999, 12, 31],
  ] as const)('construye %s con el día, mes y año locales correctos', (value, year, month, day) => {
    const parsed = parseCalendarDate(value);
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.getFullYear()).toBe(year);
    expect(parsed?.getMonth()).toBe(month - 1);
    expect(parsed?.getDate()).toBe(day);
    expect(formatCalendarDate(parsed!)).toBe(value);
  });

  it.each([
    '', '2023-02-29', '1900-02-29', '2100-02-29', '2026-04-31', '2026-02-30',
    '2026-00-15', '2026-13-01', '2026-01-00', '0000-01-01', '10000-01-01',
    '2026-1-01', '2026-01-1', '2026-01-', '01/01/2026', ' 2026-01-01 ',
    '2026-01-01T00:00:00Z', '2026-01-01T12:00:00-03:00',
  ])('rechaza %j sin normalizar días imposibles ni interpretar horas', (value) => {
    expect(parseCalendarDate(value)).toBeUndefined();
  });
});

describe('formatCalendarDate', () => {
  it('conserva el día local cerca de medianoche en vez del día UTC', () => {
    expect(formatCalendarDate(new Date(2026, 0, 9, 0, 5))).toBe('2026-01-09');
    expect(formatCalendarDate(new Date(2026, 0, 9, 23, 55))).toBe('2026-01-09');
  });

  it('no serializa instantes inválidos ni años fuera del calendario admitido', () => {
    expect(formatCalendarDate(new Date(NaN))).toBe('');
    const date = new Date(2026, 0, 1, 12);
    date.setFullYear(0);
    expect(formatCalendarDate(date)).toBe('');
    date.setFullYear(10000);
    expect(formatCalendarDate(date)).toBe('');
  });
});

describe('formato y normalización de fecha escrita', () => {
  it.each([
    ['2024-02-29', '29/02/2024'],
    ['2000-02-29', '29/02/2000'],
    ['2026-09-19', '19/09/2026'],
    ['0001-01-09', '09/01/0001'],
    ['0099-12-31', '31/12/0099'],
    ['9999-12-31', '31/12/9999'],
  ])('conserva el mismo calendario al pasar entre %s y %s', (iso, visible) => {
    expect(formatDateInput(iso)).toBe(visible);
    expect(normalizeDateInput(visible)).toBe(iso);
    expect(normalizeDateInput(formatDateInput(iso))).toBe(iso);
    const date = parseCalendarDate(normalizeDateInput(visible))!;
    const localValue = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    expect(localValue).toBe(iso);
  });

  it.each([
    '', '1', '19/', '19/09/', '19/09/20', '1/9/2026', '29/02/1900', '29/02/2100',
    '31/04/2026', '00/01/2026', '01/13/2026', '01/01/0000', ' 19/09/2026 ',
    '2026-02-30', 'fecha pendiente',
  ])('preserva el borrador %j para permitir corregirlo', (draft) => {
    expect(normalizeDateInput(draft)).toBe(draft);
    expect(formatDateInput(draft)).toBe(draft);
  });
});

describe('dateInputError', () => {
  const limits = { min: '2024-02-29', max: '2024-03-02' };

  it('deja vacío válido aunque haya límites, para que required se maneje por separado', () => {
    expect(dateInputError('', limits)).toBeUndefined();
  });

  it.each(['2024-02-29', '2024-03-01', '2024-03-02'])('acepta el rango inclusivo: %s', (value) => {
    expect(dateInputError(value, limits)).toBeUndefined();
  });

  it('explica ambos límites con la fecha local legible', () => {
    expect(dateInputError('2024-02-28', limits)).toBe('Ingresá una fecha igual o posterior al 29/02/2024.');
    expect(dateInputError('2024-03-03', limits)).toBe('Ingresá una fecha igual o anterior al 02/03/2024.');
  });

  it('valida el día real antes de compararlo con los límites', () => {
    for (const value of ['2024-02-30', '2024-02-', '29/02/2024', '0000-01-01', ' ']) {
      expect(dateInputError(value, limits)).toBe('Ingresá una fecha válida en dd/mm/aaaa.');
    }
    expect(dateInputError(normalizeDateInput('29/02/2024'), limits)).toBeUndefined();
  });

  it('compara correctamente años pequeños y límites iguales', () => {
    expect(dateInputError('0001-01-01', { min: '0001-01-01', max: '0001-01-01' })).toBeUndefined();
    expect(dateInputError('0099-12-31', { min: '0100-01-01' })).toBe('Ingresá una fecha igual o posterior al 01/01/0100.');
    expect(dateInputError('9999-12-31')).toBeUndefined();
  });

  it('ignora límites mal formados, como los atributos nativos min y max', () => {
    expect(dateInputError('2026-09-19', { min: '0000-01-01', max: '2026-02-30' })).toBeUndefined();
    expect(dateInputError('2026-09-19', { min: '01/01/2026', max: 'sin límite' })).toBeUndefined();
  });
});
