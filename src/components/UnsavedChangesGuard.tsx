import type { ReactNode } from 'react';
import {
  useUnsavedChangesGuard,
  type UnsavedChangesGuardResult,
  type UseUnsavedChangesGuardOptions,
} from '../hooks/useUnsavedChangesGuard';
import { DiscardChangesDialog } from './DiscardChangesDialog';

interface UnsavedChangesGuardProps extends UseUnsavedChangesGuardOptions {
  children: (guard: UnsavedChangesGuardResult) => ReactNode;
}

type ActiveUnsavedChangesGuardProps = Omit<UnsavedChangesGuardProps, 'isOpen'>;

const ActiveUnsavedChangesGuard = ({ children, ...options }: ActiveUnsavedChangesGuardProps) => {
  const guard = useUnsavedChangesGuard({ ...options, isOpen: true });

  return (
    <>
      {children(guard)}
      <DiscardChangesDialog {...guard.dialog} />
    </>
  );
};

/**
 * Monta la única sesión de bloqueo sólo cuando el editor está visible.
 * Esto evita registrar varios `useBlocker` en páginas que conservan modales
 * cerrados en el árbol.
 */
export const UnsavedChangesGuard = ({
  isOpen,
  children,
  ...options
}: UnsavedChangesGuardProps) => {
  if (!isOpen) return null;
  return <ActiveUnsavedChangesGuard {...options}>{children}</ActiveUnsavedChangesGuard>;
};
