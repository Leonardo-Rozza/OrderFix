import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EstadoBadge } from '../components/EstadoBadge';
import { ReparacionFormModal } from '../components/ReparacionFormModal';
import { Pagination } from '../components/Pagination';
import { SortSelect } from '../components/SortSelect';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { btnPrimary } from '../components/ui';
import { getEstadoMeta, esTransicionValida, ESTADOS_LIST, FASES } from '../config/estados';
import { showError } from '../utils/toast';
import type { EstadoMeta, FaseMeta } from '../config/estados';
import { formatMoney } from '../utils/format';
import { equipoLabel, clienteLabel, ordenLabel } from '../utils/reparacion';
import { PagoChip } from '../components/PagoChip';
import { useListParams } from '../hooks/useListParams';
import { usePageBounds } from '../hooks/usePageBounds';
import { useReparacionesQuery } from '../api/queries/reparaciones.queries';
import { useDashboardQuery } from '../api/queries/dashboard.queries';
import { useCambiarEstadoMutation } from '../api/mutations/reparaciones.mutations';
import type { EstadoReparacion, Reparacion } from '../types';

type Vista = 'board' | 'list';
type Filtro = EstadoReparacion | 'TODOS';

export const ReparacionesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cambiarEstado = useCambiarEstadoMutation();
  const { data: stats } = useDashboardQuery();
  const { q, onSearch, page, setPage, debouncedQ, size, sort, setSort } = useListParams(20, 'id,desc');
  const [vista, setVista] = useState<Vista>('board');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [localOpen, setLocalOpen] = useState(false);
  const transitionLock = useRef(false);
  const [transitionInFlight, setTransitionInFlight] = useState(false);
  const transitionPending = cambiarEstado.isPending || transitionInFlight;

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
  const requestStateChange = (id: number, estado: EstadoReparacion) => {
    if (transitionLock.current || cambiarEstado.isPending) return;
    transitionLock.current = true;
    setTransitionInFlight(true);
    cambiarEstado.mutate(
      { id, estado },
      {
        onSettled: () => {
          transitionLock.current = false;
          setTransitionInFlight(false);
        },
      },
    );
  };
  const advance = (r: Reparacion) => {
    if (transitionLock.current || cambiarEstado.isPending) return;
    const next = getEstadoMeta(r.estado).next;
    if (next) requestStateChange(r.id, next);
  };
  const move = (id: number, desde: EstadoReparacion, hacia: EstadoReparacion) => {
    if (transitionLock.current || cambiarEstado.isPending || desde === hacia) return;
    // La máquina de estados del backend rechazaría el salto con 409: avisamos
    // antes de llamar para que el drag & drop no "rebote" sin explicación.
    if (!esTransicionValida(desde, hacia)) {
      showError(`No se puede pasar de "${getEstadoMeta(desde).label}" a "${getEstadoMeta(hacia).label}".`);
      return;
    }
    requestStateChange(id, hacia);
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
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
            </svg>
            <input
              type="search"
              aria-label="Buscar reparaciones"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar equipo, cliente o problema…"
              className="min-h-11 w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-base text-text outline-none transition placeholder:text-text-3 focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)] sm:min-h-0 sm:text-[13.5px]"
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
          <Board
            q={debouncedQ}
            transitionsDisabled={transitionPending}
            onOpen={open}
            onAdvance={advance}
            onMove={move}
          />
        ) : (
          <Lista
            q={debouncedQ}
            transitionsDisabled={transitionPending}
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
        onCreated={(id) => navigate(`/reparaciones/${id}`)}
      />
    </DashboardLayout>
  );
};

/* ----------------------------------------------------------------------
   Tablero kanban por FASES: cada columna agrupa estados afines y cada
   estado es una zona droppable con su propia query (?estado=).
   ---------------------------------------------------------------------- */
