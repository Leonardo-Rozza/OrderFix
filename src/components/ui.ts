/** Clases reutilizables basadas en los design tokens de OrdenFix. */

export const inputClass = (hasError = false) =>
  `w-full rounded-md border bg-surface px-3.5 py-2.5 text-[14px] text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)] ${
    hasError ? 'border-danger' : 'border-border-strong'
  }`;

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[14px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover disabled:opacity-60';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-4 py-2.5 text-[14px] font-bold text-text transition hover:bg-surface-2';

export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-danger-soft px-4 py-2.5 text-[14px] font-bold text-danger-fg transition hover:border-danger';

export const card = 'rounded-2xl border border-border bg-surface shadow-sm';
