import { useState } from 'react';
import { useNavigate } from 'react-router';
import { FormActions, Modal } from './Modal';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { useReclamoGarantiaMutation } from '../api/mutations/reparaciones.mutations';
import { ordenLabel } from '../utils/reparacion';
import type { Reparacion } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reparacion: Reparacion;
}

/**
 * Crea un reclamo en garantía: una reparación nueva vinculada a la original.
 * No consume cupo del plan y arranca sin precio (se cobra solo si el
 * diagnóstico revela una falla ajena a la reparación original).
 */
export const ReclamoGarantiaModal = ({ isOpen, onClose, reparacion }: Props) => {
  const navigate = useNavigate();
  const reclamo = useReclamoGarantiaMutation();
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);

  // El reset sólo ocurre cuando el cierre ya fue aceptado o el alta terminó.
  const resetAndClose = () => {
    setDescripcion('');
    setError(null);
    onClose();
  };

  const onSubmit = async (e: React.FormEvent, commitAndClose: () => void) => {
    e.preventDefault();
    const desc = descripcion.trim();
    if (!desc) {
      setError('Contanos qué problema tiene el equipo');
      return;
    }
    let nueva: Reparacion;
    try {
      nueva = await reclamo.mutateAsync({ id: reparacion.id, descripcionProblema: desc });
    } catch {
      return;
    }
    commitAndClose();
    navigate(`/reparaciones/${nueva.id}`);
  };

  return (
    <UnsavedChangesGuard
      isOpen={isOpen}
      isDirty={descripcion.trim() !== ''}
      isBusy={reclamo.isPending}
      onClose={resetAndClose}
    >
      {(guard) => (
        <Modal
          isOpen
          onClose={guard.requestClose}
          title={`Reclamo en garantía · ${ordenLabel(reparacion)}`}
          preventClose={reclamo.isPending}
          suspended={guard.isSuspended}
          footer={(
            <FormActions>
              <button type="button" className={btnGhost} onClick={guard.requestClose} disabled={reclamo.isPending}>
                Cancelar
              </button>
              <button type="submit" form="reclamo-garantia-form" className={btnPrimary} disabled={reclamo.isPending}>
                {reclamo.isPending ? 'Creando…' : 'Crear reclamo'}
              </button>
            </FormActions>
          )}
        >
          <form
            id="reclamo-garantia-form"
            onSubmit={(event) => onSubmit(event, guard.commitAndClose)}
            aria-busy={reclamo.isPending}
          >
            <fieldset disabled={reclamo.isPending} className="m-0 min-w-0 space-y-4 border-0 p-0">
            <FormField label="¿Qué problema tiene ahora?" required error={error ?? undefined} htmlFor="descripcionReclamo">
              <textarea
                id="descripcionReclamo"
                rows={3}
                maxLength={255}
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  if (error) setError(null);
                }}
                className={`${inputClass(!!error)} resize-none`}
                placeholder="Ej: la pantalla volvió a fallar, no responde el táctil…"
              />
            </FormField>
            <p className="text-[12.5px] text-text-3">
              Se crea una orden nueva vinculada a esta, sin precio y sin consumir el cupo mensual del plan.
              Se cobra solo si el diagnóstico revela una falla ajena (golpe o mojadura nueva).
            </p>
            </fieldset>
          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
