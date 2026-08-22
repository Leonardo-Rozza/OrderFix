import { describe, it, expect } from 'vitest';
import { requirePageMeta, toQueryParams, unwrapList } from './pagination';

describe('unwrapList', () => {
  it('devuelve el array tal cual si ya es array', () => {
    expect(unwrapList([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('extrae content de una respuesta paginada (Spring Page)', () => {
    const page = { content: [{ id: 1 }, { id: 2 }], page: { size: 20, number: 0, totalElements: 2, totalPages: 1 } };
    expect(unwrapList(page)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('devuelve [] ante null/undefined', () => {
    expect(unwrapList(null)).toEqual([]);
    expect(unwrapList(undefined)).toEqual([]);
  });

  it('devuelve [] si el shape es inesperado (objeto sin content array)', () => {
    // @ts-expect-error probamos un shape inválido a propósito
    expect(unwrapList({ foo: 'bar' })).toEqual([]);
  });

  it('soporta content vacío', () => {
    expect(unwrapList({ content: [] })).toEqual([]);
  });
});

describe('requirePageMeta', () => {
  it('devuelve la metadata contractual sin inferirla desde content', () => {
    const page = {
      content: [{ id: 1 }],
      page: { size: 20, number: 1, totalElements: 41, totalPages: 3 },
    };

    expect(requirePageMeta(page)).toBe(page.page);
  });

  it('rechaza una respuesta que no permite calcular la página siguiente', () => {
    expect(() => requirePageMeta({ content: [] })).toThrow(/metadata de página/i);
  });
});

describe('toQueryParams', () => {
  it('normaliza q y omite filtros que no se enviarán al backend', () => {
    expect(toQueryParams({ q: '  Ada  ', page: 1, size: 20 })).toEqual({
      q: 'Ada',
      page: 1,
      size: 20,
    });
    expect(toQueryParams({ q: '   ', page: 0, size: 20 })).toEqual({
      page: 0,
      size: 20,
    });
  });
});
