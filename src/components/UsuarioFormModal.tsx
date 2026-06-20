import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { useCreateUsuarioMutation } from '../api/mutations/usuarios.mutations';
import type { UsuarioCreate } from '../types';

const schema = z.object({
  username: z.string().min(1, 'El usuario es requerido').max(50, 'Máximo 50'),
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['USER', 'ADMIN']),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UsuarioFormModal = ({ isOpen, onClose }: Props) => {
  const createMutation = useCreateUsuarioMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'USER' } });

  useEffect(() => {
    if (isOpen) reset({ username: '', email: '', password: '', role: 'USER' });
  }, [isOpen, reset]);

  const onSubmit = async (data: FormData) => {
    const payload: UsuarioCreate = data;
    await createMutation.mutateAsync(payload);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo empleado" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Usuario" required error={errors.username?.message} htmlFor="username">
          <input id="username" type="text" {...register('username')} className={inputClass(!!errors.username)} placeholder="Ej: juan" />
        </FormField>
        <FormField label="Email" required error={errors.email?.message} htmlFor="email">
          <input id="email" type="email" {...register('email')} className={inputClass(!!errors.email)} placeholder="juan@taller.com" />
        </FormField>
        <FormField label="Contraseña" required error={errors.password?.message} htmlFor="password">
          <input id="password" type="password" {...register('password')} className={inputClass(!!errors.password)} placeholder="Mínimo 6 caracteres" />
        </FormField>
        <FormField label="Rol" error={errors.role?.message} htmlFor="role">
          <select id="role" {...register('role')} className={inputClass(!!errors.role)}>
            <option value="USER">Empleado (USER)</option>
            <option value="ADMIN">Administrador (ADMIN)</option>
          </select>
        </FormField>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando…' : 'Crear empleado'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
