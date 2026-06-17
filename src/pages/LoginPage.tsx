import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { useLoginMutation } from '../api/mutations/auth.mutations';
import { useAuth } from '../store/auth.store';
import { AuthAside } from '../components/AuthAside';
import { Logo } from '../components/Logo';

const loginSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const fieldClass =
  'w-full rounded-md border border-border-strong bg-surface px-3.5 py-3 pl-11 text-[14.5px] text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    const res = await loginMutation.mutateAsync(data);
    login(res.token, res.email);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthAside />

      <div className="flex items-center justify-center bg-bg px-6 py-10">
        <div className="ofx-in w-full max-w-[392px]">
          <Logo size={38} className="mb-2" />

          <h1 className="mb-1.5 mt-[18px] text-[26px] font-extrabold tracking-tight">Iniciá sesión</h1>
          <p className="mb-6 text-[14.5px] text-text-2">Ingresá con tu cuenta del taller.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <label className="mb-1.5 block text-[13px] font-bold">Email</label>
            <div className="relative mb-4">
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-3.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <input
                type="email"
                autoComplete="email"
                placeholder="tecnico@mitaller.com"
                {...register('email')}
                className={fieldClass}
              />
              {errors.email && <p className="mt-1.5 text-[12.5px] text-danger-fg">{errors.email.message}</p>}
            </div>

            <label className="mb-1.5 block text-[13px] font-bold">Contraseña</label>
            <div className="relative mb-5">
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-3.5">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••"
                {...register('password')}
                className={fieldClass}
              />
              {errors.password && <p className="mt-1.5 text-[12.5px] text-danger-fg">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3.5 text-[15px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
            >
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
              {!isSubmitting && (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              )}
            </button>
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
