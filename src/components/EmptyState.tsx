import type { ReactNode } from 'react';

interface Props {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Estado vacío consistente para listados y paneles. */
export const EmptyState = ({ title, hint, icon, action }: Props) => (
  <div className="px-6 py-12 text-center">
    {icon && <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-text-3">{icon}</div>}
    <div className="text-[15px] font-extrabold">{title}</div>
    {hint && <div className="mt-1 text-[13px] text-text-3">{hint}</div>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);
