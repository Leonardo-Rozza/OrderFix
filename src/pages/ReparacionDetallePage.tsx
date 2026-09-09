import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EstadoBadge } from '../components/EstadoBadge';
import { ReparacionFormModal } from '../components/ReparacionFormModal';
import { RepuestoFormModal } from '../components/RepuestoFormModal';
import { PresupuestoFormModal } from '../components/PresupuestoFormModal';
import { PresupuestoBadge } from '../components/PresupuestoBadge';
import { CobroFormModal } from '../components/CobroFormModal';
import { CobroAnulacionModal } from '../components/CobroAnulacionModal';
import { ReclamoGarantiaModal } from '../components/ReclamoGarantiaModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { metodoLabel } from '../config/cobros';
import { Loader } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import { btnGhost, btnDanger, card, inputClass } from '../components/ui';
import { getEstadoMeta, transicionesDesde } from '../config/estados';
import { formatMoney, formatDate, formatDateTime, iniciales } from '../utils/format';
import { equipoLabel, clienteLabel, ordenLabel, fotosPorMomento } from '../utils/reparacion';
import { PagoChip } from '../components/PagoChip';
import { apiClient } from '../api/axios';
import type { WhatsappLink } from '../types';
import { useReparacionQuery } from '../api/queries/reparaciones.queries';
import { useRepuestosPorReparacionQuery } from '../api/queries/repuestos.queries';
import { usePresupuestosQuery } from '../api/queries/presupuestos.queries';
import {
  useResponderPresupuestoTallerMutation,
  useRepresupuestarMutation,
} from '../api/mutations/presupuestos.mutations';
import { calidadLabel } from '../config/presupuestos';
import { cuentaLabel, RIESGO_CUENTA_MSG } from '../config/ingreso';
import { useCobrosQuery } from '../api/queries/cobros.queries';
import { useFunciones } from '../api/queries/suscripcion.queries';
import {
  useCambiarEstadoMutation,
  useDeleteReparacionMutation,
} from '../api/mutations/reparaciones.mutations';
import { useDeleteRepuestoMutation } from '../api/mutations/repuestos.mutations';
import { useAuth } from '../store/auth.store';
import type { Cobro, EstadoReparacion, Repuesto } from '../types';

const EMPTY_REPUESTOS: Repuesto[] = [];

const SectionLoader = ({ label }: { label: string }) => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-24 items-center justify-center gap-2.5 px-5 py-6 text-[13px] text-text-3"
  >
    <Loader size="sm" />
    <span>Cargando {label}…</span>
  </div>
);

export const ReparacionDetallePage = () => {
  const { id } = useParams();
  return <ReparacionDetalleContent key={id} reparacionId={Number(id)} />;
};

/**
 * React Router reutiliza el elemento cuando sólo cambia `:id`. La clave del
 * wrapper fuerza una sesión nueva para que ningún modal, selección o lock de
 * la orden anterior sobreviva sobre el detalle siguiente.
 */
