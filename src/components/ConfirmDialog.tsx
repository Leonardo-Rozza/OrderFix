import { Modal } from './Modal';
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
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
    <p className="text-[14px] leading-relaxed text-text-2">{message}</p>
    <div className="mt-6 flex justify-end gap-3">
      <button type="button" className={btnGhost} onClick={onClose}>
        Cancelar
      </button>
      <button type="button" className={btnDanger} onClick={onConfirm} disabled={loading}>
        {loading ? 'Eliminando…' : confirmLabel}
      </button>
    </div>
  </Modal>
);
