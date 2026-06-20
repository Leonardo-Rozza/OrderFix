import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EstadoBadge } from '../components/EstadoBadge';
import { ReparacionFormModal } from '../components/ReparacionFormModal';
import { RepuestoFormModal } from '../components/RepuestoFormModal';
import { PresupuestoFormModal } from '../components/PresupuestoFormModal';
import { PresupuestoBadge } from '../components/PresupuestoBadge';
import { CobroFormModal } from '../components/CobroFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { metodoLabel } from '../config/cobros';
import { Loader } from '../components/Loader';
import { btnGhost, btnDanger, card } from '../components/ui';
import { ESTADOS, ESTADOS_LIST } from '../config/estados';
import { formatMoney, formatDate, iniciales } from '../utils/format';
import { apiClient } from '../api/axios';
import type { WhatsappLink } from '../types';
import { useReparacionesEnriquecidas, useEquiposEnriquecidos } from '../hooks/useEnriched';
import { useRepuestosPorReparacionQuery } from '../api/queries/repuestos.queries';
import { usePresupuestosQuery } from '../api/queries/presupuestos.queries';
import { useCobrosQuery } from '../api/queries/cobros.queries';
import { useAnularCobroMutation } from '../api/mutations/cobros.mutations';
import {
  useCambiarEstadoMutation,
  useDeleteReparacionMutation,
} from '../api/mutations/reparaciones.mutations';
import { useDeleteRepuestoMutation } from '../api/mutations/repuestos.mutations';
import { useAuth } from '../store/auth.store';
import type { EstadoReparacion, Repuesto } from '../types';

