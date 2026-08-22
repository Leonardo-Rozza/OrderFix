/** Clases reutilizables basadas en los design tokens de OrdenFix. */

export const inputClass = (hasError = false) =>
  `min-h-11 w-full min-w-0 rounded-md border bg-surface px-3.5 py-2.5 text-base text-text outline-none transition placeholder:text-text-3 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] read-only:cursor-default read-only:bg-surface-2 read-only:text-text-2 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-3 disabled:opacity-70 sm:min-h-0 sm:text-[14px] ${
    hasError ? 'border-danger' : 'border-border-strong'
  }`;

export const btnPrimary =
  'inline-flex min-h-11 min-w-0 touch-manipulation items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[14px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0';

export const btnGhost =
  'inline-flex min-h-11 min-w-0 touch-manipulation items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-4 py-2.5 text-[14px] font-bold text-text transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0';

export const btnDanger =
  'inline-flex min-h-11 min-w-0 touch-manipulation items-center justify-center gap-2 rounded-md border border-transparent bg-danger-soft px-4 py-2.5 text-[14px] font-bold text-danger-fg transition hover:border-danger focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0';

export const card = 'rounded-2xl border border-border bg-surface shadow-sm';
