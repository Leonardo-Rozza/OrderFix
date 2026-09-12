import { useRef, useState, type FormEvent } from 'react';
import { FormField } from './FormField';
import { FormActions, Modal } from './Modal';
import { PasswordInput } from './PasswordInput';
import { btnGhost, btnPrimary } from './ui';

interface Props {
  title: string;
  confirmLabel: string;
  pending: boolean;
  message: string;
  retrySeconds: number;
  onClose: () => void;
  onConfirm: (password: string) => void;
}

/** Se monta por intento: cerrar o enviar descarta la contraseña escrita. */
export const ExportReauthForm = ({ title, confirmLabel, pending, message, retrySeconds, onClose, onConfirm }: Props) => {
  const [password, setPassword] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending || retrySeconds > 0 || !password.trim() || password.length > 100) return;
    onConfirm(password);
    setPassword('');
  };
  return <Modal isOpen onClose={onClose} title={title} size="sm" preventClose={pending}
    initialFocusRef={input} ariaDescribedBy="export-reauth-description"
    footer={<FormActions>
      <button type="button" onClick={onClose} disabled={pending} className={btnGhost}>Volver</button>
      <button type="submit" form="export-reauth-form" className={btnPrimary}
        disabled={pending || retrySeconds > 0 || !password.trim() || password.length > 100}>
        {pending ? 'Confirmando…' : retrySeconds > 0 ? `Reintentá en ${retrySeconds} s` : confirmLabel}
      </button>
    </FormActions>}>
    <form id="export-reauth-form" noValidate onSubmit={submit} className="space-y-4" aria-busy={pending}>
      <p id="export-reauth-description" className="text-sm leading-6 text-text-2">
        Ingresá tu contraseña actual para proteger los datos del taller. Te la pediremos nuevamente en cada descarga.
      </p>
      <FormField label="Contraseña actual" htmlFor="export-password" required>
        <PasswordInput ref={input} id="export-password" name="passwordActual" autoComplete="current-password"
          value={password} onChange={(event) => setPassword(event.target.value)} maxLength={100} disabled={pending}
          aria-describedby={message ? 'export-confirmation-error' : undefined} />
      </FormField>
      {message && <p id="export-confirmation-error" role="alert" className="text-sm leading-6 text-danger-fg">{message}</p>}
      {pending && <p role="status" className="text-sm text-text-2">Esperá la respuesta antes de continuar.</p>}
    </form>
  </Modal>;
};
