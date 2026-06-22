import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { Combobox } from './Combobox';
import { inputClass, btnGhost, btnPrimary } from './ui';
import {
  useCreateEquipoMutation,
  useUpdateEquipoMutation,
} from '../api/mutations/equipos.mutations';
import type { Cliente, Equipo, EquipoCreate, EquipoUpdate } from '../types';

const schema = z.object({
  marca: z.string().min(1, 'La marca es requerida').max(60, 'Máximo 60 caracteres'),
  modelo: z.string().min(1, 'El modelo es requerido').max(60, 'Máximo 60 caracteres'),
  clienteId: z.number({ message: 'Seleccioná un cliente' }).min(1, 'Seleccioná un cliente'),
  imei: z.string().max(30, 'Máximo 30 caracteres').optional().or(z.literal('')),
  color: z.string().max(40, 'Máximo 40 caracteres').optional().or(z.literal('')),
  descripcion: z.string().max(255, 'Máximo 255 caracteres').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing: Equipo | null;
  clientes: Cliente[];
  /** Cliente preseleccionado al crear (p. ej. desde la ficha de un cliente). */
  defaultClienteId?: number;
}

const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);

export const EquipoFormModal = ({ isOpen, onClose, editing, clientes, defaultClienteId }: Props) => {
  const createMutation = useCreateEquipoMutation();
  const updateMutation = useUpdateEquipoMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      marca: editing?.marca ?? '',
      modelo: editing?.modelo ?? '',
      clienteId: editing?.clienteId ?? defaultClienteId ?? undefined,
      imei: editing?.imei ?? '',
      color: editing?.color ?? '',
      descripcion: editing?.descripcion ?? '',
    });
  }, [isOpen, editing, defaultClienteId, reset]);

  const onSubmit = async (data: FormData) => {
    const base: EquipoCreate = {
      marca: data.marca,
      modelo: data.modelo,
      clienteId: data.clienteId,
      imei: str(data.imei),
      color: str(data.color),
      descripcion: str(data.descripcion),
    };

    if (editing) {
      const payload: EquipoUpdate = { id: editing.id, ...base };
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(base);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar equipo' : 'Nuevo equipo'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Marca" required error={errors.marca?.message} htmlFor="marca">
            <input id="marca" type="text" maxLength={60} {...register('marca')} className={inputClass(!!errors.marca)} placeholder="Ej: Apple" />
          </FormField>
          <FormField label="Modelo" required error={errors.modelo?.message} htmlFor="modelo">
            <input id="modelo" type="text" maxLength={60} {...register('modelo')} className={inputClass(!!errors.modelo)} placeholder="Ej: iPhone 11" />
          </FormField>
        </div>

        <FormField label="Cliente" required error={errors.clienteId?.message} htmlFor="clienteId">
          <Controller
            control={control}
            name="clienteId"
            render={({ field }) => (
              <Combobox
                id="clienteId"
                value={field.value}
                onChange={(v) => field.onChange(v)}
                hasError={!!errors.clienteId}
                placeholder="Seleccioná un cliente"
                options={clientes.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} ${c.apellido ?? ''}`.trim(),
                }))}
              />
            )}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="IMEI / Serie" error={errors.imei?.message} htmlFor="imei">
            <input id="imei" type="text" maxLength={30} {...register('imei')} className={inputClass(!!errors.imei)} />
          </FormField>
          <FormField label="Color" error={errors.color?.message} htmlFor="color">
            <input id="color" type="text" maxLength={40} {...register('color')} className={inputClass(!!errors.color)} />
          </FormField>
        </div>

        <FormField label="Descripción" error={errors.descripcion?.message} htmlFor="descripcion">
          <textarea
            id="descripcion"
            rows={3}
            maxLength={255}
            {...register('descripcion')}
            className={`${inputClass(!!errors.descripcion)} resize-none`}
            placeholder="Detalle adicional del equipo…"
          />
        </FormField>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear equipo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
