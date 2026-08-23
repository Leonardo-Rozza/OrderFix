import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
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
import { useListParams, type UseListParamsOptions } from '../hooks/useListParams';
import { usePageBounds } from '../hooks/usePageBounds';
import {
  useReparacionesBoardInfiniteQuery,
  useReparacionesQuery,
} from '../api/queries/reparaciones.queries';
import { queryKeys } from '../api/queryKeys';
import { useDashboardQuery } from '../api/queries/dashboard.queries';
import { useCambiarEstadoMutation } from '../api/mutations/reparaciones.mutations';
import {
  composeSearchParamsNormalizers,
  normalizeEnumParam,
  normalizeFlagParam,
  setCanonicalSearchParam,
} from '../lib/urlSearchParams';
import type { EstadoReparacion, Reparacion } from '../types';
import { projectReparacionesBoardPages } from '../lib/reparacionesBoard';

type Vista = 'board' | 'list';
type Filtro = EstadoReparacion | 'TODOS';

const BOARD_PAGE_SIZE = 20;

const REPARACION_SORT_OPTIONS = [
  { value: 'id,desc', label: 'Más recientes' },
  { value: 'fechaIngreso,desc', label: 'Ingreso reciente' },
  { value: 'precioFinal,desc', label: 'Mayor precio' },
  { value: 'estado,asc', label: 'Estado' },
];

const REPARACION_VISTAS: readonly Vista[] = ['board', 'list'];
const REPARACION_FILTROS: readonly Filtro[] = [
  'TODOS',
  ...ESTADOS_LIST.map(({ key }) => key),
];

const normalizeReparacionParams = composeSearchParamsNormalizers(
  (params) => { normalizeEnumParam(params, 'vista', REPARACION_VISTAS, 'board'); },
  (params) => { normalizeEnumParam(params, 'estado', REPARACION_FILTROS, 'TODOS'); },
  (params) => { normalizeFlagParam(params, 'nuevo'); },
);

const REPARACION_LIST_PARAMS = {
  size: 20,
  defaultSort: 'id,desc',
  allowedSorts: REPARACION_SORT_OPTIONS.map(({ value }) => value),
  normalizeParams: normalizeReparacionParams,
} satisfies UseListParamsOptions;

