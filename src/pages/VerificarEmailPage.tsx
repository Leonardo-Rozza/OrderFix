import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Logo } from '../components/Logo';
import { inputClass, btnPrimary } from '../components/ui';
import {
  useVerificarEmailMutation,
  useReenviarVerificacionMutation,
} from '../api/mutations/auth.mutations';
import { authStore } from '../store/auth.store';

/**
 * Pantalla del link del email de bienvenida ({front}/verificar-email?token=...).
 * La verificación se dispara con un click (no al montar): el token es de un
 * solo uso y los escáneres de los clientes de email pre-abren los links.
 */
export const VerificarEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const verificar = useVerificarEmailMutation();
  const reenviar = useReenviarVerificacionMutation();
  const [emailReenvio, setEmailReenvio] = useState('');

  const confirmar = () =>
    verificar.mutate(token, {
      onSuccess: () => {
        // Si además hay sesión abierta, apagar el banner de "confirmá tu email".
        if (authStore.getState().isAuthenticated) authStore.getState().marcarEmailVerificado();
      },
    });

  const estado = !token ? 'sin-token' : verificar.isSuccess ? 'ok' : verificar.isError ? 'error' : 'confirmar';

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 py-10 text-text">
      <div className="ofx-in w-full max-w-[420px] rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <Logo size={36} className="mx-auto mb-5" />

        {estado === 'confirmar' && (
          <>
            <h1 className="text-[20px] font-extrabold tracking-tight">Confirmá tu email</h1>
            <p className="mt-2 text-[14px] text-text-2">Un click y listo: tu cuenta queda verificada.</p>
            <button
              type="button"
              onClick={confirmar}
              disabled={verificar.isPending}
              className={`${btnPrimary} mt-6 w-full py-3`}
            >
              {verificar.isPending ? 'Verificando…' : 'Confirmar mi email'}
            </button>
          </>
        )}

        {estado === 'ok' && (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success-soft text-success">
              <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <h1 className="mt-4 text-[20px] font-extrabold tracking-tight">¡Email verificado! ✅</h1>
            <p className="mt-2 text-[14px] text-text-2">Tu cuenta quedó confirmada.</p>
            <Link to="/dashboard" className={`${btnPrimary} mt-6 w-full py-3`}>
              Ir a OrdenFix
            </Link>
          </>
        )}

        {(estado === 'error' || estado === 'sin-token') && (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning-soft text-warning">
              <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
            </span>
            <h1 className="mt-4 text-[20px] font-extrabold tracking-tight">
              {estado === 'sin-token' ? 'Link incompleto' : 'El link no es válido o venció'}
            </h1>
            <p className="mt-2 text-[14px] text-text-2">
              Ingresá tu email y te mandamos uno nuevo (vence a las 48 horas).
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (emailReenvio.trim()) reenviar.mutate(emailReenvio.trim());
              }}
              className="mt-5 space-y-3"
            >
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="tecnico@mitaller.com"
                value={emailReenvio}
                onChange={(e) => setEmailReenvio(e.target.value)}
                className={inputClass()}
                aria-label="Email"
              />
              <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={reenviar.isPending}>
                {reenviar.isPending ? 'Enviando…' : 'Reenviar email de verificación'}
              </button>
            </form>
            <Link to="/login" className="mt-5 block text-[13px] font-bold text-text-2 hover:text-primary">
              ← Ir a iniciar sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
