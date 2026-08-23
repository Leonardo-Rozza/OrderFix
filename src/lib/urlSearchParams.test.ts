import { describe, expect, it } from 'vitest';
import {
  composeSearchParamsNormalizers,
  isIsoDate,
  normalizeEnumParam,
  normalizeFlagParam,
  normalizeIsoDateParam,
  normalizeNonNegativeIntegerParam,
  normalizeSearchQueryParam,
  setCanonicalSearchParam,
} from './urlSearchParams';

describe('setCanonicalSearchParam', () => {
  it('conserva un único valor y preserva los parámetros desconocidos', () => {
    const params = new URLSearchParams('page=2&page=3&nuevo=1');

    setCanonicalSearchParam(params, 'page', '4');

    expect(params.getAll('page')).toEqual(['4']);
    expect(params.get('nuevo')).toBe('1');
  });

  it('elimina valores ausentes o equivalentes al default', () => {
    const params = new URLSearchParams('page=2&page=3&q=ada');

    setCanonicalSearchParam(params, 'page', '0', '0');
    setCanonicalSearchParam(params, 'q', undefined);

    expect(params.toString()).toBe('');
  });
});

describe('normalizeSearchQueryParam', () => {
  it('elige la primera búsqueda, elimina duplicados y preserva su valor literal', () => {
    const params = new URLSearchParams('q=%20Ada%20&q=Grace&nuevo=1');

    expect(normalizeSearchQueryParam(params)).toBe(' Ada ');
    expect(params.getAll('q')).toEqual([' Ada ']);
    expect(params.get('nuevo')).toBe('1');
  });

  it('omite la búsqueda cuando el primer valor contiene sólo espacios', () => {
    const params = new URLSearchParams('search=%20%20&search=Ada');

    expect(normalizeSearchQueryParam(params, 'search')).toBe('');
    expect(params.has('search')).toBe(false);
  });
});

describe('normalizeNonNegativeIntegerParam', () => {
  it('acepta un entero decimal canónico y elimina sus duplicados', () => {
    const params = new URLSearchParams('page=12&page=3&nuevo=1');

    expect(normalizeNonNegativeIntegerParam(params, 'page')).toBe(12);
    expect(params.getAll('page')).toEqual(['12']);
    expect(params.get('nuevo')).toBe('1');
  });

  it.each(['-1', '1.5', '9007199254740992', '01', '+1', '1e2', 'Infinity', 'abc'])(
    'reemplaza %s por el default y lo omite de la URL',
    (value) => {
      const params = new URLSearchParams({ page: value, nuevo: '1' });

      expect(normalizeNonNegativeIntegerParam(params, 'page')).toBe(0);
      expect(params.has('page')).toBe(false);
      expect(params.get('nuevo')).toBe('1');
    },
  );

  it('omite cero y materializa un default personalizado para valores inválidos', () => {
    const zeroParams = new URLSearchParams('page=0&page=1');
    const customDefaultParams = new URLSearchParams('page=-2');

    expect(normalizeNonNegativeIntegerParam(zeroParams, 'page')).toBe(0);
    expect(zeroParams.has('page')).toBe(false);
    expect(normalizeNonNegativeIntegerParam(customDefaultParams, 'page', 3)).toBe(3);
    expect(customDefaultParams.has('page')).toBe(false);
  });
});

describe('normalizeEnumParam', () => {
  const allowedViews = ['board', 'list'] as const;

  it('acepta el primer valor permitido y elimina duplicados', () => {
    const params = new URLSearchParams('vista=list&vista=board&nuevo=1');

    expect(normalizeEnumParam(params, 'vista', allowedViews, 'board')).toBe('list');
    expect(params.getAll('vista')).toEqual(['list']);
    expect(params.get('nuevo')).toBe('1');
  });

  it('usa y omite el default para un valor desconocido o explícito', () => {
    const invalidParams = new URLSearchParams('vista=grid');
    const defaultParams = new URLSearchParams('vista=board&vista=list');

    expect(normalizeEnumParam(invalidParams, 'vista', allowedViews, 'board')).toBe('board');
    expect(invalidParams.has('vista')).toBe(false);
    expect(normalizeEnumParam(defaultParams, 'vista', allowedViews, 'board')).toBe('board');
    expect(defaultParams.has('vista')).toBe(false);
  });
});

describe('normalizeFlagParam', () => {
  it('acepta sólo el valor verdadero configurado y elimina duplicados', () => {
    const params = new URLSearchParams('nuevo=1&nuevo=0&externo=si');

    expect(normalizeFlagParam(params, 'nuevo')).toBe(true);
    expect(params.getAll('nuevo')).toEqual(['1']);
    expect(params.get('externo')).toBe('si');
  });

  it('elimina valores falsos y soporta otro valor verdadero', () => {
    const invalidParams = new URLSearchParams('nuevo=true&nuevo=1');
    const customParams = new URLSearchParams('activo=si&activo=no');

    expect(normalizeFlagParam(invalidParams, 'nuevo')).toBe(false);
    expect(invalidParams.has('nuevo')).toBe(false);
    expect(normalizeFlagParam(customParams, 'activo', 'si')).toBe(true);
    expect(customParams.getAll('activo')).toEqual(['si']);
  });
});

describe('isIsoDate', () => {
  it.each(['2024-02-29', '2000-02-29', '2026-01-31', '2026-04-30'])('acepta la fecha real %s', (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each([
    '2023-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-01-00',
    '2026-1-01',
    '26-01-01',
    '2026-01-01T00:00:00Z',
  ])('rechaza la fecha inválida %s', (value) => {
    expect(isIsoDate(value)).toBe(false);
  });
});

describe('normalizeIsoDateParam', () => {
  it('conserva una única fecha real y parámetros desconocidos', () => {
    const params = new URLSearchParams('desde=2024-02-29&desde=2026-01-01&externo=1');

    expect(normalizeIsoDateParam(params, 'desde')).toBe('2024-02-29');
    expect(params.getAll('desde')).toEqual(['2024-02-29']);
    expect(params.get('externo')).toBe('1');
  });

  it('elimina una fecha inexistente', () => {
    const params = new URLSearchParams('hasta=2026-02-29&externo=1');

    expect(normalizeIsoDateParam(params, 'hasta')).toBeUndefined();
    expect(params.has('hasta')).toBe(false);
    expect(params.get('externo')).toBe('1');
  });
});

describe('composeSearchParamsNormalizers', () => {
  it('ejecuta los normalizadores en orden y preserva parámetros ajenos', () => {
    const calls: string[] = [];
    const params = new URLSearchParams('q=%20%20&page=02&nuevo=1');
    const normalize = composeSearchParamsNormalizers(
      (nextParams) => {
        calls.push('q');
        normalizeSearchQueryParam(nextParams);
      },
      (nextParams) => {
        calls.push('page');
        normalizeNonNegativeIntegerParam(nextParams, 'page');
      },
    );

    normalize(params);

    expect(calls).toEqual(['q', 'page']);
    expect(params.toString()).toBe('nuevo=1');
  });
});
