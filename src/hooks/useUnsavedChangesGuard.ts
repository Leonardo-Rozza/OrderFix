import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useBlocker } from 'react-router';

export interface UnsavedChangesCopy {
  title?: string;
  message?: string;
  discardLabel?: string;
}

export interface UseUnsavedChangesGuardOptions {
  isOpen: boolean;
  isDirty: boolean;
  isBusy?: boolean;
  onClose: () => void;
  copy?: UnsavedChangesCopy;
}

export interface UnsavedChangesGuardResult {
  requestClose: (source?: HTMLElement | { currentTarget: EventTarget | null } | null) => void;
  commitAndClose: () => void;
  isSuspended: boolean;
  dialog: {
    isOpen: boolean;
    isBusy: boolean;
    copy?: UnsavedChangesCopy;
    restoreFocusRef: RefObject<HTMLElement | null>;
    restoreFocusOnCloseRef: RefObject<boolean>;
    onContinueEditing: () => void;
    onDiscardChanges: () => void;
  };
}

/**
 * Coordina el descarte local, las navegaciones del Data Router y beforeunload.
 *
 * React Router sólo soporta un blocker a la vez. Este hook debe vivir en una
 * sesión hija que se monte únicamente mientras el formulario está abierto.
 */
export const useUnsavedChangesGuard = ({
  isOpen,
  isDirty,
  isBusy = false,
  onClose,
  copy,
}: UseUnsavedChangesGuardOptions): UnsavedChangesGuardResult => {
  const [localCloseRequested, setLocalCloseRequested] = useState(false);
  const releasedRef = useRef(false);
  const localCloseInvokerRef = useRef<HTMLElement | null>(null);
  const restoreFocusOnCloseRef = useRef(true);

  useEffect(() => {
    if (isOpen) releasedRef.current = false;
  }, [isOpen]);

  const shouldBlockNavigation = useCallback(
    () => isOpen && !releasedRef.current && (isDirty || isBusy),
    [isBusy, isDirty, isOpen],
  );
  const blocker = useBlocker(shouldBlockNavigation);

  useEffect(() => {
    if (!isOpen || (!isDirty && !isBusy)) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (releasedRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
    return () => window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
  }, [isBusy, isDirty, isOpen]);

  const requestClose = useCallback((
    source?: HTMLElement | { currentTarget: EventTarget | null } | null,
  ) => {
    if (!isOpen || releasedRef.current) return;
    if (isBusy) return;
    if (!isDirty) {
      onClose();
      return;
    }
    const explicitInvoker = source instanceof HTMLElement
      ? source
      : source?.currentTarget instanceof HTMLElement
        ? source.currentTarget
        : null;
    localCloseInvokerRef.current = explicitInvoker
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    restoreFocusOnCloseRef.current = true;
    setLocalCloseRequested(true);
  }, [isBusy, isDirty, isOpen, onClose]);

  const onContinueEditing = useCallback(() => {
    restoreFocusOnCloseRef.current = true;
    setLocalCloseRequested(false);
    if (blocker.state === 'blocked') blocker.reset();
    localCloseInvokerRef.current = null;
  }, [blocker]);

  const onDiscardChanges = useCallback(() => {
    if (isBusy || releasedRef.current) return;

    releasedRef.current = true;
    restoreFocusOnCloseRef.current = false;
    setLocalCloseRequested(false);
    localCloseInvokerRef.current = null;

    if (blocker.state === 'blocked') {
      blocker.proceed();
      onClose();
      return;
    }

    onClose();
  }, [blocker, isBusy, onClose]);

  const commitAndClose = useCallback(() => {
    if (releasedRef.current) return;
    releasedRef.current = true;
    restoreFocusOnCloseRef.current = false;
    setLocalCloseRequested(false);
    localCloseInvokerRef.current = null;
    if (blocker.state === 'blocked') blocker.reset();
    onClose();
  }, [blocker, onClose]);

  const navigationBlocked = blocker.state === 'blocked';
  const isSuspended = isOpen && (localCloseRequested || navigationBlocked);

  useEffect(() => {
    if (isOpen && (isDirty || isBusy)) return;
    if (blocker.state === 'blocked') blocker.reset();
    if (!localCloseRequested) return;

    const timeout = window.setTimeout(() => setLocalCloseRequested(false), 0);
    return () => window.clearTimeout(timeout);
  }, [blocker, isBusy, isDirty, isOpen, localCloseRequested]);

  return {
    requestClose,
    commitAndClose,
    isSuspended,
    dialog: {
      isOpen: isSuspended,
      isBusy,
      copy,
      restoreFocusRef: localCloseInvokerRef,
      restoreFocusOnCloseRef,
      onContinueEditing,
      onDiscardChanges,
    },
  };
};
