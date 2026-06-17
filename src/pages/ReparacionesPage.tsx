import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EstadoBadge } from '../components/EstadoBadge';
import { ReparacionFormModal } from '../components/ReparacionFormModal';
import { btnPrimary } from '../components/ui';
import { ESTADOS, ESTADOS_LIST } from '../config/estados';
import { formatMoney } from '../utils/format';
import { useReparacionesEnriquecidas } from '../hooks/useEnriched';
import type { ReparacionEnriquecida } from '../hooks/useEnriched';
import { useEquiposEnriquecidos } from '../hooks/useEnriched';
import { useCambiarEstadoMutation } from '../api/mutations/reparaciones.mutations';
import type { EstadoReparacion, Reparacion } from '../types';

type Vista = 'board' | 'list';
type Filtro = EstadoReparacion | 'TODOS';

const equipoLabel = (r: ReparacionEnriquecida) =>
  r.equipo ? `${r.equipo.marca} ${r.equipo.modelo}` : `Equipo #${r.equipoId}`;
const clienteLabel = (r: ReparacionEnriquecida) =>
  r.equipo?.cliente ? `${r.equipo.cliente.nombre} ${r.equipo.cliente.apellido}` : 'Sin cliente';

const matches = (r: ReparacionEnriquecida, q: string) => {
  if (!q) return true;
  const t = q.toLowerCase();
  return (
    equipoLabel(r).toLowerCase().includes(t) ||
    clienteLabel(r).toLowerCase().includes(t) ||
    r.descripcionProblema.toLowerCase().includes(t) ||
    String(r.id).includes(t)
  );
};

