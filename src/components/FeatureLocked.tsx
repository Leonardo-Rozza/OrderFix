import { useNavigate } from 'react-router';
import { btnPrimary } from './ui';

/** Pantalla de upsell para funciones que requieren plan PRO. */
export const FeatureLocked = ({ titulo, detalle }: { titulo: string; detalle: string }) => {
  const navigate = useNavigate();
  return (
    <div className="ofx-in mx-auto max-w-md py-16 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg">
        <svg viewBox="0 0 24 24" width={26} height={26} fill="currentColor" stroke="none">
          <path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10z" />
        </svg>
      </span>
      <h1 className="mt-4 text-[20px] font-extrabold">{titulo}</h1>
      <p className="mt-2 text-[14px] text-text-2">{detalle}</p>
      <button type="button" className={`${btnPrimary} mt-6`} onClick={() => navigate('/planes')}>
        Ver planes PRO
      </button>
    </div>
  );
};