const ReparacionDetalleContent = ({ reparacionId }: { reparacionId: number }) => {
  const navigate = useNavigate();

  const {
    data: rep,
    isLoading,
    isError,
    refetch,
    credenciales,
    limpiarCredenciales,
    refetchCredenciales,
  } = useReparacionQuery(reparacionId);
  const {
    data: repuestosData,
    isPending: repuestosPending,
    isError: repuestosError,
    isSuccess: repuestosSuccess,
    refetch: refetchRepuestos,
  } = useRepuestosPorReparacionQuery(reparacionId);
  const {
    data: presupuestosData,
    isPending: presupuestosPending,
    isError: presupuestosError,
    isSuccess: presupuestosSuccess,
    refetch: refetchPresupuestos,
  } = usePresupuestosQuery(reparacionId);
  const { cobros: cobrosHabilitado } = useFunciones();
  const {
    data: cobros,
    isPending: cobrosPending,
    isError: cobrosError,
    isSuccess: cobrosSuccess,
    refetch: refetchCobros,
  } = useCobrosQuery(cobrosHabilitado ? reparacionId : undefined);
  const responderPresupuesto = useResponderPresupuestoTallerMutation(reparacionId);
  const represupuestarPresupuesto = useRepresupuestarMutation(reparacionId);
  const { isAdmin } = useAuth();
  const cambiarEstado = useCambiarEstadoMutation();
  const deleteMutation = useDeleteReparacionMutation();
  const deleteRepuesto = useDeleteRepuestoMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [repuestoOpen, setRepuestoOpen] = useState(false);
  const [editingRepuesto, setEditingRepuesto] = useState<Repuesto | null>(null);
  const [repuestoToDelete, setRepuestoToDelete] = useState<Repuesto | null>(null);
  const [presupuestoOpen, setPresupuestoOpen] = useState(false);
  const [cobroOpen, setCobroOpen] = useState(false);
  const [cobroToCancel, setCobroToCancel] = useState<Cobro | null>(null);
  const [reclamoOpen, setReclamoOpen] = useState(false);
  const estadoTransitionLock = useRef(false);
  const [estadoTransitionInFlight, setEstadoTransitionInFlight] = useState(false);

  const repuestos = repuestosData ?? EMPTY_REPUESTOS;
  const presupuestos = presupuestosData ?? [];
  const cobroSeleccionado = cobroToCancel
    ? (cobros?.cobros.find((cobro) => cobro.id === cobroToCancel.id) ?? cobroToCancel)
    : null;

  const openNewRepuesto = () => {
    setEditingRepuesto(null);
    setRepuestoOpen(true);
  };
  const openEditRepuesto = (rp: Repuesto) => {
    setEditingRepuesto(rp);
    setRepuestoOpen(true);
  };

  const totalRepuestos = useMemo(() => repuestos.reduce((sum, r) => sum + (r.precio ?? 0), 0), [repuestos]);

  if (isLoading) {
    return (
      <DashboardLayout title="Reparación">
        <div className="py-24">
          <Loader size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout title="Reparación">
        <div className="ofx-in mx-auto max-w-md py-16">
          <ErrorState onRetry={() => refetch()} message="No pudimos cargar la reparación." />
          <div className="mt-2 text-center">
            <button className={btnGhost} onClick={() => navigate('/reparaciones')}>
              Volver al tablero
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!rep) {
    return (
      <DashboardLayout title="Reparación">
        <div className="ofx-in mx-auto max-w-md py-20 text-center">
          <div className="text-[16px] font-extrabold">No encontramos esa reparación</div>
          <div className="mt-1 text-[13px] text-text-3">Puede haber sido eliminada o no pertenece a tu taller.</div>
          <button className={`${btnGhost} mt-5`} onClick={() => navigate('/reparaciones')}>
            Volver al tablero
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const meta = getEstadoMeta(rep.estado);
  const clienteTelefono = rep.clienteTelefono ?? null;
  const equipoNombre = equipoLabel(rep);
  const next = meta.next;

  const flagsRiesgo = [
    rep.mojado && 'Mojado / cayó al agua',
    rep.trabajoEnPlaca && 'Trabajo en placa',
    rep.noTesteableAlIngreso && 'No testeable al ingreso',
    rep.tieneBloqueoPantalla && 'Bloqueo de pantalla',
    rep.tieneCuentaVinculada &&
      rep.tieneCuentaVinculada !== 'NINGUNA' &&
      `Cuenta ${cuentaLabel(rep.tieneCuentaVinculada)} ${rep.clienteConoceCredenciales ? '(con credenciales)' : '(sin credenciales)'}`,
  ].filter(Boolean) as string[];

  const cambiarEstadoSeguro = (estado: EstadoReparacion) => {
    if (
      estado === rep.estado ||
      cambiarEstado.isPending ||
      estadoTransitionLock.current
    ) return;

    estadoTransitionLock.current = true;
    setEstadoTransitionInFlight(true);
    const entregando = estado === 'ENTREGADO';
    if (entregando) limpiarCredenciales();
    cambiarEstado.mutate(
      { id: rep.id, estado },
      {
        onError: () => {
          if (!entregando) return;
          // El rollback de secretos nunca usa una snapshot en cache: vuelve a
          // leer el detalle autenticado. El interceptor informa si también falla.
          void refetchCredenciales().catch(() => undefined);
        },
        onSettled: () => {
          estadoTransitionLock.current = false;
          setEstadoTransitionInFlight(false);
        },
      },
    );
  };

  const handleEstadoSelect = (estado: EstadoReparacion) => {
    cambiarEstadoSeguro(estado);
  };

  // El backend arma el mensaje + link de seguimiento; abrimos la pestaña en el
  // click (gesto del usuario) y la redirigimos cuando llega la URL.
  const avisarWhatsapp = async () => {
    const win = window.open('', '_blank');
    try {
      const { data } = await apiClient.get<WhatsappLink>(`/reparaciones/${rep.id}/whatsapp`);
      if (win) win.location.href = data.url;
      else window.location.href = data.url;
    } catch {
      // El interceptor de axios ya mostró el toast del error (es un GET);
      // acá solo cerramos la pestaña vacía que habíamos abierto.
      win?.close();
    }
  };

  return (
    <DashboardLayout title="Detalle de reparación">
      <div className="ofx-in mx-auto max-w-4xl">
        <button
          onClick={() => navigate('/reparaciones')}
          className="mb-3.5 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-text-2 transition hover:text-primary"
        >
          <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver al tablero
        </button>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
          {/* Columna principal */}
          <div className="flex flex-col gap-4">
            <div className={`${card} p-5`}>
              <div className="flex flex-wrap items-start gap-3.5">
                <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-surface-3 text-text-2">
                  <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="2" width="12" height="20" rx="2.5" />
                    <path d="M11 18h2" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[22px] font-extrabold tracking-tight">{equipoNombre}</span>
                    <span className="rounded-md bg-surface-3 px-2 py-0.5 font-mono text-[12px] font-bold text-text-3">{ordenLabel(rep)}</span>
                    {rep.esGarantia && (
                      <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-soft-fg">
                        Garantía
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[14px] text-text-2">
                    Ingresó el {formatDate(rep.fechaIngreso)}
                    {rep.esGarantia && rep.reparacionOrigenId && (
                      <>
                        {' · '}
                        <button
                          type="button"
                          onClick={() => navigate(`/reparaciones/${rep.reparacionOrigenId}`)}
                          className="font-bold text-primary hover:underline"
                        >
                          Ver orden original →
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <EstadoBadge estado={rep.estado} size="md" />
                  <PagoChip
                    estadoPago={rep.estadoPago}
                    saldo={rep.saldo}
                    excedente={rep.excedente}
                    requiereRevision={rep.requiereRevision}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-text-3">Problema reportado</div>
                <div className="text-[15px] leading-relaxed">{rep.descripcionProblema}</div>
              </div>
            </div>

            {/* Bandera roja: cuenta activa sin credenciales (derivada por el backend) */}
            {rep.riesgoCuentaSinCredenciales && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-danger bg-danger-soft p-4 text-[13.5px] font-semibold text-danger-fg">
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
                {RIESGO_CUENTA_MSG}
              </div>
            )}

            {/* Repuestos */}
            <section
              className={`${card} overflow-hidden`}
              aria-labelledby="repuestos-section-title"
              aria-busy={repuestosPending}
            >
              <div className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] font-extrabold">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m7.5 4.27 9 5.15M21 8l-9 5-9-5 9-5 9 5zM3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
                <h2 id="repuestos-section-title">Repuestos</h2>
                <button
                  type="button"
                  onClick={openNewRepuesto}
                  disabled={!repuestosSuccess}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[12.5px] font-bold text-text-2 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Agregar
                </button>
              </div>
              {repuestosPending ? (
                <SectionLoader label="repuestos" />
              ) : repuestosError ? (
                <div role="alert">
                  <ErrorState
                    message="No pudimos cargar los repuestos."
                    onRetry={() => void refetchRepuestos()}
                  />
                </div>
              ) : repuestosSuccess ? (
                <>
                  {repuestos.map((rp) => (
                    <div key={rp.id} className="group flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:flex-nowrap sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold">{rp.nombre}</div>
                        {rp.descripcion && <div className="truncate text-[12px] text-text-3">{rp.descripcion}</div>}
                      </div>
                      <span className="font-mono text-[13.5px] font-bold">{formatMoney(rp.precio)}</span>
                      <div className="flex w-full justify-end gap-1 opacity-100 transition sm:w-auto sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button
                          type="button"
                          aria-label="Editar" title="Editar"
                          onClick={() => openEditRepuesto(rp)}
                          className="grid h-11 w-11 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:h-8 sm:w-8"
                        >
                          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                          </svg>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            aria-label="Eliminar" title="Eliminar"
                            onClick={() => setRepuestoToDelete(rp)}
                            className="grid h-11 w-11 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:h-8 sm:w-8"
                          >
                            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {repuestos.length === 0 && (
                    <div className="px-5 py-5 text-center text-[13.5px] text-text-3">Sin repuestos cargados.</div>
                  )}
                </>
              ) : null}
              <div className="flex items-center justify-between bg-surface-2 px-5 py-3.5">
                <span className="text-[14px] font-extrabold">Total repuestos</span>
                <span className="font-mono text-[15px] font-extrabold text-primary">
                  {repuestosSuccess ? formatMoney(rep.totalRepuestos ?? totalRepuestos) : '—'}
                </span>
              </div>
            </section>

            {/* Orden de trabajo */}
            {(credenciales.patronDesbloqueo ||
              credenciales.pinDesbloqueo ||
              rep.accesorios ||
              rep.condicionesIngreso ||
              rep.observaciones ||
              rep.tecnicoNombre ||
              flagsRiesgo.length > 0 ||
              (rep.fotos?.length ?? 0) > 0) && (
              <div className={`${card} p-5`}>
                <div className="mb-3.5 text-[15px] font-extrabold">Orden de trabajo</div>
                {flagsRiesgo.length > 0 && (
                  <div className="mb-3.5 flex flex-wrap gap-1.5">
                    {flagsRiesgo.map((f) => (
                      <span key={f} className="inline-flex items-center rounded-full bg-warning-soft px-2.5 py-1 text-[11.5px] font-extrabold text-warning">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13.5px] sm:grid-cols-2">
                  {rep.tecnicoNombre && (
                    <div>
                      <span className="text-text-3">Técnico: </span>
                      <span className="font-semibold">{rep.tecnicoNombre}</span>
                    </div>
                  )}
                  {credenciales.patronDesbloqueo && (
                    <div>
                      <span className="text-text-3">Patrón: </span>
                      <span className="font-mono font-semibold">{credenciales.patronDesbloqueo}</span>
                    </div>
                  )}
                  {credenciales.pinDesbloqueo && (
                    <div>
                      <span className="text-text-3">PIN: </span>
                      <span className="font-mono font-semibold">{credenciales.pinDesbloqueo}</span>
                    </div>
                  )}
                  {rep.accesorios && (
                    <div>
                      <span className="text-text-3">Accesorios: </span>
                      <span className="font-semibold">{rep.accesorios}</span>
                    </div>
                  )}
                </div>
                {rep.condicionesIngreso && (
                  <div className="mt-3.5 border-t border-border pt-3.5">
                    <div className="mb-1 text-[12px] font-extrabold uppercase tracking-wide text-text-3">Condiciones de ingreso</div>
                    <div className="text-[13.5px] leading-relaxed">{rep.condicionesIngreso}</div>
                  </div>
                )}
                {rep.observaciones && (
                  <div className="mt-3.5 border-t border-border pt-3.5">
                    <div className="mb-1 text-[12px] font-extrabold uppercase tracking-wide text-text-3">Observaciones (privado)</div>
                    <div className="text-[13.5px] leading-relaxed text-text-2">{rep.observaciones}</div>
                  </div>
                )}
                {(rep.fotos?.length ?? 0) > 0 &&
                  (
                    [
                      { momento: 'INGRESO', label: 'Fotos del ingreso', alt: 'Foto del ingreso' },
                      { momento: 'POST_REPARACION', label: 'Fotos post-reparación', alt: 'Foto post-reparación' },
                    ] as const
                  ).map(({ momento, label, alt }) => {
                    const fotos = fotosPorMomento(rep.fotos, momento);
                    if (fotos.length === 0) return null;
                    return (
                      <div key={momento} className="mt-3.5 border-t border-border pt-3.5">
                        <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-text-3">{label}</div>
                        <div className="flex flex-wrap gap-2">
                          {fotos.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                              <img src={url} alt={alt} className="h-16 w-16 rounded-lg border border-border object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Presupuestos */}
            <section
              className={`${card} overflow-hidden`}
              aria-labelledby="presupuestos-section-title"
              aria-busy={presupuestosPending}
            >
              <div className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] font-extrabold">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h6" />
                </svg>
                <h2 id="presupuestos-section-title">Presupuestos</h2>
                <button
                  type="button"
                  onClick={() => setPresupuestoOpen(true)}
                  disabled={!presupuestosSuccess}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[12.5px] font-bold text-text-2 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nuevo
                </button>
              </div>
              {presupuestosPending ? (
                <SectionLoader label="presupuestos" />
              ) : presupuestosError ? (
                <div role="alert">
                  <ErrorState
                    message="No pudimos cargar los presupuestos."
                    onRetry={() => void refetchPresupuestos()}
                  />
                </div>
              ) : presupuestosSuccess && presupuestos.length === 0 ? (
                <div className="px-5 py-5 text-center text-[13.5px] text-text-3">
                  Sin presupuestos. Creá uno para que el cliente lo apruebe desde el seguimiento.
                </div>
              ) : presupuestosSuccess ? (
                presupuestos.map((p) => {
                  const pendiente = p.estado === 'PENDIENTE' && !p.vencido;
                  const vencido = p.estado === 'VENCIDO' || p.vencido;
                  return (
                    <div key={p.id} className="border-b border-border px-5 py-3.5 last:border-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <PresupuestoBadge estado={p.estado} />
                        {p.tipo === 'ADICIONAL' && (
                          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-text-2">
                            Adicional
                          </span>
                        )}
                        <span className="text-[12.5px] text-text-3">{formatDate(p.createdAt)}</span>
                        <span className="ml-auto font-mono text-[15px] font-extrabold text-primary">{formatMoney(p.total)}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {p.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between gap-3 text-[13px] text-text-2">
                            <span className="min-w-0 truncate">
                              {it.cantidad}× {it.descripcion}
                              {calidadLabel(it.calidad) && (
                                <span className="ml-1.5 rounded bg-surface-3 px-1.5 py-0.5 text-[10.5px] font-bold text-text-3">
                                  {calidadLabel(it.calidad)}
                                </span>
                              )}
                            </span>
                            <span className="font-mono">{formatMoney(it.cantidad * it.precioUnitario)}</span>
                          </div>
                        ))}
                      </div>
                      {(p.manoDeObraTotal ?? 0) > 0 && (p.repuestosTotal ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-3">
                          <span>
                            Mano de obra: <span className="font-mono font-semibold">{formatMoney(p.manoDeObraTotal)}</span>
                          </span>
                          <span>
                            Repuestos: <span className="font-mono font-semibold">{formatMoney(p.repuestosTotal)}</span>
                          </span>
                        </div>
                      )}
                      {pendiente && p.validoHasta && (
                        <div className="mt-1.5 text-[12px] text-text-3">Válido hasta el {formatDate(p.validoHasta)}</div>
                      )}
                      {p.observaciones && <div className="mt-2 text-[12.5px] text-text-3">{p.observaciones}</div>}

                      {pendiente && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={responderPresupuesto.isPending}
                            onClick={() => responderPresupuesto.mutate({ presupuestoId: p.id, accion: 'aprobar' })}
                            className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[12.5px] font-bold text-success transition hover:border-success disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={responderPresupuesto.isPending}
                            onClick={() => responderPresupuesto.mutate({ presupuestoId: p.id, accion: 'rechazar' })}
                            className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[12.5px] font-bold text-text-2 transition hover:border-danger hover:text-danger disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                          <span className="self-center text-[11.5px] text-text-3">
                            (si el cliente respondió en persona; también puede hacerlo desde el link)
                          </span>
                        </div>
                      )}
                      {vencido && (
                        <div className="mt-3">
                          <button
                            type="button"
                            disabled={represupuestarPresupuesto.isPending}
                            onClick={() => represupuestarPresupuesto.mutate({ presupuestoId: p.id })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[12.5px] font-bold text-text-2 transition hover:border-primary hover:text-primary disabled:opacity-50"
                          >
                            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
                            </svg>
                            Re-presupuestar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : null}
            </section>
            {/* Cobros (PRO) */}
            {cobrosHabilitado && (
              <section
                className={`${card} overflow-hidden`}
                aria-labelledby="cobros-section-title"
                aria-busy={cobrosPending}
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 text-[15px] font-extrabold sm:px-5 sm:py-4">
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <h2 id="cobros-section-title" className="mr-auto">Cobros</h2>
                  <Link
                    to={`/reparaciones/${rep.id}/resumen`}
                    aria-disabled={!cobrosSuccess}
                    tabIndex={cobrosSuccess ? undefined : -1}
                    onClick={(event) => {
                      if (!cobrosSuccess) event.preventDefault();
                    }}
                    className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-[12.5px] font-bold text-text-2 transition sm:min-h-0 sm:px-2.5 sm:py-1 ${cobrosSuccess ? 'hover:border-primary hover:text-primary' : 'pointer-events-none opacity-50'}`}
                  >
                    Resumen digital
                  </Link>
                  <button
                    type="button"
                    onClick={() => setCobroOpen(true)}
                    disabled={
                      !cobrosSuccess
                      || !cobros
                      || cobros.saldo <= 0
                      || cobros.requiereRevision
                    }
                    title={
                      cobros?.requiereRevision
                        ? 'Revisá el excedente antes de registrar otro cobro'
                        : cobrosSuccess && cobros && cobros.saldo <= 0
                          ? 'La orden no tiene pendiente de cobro'
                          : undefined
                    }
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-[12.5px] font-bold text-text-2 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:px-2.5 sm:py-1"
                  >
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Registrar cobro
                  </button>
                </div>

                <p className="border-b border-border px-4 py-3 text-[12.5px] leading-relaxed text-text-3 sm:px-5">
                  Control opcional de cobros recibidos por fuera de OrdenFix. Los importes reflejan lo registrado por el taller.
                </p>

                {cobrosPending ? (
                  <SectionLoader label="cobros" />
                ) : cobrosError ? (
                  <div role="alert">
                    <ErrorState
                      message="No pudimos cargar los cobros."
                      onRetry={() => void refetchCobros()}
                    />
                  </div>
                ) : cobrosSuccess && cobros ? (
                  <>
                    <div className={`grid gap-px bg-border ${cobros.requiereRevision ? 'grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 min-[360px]:grid-cols-3'}`}>
                      <div className="min-w-0 bg-surface px-3 py-3 text-center sm:px-5">
                        <div className="text-[11.5px] text-text-3">Total</div>
                        <div className="font-mono text-[15px] font-extrabold [overflow-wrap:anywhere]">{formatMoney(cobros.total)}</div>
                      </div>
                      <div className="min-w-0 bg-surface px-3 py-3 text-center sm:px-5">
                        <div className="text-[11.5px] text-text-3">Cobrado</div>
                        <div className="font-mono text-[15px] font-extrabold text-success [overflow-wrap:anywhere]">{formatMoney(cobros.cobrado)}</div>
                      </div>
                      <div className="min-w-0 bg-surface px-3 py-3 text-center sm:px-5">
                        <div className="text-[11.5px] text-text-3">Pendiente de cobro</div>
                        <div className={`font-mono text-[15px] font-extrabold [overflow-wrap:anywhere] ${cobros.saldo > 0 ? 'text-warning' : 'text-text-2'}`}>
                          {formatMoney(cobros.saldo)}
                        </div>
                      </div>
                      {cobros.requiereRevision && (
                        <div className="min-w-0 bg-danger-soft px-3 py-3 text-center sm:px-5">
                          <div className="text-[11.5px] font-semibold text-danger-fg">Excedente a revisar</div>
                          <div className="font-mono text-[15px] font-extrabold text-danger-fg [overflow-wrap:anywhere]">
                            {formatMoney(cobros.excedente)}
                          </div>
                        </div>
                      )}
                    </div>

                    {cobros.requiereRevision ? (
                      <div role="alert" className="border-t border-danger bg-danger-soft px-5 py-2 text-center text-[12.5px] font-bold text-danger-fg">
                        Hay un excedente histórico. Revisá los cobros antes de registrar otro movimiento.
                      </div>
                    ) : cobros.pagado && cobros.total > 0 ? (
                      <div className="border-t border-border bg-success-soft px-5 py-2 text-center text-[12.5px] font-bold text-success">
                        Cobro completo registrado
                      </div>
                    ) : null}

                    {cobros.cobros.length === 0 ? (
                      <div className="border-t border-border px-5 py-5 text-center text-[13.5px] text-text-3">Sin cobros registrados.</div>
                    ) : (
                      cobros.cobros.map((c) => {
                        const anulado = c.estado === 'ANULADO';
                        return (
                          <div
                            key={c.id}
                            className={`group flex flex-wrap items-start gap-3 border-t border-border px-4 py-3 sm:flex-nowrap sm:px-5 ${anulado ? 'bg-surface-2' : ''}`}
                          >
                            <div className="min-w-0 flex-1 basis-[180px]">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <span className={`text-[14px] font-semibold ${anulado ? 'text-text-2' : ''}`}>
                                  {metodoLabel(c.metodo)}
                                </span>
                                {anulado && (
                                  <span className="inline-flex rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-extrabold text-danger-fg">
                                    Anulado
                                  </span>
                                )}
                              </div>
                              <div className="text-[12px] text-text-3">Registrado el {formatDate(c.fecha)}</div>
                              {c.referencia && (
                                <div className="mt-1 break-all text-[12px] font-semibold text-text-2">
                                  Referencia: <span className="font-mono">{c.referencia}</span>
                                </div>
                              )}
                              {c.observaciones && (
                                <div className="mt-1 [overflow-wrap:anywhere] text-[12px] text-text-3">Observación: {c.observaciones}</div>
                              )}
                              {anulado && (
                                <div className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-text-2">
                                  <div className="font-semibold [overflow-wrap:anywhere]">
                                    {c.anuladoAt ? `Anulado el ${formatDateTime(c.anuladoAt)}` : 'Anulado'}
                                    {c.anuladoPorNombre ? ` por ${c.anuladoPorNombre}` : ''}
                                  </div>
                                  <div className="mt-0.5 [overflow-wrap:anywhere]">
                                    Motivo: {c.motivoAnulacion?.trim() || 'No informado'}
                                  </div>
                                </div>
                              )}
                            </div>
                            <span className={`shrink-0 font-mono text-[14px] font-bold ${anulado ? 'text-text-3 line-through decoration-danger' : ''}`}>
                              {formatMoney(c.monto)}
                            </span>
                            {isAdmin && !anulado && (
                              <button
                                type="button"
                                aria-label={`Anular cobro de ${formatMoney(c.monto)} del ${formatDate(c.fecha)}`}
                                title="Anular cobro"
                                onClick={() => setCobroToCancel(c)}
                                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 opacity-100 transition hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                              >
                                <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                ) : null}
              </section>
            )}
          </div>

          {/* Columna lateral */}
          <div className="flex flex-col gap-4">
            <div className={`${card} p-5`}>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-primary-soft text-[15px] font-extrabold text-primary-soft-fg">
                  {iniciales(rep.clienteNombre, rep.clienteApellido)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-extrabold">{clienteLabel(rep)}</div>
                  {clienteTelefono && <div className="font-mono text-[12.5px] text-text-3">{clienteTelefono}</div>}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between text-[13.5px]">
                  <span className="text-text-2">Precio estimado</span>
                  <span className="font-mono font-bold">{formatMoney(rep.precioEstimado)}</span>
                </div>
                <div className="flex justify-between text-[13.5px]">
                  <span className="text-text-2">Precio final</span>
                  <span className="font-mono font-bold">{formatMoney(rep.precioFinal)}</span>
                </div>
                {rep.total != null && (
                  <div className="flex justify-between border-t border-border pt-2.5 text-[13.5px]">
                    <span className="font-semibold text-text-2">Total (con repuestos)</span>
                    <span className="font-mono text-[16px] font-extrabold text-primary">{formatMoney(rep.total)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={`${card} p-5`}>
              <label htmlFor="estado-reparacion" className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-text-3">Cambiar estado</label>
              <select
                id="estado-reparacion"
                value={rep.estado}
                onChange={(e) => handleEstadoSelect(e.target.value as EstadoReparacion)}
                disabled={estadoTransitionInFlight || cambiarEstado.isPending}
                className={`${inputClass()} mb-2.5 cursor-pointer`}
              >
                {/* Solo el estado actual + las transiciones legales (un salto ilegal daría 409). */}
                {[rep.estado, ...transicionesDesde(rep.estado)].map((k) => {
                  const e = getEstadoMeta(k);
                  return (
                    <option key={e.key} value={e.key}>
                      {e.label}
                    </option>
                  );
                })}
              </select>
              {next && (
                <button
                  onClick={() => cambiarEstadoSeguro(next)}
                  disabled={estadoTransitionInFlight || cambiarEstado.isPending}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-3 text-[14px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:opacity-60 sm:min-h-0"
                >
                  Marcar como {getEstadoMeta(next).label.toLowerCase()}
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              )}
              <button
                onClick={avisarWhatsapp}
                disabled={!clienteTelefono}
                className={`${btnGhost} mt-2.5 w-full`}
                title={clienteTelefono ? 'Avisar por WhatsApp' : 'El cliente no tiene teléfono'}
              >
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.7A8.4 8.4 0 1 1 21 11.5z" />
                </svg>
                Avisar al cliente
              </button>
            </div>

            {/* Garantía y conformidad (aparecen a partir de la entrega) */}
            {(rep.garantiaFin || rep.garantiaInicio || rep.fechaConformidadEntrega) && (
              <div className={`${card} p-4`}>
                <div className="text-[12px] font-extrabold uppercase tracking-wide text-text-3">Garantía</div>
                {rep.garantiaFin && (
                  <div className="mt-2">
                    {rep.garantiaVigente ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-extrabold text-success">
                        Vigente hasta el {formatDate(rep.garantiaFin)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-surface-3 px-2.5 py-1 text-[12px] font-extrabold text-text-2">
                        Venció el {formatDate(rep.garantiaFin)}
                      </span>
                    )}
                  </div>
                )}
                {rep.garantiaCondiciones && (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-text-2">{rep.garantiaCondiciones}</p>
                )}
                {rep.fechaConformidadEntrega && (
                  <div className="mt-2 text-[12.5px] text-text-3">
                    Retiró conforme el {formatDate(rep.fechaConformidadEntrega)}
                  </div>
                )}
                {rep.garantiaVigente && !rep.esGarantia && (
                  <button
                    type="button"
                    onClick={() => setReclamoOpen(true)}
                    className={`${btnGhost} mt-3 w-full text-[13px]`}
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Reclamo en garantía
                  </button>
                )}
              </div>
            )}

            {rep.codigoSeguimiento && (
              <div className={`${card} p-4`}>
                <div className="text-[12px] font-extrabold uppercase tracking-wide text-text-3">Seguimiento del cliente</div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-[14px] font-bold">{rep.codigoSeguimiento}</span>
                  <a
                    href={`/seguimiento/${rep.codigoSeguimiento}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] font-bold text-primary hover:underline"
                  >
                    Ver página →
                  </a>
                </div>
              </div>
            )}

            <div className="flex gap-2.5">
              <button className={`${btnGhost} flex-1`} onClick={() => setEditOpen(true)}>
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
                Editar
              </button>
              {isAdmin && (
                <button className={`${btnDanger} flex-1`} onClick={() => setConfirmOpen(true)}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReparacionFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        editing={rep}
        credenciales={credenciales}
        onLimpiarCredenciales={limpiarCredenciales}
        onRefetchCredenciales={refetchCredenciales}
      />
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Eliminar reparación"
        message={`¿Seguro que querés eliminar la reparación ${ordenLabel(rep)}? Esta acción no se puede deshacer.`}
        loading={deleteMutation.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(rep.id);
          setConfirmOpen(false);
          navigate('/reparaciones');
        }}
      />

      <RepuestoFormModal
        isOpen={repuestoOpen}
        onClose={() => setRepuestoOpen(false)}
        editing={editingRepuesto}
        lockedReparacionId={rep.id}
      />
      <PresupuestoFormModal isOpen={presupuestoOpen} onClose={() => setPresupuestoOpen(false)} reparacionId={rep.id} />
      <ReclamoGarantiaModal isOpen={reclamoOpen} onClose={() => setReclamoOpen(false)} reparacion={rep} />
      <CobroFormModal
        isOpen={cobroOpen}
        onClose={() => setCobroOpen(false)}
        reparacionId={rep.id}
        saldo={cobrosSuccess ? cobros?.saldo : undefined}
        excedente={cobrosSuccess ? cobros?.excedente : undefined}
        requiereRevision={cobrosSuccess ? cobros?.requiereRevision : undefined}
      />
      <ConfirmDialog
        isOpen={!!repuestoToDelete}
        title="Eliminar repuesto"
        message={`¿Seguro que querés eliminar "${repuestoToDelete?.nombre}"?`}
        loading={deleteRepuesto.isPending}
        onClose={() => setRepuestoToDelete(null)}
        onConfirm={async () => {
          if (!repuestoToDelete) return;
          await deleteRepuesto.mutateAsync(repuestoToDelete.id);
          setRepuestoToDelete(null);
        }}
      />
      <CobroAnulacionModal
        isOpen={!!cobroToCancel}
        onClose={() => setCobroToCancel(null)}
        reparacionId={rep.id}
        cobro={cobroSeleccionado}
      />
    </DashboardLayout>
  );
};
