import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EstadoBadge } from '../components/EstadoBadge';
import { ReparacionFormModal } from '../components/ReparacionFormModal';
import { Pagination } from '../components/Pagination';
import { SortSelect } from '../components/SortSelect';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { btnPrimary } from '../components/ui';
import { getEstadoMeta, ESTADOS_LIST } from '../config/estados';
import { formatMoney } from '../utils/format';
import { equipoLabel, clienteLabel } from '../utils/reparacion';
import { useListParams } from '../hooks/useListParams';
import { useReparacionesQuery } from '../api/queries/reparaciones.queries';
import { useEquiposOptions } from '../api/queries/equipos.queries';
import { useDashboardQuery } from '../api/queries/dashboard.queries';
import { useCambiarEstadoMutation } from '../api/mutations/reparaciones.mutations';
import type { EstadoReparacion, Reparacion } from '../types';

type Vista = 'board' | 'list';
type Filtro = EstadoReparacion | 'TODOS';

export const ReparacionesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cambiarEstado = useCambiarEstadoMutation();
  const { data: equipos = [] } = useEquiposOptions();
  const { data: stats } = useDashboardQuery();

  const { q, onSearch, page, setPage, debouncedQ, size, sort, setSort } = useListParams(20, 'id,desc');
  const [vista, setVista] = useState<Vista>('board');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [localOpen, setLocalOpen] = useState(false);

  const nuevoParam = searchParams.get('nuevo') !== null;
  const formOpen = localOpen || nuevoParam;
  const closeForm = () => {
    setLocalOpen(false);
    if (nuevoParam) {
      searchParams.delete('nuevo');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const open = (id: number) => navigate(`/reparaciones/${id}`);
  const advance = (r: Reparacion) => {
    if (cambiarEstado.isPending) return; // evita doble disparo
    const next = getEstadoMeta(r.estado).next;
    if (next) cambiarEstado.mutate({ id: r.id, estado: next });
  };
  const move = (id: number, estado: EstadoReparacion) => {
    if (cambiarEstado.isPending) return;
    cambiarEstado.mutate({ id, estado });
  };

  const counts = stats?.reparacionesPorEstado;
  const chips: { key: Filtro; label: string; count?: number }[] = [
    { key: 'TODOS', label: 'Todas', count: stats?.totalReparaciones },
    ...ESTADOS_LIST.map((e) => ({ key: e.key as Filtro, label: e.label, count: counts?.[e.key] })),
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

          <div className="relative w-full sm:ml-auto sm:w-auto sm:min-w-[180px] sm:max-w-[320px] sm:flex-1">
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-2.5">
              <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
            </svg>
            <input
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar equipo, cliente o problema…"
              className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-[13.5px] text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]"
            />
          </div>

          {vista === 'list' && (
            <SortSelect
              value={sort}
              onChange={setSort}
              options={[
                { value: 'id,desc', label: 'Más recientes' },
                { value: 'fechaIngreso,desc', label: 'Ingreso reciente' },
                { value: 'precioFinal,desc', label: 'Mayor precio' },
                { value: 'estado,asc', label: 'Estado' },
              ]}
            />
          )}

          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setLocalOpen(true)}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva reparación
          </button>
        </div>

        {vista === 'list' && (
          <div className="ofx-scroll flex gap-2 overflow-x-auto pb-1">
            {chips.map((c) => {
              const active = filtro === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setFiltro(c.key);
                    setPage(0);
                  }}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition ${
                    active ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong bg-surface text-text-2 hover:bg-surface-2'
                  }`}
                >
                  {c.label}
                  {c.count != null ? ` · ${c.count}` : ''}
                </button>
              );
            })}
          </div>
        )}

        {vista === 'board' ? (
          <Board q={debouncedQ} onOpen={open} onAdvance={advance} onMove={move} />
        ) : (
          <Lista
            q={debouncedQ}
            estado={filtro === 'TODOS' ? undefined : filtro}
            page={page}
            size={size}
            sort={sort}
            onPage={setPage}
            onOpen={open}
            onAdvance={advance}
          />
        )}
      </div>

      <ReparacionFormModal
        isOpen={formOpen}
        onClose={closeForm}
        editing={null}
        equipos={equipos}
        onCreated={(id) => navigate(`/reparaciones/${id}`)}
      />
    </DashboardLayout>
  );
};

/* ---------- Tablero kanban: una query por columna (?estado=) ---------- */
const Board = ({
  q,
  onOpen,
  onAdvance,
  onMove,
}: {
  q: string;
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
  onMove: (id: number, estado: EstadoReparacion) => void;
}) => {
  const [drag, setDrag] = useState<{ id: number; estado: EstadoReparacion } | null>(null);
  const [overCol, setOverCol] = useState<EstadoReparacion | null>(null);

  return (
    <div className="ofx-scroll flex items-start gap-3.5 overflow-x-auto pb-2">
      {ESTADOS_LIST.map((meta) => (
        <BoardColumn
          key={meta.key}
          meta={meta}
          q={q}
          isOver={overCol === meta.key && drag !== null && drag.estado !== meta.key}
          onOpen={onOpen}
          onAdvance={onAdvance}
          onDragStartCard={(r) => setDrag({ id: r.id, estado: r.estado })}
          onDragEndCard={() => {
            setDrag(null);
            setOverCol(null);
          }}
          onOver={() => setOverCol(meta.key)}
          onDropCol={() => {
            if (drag && drag.estado !== meta.key) onMove(drag.id, meta.key);
            setDrag(null);
            setOverCol(null);
          }}
          draggingId={drag?.id ?? null}
        />
      ))}
    </div>
  );
};

const BoardColumn = ({
  meta,
  q,
  isOver,
  onOpen,
  onAdvance,
  onDragStartCard,
  onDragEndCard,
  onOver,
  onDropCol,
  draggingId,
}: {
  meta: (typeof ESTADOS_LIST)[number];
  q: string;
  isOver: boolean;
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
  onDragStartCard: (r: Reparacion) => void;
  onDragEndCard: () => void;
  onOver: () => void;
  onDropCol: () => void;
  draggingId: number | null;
}) => {
  const { data, isLoading } = useReparacionesQuery({ q, estado: meta.key, page: 0, size: 100 });
  const items = data?.content ?? [];
  const total = data?.page?.totalElements ?? items.length;

  return (
    <div
      data-testid={`col-${meta.key}`}
      onDragOver={(e) => {
        e.preventDefault();
        onOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropCol();
      }}
      className={`flex w-[296px] flex-shrink-0 flex-col rounded-2xl border bg-surface-2 transition ${
        isOver ? 'border-primary ring-2 ring-[var(--ring)]' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
        <span className={`grid h-6 w-6 place-items-center rounded-lg ${meta.textClass} ${meta.bgClass}`}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d={meta.iconD} />
          </svg>
        </span>
        <span className="text-[13.5px] font-extrabold">{meta.label}</span>
        <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[12px] font-bold text-text-3">{total}</span>
      </div>
      <div className="flex min-h-[64px] flex-col gap-2.5 p-3">
        {isLoading && items.length === 0 &&
          Array.from({ length: 2 }).map((_, i) => <div key={`sk-${i}`} className="ofx-skel h-[92px] rounded-xl" />)}
        {items.map((r) => (
          <div
            key={r.id}
            data-testid={`card-${r.id}`}
            role="button"
            tabIndex={0}
            aria-label={`Abrir reparación #${r.id} — ${equipoLabel(r)}`}
            draggable
            onDragStart={(e) => {
              onDragStartCard(r);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={onDragEndCard}
            onClick={() => onOpen(r.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(r.id);
              }
            }}
            className={`cursor-grab select-none rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] active:cursor-grabbing ${
              draggingId === r.id ? 'opacity-50' : ''
            }`}
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
        {!isLoading && items.length === 0 && (
          <div className={`rounded-lg border border-dashed py-5 text-center text-[12.5px] transition ${isOver ? 'border-primary text-primary' : 'border-border text-text-3'}`}>
            {isOver ? 'Soltá acá' : 'Sin reparaciones'}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Vista lista (paginada) ---------- */
const Lista = ({
  q,
  estado,
  page,
  size,
  sort,
  onPage,
  onOpen,
  onAdvance,
}: {
  q: string;
  estado?: EstadoReparacion;
  page: number;
  size: number;
  sort?: string;
  onPage: (p: number) => void;
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
}) => {
  const { data, isLoading, isError, refetch } = useReparacionesQuery({ q, estado, page, size, sort });
  const reparaciones = data?.content ?? [];

  if (isError) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <ErrorState onRetry={() => refetch()} message="No pudimos cargar las reparaciones." />
      </div>
    );
  }

  if (!isLoading && reparaciones.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState title="No encontramos reparaciones" hint="Probá con otro filtro o término de búsqueda." />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
          <div className="min-w-0 flex-[1.6]">Equipo / Cliente</div>
          <div className="hidden min-w-0 flex-[1.6] sm:block">Problema</div>
          <div className="hidden w-[150px] sm:block">Estado</div>
          <div className="w-[96px] text-right">Precio</div>
          <div className="w-10" />
        </div>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <div className="ofx-skel h-4 flex-[1.6] rounded" />
                <div className="ofx-skel hidden h-4 flex-[1.6] rounded sm:block" />
                <div className="ofx-skel hidden h-5 w-[150px] rounded-full sm:block" />
                <div className="ofx-skel h-4 w-[96px] rounded" />
                <div className="w-10" />
              </div>
            ))
          : reparaciones.map((r) => {
          const meta = getEstadoMeta(r.estado);
          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              aria-label={`Abrir reparación #${r.id} — ${equipoLabel(r)}`}
              onClick={() => onOpen(r.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen(r.id);
                }
              }}
              className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 transition last:border-0 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
            >
              <div className="min-w-0 flex-[1.6]">
                <div className="truncate text-[14px] font-bold">{equipoLabel(r)}</div>
                <div className="truncate text-[12.5px] text-text-2">{clienteLabel(r)}</div>
                {/* En mobile el estado va acá (la columna dedicada se oculta). */}
                <div className="mt-1.5 sm:hidden">
                  <EstadoBadge estado={r.estado} />
                </div>
              </div>
              <div className="hidden min-w-0 flex-[1.6] truncate text-[13px] text-text-3 sm:block">{r.descripcionProblema}</div>
              <div className="hidden w-[150px] sm:block">
                <EstadoBadge estado={r.estado} />
              </div>
              <div className="w-[96px] text-right font-mono text-[13.5px] font-bold">{formatMoney(r.precioFinal ?? r.precioEstimado)}</div>
              {meta.next ? (
                <button
                  type="button"
                  aria-label="Avanzar estado" title="Avanzar estado"
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
      <div className="mt-3">
        <Pagination meta={data?.page} onChange={onPage} />
      </div>
    </>
  );
};
