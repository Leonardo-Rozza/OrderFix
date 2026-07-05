import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Modal } from './Modal';
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

  // Limpiar al cerrar deja el modal fresco para la próxima apertura.
  const handleClose = () => {
    setDescripcion('');
    setError(null);
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = descripcion.trim();
    if (!desc) {
      setError('Contanos qué problema tiene el equipo');
      return;
    }
    const nueva = await reclamo.mutateAsync({ id: reparacion.id, descripcionProblema: desc });
    handleClose();
    navigate(`/reparaciones/${nueva.id}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Reclamo en garantía · ${ordenLabel(reparacion)}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="¿Qué problema tiene ahora?" required error={error ?? undefined} htmlFor="descripcionReclamo">
          <textarea
            id="descripcionReclamo"
            rows={3}
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
        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={handleClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={reclamo.isPending}>
            {reclamo.isPending ? 'Creando…' : 'Crear reclamo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
