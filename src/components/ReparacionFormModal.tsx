import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { ESTADOS_LIST } from '../config/estados';
import {
  useCreateReparacionMutation,
  useUpdateReparacionMutation,
} from '../api/mutations/reparaciones.mutations';
import type { EquipoEnriquecido } from '../hooks/useEnriched';
import type { Reparacion, ReparacionCreate, ReparacionUpdate } from '../types';

const schema = z.object({
  equipoId: z.number({ message: 'Seleccioná un equipo' }).min(1, 'Seleccioná un equipo'),
  descripcionProblema: z.string().min(1, 'Describí el problema'),
  estado: z.enum(['INGRESADO', 'EN_PROCESO', 'ESPERANDO_REPUESTO', 'COMPLETADO', 'ENTREGADO']),
  precioEstimado: z.union([z.number().min(0), z.nan(), z.literal('')]).optional(),
  precioFinal: z.union([z.number().min(0), z.nan(), z.literal('')]).optional(),
  fechaIngreso: z.string().optional().or(z.literal('')),
  fechaEstimadaEntrega: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing: Reparacion | null;
  equipos: EquipoEnriquecido[];
}

const num = (v: number | '' | undefined): number | undefined =>
  v === '' || v === undefined || Number.isNaN(v) ? undefined : v;
const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);

export const ReparacionFormModal = ({ isOpen, onClose, editing, equipos }: Props) => {
  const createMutation = useCreateReparacionMutation();
  const updateMutation = useUpdateReparacionMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'INGRESADO' },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      reset({
        equipoId: editing.equipoId,
        descripcionProblema: editing.descripcionProblema,
        estado: editing.estado,
        precioEstimado: editing.precioEstimado ?? '',
        precioFinal: editing.precioFinal ?? '',
        fechaIngreso: editing.fechaIngreso ?? '',
        fechaEstimadaEntrega: editing.fechaEstimadaEntrega ?? '',
      });
    } else {
      reset({
        equipoId: undefined,
        descripcionProblema: '',
        estado: 'INGRESADO',
        precioEstimado: '',
        precioFinal: '',
        fechaIngreso: new Date().toISOString().slice(0, 10),
        fechaEstimadaEntrega: '',
      });
    }
  }, [isOpen, editing, reset]);

  const onSubmit = async (data: FormData) => {
    const base: ReparacionCreate = {
      equipoId: data.equipoId,
      descripcionProblema: data.descripcionProblema,
      estado: data.estado,
      precioEstimado: num(data.precioEstimado),
      precioFinal: num(data.precioFinal),
      fechaIngreso: str(data.fechaIngreso),
      fechaEstimadaEntrega: str(data.fechaEstimadaEntrega),
    };

    if (editing) {
      const payload: ReparacionUpdate = { id: editing.id, ...base };
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(base);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar reparación' : 'Nueva reparación'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Equipo" required error={errors.equipoId?.message} htmlFor="equipoId">
          <select id="equipoId" {...register('equipoId', { valueAsNumber: true })} className={inputClass(!!errors.equipoId)}>
            <option value="">Seleccioná un equipo</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.marca} {e.modelo}
                {e.cliente ? ` — ${e.cliente.nombre} ${e.cliente.apellido}` : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Problema reportado" required error={errors.descripcionProblema?.message} htmlFor="descripcionProblema">
          <textarea
            id="descripcionProblema"
            rows={3}
            {...register('descripcionProblema')}
            className={`${inputClass(!!errors.descripcionProblema)} resize-none`}
            placeholder="Ej: No carga, pantalla rota, no enciende…"
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Estado" error={errors.estado?.message} htmlFor="estado">
            <select id="estado" {...register('estado')} className={inputClass(!!errors.estado)}>
              {ESTADOS_LIST.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Fecha de ingreso" error={errors.fechaIngreso?.message} htmlFor="fechaIngreso">
            <input id="fechaIngreso" type="date" {...register('fechaIngreso')} className={inputClass(!!errors.fechaIngreso)} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Precio estimado" error={errors.precioEstimado?.message} htmlFor="precioEstimado">
            <input id="precioEstimado" type="number" step="0.01" min="0" {...register('precioEstimado', { valueAsNumber: true })} className={inputClass(!!errors.precioEstimado)} placeholder="0" />
          </FormField>
          <FormField label="Precio final" error={errors.precioFinal?.message} htmlFor="precioFinal">
            <input id="precioFinal" type="number" step="0.01" min="0" {...register('precioFinal', { valueAsNumber: true })} className={inputClass(!!errors.precioFinal)} placeholder="0" />
          </FormField>
        </div>

        <FormField label="Entrega estimada" error={errors.fechaEstimadaEntrega?.message} htmlFor="fechaEstimadaEntrega">
          <input id="fechaEstimadaEntrega" type="date" {...register('fechaEstimadaEntrega')} className={inputClass(!!errors.fechaEstimadaEntrega)} />
        </FormField>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear reparación'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
