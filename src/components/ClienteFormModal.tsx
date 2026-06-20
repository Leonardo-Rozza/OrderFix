import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import {
  useCreateClienteMutation,
  useUpdateClienteMutation,
} from '../api/mutations/clientes.mutations';
import type { Cliente, ClienteCreate, ClienteUpdate } from '../types';

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(60, 'Máximo 60 caracteres'),
  apellido: z.string().min(1, 'El apellido es requerido').max(60, 'Máximo 60 caracteres'),
  telefono: z.string().min(1, 'El teléfono es requerido').max(20, 'Máximo 20 caracteres'),
  email: z.string().email('Email inválido').max(120).optional().or(z.literal('')),
  direccion: z.string().max(255, 'Máximo 255 caracteres').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing: Cliente | null;
}

const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);

export const ClienteFormModal = ({ isOpen, onClose, editing }: Props) => {
  const createMutation = useCreateClienteMutation();
  const updateMutation = useUpdateClienteMutation();
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
      apellido: editing?.apellido ?? '',
      telefono: editing?.telefono ?? '',
      email: editing?.email ?? '',
      direccion: editing?.direccion ?? '',
    });
  }, [isOpen, editing, reset]);

  const onSubmit = async (data: FormData) => {
    const base: ClienteCreate = {
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      email: str(data.email),
      direccion: str(data.direccion),
    };

    if (editing) {
      const payload: ClienteUpdate = { id: editing.id, ...base };
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(base);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar cliente' : 'Nuevo cliente'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nombre" required error={errors.nombre?.message} htmlFor="nombre">
            <input id="nombre" type="text" maxLength={60} {...register('nombre')} className={inputClass(!!errors.nombre)} />
          </FormField>
          <FormField label="Apellido" required error={errors.apellido?.message} htmlFor="apellido">
            <input id="apellido" type="text" maxLength={60} {...register('apellido')} className={inputClass(!!errors.apellido)} />
          </FormField>
        </div>

        <FormField label="Teléfono" required error={errors.telefono?.message} htmlFor="telefono">
          <input id="telefono" type="tel" maxLength={20} {...register('telefono')} className={inputClass(!!errors.telefono)} placeholder="+54 9 11 5555-1234" />
        </FormField>

        <FormField label="Email" error={errors.email?.message} htmlFor="email">
          <input id="email" type="email" maxLength={120} {...register('email')} className={inputClass(!!errors.email)} placeholder="cliente@email.com" />
        </FormField>

        <FormField label="Dirección" error={errors.direccion?.message} htmlFor="direccion">
          <input id="direccion" type="text" maxLength={255} {...register('direccion')} className={inputClass(!!errors.direccion)} />
        </FormField>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