export const ReparacionesPage = () => {
  const navigate = useNavigate();
  const cambiarEstado = useCambiarEstadoMutation();
  const { data: stats } = useDashboardQuery();
  const {
    q,
    onSearch,
    page,
    setPage,
    replacePage,
    debouncedQ,
    size,
    sort,
    setSort,
    searchParams,
    updateSearchParams,
  } = useListParams(REPARACION_LIST_PARAMS);
  const [localOpen, setLocalOpen] = useState(false);
  const transitionLock = useRef(false);
  const [transitionInFlight, setTransitionInFlight] = useState(false);
  const transitionPending = cambiarEstado.isPending || transitionInFlight;

  const vista = (searchParams.get('vista') ?? 'board') as Vista;
  const filtro = (searchParams.get('estado') ?? 'TODOS') as Filtro;
  const nuevoParam = searchParams.get('nuevo') === '1';
  const formOpen = localOpen || nuevoParam;
  const setVista = useCallback((nextVista: Vista) => {
    updateSearchParams((next) => {
      setCanonicalSearchParam(next, 'vista', nextVista, 'board');
    });
  }, [updateSearchParams]);
  const setFiltro = useCallback((nextFiltro: Filtro) => {
    updateSearchParams((next) => {
      setCanonicalSearchParam(next, 'estado', nextFiltro, 'TODOS');
      next.delete('page');
    });
  }, [updateSearchParams]);
  const closeForm = () => {
    setLocalOpen(false);
    if (nuevoParam) {
      updateSearchParams((next) => {
        next.delete('nuevo');
      }, { replace: true });
    }
  };
  const discardNavigatingForm = () => {
    // La navegación bloqueada ya conoce su destino. Sólo limpiamos estado local
    // para no competir con `blocker.proceed()` mediante otro replace de la URL.
    setLocalOpen(false);
  };

  const open = (id: number) => navigate(`/reparaciones/${id}`);
  const handleCreated = (id: number) => {
    navigate(`/reparaciones/${id}`, { replace: nuevoParam });
  };
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
            {REPARACION_VISTAS.map((v) => (
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
              options={REPARACION_SORT_OPTIONS}
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
                  onClick={() => setFiltro(c.key)}
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
            onReplacePage={replacePage}
            onOpen={open}
            onAdvance={advance}
          />
        )}
      </div>

      <ReparacionFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onNavigationDiscard={discardNavigatingForm}
        editing={null}
        onCreated={handleCreated}
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
  const boardFetching = useIsFetching({ queryKey: queryKeys.reparaciones.boards });
  const boardTransitionsDisabled = transitionsDisabled || boardFetching > 0;

  return (
    <div
      role="region"
      aria-label="Tablero de reparaciones"
      className="ofx-scroll flex items-start gap-3.5 overflow-x-auto pb-2"
    >
      {FASES.map((fase) => (
        <FaseColumn
          key={fase.key}
          fase={fase}
          q={q}
          transitionsDisabled={boardTransitionsDisabled}
          openDisabled={transitionsDisabled}
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
  openDisabled: boolean;
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
  <section
    aria-labelledby={`fase-${fase.key}`}
    className="flex w-[296px] max-w-[calc(100vw-2rem)] flex-shrink-0 flex-col rounded-2xl border border-border bg-surface-2"
  >
    <h2 id={`fase-${fase.key}`} className="border-b border-border px-3.5 py-3 text-[12px] font-extrabold uppercase tracking-wide text-text-2">
      {fase.label}
    </h2>
    <div className="flex flex-col gap-3 p-3">
      {fase.estados.map((estado) => (
        <EstadoZona key={estado} meta={getEstadoMeta(estado)} q={q} {...dnd} />
      ))}
    </div>
  </section>
);

const EstadoZona = ({
  meta,
  q,
  transitionsDisabled,
  openDisabled,
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
    isFetchingNextPage,
    isFetchNextPageError,
    isRefetchError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useReparacionesBoardInfiniteQuery({
    q,
    estado: meta.key,
    size: BOARD_PAGE_SIZE,
  });
  const projection = useMemo(
    () => projectReparacionesBoardPages(data?.pages, BOARD_PAGE_SIZE),
    [data?.pages],
  );
  const { items, total, visible, nextBatchSize } = projection;
  const hasData = data !== undefined;
  const initialError = !hasData && (isError || !isLoading);
  const refetchError = hasData && isRefetchError && !isFetchNextPageError;
  const refreshing = hasData && isFetching && !isFetchingNextPage;
  const interactionsDisabled = transitionsDisabled || refetchError;
  const isOver = !interactionsDisabled && overZona === meta.key && drag !== null && drag.estado !== meta.key;
  const draggingId = drag?.id ?? null;
  const openButtonsRef = useRef(new Map<number, HTMLButtonElement>());
  const pendingFocusIdsRef = useRef<Set<number> | null>(null);

  const loadNextPage = useCallback(() => {
    if (!hasNextPage || isFetching || interactionsDisabled) return;
    pendingFocusIdsRef.current = new Set(items.map(({ id }) => id));
    void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage, hasNextPage, interactionsDisabled, isFetching, items]);

  useEffect(() => {
    const previousIds = pendingFocusIdsRef.current;
    if (!previousIds || isFetchingNextPage) return;
    if (isFetchNextPageError) {
      pendingFocusIdsRef.current = null;
      return;
    }

    const firstNew = items.find(({ id }) => !previousIds.has(id));
    if (firstNew) openButtonsRef.current.get(firstNew.id)?.focus();
    pendingFocusIdsRef.current = null;
  }, [isFetchNextPageError, isFetchingNextPage, items]);

  return (
    <section
      data-testid={`col-${meta.key}`}
      aria-labelledby={`estado-${meta.key}`}
      aria-busy={isLoading || isFetching}
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
        <h3 id={`estado-${meta.key}`} className="text-[13px] font-extrabold">{meta.label}</h3>
        {isLoading ? (
          <span className="ofx-skel ml-auto h-5 w-8 rounded-full" aria-label={`Cargando ${meta.label}`} />
        ) : (
          <span
            className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[11.5px] font-bold text-text-3"
            aria-label={!hasData ? `Cantidad de ${meta.label} no disponible` : undefined}
          >
            {hasData ? total : '—'}
          </span>
        )}
      </div>
      <div className="flex min-h-[48px] flex-col gap-2.5">
        {refreshing && (
          <div role="status" className="rounded-lg bg-surface-3 px-3 py-2 text-[12px] font-semibold text-text-3">
            Actualizando resultados…
          </div>
        )}
        {refetchError && (
          <div role="alert" className="rounded-lg border border-warning bg-warning-soft px-3 py-2 text-[12px] font-semibold text-warning">
            <p>No pudimos actualizar esta etapa. Las transiciones quedan pausadas hasta reconciliarla.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={`Actualizar ${meta.label}`}
              className="mt-2 inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg border border-warning px-3 py-2 font-bold transition hover:bg-surface focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0"
            >
              Actualizar
            </button>
          </div>
        )}
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <div key={`sk-${index}`} className="ofx-skel h-[92px] rounded-xl" aria-hidden="true" />
          ))
        ) : initialError ? (
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
              ref={(node) => {
                if (node) openButtonsRef.current.set(r.id, node);
                else openButtonsRef.current.delete(r.id);
              }}
              type="button"
              aria-label={`Abrir reparación ${ordenLabel(r)} — ${equipoLabel(r)}`}
              onClick={() => onOpen(r.id)}
              disabled={openDisabled}
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
                <PagoChip
                  estadoPago={r.estadoPago}
                  saldo={r.saldo}
                  excedente={r.excedente}
                  requiereRevision={r.requiereRevision}
                />
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
            {isFetchNextPageError ? (
              <div role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-[12px] font-semibold text-danger-fg">
                <p>No pudimos cargar más reparaciones. Lo que ya estaba visible se conserva.</p>
                <button
                  type="button"
                  onClick={loadNextPage}
                  disabled={interactionsDisabled || isFetching}
                  aria-label={`Reintentar carga en ${meta.label}`}
                  className="mt-2 inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg border border-danger px-3 py-2 font-bold transition hover:bg-surface focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0"
                >
                  Reintentar
                </button>
              </div>
            ) : hasNextPage ? (
              <div className="rounded-lg border border-border bg-surface px-2.5 py-2.5">
                <div
                  role="status"
                  aria-live="polite"
                  className="pb-2 text-center text-[11.5px] font-semibold text-text-2"
                >
                  {visible} de {total} visibles
                </div>
                <button
                  type="button"
                  onClick={loadNextPage}
                  disabled={interactionsDisabled || isFetching}
                  aria-busy={isFetchingNextPage}
                  aria-label={`Cargar ${nextBatchSize} reparaciones más en ${meta.label}`}
                  className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg border border-primary bg-primary-soft px-3 py-2 text-[12px] font-extrabold text-primary-soft-fg transition hover:bg-primary hover:text-primary-fg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0"
                >
                  {isFetchingNextPage ? 'Cargando más…' : `Cargar ${nextBatchSize} más`}
                </button>
              </div>
            ) : (data?.pages.length ?? 0) > 1 ? (
              <div role="status" aria-live="polite" className="sr-only">
                {visible} de {total} visibles
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
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
  onReplacePage,
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
  onReplacePage: (p: number) => void;
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
  usePageBounds(page, onReplacePage, data?.page, !isPlaceholderData);

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
                  <PagoChip
                    estadoPago={r.estadoPago}
                    saldo={r.saldo}
                    excedente={r.excedente}
                    requiereRevision={r.requiereRevision}
                  />
                </div>
              </div>
              <div className="pointer-events-none relative z-10 hidden min-w-0 flex-[1.6] truncate text-[13px] text-text-3 sm:block">{r.descripcionProblema}</div>
              <div className="pointer-events-none relative z-10 hidden w-[150px] sm:block">
                <EstadoBadge estado={r.estado} />
                <div className="mt-1">
                  <PagoChip
                    estadoPago={r.estadoPago}
                    saldo={r.saldo}
                    excedente={r.excedente}
                    requiereRevision={r.requiereRevision}
                  />
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
