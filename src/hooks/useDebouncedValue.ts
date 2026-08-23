import { useEffect, useState } from 'react';

/** Devuelve `value` con retraso, salvo cuando una restauración debe ser inmediata. */
export const useDebouncedValue = <T>(
  value: T,
  ms = 350,
  immediate = false,
): T => {
  const [snapshot, setSnapshot] = useState({ source: value, debounced: value });

  // React reinicia este render antes de confirmar hijos. Así una restauración
  // inmediata también actualiza el baseline que usará un REPLACE canónico.
  if (immediate && !Object.is(snapshot.source, value)) {
    setSnapshot({ source: value, debounced: value });
  }

  useEffect(() => {
    if (immediate) return undefined;

    const id = setTimeout(() => {
      setSnapshot({ source: value, debounced: value });
    }, ms);
    return () => clearTimeout(id);
  }, [immediate, ms, value]);

  return immediate ? value : snapshot.debounced;
};