export const ReparacionDetallePage = () => {
  const { id } = useParams();
  const reparacionId = Number(id);
  const navigate = useNavigate();

  const { data: reparaciones, isLoading } = useReparacionesEnriquecidas();
  const { data: equipos } = useEquiposEnriquecidos();
  const { data: repuestos = [] } = useRepuestosPorReparacionQuery(reparacionId);
  const { data: presupuestos = [] } = usePresupuestosQuery(reparacionId);
  const { data: cobros } = useCobrosQuery(reparacionId);
  const anularCobro = useAnularCobroMutation(reparacionId);
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

  const openNewRepuesto = () => {
    setEditingRepuesto(null);
    setRepuestoOpen(true);
  };
  const openEditRepuesto = (rp: Repuesto) => {
    setEditingRepuesto(rp);
    setRepuestoOpen(true);
  };

  const rep = useMemo(() => reparaciones.find((r) => r.id === reparacionId), [reparaciones, reparacionId]);
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

  const meta = ESTADOS[rep.estado];
  const cliente = rep.equipo?.cliente;
  const equipoNombre = rep.equipo ? `${rep.equipo.marca} ${rep.equipo.modelo}` : `Equipo #${rep.equipoId}`;
  const next = meta.next;

  const handleEstadoSelect = (estado: EstadoReparacion) => {
    if (estado !== rep.estado) cambiarEstado.mutate({ id: rep.id, estado });
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
                    <span className="rounded-md bg-surface-3 px-2 py-0.5 font-mono text-[12px] font-bold text-text-3">#{rep.id}</span>
                  </div>
                  <div className="mt-0.5 text-[14px] text-text-2">Ingresó el {formatDate(rep.fechaIngreso)}</div>
                </div>
                <EstadoBadge estado={rep.estado} size="md" />
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-text-3">Problema reportado</div>
                <div className="text-[15px] leading-relaxed">{rep.descripcionProblema}</div>
              </div>

              {rep.equipo && (rep.equipo.imei || rep.equipo.color) && (
                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-[13.5px]">
                  {rep.equipo.color && (
                    <div>
                      <span className="text-text-3">Color: </span>
                      <span className="font-semibold">{rep.equipo.color}</span>
                    </div>
                  )}
                  {rep.equipo.imei && (
                    <div>
                      <span className="text-text-3">IMEI: </span>
                      <span className="font-mono font-semibold">{rep.equipo.imei}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Repuestos */}
            <div className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] font-extrabold">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m7.5 4.27 9 5.15M21 8l-9 5-9-5 9-5 9 5zM3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
                Repuestos
                <button
                  type="button"
                  onClick={openNewRepuesto}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[12.5px] font-bold text-text-2 transition hover:border-primary hover:text-primary"
                >
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Agregar
                </button>
              </div>
              {repuestos.map((rp) => (
                <div key={rp.id} className="group flex items-center gap-3 border-b border-border px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{rp.nombre}</div>
                    {rp.descripcion && <div className="truncate text-[12px] text-text-3">{rp.descripcion}</div>}
                  </div>
                  <span className="font-mono text-[13.5px] font-bold">{formatMoney(rp.precio)}</span>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => openEditRepuesto(rp)}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary"
                    >
                      <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </svg>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() => setRepuestoToDelete(rp)}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-danger hover:text-danger"
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
              <div className="flex items-center justify-between bg-surface-2 px-5 py-3.5">
                <span className="text-[14px] font-extrabold">Total repuestos</span>
                <span className="font-mono text-[15px] font-extrabold text-primary">{formatMoney(rep.totalRepuestos ?? totalRepuestos)}</span>
              </div>
            </div>

            {/* Orden de trabajo */}
            {(rep.patronDesbloqueo ||
              rep.pinDesbloqueo ||
              rep.accesorios ||
              rep.condicionesIngreso ||
              rep.observaciones ||
              rep.tecnicoNombre ||
              (rep.fotos?.length ?? 0) > 0) && (
              <div className={`${card} p-5`}>
                <div className="mb-3.5 text-[15px] font-extrabold">Orden de trabajo</div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13.5px] sm:grid-cols-2">
                  {rep.tecnicoNombre && (
                    <div>
                      <span className="text-text-3">Técnico: </span>
                      <span className="font-semibold">{rep.tecnicoNombre}</span>
                    </div>
                  )}
                  {rep.patronDesbloqueo && (
                    <div>
                      <span className="text-text-3">Patrón: </span>
                      <span className="font-mono font-semibold">{rep.patronDesbloqueo}</span>
                    </div>
                  )}
                  {rep.pinDesbloqueo && (
                    <div>
                      <span className="text-text-3">PIN: </span>
                      <span className="font-mono font-semibold">{rep.pinDesbloqueo}</span>
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
                {(rep.fotos?.length ?? 0) > 0 && (
                  <div className="mt-3.5 border-t border-border pt-3.5">
                    <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-text-3">Fotos</div>
                    <div className="flex flex-wrap gap-2">
                      {rep.fotos!.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                          <img src={url} alt="Foto del equipo" className="h-16 w-16 rounded-lg border border-border object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Presupuestos */}
            <div className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] font-extrabold">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h6" />
                </svg>
                Presupuestos
                <button
                  type="button"
                  onClick={() => setPresupuestoOpen(true)}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[12.5px] font-bold text-text-2 transition hover:border-primary hover:text-primary"
                >
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nuevo
                </button>
              </div>
              {presupuestos.length === 0 ? (
                <div className="px-5 py-5 text-center text-[13.5px] text-text-3">
                  Sin presupuestos. Creá uno para que el cliente lo apruebe desde el seguimiento.
                </div>
              ) : (
                presupuestos.map((p) => (
                  <div key={p.id} className="border-b border-border px-5 py-3.5 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <PresupuestoBadge estado={p.estado} />
                      <span className="text-[12.5px] text-text-3">{formatDate(p.createdAt)}</span>
                      <span className="ml-auto font-mono text-[15px] font-extrabold text-primary">{formatMoney(p.total)}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {p.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[13px] text-text-2">
                          <span className="truncate">
                            {it.cantidad}× {it.descripcion}
                          </span>
                          <span className="font-mono">{formatMoney(it.cantidad * it.precioUnitario)}</span>
                        </div>
                      ))}
                    </div>
                    {p.observaciones && <div className="mt-2 text-[12.5px] text-text-3">{p.observaciones}</div>}
                  </div>
                ))
              )}
            </div>
            {/* Cobros */}
            <div className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] font-extrabold">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Cobros
                <a
                  href={`/reparaciones/${rep.id}/recibo`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[12.5px] font-bold text-text-2 transition hover:border-primary hover:text-primary"
                >
                  Recibo
                </a>
                <button
                  type="button"
                  onClick={() => setCobroOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[12.5px] font-bold text-text-2 transition hover:border-primary hover:text-primary"
                >
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Cobrar
                </button>
              </div>

              <div className="grid grid-cols-3 gap-px bg-border">
                <div className="bg-surface px-5 py-3 text-center">
                  <div className="text-[11.5px] text-text-3">Total</div>
                  <div className="font-mono text-[15px] font-extrabold">{formatMoney(cobros?.total)}</div>
                </div>
                <div className="bg-surface px-5 py-3 text-center">
                  <div className="text-[11.5px] text-text-3">Cobrado</div>
                  <div className="font-mono text-[15px] font-extrabold text-success">{formatMoney(cobros?.cobrado)}</div>
                </div>
                <div className="bg-surface px-5 py-3 text-center">
                  <div className="text-[11.5px] text-text-3">Saldo</div>
                  <div className={`font-mono text-[15px] font-extrabold ${(cobros?.saldo ?? 0) > 0 ? 'text-warning' : 'text-text-2'}`}>
                    {formatMoney(cobros?.saldo)}
                  </div>
                </div>
              </div>

              {cobros?.pagado && (
                <div className="border-t border-border bg-success-soft px-5 py-2 text-center text-[12.5px] font-bold text-success">
                  Pagado en su totalidad
                </div>
              )}

              {(cobros?.cobros.length ?? 0) === 0 ? (
                <div className="border-t border-border px-5 py-5 text-center text-[13.5px] text-text-3">Sin cobros registrados.</div>
              ) : (
                cobros!.cobros.map((c) => (
                  <div key={c.id} className="group flex items-center gap-3 border-t border-border px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold">{metodoLabel(c.metodo)}</div>
                      <div className="text-[12px] text-text-3">
                        {formatDate(c.fecha)}
                        {c.observaciones ? ` · ${c.observaciones}` : ''}
                      </div>
                    </div>
                    <span className="font-mono text-[14px] font-bold">{formatMoney(c.monto)}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        title="Anular cobro"
                        onClick={() => anularCobro.mutate({ reparacionId: rep.id, cobroId: c.id })}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 opacity-0 transition hover:border-danger hover:text-danger group-hover:opacity-100"
                      >
                        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Columna lateral */}
          <div className="flex flex-col gap-4">
            <div className={`${card} p-5`}>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-primary-soft text-[15px] font-extrabold text-primary-soft-fg">
                  {iniciales(cliente?.nombre, cliente?.apellido)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-extrabold">
                    {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Sin cliente'}
                  </div>
                  {cliente?.telefono && <div className="font-mono text-[12.5px] text-text-3">{cliente.telefono}</div>}
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
              <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-text-3">Cambiar estado</div>
              <select
                value={rep.estado}
                onChange={(e) => handleEstadoSelect(e.target.value as EstadoReparacion)}
                className="mb-2.5 w-full cursor-pointer rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-[14px] text-text outline-none focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]"
              >
                {ESTADOS_LIST.map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.label}
                  </option>
                ))}
              </select>
              {next && (
                <button
                  onClick={() => cambiarEstado.mutate({ id: rep.id, estado: next })}
                  disabled={cambiarEstado.isPending}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-3 text-[14px] font-bold text-primary-fg shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
                >
                  Marcar como {ESTADOS[next].label.toLowerCase()}
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              )}
              <button
                onClick={avisarWhatsapp}
                disabled={!cliente?.telefono}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface py-2.5 text-[14px] font-bold text-text transition hover:bg-surface-2 disabled:opacity-50"
                title={cliente?.telefono ? 'Avisar por WhatsApp' : 'El cliente no tiene teléfono'}
              >
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.7A8.4 8.4 0 1 1 21 11.5z" />
                </svg>
                Avisar al cliente
              </button>
            </div>

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

      <ReparacionFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} editing={rep} equipos={equipos} />
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Eliminar reparación"
        message={`¿Seguro que querés eliminar la reparación #${rep.id}? Esta acción no se puede deshacer.`}
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
      <CobroFormModal isOpen={cobroOpen} onClose={() => setCobroOpen(false)} reparacionId={rep.id} saldo={cobros?.saldo} />
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
    </DashboardLayout>
  );
};
