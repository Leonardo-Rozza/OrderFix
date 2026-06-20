import { useEffect } from 'react';
import { syncThemeClass, useThemeStore } from '../store/theme.store';

/** Sincroniza la clase/atributo de tema en <html> cuando cambia el store. */
export const ThemeBootstrapper = () => {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    syncThemeClass(theme);
  }, [theme]);

  return null;
};
