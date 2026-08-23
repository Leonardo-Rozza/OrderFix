import { useCallback, useMemo } from 'react';
import { useNavigationType } from 'react-router';
import {
  composeSearchParamsNormalizers,
  normalizeEnumParam,
  normalizeNonNegativeIntegerParam,
  normalizeSearchQueryParam,
  setCanonicalSearchParam,
  type SearchParamsNormalizer,
} from '../lib/urlSearchParams';
import { useDebouncedValue } from './useDebouncedValue';
import {
  useUrlSearchParams,
  type UpdateUrlSearchParamsOptions,
  type UrlSearchParamsRecipe,
} from './useUrlSearchParams';

export interface UseListParamsOptions {
  size?: number;
  defaultSort?: string;
  allowedSorts?: readonly string[];
  normalizeParams?: SearchParamsNormalizer;
}

export interface UseListParamsResult {
  q: string;
  onSearch: (value: string) => void;
  page: number;
  setPage: (page: number) => void;
  replacePage: (page: number) => void;
  debouncedQ: string;
  size: number;
  sort: string | undefined;
  setSort: (sort: string) => void;
  searchParams: URLSearchParams;
  updateSearchParams: (
    recipe: UrlSearchParamsRecipe,
    options?: UpdateUrlSearchParamsOptions,
  ) => void;
}

/**
 * Maneja búsqueda, página y orden directamente desde la URL. Las consultas se
 * retrasan al escribir, pero una carga o navegación POP se restaura de inmediato.
 */
export function useListParams(
  {
    size = 20,
    defaultSort,
    allowedSorts,
    normalizeParams,
  }: UseListParamsOptions = {},
): UseListParamsResult {
  const normalizeListParams = useMemo(() => {
    const normalizers: SearchParamsNormalizer[] = [
      (params) => { normalizeSearchQueryParam(params); },
      (params) => { normalizeNonNegativeIntegerParam(params, 'page'); },
    ];

    if (defaultSort) {
      normalizers.push((params) => {
        normalizeEnumParam(params, 'sort', allowedSorts ?? [defaultSort], defaultSort);
      });
    }

    if (normalizeParams) normalizers.push(normalizeParams);
    return composeSearchParamsNormalizers(...normalizers);
  }, [allowedSorts, defaultSort, normalizeParams]);

  const { searchParams, updateSearchParams } = useUrlSearchParams(normalizeListParams);
  const navigationType = useNavigationType();
  const q = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? 0);
  const sort = defaultSort
    ? (searchParams.get('sort') ?? defaultSort)
    : undefined;
  const debouncedQ = useDebouncedValue(q.trim(), 350, navigationType === 'POP');

  const onSearch = useCallback((value: string) => {
    updateSearchParams((next) => {
      setCanonicalSearchParam(next, 'q', value);
      next.delete('page');
    }, { replace: true });
  }, [updateSearchParams]);

  const updatePage = useCallback((nextPage: number, replace: boolean) => {
    updateSearchParams((next) => {
      setCanonicalSearchParam(next, 'page', String(nextPage), '0');
    }, { replace });
  }, [updateSearchParams]);

  const setPage = useCallback((nextPage: number) => {
    updatePage(nextPage, false);
  }, [updatePage]);

  const replacePage = useCallback((nextPage: number) => {
    updatePage(nextPage, true);
  }, [updatePage]);

  const setSort = useCallback((nextSort: string) => {
    if (!defaultSort) return;

    updateSearchParams((next) => {
      setCanonicalSearchParam(next, 'sort', nextSort, defaultSort);
      next.delete('page');
    });
  }, [defaultSort, updateSearchParams]);

  return {
    q,
    onSearch,
    page,
    setPage,
    replacePage,
    debouncedQ,
    size,
    sort,
    setSort,
    searchParams,
    updateSearchParams,
  };
}
