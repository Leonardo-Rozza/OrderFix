import { describe, it, expect } from 'vitest';
import { unwrapList } from './pagination';

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
