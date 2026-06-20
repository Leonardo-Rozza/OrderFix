import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, iniciales, whatsappLink } from './format';

describe('formatMoney', () => {
  it('formatea ARS sin decimales', () => {
    expect(formatMoney(48000)).toContain('48.000');
    expect(formatMoney(48000)).toContain('$');
  });
  it('devuelve em dash para null/undefined', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
  });
  it('formatea 0 como monto válido', () => {
    expect(formatMoney(0)).toContain('0');
    expect(formatMoney(0)).not.toBe('—');
  });
});

describe('formatDate', () => {
  it('formatea YYYY-MM-DD a fecha legible es-AR', () => {
    const out = formatDate('2026-06-16');
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/jun/i);
  });
  it('devuelve em dash si no hay fecha', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
  it('devuelve el valor original si no es parseable', () => {
    expect(formatDate('no-es-fecha')).toBe('no-es-fecha');
  });
});

describe('iniciales', () => {
  it('toma la primera letra de nombre y apellido en mayúscula', () => {
    expect(iniciales('Pedro', 'Gomez')).toBe('PG');
  });
  it('funciona con solo nombre', () => {
    expect(iniciales('ana')).toBe('A');
  });
  it('devuelve em dash si no hay datos', () => {
    expect(iniciales(null, null)).toBe('—');
  });
});

describe('whatsappLink', () => {
  it('arma el link wa.me dejando solo dígitos y codificando el mensaje', () => {
    const link = whatsappLink('+54 9 11 5555-1234', 'Hola Juan');
    expect(link).toBe('https://wa.me/5491155551234?text=Hola%20Juan');
  });
  it('tolera teléfono nulo', () => {
    expect(whatsappLink(null, 'Hola')).toBe('https://wa.me/?text=Hola');
  });
});
