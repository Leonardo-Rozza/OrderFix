import type { ComponentProps } from 'react';
import { useTheme } from '../hooks/useTheme';

type ButtonProps = ComponentProps<'button'>;

export const ThemeToggle = (props: Omit<ButtonProps, 'onClick' | 'children'>) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { className = '', ...rest } = props;

  return (
    <button
      type="button"
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      {...rest}
      onClick={toggleTheme}
      className={`grid h-9 w-9 place-items-center rounded-full border border-border-strong bg-surface text-text-2 transition-colors hover:bg-surface-2 hover:text-text ${className}`}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
};
