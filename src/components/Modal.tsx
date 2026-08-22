import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: (invoker?: HTMLElement | null) => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Contenido persistente fuera de la zona desplazable (normalmente FormActions). */
  footer?: ReactNode;
  /** Impide cerrar por Escape, backdrop o el botón de cierre durante una operación crítica. */
  preventClose?: boolean;
  /** Mantiene visible un diálogo inferior, pero lo vuelve inerte mientras hay otra capa activa. */
  suspended?: boolean;
  /** Capa visual del diálogo. `guard` se reserva para confirmaciones sobre formularios. */
  layer?: 'base' | 'guard';
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusOnClose?: boolean;
  restoreFocusOnCloseRef?: RefObject<boolean>;
  showCloseButton?: boolean;
  ariaDescribedBy?: string;
  bodyClassName?: string;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

const getFocusable = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && !element.closest('[hidden]');
  });

let bodyScrollLockCount = 0;
let bodyScrollSnapshot: { overflow: string; overscrollBehavior: string } | null = null;

const lockBodyScroll = () => {
  if (bodyScrollLockCount === 0) {
    bodyScrollSnapshot = {
      overflow: document.body.style.overflow,
      overscrollBehavior: document.body.style.overscrollBehavior,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
  }
  bodyScrollLockCount += 1;

  return () => {
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
    if (bodyScrollLockCount !== 0 || !bodyScrollSnapshot) return;
    document.body.style.overflow = bodyScrollSnapshot.overflow;
    document.body.style.overscrollBehavior = bodyScrollSnapshot.overscrollBehavior;
    bodyScrollSnapshot = null;
  };
};

export const FormActions = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:min-h-0 sm:[&>*]:w-auto ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  preventClose = false,
  suspended = false,
  layer = 'base',
  initialFocusRef,
  restoreFocusRef,
  restoreFocusOnClose = true,
  restoreFocusOnCloseRef,
  showCloseButton = true,
  ariaDescribedBy,
  bodyClassName = '',
}: ModalProps) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const hasAutoFocused = useRef(false);

  // Cerrar con Escape + atrapar el foco dentro del diálogo (Tab cíclico).
  useEffect(() => {
    if (!isOpen || suspended) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // Un control compuesto (por ejemplo Combobox) puede consumir Escape primero.
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (!preventClose) onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = getFocusable(panelRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, preventClose, suspended]);

  // Bloquear el scroll del fondo mientras está abierto.
  useLayoutEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Recordar el invocador al abrir y restaurarlo sólo al cerrar la capa.
  useLayoutEffect(() => {
    if (!isOpen) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    hasAutoFocused.current = false;
    const explicitRestoreTarget = restoreFocusRef?.current;

    return () => {
      hasAutoFocused.current = false;
      if (!restoreFocusOnClose) return;
      const restoreTarget = explicitRestoreTarget ?? lastFocused.current;
      // React limpia los layout effects antes de terminar todas las mutaciones
      // del commit. En WebKit, enfocar en ese instante falla si el destino aún
      // pertenece al modal inferior marcado como `inert`. Esperar al microtask
      // permite que React quite la suspensión antes de restaurar el foco.
      queueMicrotask(() => {
        // Se consulta el valor más reciente a propósito: descartar puede
        // desactivar la restauración después de montar esta capa.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (restoreFocusOnCloseRef?.current === false) return;
        if (!restoreTarget?.isConnected || restoreTarget.closest('[inert]')) return;

        // Si otra capa distinta quedó activa en el mismo commit, su foco
        // inicial tiene prioridad sobre el invocador del modal que cerró.
        const activeDialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
        if (activeDialog && !activeDialog.contains(restoreTarget)) return;

        restoreTarget.focus();
      });
    };
  }, [isOpen, restoreFocusOnClose, restoreFocusOnCloseRef, restoreFocusRef]);

  // Enfocar una sola vez. Suspender/reanudar el modal inferior no roba foco.
  useLayoutEffect(() => {
    if (!isOpen || suspended || hasAutoFocused.current) return;
    hasAutoFocused.current = true;
    const panel = panelRef.current;
    if (!panel) return;
    const body = panel.querySelector<HTMLElement>('[data-modal-body]');
    const initialFocus = initialFocusRef?.current
      ?? (body ? getFocusable(body)[0] : undefined)
      ?? getFocusable(panel)[0]
      ?? panel;
    initialFocus.focus();
  }, [initialFocusRef, isOpen, suspended]);

  if (!isOpen) return null;
  const hasFooter = footer !== undefined && footer !== null;

  const requestClose = (invoker?: HTMLElement | null) => {
    if (!preventClose && !suspended) {
      onClose(invoker ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null));
    }
  };

  const layerClass = layer === 'guard' ? 'z-[90]' : 'z-50';

  return (
    <div
      className={`ofx-modal-viewport fixed inset-0 flex min-h-0 items-end justify-center overflow-hidden sm:items-center sm:p-4 ${layerClass} ${suspended ? 'pointer-events-none' : ''}`}
      data-modal-layer={layer}
      data-modal-suspended={suspended ? 'true' : undefined}
      aria-hidden={suspended ? 'true' : undefined}
      inert={suspended || undefined}
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={() => requestClose()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        data-modal-panel
        role={suspended ? undefined : 'dialog'}
        aria-modal={suspended ? undefined : 'true'}
        aria-labelledby={suspended ? undefined : titleId}
        aria-describedby={suspended ? undefined : ariaDescribedBy}
        tabIndex={-1}
        className={`ofx-modal-panel relative z-10 flex max-h-full w-full min-w-0 flex-col overflow-visible rounded-t-2xl border border-border bg-surface shadow-lg outline-none sm:max-h-[calc(100dvh-2rem)] ${sizeClasses[size]} sm:rounded-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h3 id={titleId} className="min-w-0 flex-1 text-[17px] font-extrabold leading-snug tracking-tight">
            {title}
          </h3>
          {showCloseButton ? (
            <button
              type="button"
              onClick={(event) => requestClose(event.currentTarget)}
              disabled={preventClose || suspended}
              aria-label="Cerrar"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-3 transition hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        <div
          data-modal-body
          className={`ofx-scroll min-h-0 flex-1 overscroll-contain overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 ${hasFooter ? '' : 'ofx-modal-body-no-footer'} ${bodyClassName}`}
        >
          {children}
        </div>

        {hasFooter ? (
          <div className="ofx-modal-footer shrink-0 border-t border-border bg-surface px-4 pt-3 sm:px-6 sm:pb-4 sm:pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};
