import { useAuth } from '../store/auth.store';
import { useReenviarVerificacionMutation } from '../api/mutations/auth.mutations';

/**
 * Banner de verificación suave (§4.1): la cuenta puede operar igual, pero se
 * recuerda confirmar el email. Solo aparece cuando el backend dijo
 * emailVerificado === false (null = sesión vieja sin el dato → no molestar).
 */
export const EmailVerificacionBanner = () => {
  const { email, emailVerificado, isAuthenticated } = useAuth();
  const reenviar = useReenviarVerificacionMutation();

  if (!isAuthenticated || emailVerificado !== false) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-warning bg-warning-soft px-4 py-2 lg:px-6">
      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="var(--warning)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
      <span className="min-w-0 flex-1 text-[13px] font-semibold text-warning">
        Confirmá tu email: te mandamos un link a {email}. Revisá tu casilla (y spam).
      </span>
      <button
        type="button"
        onClick={() => email && reenviar.mutate(email)}
        disabled={reenviar.isPending}
        className="shrink-0 rounded-lg border border-warning px-2.5 py-1 text-[12px] font-extrabold text-warning transition hover:brightness-110 disabled:opacity-60"
      >
        {reenviar.isPending ? 'Enviando…' : 'Reenviar'}
      </button>
    </div>
  );
};
