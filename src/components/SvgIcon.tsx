import type { ReactNode } from 'react';

/** Wrapper de ícono SVG (stroke, 24x24) usado por la navegación. */
export const SvgIcon = ({ children }: { children: ReactNode }) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
