import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import {
  useCreateRepuestoMutation,
  useUpdateRepuestoMutation,
} from '../api/mutations/repuestos.mutations';
import type { Reparacion, Repuesto, RepuestoCreate, RepuestoUpdate } from '../types';

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional().or(z.literal('')),
  precio: z.number({ message: 'El precio es requerido' }).min(0, 'Mínimo 0'),
  reparacionId: z.union([z.number(), z.nan(), z.literal('')]).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing: Repuesto | null;
  /** Lista de reparaciones para el selector (no hace falta si reparacionId está fijo). */
  reparaciones?: Reparacion[];
  /** Si viene, el repuesto queda asociado a esa reparación y se oculta el selector. */
  lockedReparacionId?: number;
}

const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);
const repId = (v: number | '' | undefined): number | undefined =>
  v === '' || v === undefined || Number.isNaN(v) ? undefined : v;

export const RepuestoFormModal = ({ isOpen, onClose, editing, reparaciones = [], lockedReparacionId }: Props) => {
  const createMutation = useCreateRepuestoMutation();
  const updateMutation = useUpdateRepuestoMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      nombre: editing?.nombre ?? '',
      descripcion: editing?.descripcion ?? '',
      precio: editing?.precio ?? ('' as unknown as number),
      reparacionId: editing?.reparacionId ?? lockedReparacionId ?? '',
    });
  }, [isOpen, editing, lockedReparacionId, reset]);

  const onSubmit = async (data: FormData) => {
    const base: RepuestoCreate = {
      nombre: data.nombre,
      precio: data.precio,
      descripcion: str(data.descripcion),
      reparacionId: lockedReparacionId ?? repId(data.reparacionId),
    };

    if (editing) {
      const payload: RepuestoUpdate = { id: editing.id, ...base };
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(base);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar repuesto' : 'Nuevo repuesto'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Nombre" required error={errors.nombre?.message} htmlFor="nombre">
          <input id="nombre" type="text" {...register('nombre')} className={inputClass(!!errors.nombre)} placeholder="Ej: Módulo de pantalla" />
        </FormField>

        <FormField label="Descripción" error={errors.descripcion?.message} htmlFor="descripcion">
          <textarea
            id="descripcion"
            rows={2}
            {...register('descripcion')}
            className={`${inputClass(!!errors.descripcion)} resize-none`}
            placeholder="Detalle opcional (calidad, origen…)"
          />
        </FormField>

        <FormField label="Precio" required error={errors.precio?.message} htmlFor="precio">
          <input id="precio" type="number" step="0.01" min="0" {...register('precio', { valueAsNumber: true })} className={inputClass(!!errors.precio)} placeholder="0" />
        </FormField>

        {/* Selector de reparación solo si no viene fijada */}
        {lockedReparacionId === undefined && (
          <FormField label="Reparación asociada" error={errors.reparacionId?.message} htmlFor="reparacionId">
            <select id="reparacionId" {...register('reparacionId', { valueAsNumber: true })} className={inputClass(!!errors.reparacionId)}>
              <option value="">Sin asociar</option>
              {reparaciones.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {r.descripcionProblema.slice(0, 40)}
                  {r.descripcionProblema.length > 40 ? '…' : ''}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear repuesto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
