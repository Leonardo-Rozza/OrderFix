import { useContext, useState } from 'react';
import { useReenviarVerificacionMutation } from '../api/mutations/auth.mutations';
import { AccountProfileContext, useAccountSessionStatus } from '../router/accountProfile';
import { useRetryAfter } from '../hooks/useRetryAfter';

/** Usa la misma observación remota que controla el acceso, nunca el valor persistido. */
export const EmailVerificacionBanner = () => {
  const profile = useContext(AccountProfileContext);
  const session = useAccountSessionStatus();
  const reenviar = useReenviarVerificacionMutation();
  const retryAfter = useRetryAfter();
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);

  if (!profile || !session || profile.usuario.emailVerificado !== false) return null;

  const refresh = async () => {
    setChecking(true);
    setChecked(false);
    setCheckFailed(false);
    try {
      await session.refetch();
      setChecked(true);
    } catch {
      setCheckFailed(true);
    } finally {
      setChecking(false);
    }
  };
  const busy = checking || session.isFetching || reenviar.isPending;
  const failed = !!session.error || checkFailed;
  const actionClass = 'min-h-11 shrink-0 rounded-lg border border-warning px-3 py-2 text-[12px] font-extrabold text-warning transition hover:brightness-110 focus-visible:outline focus-visible:outline-warning disabled:opacity-60';

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-warning bg-warning-soft px-4 py-3 lg:px-6">
      <svg aria-hidden="true" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--warning)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
      <div className="min-w-0 flex-1 basis-64 text-[13px] text-warning [overflow-wrap:anywhere]">
        <p className="font-bold">Confirmá tu email: {profile.usuario.email}</p>
        <p>Revisá tu casilla y spam. Hasta confirmarlo podés recorrer la interfaz, pero las operaciones están bloqueadas.</p>
        {failed ? (
          <p role="alert" className="mt-1 font-semibold">No pudimos comprobar la verificación. Tu sesión sigue abierta; intentá de nuevo.</p>
        ) : checked ? (
          <p role="status" className="mt-1 font-semibold">La verificación sigue pendiente. Abrí el enlace del email de esta cuenta y volvé a comprobar.</p>
        ) : null}
        {reenviar.isSuccess && <p role="status" className="mt-1">Si tu cuenta lo necesita, te reenviamos el email.</p>}
        {reenviar.isError && !retryAfter.isCoolingDown && <p role="alert" className="mt-1">No pudimos reenviar el email. Intentá de nuevo.</p>}
      </div>
      <button type="button" onClick={() => void refresh()} disabled={busy} className={actionClass}>
        {checking || session.isFetching ? 'Comprobando…' : 'Ya lo confirmé'}
      </button>
      <button type="button" onClick={() => reenviar.mutate(profile.usuario.email, { onError: retryAfter.startRetryAfter })}
        disabled={busy || retryAfter.isCoolingDown} className={actionClass}>
        {retryAfter.isCoolingDown ? `Reintentá en ${retryAfter.secondsRemaining} s` : reenviar.isPending ? 'Enviando…' : 'Reenviar'}
      </button>
    </div>
  );
};
