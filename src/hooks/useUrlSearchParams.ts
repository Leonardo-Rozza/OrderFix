import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { SearchParamsNormalizer } from '../lib/urlSearchParams';

const preserveSearchParams: SearchParamsNormalizer = () => undefined;

export type UrlSearchParamsRecipe = (params: URLSearchParams) => void;

export interface UpdateUrlSearchParamsOptions {
  replace?: boolean;
}

/**
 * Expone una única sesión transaccional para los search params de la pantalla.
 * El normalizador se aplica tanto al leer como antes de cada navegación.
 */
export const useUrlSearchParams = (
  normalize: SearchParamsNormalizer = preserveSearchParams,
) => {
  const [routerSearchParams, setRouterSearchParams] = useSearchParams();
  const normalizeRef = useRef(normalize);
  const setRouterSearchParamsRef = useRef(setRouterSearchParams);
  const rawSearch = routerSearchParams.toString();

  useLayoutEffect(() => {
    normalizeRef.current = normalize;
    setRouterSearchParamsRef.current = setRouterSearchParams;
  }, [normalize, setRouterSearchParams]);

  const normalizedSearch = useMemo(() => {
    const next = new URLSearchParams(rawSearch);
    normalize(next);
    return next.toString();
  }, [normalize, rawSearch]);

  const searchParams = useMemo(
    () => new URLSearchParams(normalizedSearch),
    [normalizedSearch],
  );

  useEffect(() => {
    if (rawSearch === normalizedSearch) return;

    setRouterSearchParams(new URLSearchParams(normalizedSearch), {
      replace: true,
      preventScrollReset: true,
    });
  }, [normalizedSearch, rawSearch, setRouterSearchParams]);

  // React Router no encola escritores funcionales. Todos los cambios de una
  // interacción deben agruparse en una sola receta de esta función.
  const updateSearchParams = useCallback((
    recipe: UrlSearchParamsRecipe,
    { replace = false }: UpdateUrlSearchParamsOptions = {},
  ) => {
    setRouterSearchParamsRef.current((current) => {
      const next = new URLSearchParams(current);
      recipe(next);
      normalizeRef.current(next);
      return next;
    }, {
      replace,
      preventScrollReset: true,
    });
  }, []);

  return { searchParams, updateSearchParams };
};
