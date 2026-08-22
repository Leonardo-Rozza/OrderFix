import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';
import { useSuscripcionQuery } from '../api/queries/suscripcion.queries';
import { useIniciarPagoProMutation, useCancelarSuscripcionMutation } from '../api/mutations/pagos.mutations';
import { useAuth } from '../store/auth.store';
import type { Suscripcion } from '../types';

/** Una fila de la comparativa. value: texto, true (incluido) o false (no incluido). */
interface Feature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

const FUNCIONES_CERRADAS = {
  inventario: false,
  cobros: false,
  empleadosMultiples: false,
};

const buildFeatures = (suscripcion: Suscripcion): Feature[] => {
  const funciones = suscripcion.funciones ?? FUNCIONES_CERRADAS;
  const freeActual = suscripcion.plan === 'FREE';
  const proActual = suscripcion.plan === 'PRO';
  const suspendida = suscripcion.estado === 'VENCIDA' || suscripcion.estado === 'CANCELADA';

  const reparacionesFree: string | boolean = freeActual
    ? suspendida
      ? false
      : suscripcion.limiteReparacionesMes === null
        ? 'Ilimitadas'
        : `${suscripcion.limiteReparacionesMes} por mes`
    : 'Límite mensual';
  const reparacionesPro: string | boolean = proActual && suspendida ? false : 'Ilimitadas';

  return [
    { label: 'Reparaciones por mes', free: reparacionesFree, pro: reparacionesPro },
    { label: 'Clientes, equipos y repuestos', free: true, pro: true },
    { label: 'Tablero por estado', free: true, pro: true },
    { label: 'Presupuestos', free: true, pro: true },
    { label: 'Dashboard', free: true, pro: true },
    { label: 'Seguimiento público + WhatsApp', free: true, pro: true },
    {
      label: 'Inventario con stock',
      free: freeActual ? !suspendida && funciones.inventario : false,
      pro: proActual ? !suspendida && funciones.inventario : true,
    },
    {
      label: 'Cobros, caja y recibo',
      free: freeActual ? !suspendida && funciones.cobros : false,
      pro: proActual ? !suspendida && funciones.cobros : true,
    },
    {
      label: 'Empleados',
      free: freeActual && !suspendida && funciones.empleadosMultiples ? 'Varios' : '1',
      pro: proActual && (suspendida || !funciones.empleadosMultiples) ? false : 'Varios',
    },
  ];
};

const getStatus = (suscripcion: Suscripcion) => {
  const funciones = suscripcion.funciones ?? FUNCIONES_CERRADAS;
  const extras = [
    funciones.inventario ? 'inventario' : null,
    funciones.cobros ? 'cobros y caja' : null,
    funciones.empleadosMultiples ? 'varios empleados' : null,
  ].filter((item): item is string => item !== null);
  const capacidad =
    suscripcion.limiteReparacionesMes === null
      ? 'Reparaciones ilimitadas'
      : `${suscripcion.limiteReparacionesMes} reparaciones por mes`;
  const detalleCapacidad = `${capacidad}${extras.length > 0 ? ` · ${extras.join(', ')}` : ''}.`;

  if (suscripcion.estado === 'TRIAL') {
    return {
      title: 'Prueba PRO activa',
      detail: detalleCapacidad,
      className: 'border-primary/35 bg-primary-soft text-primary-soft-fg',
    };
  }

  if (suscripcion.plan === 'PRO' && suscripcion.estado === 'ACTIVA') {
    return {
      title: 'Plan PRO activo',
      detail: detalleCapacidad,
      className: 'border-success/35 bg-success-soft text-success',
    };
  }

  if (suscripcion.estado === 'VENCIDA' || suscripcion.estado === 'CANCELADA') {
    const estado = suscripcion.estado === 'VENCIDA' ? 'vencido' : 'cancelado';
    return {
      title: `Plan ${suscripcion.plan} ${estado}`,
      detail: 'Las funciones PRO están pausadas. Reactivá el plan para volver a utilizarlas.',
      className: 'border-warning/40 bg-warning-soft text-warning',
    };
  }

  const limite = suscripcion.limiteReparacionesMes;
  return {
    title: 'Plan FREE activo',
    detail:
      limite === null
        ? detalleCapacidad
        : `Vas ${suscripcion.reparacionesEsteMes} de ${limite} reparaciones este mes.`,
    className: 'border-border bg-surface text-text',
  };
};

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const CrossIcon = () => (
  <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-3 opacity-70">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const FeatureRow = ({ value, label, accent }: { value: string | boolean; label: string; accent?: boolean }) => (
  <div className="flex items-center gap-2.5 text-[13.5px]">
    {value === true ? (
      <CheckIcon className="shrink-0 text-success" />
    ) : value === false ? (
      <CrossIcon />
    ) : (
      <span className={`min-w-[17px] shrink-0 font-mono text-[12px] font-extrabold ${accent ? 'text-primary' : 'text-text-3'}`}>{value}</span>
    )}
    <span className={value === false ? 'text-text-3' : 'font-semibold'}>{label}</span>
  </div>
);

