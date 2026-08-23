import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAnularCobroMutation } from '../api/mutations/cobros.mutations';
import { getApiErrorBody } from '../api/errors';
import { metodoLabel } from '../config/cobros';
import type { Cobro } from '../types';
import { formatMoney } from '../utils/format';
import { FormField } from './FormField';
import { FormActions, Modal } from './Modal';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { btnDanger, btnGhost, inputClass } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reparacionId: number;
  cobro: Cobro | null;
}

/**
 * Registra una anulación auditable. El cobro no desaparece: el motivo queda
 * ligado al movimiento y la lista se reconcilia si otra sesión se adelantó.
 */
export const CobroAnulacionModal = ({ isOpen, onClose, reparacionId, cobro }: Props) => {
  const anular = useAnularCobroMutation(reparacionId);
  const [motivo, setMotivo] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflictoCobroId, setConflictoCobroId] = useState<number | null>(null);
  const motivoRef = useRef<HTMLTextAreaElement>(null);
  const conflictoRef = useRef<HTMLDivElement>(null);
  const yaAnulado = cobro?.estado === 'ANULADO' || conflictoCobroId === cobro?.id;

  useEffect(() => {
    if (isOpen && yaAnulado) conflictoRef.current?.focus();
  }, [isOpen, yaAnulado]);

  const resetAndClose = () => {
    setMotivo('');
    setValidationError(null);
    setConflictoCobroId(null);
    onClose();
  };

  const onSubmit = async (event: FormEvent, commitAndClose: () => void) => {
    event.preventDefault();
    if (!cobro || yaAnulado) return;

    const motivoNormalizado = motivo.trim();
    if (!motivoNormalizado) {
      setValidationError('El motivo es requerido');
      motivoRef.current?.focus();
      return;
    }
    if (motivoNormalizado.length > 255) {
      setValidationError('Máximo 255 caracteres');
      motivoRef.current?.focus();
      return;
    }

    try {
      await anular.mutateAsync({ cobroId: cobro.id, motivo: motivoNormalizado });
    } catch (error) {
      const apiError = getApiErrorBody(error);
      if (apiError?.code === 'COBRO_YA_ANULADO') {
        setConflictoCobroId(cobro.id);
      }
      // El conflicto se explica en este modal; el resto conserva el toast de la
      // mutación. En ningún caso se pierden el motivo ni el guard del formulario.
      return;
    }

    commitAndClose();
  };

  return (
    <UnsavedChangesGuard
      isOpen={isOpen && !!cobro}
      isDirty={!yaAnulado && motivo !== ''}
      isBusy={anular.isPending}
      onClose={resetAndClose}
    >
      {({ requestClose, commitAndClose, isSuspended }) => (
        <Modal
          isOpen
          onClose={requestClose}
          title="Anular cobro"
          size="sm"
          preventClose={anular.isPending}
          suspended={isSuspended}
          initialFocusRef={motivoRef}
          footer={(
            <FormActions>
              <button type="button" className={btnGhost} onClick={requestClose} disabled={anular.isPending}>
                {yaAnulado ? 'Listo' : 'Cancelar'}
              </button>
              <button
                type="submit"
                form="cobro-anulacion-form"
                className={btnDanger}
                disabled={anular.isPending || yaAnulado}
              >
                {anular.isPending ? 'Anulando…' : 'Anular cobro'}
              </button>
            </FormActions>
          )}
        >
          <form
            id="cobro-anulacion-form"
            onSubmit={(event) => onSubmit(event, commitAndClose)}
            aria-busy={anular.isPending}
            className="space-y-4"
          >
            <div className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] text-text-2">
              <div className="font-semibold text-text">
                {cobro ? `${metodoLabel(cobro.metodo)} · ${formatMoney(cobro.monto)}` : '—'}
              </div>
              El movimiento se conservará en el historial de la orden.
            </div>

            {yaAnulado && (
              <div
                ref={conflictoRef}
                role="alert"
                tabIndex={-1}
                className="rounded-lg border border-warning bg-warning-soft px-3 py-2.5 text-[13px] font-semibold text-warning focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
              >
                Este cobro ya fue anulado. Actualizamos el historial con el estado vigente.
              </div>
            )}

            <fieldset disabled={anular.isPending || yaAnulado} className="m-0 min-w-0 border-0 p-0">
              <FormField
                label="Motivo de anulación"
                required
                error={validationError ?? undefined}
                htmlFor="motivo-anulacion"
              >
                <textarea
                  ref={motivoRef}
                  id="motivo-anulacion"
                  rows={3}
                  maxLength={255}
                  value={motivo}
                  onChange={(event) => {
                    setMotivo(event.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  className={`${inputClass(!!validationError)} resize-none`}
                  placeholder="Ej: carga duplicada"
                />
              </FormField>
            </fieldset>
          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
