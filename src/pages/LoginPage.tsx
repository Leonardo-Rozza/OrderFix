import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { useLoginMutation } from '../api/mutations/auth.mutations';
import { useAuth } from '../store/auth.store';
import { AuthAside } from '../components/AuthAside';
import { Logo } from '../components/Logo';
import { PasswordInput } from '../components/PasswordInput';
import { useRetryAfter } from '../hooks/useRetryAfter';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const fieldClass =
  'min-h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 py-3 pl-11 text-base text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)] sm:text-[14.5px]';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const loginMutation = useLoginMutation();
  const retryAfter = useRetryAfter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await loginMutation.mutateAsync(data);
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
        <div className="ofx-in w-full max-w-[392px]">
          <Logo size={38} className="mb-2" />

          <h1 className="mb-1.5 mt-[18px] text-[26px] font-extrabold tracking-tight">Iniciá sesión</h1>
          <p className="mb-6 text-[14.5px] text-text-2">Ingresá con tu cuenta del taller.</p>

          {location.state?.accessDeactivated === true && <p role="status" className="mb-5 rounded-lg bg-surface-2 p-3 text-sm leading-6 text-text-2">
            Tu acceso fue desactivado. Tus sesiones anteriores ya no permiten ingresar.
          </p>}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-bold">Email</label>
            <div className="relative mb-4">
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-3.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="tecnico@mitaller.com"
                {...register('email')}
                className={fieldClass}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
              />
              {errors.email && <p id="login-email-error" role="alert" className="mt-1.5 text-[12.5px] text-danger-fg">{errors.email.message}</p>}
            </div>

            <label htmlFor="login-password" className="mb-1.5 block text-[13px] font-bold">Contraseña</label>
            <div className="relative mb-5">
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-3.5">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <PasswordInput
                id="login-password"
                autoComplete="current-password"
                placeholder="••••••"
                {...register('password')}
                className={fieldClass}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
              />
              {errors.password && <p id="login-password-error" role="alert" className="mt-1.5 text-[12.5px] text-danger-fg">{errors.password.message}</p>}
              <div className="mt-2 text-right">
                <Link to="/olvide-password" className="text-[12.5px] font-bold text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || retryAfter.isCoolingDown}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary py-3.5 text-[15px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:opacity-60"
            >
              {retryAfter.isCoolingDown
                ? `Reintentá en ${retryAfter.secondsRemaining} s`
                : isSubmitting
                  ? 'Ingresando…'
                  : 'Ingresar'}
              {!isSubmitting && !retryAfter.isCoolingDown && (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              )}
            </button>
            {retryAfter.isCoolingDown && (
              <p role="status" aria-live="polite" className="mt-2 text-center text-[12.5px] font-semibold text-warning">
                Demasiados intentos. Esperá antes de volver a ingresar.
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-[13px] text-text-3">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="font-bold text-primary">
              Creá tu taller
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
