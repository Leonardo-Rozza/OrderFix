import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { useRegisterMutation } from '../api/mutations/auth.mutations';
import { useAuth } from '../store/auth.store';
import { AuthAside } from '../components/AuthAside';
import { Logo } from '../components/Logo';

const registerSchema = z.object({
  nombreTaller: z.string().min(1, 'El nombre del taller es requerido').max(120, 'Máximo 120 caracteres'),
  telefonoTaller: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  nombreAdmin: z.string().min(1, 'Tu nombre es requerido').max(50, 'Máximo 50 caracteres'),
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100, 'Máximo 100 caracteres'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const fieldClass =
  'w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14.5px] text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]';
const labelClass = 'mb-1.5 block text-[13px] font-bold';
const errClass = 'mt-1.5 text-[12.5px] text-danger-fg';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    const res = await registerMutation.mutateAsync({
      nombreTaller: data.nombreTaller,
      nombreAdmin: data.nombreAdmin,
      email: data.email,
      password: data.password,
      telefonoTaller: data.telefonoTaller?.trim() ? data.telefonoTaller : undefined,
    });
    login(res.token, res.email);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthAside />

      <div className="flex items-center justify-center bg-surface px-6 py-10">
        <div className="ofx-in w-full max-w-[420px]">
          <Logo size={38} className="mb-2" />

          <h1 className="mb-1.5 mt-[18px] text-[26px] font-extrabold tracking-tight">Creá tu taller</h1>
          <p className="mb-6 text-[14.5px] text-text-2">Empezá gratis. 14 días de prueba, sin tarjeta.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label className={labelClass}>Nombre del taller</label>
              <input placeholder="CelExpress" {...register('nombreTaller')} className={fieldClass} />
              {errors.nombreTaller && <p className={errClass}>{errors.nombreTaller.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Tu nombre</label>
                <input placeholder="Juan" {...register('nombreAdmin')} className={fieldClass} />
                {errors.nombreAdmin && <p className={errClass}>{errors.nombreAdmin.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Teléfono <span className="font-normal text-text-3">(opcional)</span></label>
                <input placeholder="11 3333 4444" {...register('telefonoTaller')} className={fieldClass} />
                {errors.telefonoTaller && <p className={errClass}>{errors.telefonoTaller.message}</p>}
              </div>
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input type="email" autoComplete="email" placeholder="juan@celexpress.com" {...register('email')} className={fieldClass} />
              {errors.email && <p className={errClass}>{errors.email.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Contraseña</label>
              <input type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" {...register('password')} className={fieldClass} />
              {errors.password && <p className={errClass}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3.5 text-[15px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
            >
              {isSubmitting ? 'Creando taller…' : 'Crear taller'}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-text-3">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="font-bold text-primary">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
