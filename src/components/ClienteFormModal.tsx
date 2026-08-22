import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { FormField } from './FormField';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { inputClass, btnGhost, btnPrimary } from './ui';
import {
  useCreateClienteMutation,
  useUpdateClienteMutation,
} from '../api/mutations/clientes.mutations';
import type { Cliente, ClienteCreate, ClienteUpdate } from '../types';

const schema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido').max(60, 'Máximo 60 caracteres'),
  apellido: z.string().trim().min(1, 'El apellido es requerido').max(60, 'Máximo 60 caracteres'),
  telefono: z.string().trim().min(1, 'El teléfono es requerido').max(20, 'Máximo 20 caracteres'),
  email: z.string().trim().max(120).refine(
    (value) => value === '' || z.string().email().safeParse(value).success,
    'Email inválido',
  ).optional(),
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
    formState: { errors, isDirty },
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

  const onSubmit = async (data: FormData, commitAndClose: () => void) => {
    const base: ClienteCreate = {
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      telefono: data.telefono.trim(),
      email: str(data.email),
      direccion: str(data.direccion),
    };

    try {
      if (editing) {
        const payload: ClienteUpdate = { id: editing.id, ...base };
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(base);
      }
    } catch {
      // La mutación muestra el error; el formulario y su guard quedan activos.
      return;
    }
    commitAndClose();
  };

  return (
    <UnsavedChangesGuard
      isOpen={isOpen}
      isDirty={isDirty}
      isBusy={saving}
      onClose={onClose}
    >
      {({ requestClose, commitAndClose, isSuspended }) => (
        <Modal
          isOpen
          onClose={requestClose}
          title={editing ? 'Editar cliente' : 'Nuevo cliente'}
          size="md"
          preventClose={saving}
          suspended={isSuspended}
          footer={(
            <FormActions>
              <button type="button" className={btnGhost} onClick={requestClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" form="cliente-form" className={btnPrimary} disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </FormActions>
          )}
        >
          <form
            id="cliente-form"
            onSubmit={handleSubmit((data) => onSubmit(data, commitAndClose))}
            aria-busy={saving}
          >
            <fieldset disabled={saving} className="m-0 min-w-0 space-y-4 border-0 p-0">
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
            </fieldset>
          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