const Board = ({
  q,
  transitionsDisabled,
  onOpen,
  onAdvance,
  onMove,
}: {
  q: string;
  transitionsDisabled: boolean;
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
  onMove: (id: number, desde: EstadoReparacion, hacia: EstadoReparacion) => void;
}) => {
  const [drag, setDrag] = useState<{ id: number; estado: EstadoReparacion } | null>(null);
  const [overZona, setOverZona] = useState<EstadoReparacion | null>(null);

  return (
    <div className="ofx-scroll flex items-start gap-3.5 overflow-x-auto pb-2">
      {FASES.map((fase) => (
        <FaseColumn
          key={fase.key}
          fase={fase}
          q={q}
          transitionsDisabled={transitionsDisabled}
          drag={drag}
          overZona={overZona}
          onOpen={onOpen}
          onAdvance={onAdvance}
          onDragStartCard={(r) => setDrag({ id: r.id, estado: r.estado })}
          onDragEndCard={() => {
            setDrag(null);
            setOverZona(null);
          }}
          onOverZona={setOverZona}
          onDropZona={(estado) => {
            if (drag) onMove(drag.id, drag.estado, estado);
            setDrag(null);
            setOverZona(null);
          }}
        />
      ))}
    </div>
  );
};

interface ZonaDnD {
  transitionsDisabled: boolean;
  drag: { id: number; estado: EstadoReparacion } | null;
  overZona: EstadoReparacion | null;
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
  onDragStartCard: (r: Reparacion) => void;
  onDragEndCard: () => void;
  onOverZona: (estado: EstadoReparacion) => void;
  onDropZona: (estado: EstadoReparacion) => void;
}

const FaseColumn = ({ fase, q, ...dnd }: { fase: FaseMeta; q: string } & ZonaDnD) => (
  <div className="flex w-[296px] flex-shrink-0 flex-col rounded-2xl border border-border bg-surface-2">
    <div className="border-b border-border px-3.5 py-3 text-[12px] font-extrabold uppercase tracking-wide text-text-2">
      {fase.label}
    </div>
    <div className="flex flex-col gap-3 p-3">
      {fase.estados.map((estado) => (
        <EstadoZona key={estado} meta={getEstadoMeta(estado)} q={q} {...dnd} />
      ))}
    </div>
  </div>
);

