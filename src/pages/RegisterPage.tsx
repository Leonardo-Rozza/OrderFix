import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { useRegisterMutation } from '../api/mutations/auth.mutations';
import { useAuth } from '../store/auth.store';
import { AuthAside } from '../components/AuthAside';
import { Logo } from '../components/Logo';
import { PasswordInput } from '../components/PasswordInput';
import { useRetryAfter } from '../hooks/useRetryAfter';

const registerSchema = z.object({
  nombreTaller: z.string().trim().min(1, 'El nombre del taller es requerido').max(120, 'Máximo 120 caracteres'),
  telefonoTaller: z.string().trim().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  nombreAdmin: z.string().trim().min(1, 'Tu nombre es requerido').max(50, 'Máximo 50 caracteres'),
  email: z.string().trim().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100, 'Máximo 100 caracteres'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const fieldClass =
  'min-h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-base text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)] sm:text-[14.5px]';
const labelClass = 'mb-1.5 block text-[13px] font-bold';
const errClass = 'mt-1.5 text-[12.5px] text-danger-fg';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const registerMutation = useRegisterMutation();
  const retryAfter = useRetryAfter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const res = await registerMutation.mutateAsync({
        nombreTaller: data.nombreTaller.trim(),
        nombreAdmin: data.nombreAdmin.trim(),
        email: data.email.trim(),
        password: data.password,
        telefonoTaller: data.telefonoTaller || undefined,
      });
      login(res.token, res.email, res.emailVerificado);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      retryAfter.startRetryAfter(error);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <AuthAside />

      <div className="flex items-center justify-center bg-surface px-5 py-8 sm:px-6 sm:py-10">
        <div className="ofx-in w-full max-w-[420px]">
          <Logo size={38} className="mb-2" />

          <h1 className="mb-1.5 mt-[18px] text-[26px] font-extrabold tracking-tight">Creá tu taller</h1>
          <p className="mb-6 text-[14.5px] text-text-2">Empezá gratis. 14 días de prueba, sin tarjeta.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="registro-taller" className={labelClass}>Nombre del taller</label>
              <input id="registro-taller" placeholder="CelExpress" {...register('nombreTaller')} className={fieldClass} aria-invalid={!!errors.nombreTaller} aria-describedby={errors.nombreTaller ? 'registro-taller-error' : undefined} />
              {errors.nombreTaller && <p id="registro-taller-error" role="alert" className={errClass}>{errors.nombreTaller.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="registro-nombre" className={labelClass}>Tu nombre</label>
                <input id="registro-nombre" placeholder="Juan" {...register('nombreAdmin')} className={fieldClass} aria-invalid={!!errors.nombreAdmin} aria-describedby={errors.nombreAdmin ? 'registro-nombre-error' : undefined} />
                {errors.nombreAdmin && <p id="registro-nombre-error" role="alert" className={errClass}>{errors.nombreAdmin.message}</p>}
              </div>
              <div>
                <label htmlFor="registro-telefono" className={labelClass}>Teléfono <span className="font-normal text-text-3">(opcional)</span></label>
                <input id="registro-telefono" type="tel" autoComplete="tel" placeholder="11 3333 4444" {...register('telefonoTaller')} className={fieldClass} aria-invalid={!!errors.telefonoTaller} aria-describedby={errors.telefonoTaller ? 'registro-telefono-error' : undefined} />
                {errors.telefonoTaller && <p id="registro-telefono-error" role="alert" className={errClass}>{errors.telefonoTaller.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="registro-email" className={labelClass}>Email</label>
              <input id="registro-email" type="email" autoComplete="email" placeholder="juan@celexpress.com" {...register('email')} className={fieldClass} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'registro-email-error' : undefined} />
              {errors.email && <p id="registro-email-error" role="alert" className={errClass}>{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="registro-password" className={labelClass}>Contraseña</label>
              <PasswordInput id="registro-password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" {...register('password')} className={fieldClass} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'registro-password-error' : undefined} />
              {errors.password && <p id="registro-password-error" role="alert" className={errClass}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || retryAfter.isCoolingDown}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary py-3.5 text-[15px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:opacity-60"
            >
              {retryAfter.isCoolingDown
                ? `Reintentá en ${retryAfter.secondsRemaining} s`
                : isSubmitting
                  ? 'Creando taller…'
                  : 'Crear taller'}
            </button>
            {retryAfter.isCoolingDown && (
              <p role="status" aria-live="polite" className="text-center text-[12.5px] font-semibold text-warning">
                Demasiados intentos. Esperá antes de volver a crear el taller.
              </p>
            )}
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
