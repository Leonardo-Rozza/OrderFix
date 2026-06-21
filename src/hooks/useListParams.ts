import { useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Maneja el estado de un listado paginado server-side: búsqueda (debounced),
 * página y tamaño. Al buscar se vuelve a la página 0.
 */
export const useListParams = (size = 20, initialSort?: string) => {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSortState] = useState<string | undefined>(initialSort);
  const debouncedQ = useDebouncedValue(q.trim(), 350);

  const onSearch = (value: string) => {
    setQ(value);
    setPage(0);
  };

  const setSort = (value: string) => {
    setSortState(value);
    setPage(0);
  };

  return { q, onSearch, page, setPage, debouncedQ, size, sort, setSort };
};
