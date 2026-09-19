import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { Logo } from '../components/Logo';
import { inputClass, btnPrimary } from '../components/ui';
import {
  useVerificarEmailMutation,
  useReenviarVerificacionMutation,
} from '../api/mutations/auth.mutations';
import { refreshCurrentSessionProfile } from '../api/queries/perfil.queries';
import { useRetryAfter } from '../hooks/useRetryAfter';
import { getHttpStatus } from '../utils/retryAfter';

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
  const client = useQueryClient();
  const retryAfter = useRetryAfter();
  const [refreshState, setRefreshState] = useState<'idle' | 'pending' | 'error' | 'unverified' | 'done'>('idle');

  const refreshSession = async () => {
    setRefreshState('pending');
    try {
      const profile = await refreshCurrentSessionProfile(client);
      setRefreshState(profile?.usuario.emailVerificado === false ? 'unverified' : 'done');
    } catch {
      setRefreshState('error');
    }
  };

  const confirmar = () =>
    verificar.mutate(token, {
      onSuccess: () => void refreshSession(),
      onError: retryAfter.startRetryAfter,
    });

  const status = getHttpStatus(verificar.error);
  const invalidToken = verificar.isError && (status === 400 || status === 404 || status === 410);
  const estado = !token ? 'sin-token' : verificar.isSuccess ? 'ok' : invalidToken ? 'error' : 'confirmar';

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-6 text-text sm:px-6 sm:py-10">
      <div className="ofx-in w-full max-w-[420px] rounded-2xl border border-border bg-surface p-5 text-center shadow-sm sm:p-8">
        <Logo size={36} className="mx-auto mb-5" />

        {estado === 'confirmar' && (
          <>
            <h1 className="text-[20px] font-extrabold tracking-tight">Confirmá tu email</h1>
            <p className="mt-2 text-[14px] text-text-2">Un click y listo: tu cuenta queda verificada.</p>
            <button
              type="button"
              onClick={confirmar}
              disabled={verificar.isPending || retryAfter.isCoolingDown}
              className={`${btnPrimary} mt-6 w-full py-3`}
            >
              {retryAfter.isCoolingDown ? `Reintentá en ${retryAfter.secondsRemaining} s` : verificar.isPending ? 'Verificando…' : 'Confirmar mi email'}
            </button>
            {verificar.isError && <p role="alert" className="mt-3 text-[13px] text-text-2">
              {retryAfter.isCoolingDown ? 'Demasiadas solicitudes. Esperá antes de volver a intentar.' : 'No pudimos verificar el email. Intentá de nuevo.'}
            </p>}
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
            <p className="mt-2 text-[14px] text-text-2">El email de este enlace quedó confirmado.</p>
            {refreshState === 'pending' && <p role="status" className="mt-3 text-[13px] text-text-2">Actualizando la sesión abierta…</p>}
            {refreshState === 'unverified' && <p role="status" className="mt-3 text-[13px] text-text-2">La sesión abierta todavía necesita confirmar su propio email.</p>}
            {refreshState === 'error' && <div className="mt-3 text-[13px] text-text-2">
              <p role="alert">El email se confirmó, pero no pudimos actualizar la sesión abierta.</p>
              <button type="button" onClick={() => void refreshSession()} className="min-h-11 px-3 font-bold text-primary underline">Reintentar actualización</button>
            </div>}
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
                if (emailReenvio.trim() && !reenviar.isPending && !retryAfter.isCoolingDown) {
                  reenviar.mutate(emailReenvio.trim(), { onError: retryAfter.startRetryAfter });
                }
              }}
              className="mt-5 space-y-3"
            >
              <label htmlFor="verificacion-email" className="sr-only">Email</label>
              <input
                id="verificacion-email"
                type="email"
                required
                autoComplete="email"
                placeholder="tecnico@mitaller.com"
                value={emailReenvio}
                onChange={(e) => setEmailReenvio(e.target.value)}
                className={inputClass()}
              />
              <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={reenviar.isPending || retryAfter.isCoolingDown}>
                {retryAfter.isCoolingDown ? `Reintentá en ${retryAfter.secondsRemaining} s` : reenviar.isPending ? 'Enviando…' : 'Reenviar email de verificación'}
              </button>
              {reenviar.isSuccess && <p role="status" className="text-[13px] text-text-2">Si tu cuenta lo necesita, te reenviamos el email.</p>}
              {reenviar.isError && <p role="alert" className="text-[13px] text-text-2">{retryAfter.isCoolingDown ? 'Esperá antes de pedir otro enlace.' : 'No pudimos reenviar el email. Intentá de nuevo.'}</p>}
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
