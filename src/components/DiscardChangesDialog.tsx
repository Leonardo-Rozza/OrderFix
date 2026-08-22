import { useId, useRef } from 'react';
import type { UnsavedChangesCopy } from '../hooks/useUnsavedChangesGuard';
import { FormActions, Modal } from './Modal';
import { btnDanger, btnGhost } from './ui';

interface DiscardChangesDialogProps {
  isOpen: boolean;
  isBusy?: boolean;
  copy?: UnsavedChangesCopy;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
}

export const DiscardChangesDialog = ({
  isOpen,
  isBusy = false,
  copy,
  onContinueEditing,
  onDiscardChanges,
}: DiscardChangesDialogProps) => {
  const descriptionId = useId();
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onContinueEditing}
      title={copy?.title ?? '¿Descartar los cambios?'}
      size="sm"
      layer="guard"
      showCloseButton={false}
      initialFocusRef={continueButtonRef}
      ariaDescribedBy={descriptionId}
      footer={(
        <FormActions>
          <button
            ref={continueButtonRef}
            type="button"
            className={btnGhost}
            onClick={onContinueEditing}
          >
            Seguir editando
          </button>
          <button
            type="button"
            className={btnDanger}
            onClick={onDiscardChanges}
            disabled={isBusy}
          >
            {copy?.discardLabel ?? 'Descartar cambios'}
          </button>
        </FormActions>
      )}
    >
      <div id={descriptionId} className="space-y-2 text-[14px] leading-relaxed text-text-2">
        <p>{copy?.message ?? 'Los datos que modificaste todavía no se guardaron.'}</p>
        {isBusy ? (
          <p role="status" className="font-semibold text-warning">
            Esperá a que termine la operación en curso para poder salir.
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
