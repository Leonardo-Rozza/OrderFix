import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Logo } from '../components/Logo';
import { inputClass, btnPrimary } from '../components/ui';
import { useResetPasswordMutation } from '../api/mutations/auth.mutations';
import { PasswordInput } from '../components/PasswordInput';
import { useRetryAfter } from '../hooks/useRetryAfter';

/**
 * Pantalla a la que llega el link del email ({front}/reset-password?token=...).
 * Pide la contraseña nueva y la resetea; el token es de un solo uso y vence en 1 h.
 */
export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const reset = useResetPasswordMutation();
  const retryAfter = useRetryAfter();

  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password.length > 100) {
      setError('La contraseña puede tener hasta 100 caracteres');
      return;
    }
    if (password !== repetir) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      await reset.mutateAsync({ token, nuevaPassword: password });
      navigate('/login', { replace: true });
    } catch (mutationError) {
      retryAfter.startRetryAfter(mutationError);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-6 text-text sm:px-6 sm:py-10">
      <div className="ofx-in w-full max-w-[420px] rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <Logo size={36} className="mb-5" />
        {!token ? (
          <>
            <h1 className="text-[20px] font-extrabold tracking-tight">Link inválido</h1>
            <p className="mt-2 text-[14px] text-text-2">
              A este link le falta el código. Abrí el enlace completo desde el email, o pedí uno nuevo.
            </p>
            <Link to="/olvide-password" className="mt-6 block text-center text-[13.5px] font-bold text-primary hover:underline">
              Pedir un link nuevo
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-[20px] font-extrabold tracking-tight">Creá tu nueva contraseña</h1>
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="nueva" className="mb-1.5 block text-[13px] font-bold">
                  Nueva contraseña
                </label>
                <PasswordInput
                  id="nueva"
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className={inputClass(!!error)}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'reset-password-error' : undefined}
                />
              </div>
              <div>
                <label htmlFor="repetir" className="mb-1.5 block text-[13px] font-bold">
                  Repetila
                </label>
                <PasswordInput
                  id="repetir"
                  autoComplete="new-password"
                  placeholder="La misma de arriba"
                  value={repetir}
                  onChange={(e) => {
                    setRepetir(e.target.value);
                    if (error) setError(null);
                  }}
                  className={inputClass(!!error)}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'reset-password-error' : undefined}
                />
              </div>
              {error && (
                <p id="reset-password-error" role="alert" className="text-[12.5px] font-semibold text-danger-fg">
                  {error}
                </p>
              )}
              <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={reset.isPending || retryAfter.isCoolingDown}>
                {retryAfter.isCoolingDown
                  ? `Reintentá en ${retryAfter.secondsRemaining} s`
                  : reset.isPending
                    ? 'Guardando…'
                    : 'Cambiar contraseña'}
              </button>
              {retryAfter.isCoolingDown && (
                <p role="status" aria-live="polite" className="text-center text-[12.5px] font-semibold text-warning">
                  Demasiadas solicitudes. Esperá antes de volver a guardar.
                </p>
              )}
            </form>
            <p className="mt-4 text-center text-[12px] text-text-3">
              ¿El link venció?{' '}
              <Link to="/olvide-password" className="font-bold text-primary hover:underline">
                Pedí uno nuevo
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
