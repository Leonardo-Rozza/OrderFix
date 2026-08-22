import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useBlocker } from 'react-router';
import {
  getUnsavedChangesReleaseEpoch,
  subscribeUnsavedChangesRelease,
} from '../lib/unsavedChangesLifecycle';

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
  /** Cleanup local al abandonar la ruta. No debe iniciar otra navegación. */
  onNavigationDiscard?: () => void;
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

type CloseIntent =
  | { kind: 'local' }
  | {
    kind: 'navigation';
    proceed: (() => void) | null;
    reset: (() => void) | null;
  };

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
  onNavigationDiscard = onClose,
  copy,
}: UseUnsavedChangesGuardOptions): UnsavedChangesGuardResult => {
  const [localCloseRequested, setLocalCloseRequested] = useState(false);
  const releasedRef = useRef(false);
  const releaseEpochRef = useRef(getUnsavedChangesReleaseEpoch());
  const intentRef = useRef<CloseIntent | null>(null);
  const localCloseInvokerRef = useRef<HTMLElement | null>(null);
  const restoreFocusOnCloseRef = useRef(true);

  const isReleased = useCallback(
    () => releasedRef.current
      || releaseEpochRef.current !== getUnsavedChangesReleaseEpoch(),
    [],
  );

  useEffect(() => {
    if (isOpen) releasedRef.current = false;
  }, [isOpen]);

  const shouldBlockNavigation = useCallback(
    () => {
      if (!isOpen || isReleased() || (!isDirty && !isBusy)) return false;
      // React Router reemplaza `blocker.proceed` ante otro Back/PUSH. La
      // intención discriminada se fija en el primer intento y no se reemplaza.
      intentRef.current ??= { kind: 'navigation', proceed: null, reset: null };
      return true;
    },
    [isBusy, isDirty, isOpen, isReleased],
  );
  const blocker = useBlocker(shouldBlockNavigation);

  useLayoutEffect(() => {
    if (blocker.state !== 'blocked') return;
    const intent = intentRef.current;
    if (intent?.kind === 'navigation' && intent.proceed === null) {
      intent.proceed = blocker.proceed;
      intent.reset = blocker.reset;
    }
  }, [blocker]);

  useEffect(() => subscribeUnsavedChangesRelease(() => {
    releasedRef.current = true;
    intentRef.current = null;
    restoreFocusOnCloseRef.current = false;
    localCloseInvokerRef.current = null;
    setLocalCloseRequested(false);
    if (blocker.state === 'blocked') blocker.reset();
  }), [blocker]);

  useEffect(() => {
    if (!isOpen || (!isDirty && !isBusy)) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isReleased()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
    return () => window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
  }, [isBusy, isDirty, isOpen, isReleased]);

  const requestClose = useCallback((
    source?: HTMLElement | { currentTarget: EventTarget | null } | null,
  ) => {
    if (!isOpen || isReleased() || intentRef.current !== null) return;
    if (isBusy) return;
    if (!isDirty) {
      onClose();
      return;
    }
    intentRef.current = { kind: 'local' };
    const explicitInvoker = source instanceof HTMLElement
      ? source
      : source?.currentTarget instanceof HTMLElement
        ? source.currentTarget
        : null;
    localCloseInvokerRef.current = explicitInvoker
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    restoreFocusOnCloseRef.current = true;
    setLocalCloseRequested(true);
  }, [isBusy, isDirty, isOpen, isReleased, onClose]);

  const onContinueEditing = useCallback(() => {
    const intent = intentRef.current;
    restoreFocusOnCloseRef.current = true;
    setLocalCloseRequested(false);
    if (blocker.state === 'blocked') {
      if (intent?.kind === 'navigation') (intent.reset ?? blocker.reset)();
      else blocker.reset();
    }
    intentRef.current = null;
    localCloseInvokerRef.current = null;
  }, [blocker]);

  const onDiscardChanges = useCallback(() => {
    if (isBusy || isReleased()) return;

    const intent = intentRef.current;
    releasedRef.current = true;
    restoreFocusOnCloseRef.current = false;
    setLocalCloseRequested(false);
    localCloseInvokerRef.current = null;
    intentRef.current = null;

    if (intent?.kind === 'navigation') {
      const proceed = intent.proceed
        ?? (blocker.state === 'blocked' ? blocker.proceed : null);
      proceed?.();
      onNavigationDiscard();
      return;
    }

    // Si el diálogo nació de un cierre local, cualquier Back/PUSH posterior se
    // cancela: descartar sólo cierra el formulario que originó la intención.
    if (blocker.state === 'blocked') blocker.reset();
    onClose();
  }, [blocker, isBusy, isReleased, onClose, onNavigationDiscard]);

  const commitAndClose = useCallback(() => {
    if (isReleased()) return;
    releasedRef.current = true;
    restoreFocusOnCloseRef.current = false;
    setLocalCloseRequested(false);
    localCloseInvokerRef.current = null;
    intentRef.current = null;
    if (blocker.state === 'blocked') blocker.reset();
    onClose();
  }, [blocker, isReleased, onClose]);

  const navigationBlocked = blocker.state === 'blocked';
  const isSuspended = isOpen && (localCloseRequested || navigationBlocked);

  useEffect(() => {
    if (isOpen && (isDirty || isBusy)) return;
    if (blocker.state === 'blocked') blocker.reset();
    intentRef.current = null;
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
