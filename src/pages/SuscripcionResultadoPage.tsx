import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { btnPrimary, btnGhost } from '../components/ui';
import { SUSCRIPCION_KEY, fetchSuscripcion } from '../api/queries/suscripcion.queries';

const POLL_MS = 4000;
const TIMEOUT_MS = 60000; // dejamos de reintentar tras 1 min

/**
 * Página de retorno de MercadoPago (/suscripcion/resultado).
 * Re-consulta GET /suscripcion hasta confirmar PRO (el webhook puede tardar).
 */
export const SuscripcionResultadoPage = () => {
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  const { data: sus, isError, refetch } = useQuery({
    queryKey: SUSCRIPCION_KEY,
    queryFn: fetchSuscripcion,
    refetchInterval: (query) => {
      const d = query.state.data;
      const ok = d?.plan === 'PRO' && d?.estado === 'ACTIVA';
      if (ok || timedOut || query.state.status === 'error') return false;
      return POLL_MS;
    },
  });
  const confirmado = sus?.plan === 'PRO' && sus?.estado === 'ACTIVA';
  // Si la consulta falla (agotados los retries), mostramos el estado de "no
  // confirmado" con reintento en vez de dejar el spinner girando hasta el timeout.
  const polling = !confirmado && !timedOut && !isError;

  // Dejar de reintentar tras TIMEOUT_MS (el efecto se reinicia al volver a pollear).
  useEffect(() => {
    if (!polling) return;
    const t = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [polling]);

  const reintentar = () => {
    setTimedOut(false);
    refetch();
  };

  return (
    <DashboardLayout title="Suscripción">
      <div className="ofx-in mx-auto grid max-w-[480px] place-items-center py-10 text-center">
        <div className="w-full rounded-2xl border border-border bg-surface p-8 shadow-sm">
          {confirmado ? (
            <>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success-soft text-success">
                <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <h1 className="mt-4 text-[20px] font-extrabold">¡Ya sos PRO! 🎉</h1>
              <p className="mt-2 text-[14px] text-text-2">
                Tu suscripción quedó activa. Ahora tenés reparaciones ilimitadas y todas las funciones PRO.
              </p>
              <button type="button" className={`${btnPrimary} mt-6 w-full`} onClick={() => navigate('/dashboard')}>
                Ir al inicio
              </button>
            </>
          ) : polling ? (
            <>
              <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-surface-3 border-t-primary" />
              <h1 className="mt-4 text-[20px] font-extrabold">Confirmando tu pago…</h1>
              <p className="mt-2 text-[14px] text-text-2">
                Estamos esperando la confirmación de MercadoPago. Esto puede tardar unos segundos, no cierres esta pantalla.
              </p>
            </>
          ) : (
            <>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning-soft text-warning">
                <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
              </span>
              <h1 className="mt-4 text-[20px] font-extrabold">Todavía no pudimos confirmarlo</h1>
              <p className="mt-2 text-[14px] text-text-2">
                Si ya pagaste, la confirmación puede demorar un poco más. Revisá en unos minutos desde la pantalla de Planes.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button type="button" className={btnPrimary} onClick={reintentar}>
                  Reintentar
                </button>
                <button type="button" className={btnGhost} onClick={() => navigate('/planes')}>
                  Ver planes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
