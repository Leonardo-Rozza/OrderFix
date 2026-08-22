import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { LIMITE_PLAN_EVENT } from '../api/axios';

const beneficios = [
  'Reparaciones mensuales ilimitadas',
  'Inventario y control de stock',
  'Cobros, caja y varios empleados',
];

const Check = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/**
 * Modal global que aparece cuando el backend responde 402 (límite del plan).
 * Escucha el CustomEvent `ofx:limite-plan` despachado por el interceptor de axios.
 */
export const LimitePlanModal = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setMensaje(detail?.message ?? null);
      setOpen(true);
    };
    window.addEventListener(LIMITE_PLAN_EVENT, handler);
    return () => window.removeEventListener(LIMITE_PLAN_EVENT, handler);
  }, []);

  if (!open) return null;

  const close = () => setOpen(false);
  const verPlanes = () => {
    setOpen(false);
    navigate('/planes');
  };

  return (
    <div
      onClick={close}
      className="ofx-in fixed inset-0 z-[100] grid place-items-center p-5"
      style={{ background: 'rgba(8,12,20,.55)', backdropFilter: 'blur(2px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ofx-pop w-full max-w-[440px] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg,#0B6F66,#0D9488)' }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-extrabold">
            <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" stroke="none">
              <path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10z" />
            </svg>
            PLAN PRO
          </div>
          <div className="mt-3.5 text-[21px] font-extrabold">Llegaste al límite de tu plan</div>
          <p className="mt-2 text-[14px] leading-relaxed text-white/85">
            {mensaje ?? 'Alcanzaste el tope de reparaciones de tu plan este mes.'} Pasá a PRO para seguir cargando órdenes y habilitar las funciones avanzadas del taller.
          </p>
        </div>
        <div className="p-6">
          <div className="mb-5 flex flex-col gap-3">
            {beneficios.map((b) => (
              <div key={b} className="flex items-center gap-2.5 text-[14px] font-semibold">
                <Check />
                {b}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={verPlanes}
            className="w-full rounded-xl bg-primary py-3.5 text-[15px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover"
          >
            Ver planes PRO
          </button>
          <button
            type="button"
            onClick={close}
            className="mt-1 w-full py-3 text-[14px] font-bold text-text-2 transition hover:text-text"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};
