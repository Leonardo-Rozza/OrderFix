import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'ordenfix-theme';

const getStoredTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
};

const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialTheme = (): Theme => {
  return getStoredTheme() ?? getSystemTheme();
};

const persistTheme = (theme: Theme) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
};

const clearPersistedTheme = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(THEME_STORAGE_KEY);
  }
};

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme, options?: { persist?: boolean }) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme, options = { persist: true }) => {
    if (options.persist === false) {
      clearPersistedTheme();
    } else {
      persistTheme(theme);
    }
    set({ theme });
    syncThemeClass(theme);
  },
  toggleTheme: () =>
    set((state) => {
      const nextTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
      persistTheme(nextTheme);
      syncThemeClass(nextTheme);
      return { theme: nextTheme };
    }),
}));

export const hasStoredThemePreference = () => getStoredTheme() !== null;

export const syncThemeClass = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  body?.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
};

// Sincronizar inmediatamente al cargar el módulo para evitar FOUC
if (typeof document !== 'undefined') {
  syncThemeClass(getInitialTheme());
}
