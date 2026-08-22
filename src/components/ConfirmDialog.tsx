import { FormActions, Modal } from './Modal';
import { btnGhost, btnDanger } from './ui';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Diálogo de confirmación para acciones destructivas. */
export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Eliminar',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="sm"
    preventClose={loading}
    footer={(
      <FormActions>
        <button type="button" className={btnGhost} onClick={onClose} disabled={loading}>
          Cancelar
        </button>
        <button type="button" className={btnDanger} onClick={onConfirm} disabled={loading}>
          {loading ? 'Procesando…' : confirmLabel}
        </button>
      </FormActions>
    )}
  >
    <p className="text-[14px] leading-relaxed text-text-2">{message}</p>
  </Modal>
);