export const PlanesPage = () => {
  const { data: sus, isPending, isError, refetch } = useSuscripcionQuery();
  const { isAdmin } = useAuth();
  const iniciarPago = useIniciarPagoProMutation();
  const cancelar = useCancelarSuscripcionMutation();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isPending) {
    return (
      <DashboardLayout title="Planes">
        <div
          role="status"
          className="ofx-in mx-auto flex min-h-[320px] max-w-[920px] flex-col items-center justify-center gap-4 text-center"
        >
          <Loader size="lg" />
          <div>
            <div className="text-[15px] font-extrabold">Verificando tu plan…</div>
            <div className="mt-1 text-[13px] text-text-3">Estamos consultando las capacidades actuales del taller.</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !sus || !sus.funciones) {
    return (
      <DashboardLayout title="Planes">
        <div className="ofx-in mx-auto max-w-[920px] rounded-2xl border border-border bg-surface shadow-sm">
          <ErrorState
            title="No pudimos verificar tu plan"
            message="No habilitamos funciones hasta confirmar la suscripción. Revisá tu conexión e intentá otra vez."
            onRetry={() => refetch()}
          />
        </div>
      </DashboardLayout>
    );
  }

  const plan = sus.plan;
  const usados = sus.reparacionesEsteMes;
  const limite = sus.limiteReparacionesMes;
  const pct = limite ? Math.min(100, Math.round((usados / limite) * 100)) : 0;
  const cerca = limite !== null && usados >= limite * 0.8;
  const esTrial = sus.estado === 'TRIAL';
  const proActivo = plan === 'PRO' && sus.estado === 'ACTIVA';
  const proSuspendido = plan === 'PRO' && (sus.estado === 'VENCIDA' || sus.estado === 'CANCELADA');
  const features = buildFeatures(sus);
  const status = getStatus(sus);

  const suscribir = () => iniciarPago.mutate();

  return (
    <DashboardLayout title="Planes">
      <div className="ofx-in mx-auto max-w-[920px] space-y-5">
        <div className="text-center">
          <h1 className="text-[24px] font-extrabold tracking-tight">Elegí el plan para tu taller</h1>
          <p className="mx-auto mt-2 max-w-[46ch] text-[14.5px] text-text-2">
            Empezá gratis. Pasá a PRO cuando necesites inventario, caja y varios empleados.
          </p>
        </div>

        <div className={`rounded-xl border px-4 py-3.5 ${status.className}`}>
          <div className="text-[14px] font-extrabold">{status.title}</div>
          <div className="mt-1 text-[12.5px] font-semibold opacity-85">{status.detail}</div>
        </div>

        {/* Consumo del plan FREE */}
        {plan === 'FREE' && sus.estado === 'ACTIVA' && limite !== null && (
          <div className={`rounded-xl border p-4 ${cerca ? 'border-warning bg-warning-soft' : 'border-border bg-surface'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[14px] font-extrabold">
                Vas {usados} de {limite} reparaciones este mes
              </div>
              <div className="font-mono text-[13px] font-bold text-text-2">{pct}%</div>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: cerca ? 'var(--warning)' : 'var(--primary)' }}
              />
            </div>
            <div className="mt-2 text-[12.5px] text-text-2">
              En el plan Free se bloquea al llegar a {limite}. Pasate a PRO para no frenar.
            </div>
          </div>
        )}

        {/* Comparativa */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* FREE */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="text-[16px] font-extrabold">{esTrial ? 'Prueba PRO' : 'Free'}</div>
            <div className="mt-0.5 text-[13px] text-text-3">
              {esTrial ? 'Experiencia completa durante la prueba' : 'Para arrancar a ordenarte'}
            </div>
            <div className="my-4">
              <span className="text-[36px] font-extrabold tracking-tight">$0</span>
              <span className="text-[14px] font-semibold text-text-3"> /mes</span>
            </div>
            <button
              type="button"
              disabled
              className={`w-full rounded-xl py-3 text-[14px] font-bold ${plan === 'FREE' ? 'bg-surface-3 text-text-2' : 'border border-border-strong bg-surface text-text-3'}`}
            >
              {plan === 'FREE' ? (esTrial ? 'Prueba actual' : 'Tu plan actual') : 'Plan Free'}
            </button>
            <div className="mt-5 flex flex-col gap-2.5">
              {features.map((f) => (
                <FeatureRow key={f.label} value={f.free} label={f.label} />
              ))}
            </div>
          </div>

          {/* PRO */}
          <div className={`relative rounded-2xl border-2 bg-surface p-6 shadow-md ${proSuspendido ? 'border-warning' : 'border-primary'}`}>
            <span className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-[11.5px] font-extrabold tracking-wide ${proSuspendido ? 'border border-warning bg-warning-soft text-warning' : 'bg-primary text-primary-fg'}`}>
              {proActivo ? 'TU PLAN' : proSuspendido ? 'VENCIDO' : 'RECOMENDADO'}
            </span>
            <div className="flex items-center gap-2">
              <div className="text-[16px] font-extrabold">PRO</div>
              <svg viewBox="0 0 24 24" width={17} height={17} fill="var(--primary)" stroke="none">
                <path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10z" />
              </svg>
            </div>
            <div className="mt-0.5 text-[13px] text-text-3">Todo lo que tu taller necesita</div>
            <div className="my-4">
              {/* Debe coincidir con MP_AMOUNT del backend (lo que cobra MercadoPago). */}
              <span className="text-[36px] font-extrabold tracking-tight">$24.900</span>
              <span className="text-[14px] font-semibold text-text-3"> /mes</span>
            </div>
            {proActivo ? (
              <div className="space-y-2">
                <button type="button" disabled className="w-full rounded-xl bg-surface-3 py-3 text-[14px] font-bold text-text-2">
                  Tu plan actual
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    className="w-full rounded-xl py-2 text-[12.5px] font-bold text-text-3 transition hover:text-danger"
                  >
                    Cancelar PRO
                  </button>
                )}
              </div>
            ) : isAdmin ? (
              <button
                type="button"
                onClick={suscribir}
                disabled={iniciarPago.isPending}
                className="w-full rounded-xl bg-primary py-3 text-[14px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:opacity-60"
              >
                {iniciarPago.isPending
                  ? 'Redirigiendo…'
                  : proSuspendido
                    ? 'Reactivar PRO'
                    : esTrial
                      ? 'Activar PRO ahora'
                      : 'Suscribirme a PRO'}
              </button>
            ) : (
              <div className="rounded-xl bg-surface-3 px-3 py-3 text-center text-[12.5px] font-semibold text-text-2">
                Solo un administrador puede activar PRO.
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2.5">
              {features.map((f) => (
                <FeatureRow key={f.label} value={f.pro} label={f.label} accent />
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmCancel}
        title="Cancelar PRO"
        message="Tu taller dejará de tener las funciones PRO y volverá a las condiciones FREE informadas por el backend. ¿Confirmás?"
        confirmLabel="Cancelar PRO"
        loading={cancelar.isPending}
        onClose={() => setConfirmCancel(false)}
        onConfirm={async () => {
          await cancelar.mutateAsync();
          setConfirmCancel(false);
        }}
      />
    </DashboardLayout>
  );
};