export const ReparacionesPage = () => {
  const navigate = useNavigate();
  const { data: reparaciones, isLoading } = useReparacionesEnriquecidas();
  const { data: equipos } = useEquiposEnriquecidos();
  const cambiarEstado = useCambiarEstadoMutation();

  const [vista, setVista] = useState<Vista>('board');
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reparacion | null>(null);

  const filtradas = useMemo(
    () => reparaciones.filter((r) => matches(r, search) && (filtro === 'TODOS' || r.estado === filtro)),
    [reparaciones, search, filtro]
  );

  const counts = useMemo(() => {
    const base = { TODOS: reparaciones.length } as Record<Filtro, number>;
    ESTADOS_LIST.forEach((e) => (base[e.key] = 0));
    reparaciones.forEach((r) => (base[r.estado] = (base[r.estado] ?? 0) + 1));
    return base;
  }, [reparaciones]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const advance = (r: Reparacion) => {
    const next = ESTADOS[r.estado].next;
    if (next) cambiarEstado.mutate({ id: r.id, estado: next });
  };

  const chips: { key: Filtro; label: string }[] = [
    { key: 'TODOS', label: 'Todas' },
    ...ESTADOS_LIST.map((e) => ({ key: e.key as Filtro, label: e.label })),
  ];

  return (
    <DashboardLayout title="Reparaciones">
      <div className="ofx-in space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-surface-3 p-1">
            {(['board', 'list'] as Vista[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={`rounded-md px-3.5 py-1.5 text-[13px] font-bold transition ${
                  vista === v ? 'bg-surface text-text shadow-sm' : 'text-text-2'
                }`}
              >
                {v === 'board' ? 'Tablero' : 'Lista'}
              </button>
            ))}
          </div>

          <div className="relative ml-auto min-w-[180px] max-w-[320px] flex-1">
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-2.5">
              <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar equipo, cliente o #orden…"
              className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-[13.5px] text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]"
            />
          </div>

          <button type="button" className={btnPrimary} onClick={openNew}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva reparación
          </button>
        </div>

        {/* Chips de filtro */}
        <div className="ofx-scroll flex gap-2 overflow-x-auto pb-1">
          {chips.map((c) => {
            const active = filtro === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFiltro(c.key)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition ${
                  active
                    ? 'border-primary bg-primary text-primary-fg'
                    : 'border-border-strong bg-surface text-text-2 hover:bg-surface-2'
                }`}
              >
                {c.label} · {counts[c.key] ?? 0}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <BoardSkeleton />
        ) : vista === 'board' ? (
          <Board reparaciones={filtradas} onOpen={(id) => navigate(`/reparaciones/${id}`)} onAdvance={advance} />
        ) : (
          <Lista
            reparaciones={filtradas}
            onOpen={(id) => navigate(`/reparaciones/${id}`)}
            onAdvance={advance}
          />
        )}
      </div>

      <ReparacionFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} editing={editing} equipos={equipos} />
    </DashboardLayout>
  );
};

/* ---------- Tablero kanban ---------- */
const Board = ({
  reparaciones,
  onOpen,
  onAdvance,
}: {
  reparaciones: ReparacionEnriquecida[];
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
}) => (
  <div className="ofx-scroll flex items-start gap-3.5 overflow-x-auto pb-2">
    {ESTADOS_LIST.map((meta) => {
      const items = reparaciones.filter((r) => r.estado === meta.key);
      return (
        <div key={meta.key} className="flex w-[296px] flex-shrink-0 flex-col rounded-2xl border border-border bg-surface-2">
          <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
            <span className={`grid h-6 w-6 place-items-center rounded-lg ${meta.textClass} ${meta.bgClass}`}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d={meta.iconD} />
              </svg>
            </span>
            <span className="text-[13.5px] font-extrabold">{meta.label}</span>
            <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[12px] font-bold text-text-3">{items.length}</span>
          </div>
          <div className="flex flex-col gap-2.5 p-3">
            {items.map((r) => (
              <div
                key={r.id}
                onClick={() => onOpen(r.id)}
                className="cursor-pointer rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong"
                style={{ borderLeft: `3px solid ${meta.cssVar}` }}
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate text-[14px] font-extrabold">{equipoLabel(r)}</div>
                  <span className="font-mono text-[10.5px] font-bold text-text-3">#{r.id}</span>
                </div>
                <div className="mt-0.5 text-[12.5px] font-semibold text-text-2">{clienteLabel(r)}</div>
                <div className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-text-3">{r.descripcionProblema}</div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="font-mono text-[13.5px] font-extrabold" style={{ color: meta.cssVar }}>
                    {formatMoney(r.precioFinal ?? r.precioEstimado)}
                  </span>
                  {meta.next && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdvance(r);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[11.5px] font-bold text-text-2 transition hover:border-primary hover:text-primary"
                    >
                      Avanzar
                      <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="rounded-lg border border-dashed border-border py-5 text-center text-[12.5px] text-text-3">
                Sin reparaciones acá
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

/* ---------- Vista lista ---------- */
const Lista = ({
  reparaciones,
  onOpen,
  onAdvance,
}: {
  reparaciones: ReparacionEnriquecida[];
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
}) => {
  if (reparaciones.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface py-12 text-center">
        <div className="text-[15px] font-extrabold">No encontramos reparaciones</div>
        <div className="mt-1 text-[13px] text-text-3">Probá con otro filtro o término de búsqueda.</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
        <div className="min-w-0 flex-[1.6]">Equipo / Cliente</div>
        <div className="hidden min-w-0 flex-[1.6] sm:block">Problema</div>
        <div className="w-[150px]">Estado</div>
        <div className="w-[96px] text-right">Precio</div>
        <div className="w-10" />
      </div>
      {reparaciones.map((r) => {
        const meta = ESTADOS[r.estado];
        return (
          <div
            key={r.id}
            onClick={() => onOpen(r.id)}
            className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 transition last:border-0 hover:bg-surface-2"
          >
            <div className="min-w-0 flex-[1.6]">
              <div className="truncate text-[14px] font-bold">{equipoLabel(r)}</div>
              <div className="text-[12.5px] text-text-2">{clienteLabel(r)}</div>
            </div>
            <div className="hidden min-w-0 flex-[1.6] truncate text-[13px] text-text-3 sm:block">{r.descripcionProblema}</div>
            <div className="w-[150px]">
              <EstadoBadge estado={r.estado} />
            </div>
            <div className="w-[96px] text-right font-mono text-[13.5px] font-bold">
              {formatMoney(r.precioFinal ?? r.precioEstimado)}
            </div>
            {meta.next ? (
              <button
                type="button"
                title="Avanzar estado"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvance(r);
                }}
                className="grid h-8 w-10 flex-shrink-0 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary"
              >
                <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            ) : (
              <div className="w-10" />
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Skeleton ---------- */
const BoardSkeleton = () => (
  <div className="flex gap-3.5 overflow-hidden">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="w-[296px] flex-shrink-0 rounded-2xl border border-border bg-surface-2 p-3">
        <div className="ofx-skel mb-3 h-6 w-32 rounded" />
        <div className="ofx-skel mb-2.5 h-24 rounded-xl" />
        <div className="ofx-skel h-24 rounded-xl" />
      </div>
    ))}
  </div>
);
