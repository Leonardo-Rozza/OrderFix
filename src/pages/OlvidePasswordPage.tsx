import { useState } from 'react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';
import { inputClass, btnPrimary } from '../components/ui';
import { useOlvidePasswordMutation } from '../api/mutations/auth.mutations';

/**
 * Olvidé mi contraseña: pide el email y dispara el envío del link de reset.
 * El backend responde siempre 200 (no revela si el email existe), así que el
 * mensaje de éxito es genérico a propósito.
 */
export const OlvidePasswordPage = () => {
  const olvide = useOlvidePasswordMutation();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await olvide.mutateAsync(email.trim());
    setEnviado(true);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 py-10 text-text">
      <div className="ofx-in w-full max-w-[420px] rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <Logo size={36} className="mb-5" />
        {enviado ? (
          <>
            <h1 className="text-[20px] font-extrabold tracking-tight">Revisá tu casilla 📬</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-text-2">
              Si <span className="font-bold">{email}</span> está registrado, te mandamos un link para crear una
              contraseña nueva. Vence en 1 hora — si no llega, revisá spam.
            </p>
            <Link to="/login" className="mt-6 block text-center text-[13.5px] font-bold text-primary hover:underline">
              Volver a iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-[20px] font-extrabold tracking-tight">¿Olvidaste tu contraseña?</h1>
            <p className="mt-2 text-[14px] text-text-2">
              Ingresá el email de tu cuenta y te mandamos un link para crear una nueva.
            </p>
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="tecnico@mitaller.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass()}
                aria-label="Email"
              />
              <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={olvide.isPending}>
                {olvide.isPending ? 'Enviando…' : 'Enviarme el link'}
              </button>
            </form>
            <Link to="/login" className="mt-5 block text-center text-[13px] font-bold text-text-2 hover:text-primary">
              ← Volver a iniciar sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