const EstadoZona = ({
  meta,
  q,
  transitionsDisabled,
  drag,
  overZona,
  onOpen,
  onAdvance,
  onDragStartCard,
  onDragEndCard,
  onOverZona,
  onDropZona,
}: { meta: EstadoMeta; q: string } & ZonaDnD) => {
  const {
    data,
    isLoading,
    isError,
    isFetching,
    isPlaceholderData,
    refetch,
  } = useReparacionesQuery({ q, estado: meta.key, page: 0, size: 100 });
  const queryReady = !isLoading && !isError && data !== undefined;
  const items = queryReady ? data.content : [];
  const total = queryReady ? (data.page?.totalElements ?? items.length) : undefined;
  const refreshing = isFetching && isPlaceholderData;
  const interactionsDisabled = transitionsDisabled || refreshing;
  const isOver = !interactionsDisabled && overZona === meta.key && drag !== null && drag.estado !== meta.key;
  const draggingId = drag?.id ?? null;
  const resultIsPartial = total !== undefined && total > items.length;

  return (
    <div
      data-testid={`col-${meta.key}`}
      aria-busy={isLoading || refreshing}
      onDragOver={(e) => {
        if (interactionsDisabled) return;
        e.preventDefault();
        onOverZona(meta.key);
      }}
      onDrop={(e) => {
        if (interactionsDisabled) return;
        e.preventDefault();
        onDropZona(meta.key);
      }}
      className={`rounded-xl border transition ${
        isOver ? 'border-primary ring-2 ring-[var(--ring)]' : 'border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className={`grid h-6 w-6 place-items-center rounded-lg ${meta.textClass} ${meta.bgClass}`}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d={meta.iconD} />
          </svg>
        </span>
        <span className="text-[13px] font-extrabold">{meta.label}</span>
        {isLoading ? (
          <span className="ofx-skel ml-auto h-5 w-8 rounded-full" aria-label={`Cargando ${meta.label}`} />
        ) : (
          <span
            className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[11.5px] font-bold text-text-3"
            aria-label={total === undefined ? `Cantidad de ${meta.label} no disponible` : undefined}
          >
            {total ?? '—'}
          </span>
        )}
      </div>
      <div className="flex min-h-[48px] flex-col gap-2.5">
        {refreshing && (
          <div role="status" className="rounded-lg bg-surface-3 px-3 py-2 text-[12px] font-semibold text-text-3">
            Actualizando resultados…
          </div>
        )}
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <div key={`sk-${index}`} className="ofx-skel h-[92px] rounded-xl" aria-hidden="true" />
          ))
        ) : isError || !data ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <ErrorState
              onRetry={() => void refetch()}
              title="No se pudo cargar esta etapa"
              message={`No pudimos consultar ${meta.label.toLowerCase()}. Reintentá sin perder el resto del tablero.`}
            />
          </div>
        ) : (
          <>
            {items.map((r) => (
          <article
            key={r.id}
            data-testid={`card-${r.id}`}
            draggable={!interactionsDisabled}
            onDragStart={(e) => {
              if (interactionsDisabled) {
                e.preventDefault();
                return;
              }
              onDragStartCard(r);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={onDragEndCard}
            className={`relative select-none rounded-xl border border-border bg-surface p-3 shadow-sm transition ${
              interactionsDisabled
                ? 'cursor-default'
                : 'cursor-grab hover:-translate-y-0.5 hover:border-border-strong active:cursor-grabbing'
            } ${
              draggingId === r.id ? 'opacity-50' : ''
            }`}
            style={{ borderLeft: `3px solid ${meta.cssVar}` }}
          >
            <button
              type="button"
              aria-label={`Abrir reparación ${ordenLabel(r)} — ${equipoLabel(r)}`}
              onClick={() => onOpen(r.id)}
              disabled={interactionsDisabled}
              className="absolute inset-0 z-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-wait"
            />
            <div className="pointer-events-none relative z-10 flex items-center gap-2">
              <div className="min-w-0 flex-1 truncate text-[14px] font-extrabold">{equipoLabel(r)}</div>
              <span className="font-mono text-[10.5px] font-bold text-text-3">{ordenLabel(r)}</span>
            </div>
            <div className="pointer-events-none relative z-10 mt-0.5 text-[12.5px] font-semibold text-text-2">{clienteLabel(r)}</div>
            <div className="pointer-events-none relative z-10 mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-text-3">{r.descripcionProblema}</div>
            <div className={`pointer-events-none relative z-10 mt-2.5 flex items-center gap-2 ${meta.next ? 'min-h-11 pr-[92px] sm:min-h-0 sm:pr-[82px]' : ''}`}>
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="font-mono text-[13.5px] font-extrabold" style={{ color: meta.cssVar }}>
                  {formatMoney(r.total ?? r.precioFinal ?? r.precioEstimado)}
                </span>
                <PagoChip estadoPago={r.estadoPago} saldo={r.saldo} />
              </span>
            </div>
            {meta.next && (
              <button
                type="button"
                onClick={() => onAdvance(r)}
                disabled={interactionsDisabled}
                aria-busy={interactionsDisabled}
                className="absolute bottom-3 right-3 z-20 inline-flex min-h-11 items-center gap-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-[12px] font-bold text-text-2 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:px-2.5 sm:py-1 sm:text-[11.5px]"
              >
                Avanzar
                <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            )}
          </article>
            ))}
            {items.length === 0 && total === 0 && (
              <div className={`rounded-lg border border-dashed py-5 text-center text-[12.5px] transition ${isOver ? 'border-primary text-primary' : 'border-border text-text-3'}`}>
                {isOver ? 'Soltá acá' : 'Sin reparaciones'}
              </div>
            )}
            {resultIsPartial && (
              <div role="status" className="rounded-lg border border-warning bg-warning-soft px-3 py-2 text-[12px] font-semibold text-warning">
                Mostrando {items.length} de {total}. El tablero carga hasta 100 por estado.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ---------- Vista lista (paginada) ---------- */
const Lista = ({
  q,
  transitionsDisabled,
  estado,
  page,
  size,
  sort,
  onPage,
  onOpen,
  onAdvance,
}: {
  q: string;
  transitionsDisabled: boolean;
  estado?: EstadoReparacion;
  page: number;
  size: number;
  sort?: string;
  onPage: (p: number) => void;
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
}) => {
  const {
    data,
    isLoading,
    isError,
    isFetching,
    isPlaceholderData,
    refetch,
  } = useReparacionesQuery({ q, estado, page, size, sort });
  const reparaciones = data?.content ?? [];
  const refreshing = isFetching && isPlaceholderData;
  usePageBounds(page, onPage, data?.page, !isPlaceholderData);

  if (isError || (!isLoading && !data)) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <ErrorState onRetry={() => void refetch()} message="No pudimos cargar las reparaciones." />
      </div>
    );
  }

  if (!isLoading && !isPlaceholderData && reparaciones.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState title="No encontramos reparaciones" hint="Probá con otro filtro o término de búsqueda." />
      </div>
    );
  }

  return (
    <>
      {refreshing && (
        <div role="status" className="mb-2 px-1 text-[12.5px] font-semibold text-text-3">
          Actualizando resultados…
        </div>
      )}
      <div aria-busy={isLoading || refreshing} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
          <div className="min-w-0 flex-[1.6]">Equipo / Cliente</div>
          <div className="hidden min-w-0 flex-[1.6] sm:block">Problema</div>
          <div className="hidden w-[150px] sm:block">Estado</div>
          <div className="w-[80px] text-right sm:w-[96px]">Precio</div>
          <div className="w-11 sm:w-10" />
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
            <article
              key={r.id}
              className="relative flex items-center gap-3 border-b border-border px-4 py-3 transition last:border-0 hover:bg-surface-2"
            >
              <button
                type="button"
                aria-label={`Abrir reparación ${ordenLabel(r)} — ${equipoLabel(r)}`}
                onClick={() => onOpen(r.id)}
                disabled={refreshing}
                className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-wait"
              />
              <div className="pointer-events-none relative z-10 min-w-0 flex-[1.6]">
                <div className="truncate text-[14px] font-bold">{equipoLabel(r)}</div>
                <div className="truncate text-[12.5px] text-text-2">{clienteLabel(r)}</div>
                {/* En mobile el estado va acá (la columna dedicada se oculta). */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                  <EstadoBadge estado={r.estado} />
                  <PagoChip estadoPago={r.estadoPago} saldo={r.saldo} />
                </div>
              </div>
              <div className="pointer-events-none relative z-10 hidden min-w-0 flex-[1.6] truncate text-[13px] text-text-3 sm:block">{r.descripcionProblema}</div>
              <div className="pointer-events-none relative z-10 hidden w-[150px] sm:block">
                <EstadoBadge estado={r.estado} />
                <div className="mt-1">
                  <PagoChip estadoPago={r.estadoPago} saldo={r.saldo} />
                </div>
              </div>
              <div className="pointer-events-none relative z-10 w-[80px] text-right font-mono text-[13.5px] font-bold sm:w-[96px]">{formatMoney(r.total ?? r.precioFinal ?? r.precioEstimado)}</div>
              {meta.next ? (
                <button
                  type="button"
                  aria-label="Avanzar estado" title="Avanzar estado"
                  onClick={() => onAdvance(r)}
                  disabled={transitionsDisabled || refreshing}
                  aria-busy={transitionsDisabled || refreshing}
                  className="relative z-20 grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg border border-border-strong bg-surface text-text-2 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:h-8 sm:w-10"
                >
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              ) : (
                <div className="w-11 sm:w-10" />
              )}
            </article>
          );
        })}
      </div>
      <div className="mt-3">
        <Pagination meta={data?.page} onChange={onPage} disabled={refreshing} />
      </div>
    </>
  );
};
