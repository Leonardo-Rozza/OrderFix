import { useEffect, useState } from 'react';

/** Devuelve `value` con un retraso de `ms` (para búsquedas que no peguen en cada tecla). */
export const useDebouncedValue = <T>(value: T, ms = 350): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
};
