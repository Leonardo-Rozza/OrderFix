import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { useCreateUsuarioMutation } from '../api/mutations/usuarios.mutations';
import type { UsuarioCreate } from '../types';
import { PasswordInput } from './PasswordInput';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';

const schema = z.object({
  username: z.string().trim().min(1, 'El usuario es requerido').max(50, 'Máximo 50'),
  email: z.string().trim().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100, 'Máximo 100 caracteres'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const defaults: FormData = { username: '', email: '', password: '' };

export const UsuarioFormModal = ({ isOpen, onClose }: Props) => {
  const createMutation = useCreateUsuarioMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: defaults });

  useEffect(() => {
    if (isOpen) reset(defaults);
  }, [isOpen, reset]);

  const clearAndClose = () => {
    reset(defaults);
    onClose();
  };

  const onSubmit = async (data: FormData, commitAndClose: () => void) => {
    const payload: UsuarioCreate = {
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.password,
      role: 'USER',
    };
    try {
      await createMutation.mutateAsync(payload);
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
      isBusy={createMutation.isPending}
      onClose={clearAndClose}
    >
      {({ requestClose, commitAndClose, isSuspended }) => (
        <Modal
          isOpen
          onClose={requestClose}
          title="Nuevo empleado"
          size="md"
          preventClose={createMutation.isPending}
          suspended={isSuspended}
          footer={(
            <FormActions>
              <button type="button" className={btnGhost} onClick={requestClose} disabled={createMutation.isPending}>
                Cancelar
              </button>
              <button type="submit" form="usuario-form" className={btnPrimary} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando…' : 'Crear empleado'}
              </button>
            </FormActions>
          )}
        >
          <form
            id="usuario-form"
            onSubmit={handleSubmit((data) => onSubmit(data, commitAndClose))}
          >
            <fieldset
              disabled={createMutation.isPending}
              aria-busy={createMutation.isPending}
              className="m-0 min-w-0 space-y-4 border-0 p-0"
            >
            <FormField label="Usuario" required error={errors.username?.message} htmlFor="username">
              <input id="username" type="text" {...register('username')} className={inputClass(!!errors.username)} placeholder="Ej: juan" />
            </FormField>
            <FormField label="Email" required error={errors.email?.message} htmlFor="email">
              <input id="email" type="email" {...register('email')} className={inputClass(!!errors.email)} placeholder="juan@taller.com" />
            </FormField>
            <FormField label="Contraseña" required error={errors.password?.message} htmlFor="password">
              <PasswordInput id="password" autoComplete="new-password" {...register('password')} className={inputClass(!!errors.password)} placeholder="Mínimo 6 caracteres" />
            </FormField>
            </fieldset>
          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
