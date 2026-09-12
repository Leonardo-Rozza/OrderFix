import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { LIMITE_PLAN_EVENT } from '../api/axios';
import { FormActions, Modal } from './Modal';
import { btnGhost, btnPrimary } from './ui';
import { useAuth } from '../store/auth.store';

const beneficios = [
  'Reparaciones mensuales ilimitadas',
  'Inventario y control de stock',
  'Cobros manuales y varios empleados',
];

const Check = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/**
 * Modal global que aparece cuando el backend responde 402 (límite del plan).
 * Escucha el CustomEvent `ofx:limite-plan` despachado por el interceptor de axios.
 */
export const LimitePlanModal = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const descriptionId = useId();
  const safeActionRef = useRef<HTMLButtonElement>(null);
  const restoreFocusOnCloseRef = useRef(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setMensaje(detail?.message ?? null);
      restoreFocusOnCloseRef.current = true;
      setOpen(true);
    };
    window.addEventListener(LIMITE_PLAN_EVENT, handler);
    return () => window.removeEventListener(LIMITE_PLAN_EVENT, handler);
  }, []);

  const close = () => {
    restoreFocusOnCloseRef.current = true;
    setOpen(false);
  };
  const verPlanes = () => {
    restoreFocusOnCloseRef.current = false;
    setOpen(false);
    navigate('/planes');
  };

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title="Llegaste al límite de tu plan"
      size="sm"
      layer="global"
      showCloseButton={false}
      initialFocusRef={safeActionRef}
      restoreFocusOnCloseRef={restoreFocusOnCloseRef}
      ariaDescribedBy={descriptionId}
      footer={(
        <FormActions>
          <button ref={safeActionRef} type="button" onClick={close} className={btnGhost}>
            Ahora no
          </button>
          <button type="button" onClick={verPlanes} className={btnPrimary}>
            Consultar plan
          </button>
        </FormActions>
      )}
    >
      <div className="space-y-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-[12px] font-extrabold text-primary-soft-fg">
            <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" stroke="none" aria-hidden="true">
              <path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10z" />
            </svg>
            PLAN PRO
          </div>
          <p id={descriptionId} className="mt-3 text-[14px] leading-relaxed text-text-2">
            {mensaje ?? 'Alcanzaste el tope de reparaciones de tu plan este mes.'}{' '}
            {isAdmin
              ? 'Consultá las opciones disponibles para el plan de tu taller.'
              : 'Contactá al titular del taller para revisar el plan. La suscripción la gestiona él.'}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {beneficios.map((beneficio) => (
            <div key={beneficio} className="flex items-center gap-2.5 text-[14px] font-semibold">
              <Check />
              {beneficio}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
