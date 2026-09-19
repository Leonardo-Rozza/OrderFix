import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EstadoBadge } from '../components/EstadoBadge';
import { ReparacionFormModal } from '../components/ReparacionFormModal';
import { Pagination } from '../components/Pagination';
import { SortSelect } from '../components/SortSelect';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { btnPrimary, btnGhost } from '../components/ui';
import { Modal, FormActions } from '../components/Modal';
import { Select } from '../components/Select';
import { getEstadoMeta, transicionesDesde, ESTADOS_LIST, FASES } from '../config/estados';
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
import { useReparacionesStateCountsQuery } from '../api/queries/reparacionesCounts.queries';
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
  (params) => {
    const vista = params.get('vista');
    // Una elección explícita prevalece sobre el valor responsive, también board.
    if (REPARACION_VISTAS.includes(vista as Vista)) params.set('vista', vista!);
    else params.delete('vista');
  },
  (params) => { normalizeEnumParam(params, 'etapa', FASES.map(({ key }) => key), 'INGRESO'); },
  (params) => { normalizeEnumParam(params, 'estado', REPARACION_FILTROS, 'TODOS'); },
  (params) => { normalizeFlagParam(params, 'nuevo'); },
);

const REPARACION_LIST_PARAMS = {
  size: 20,
  defaultSort: 'id,desc',
  allowedSorts: REPARACION_SORT_OPTIONS.map(({ value }) => value),
  normalizeParams: normalizeReparacionParams,
} satisfies UseListParamsOptions;

const mobileQuery = '(max-width: 1023px)';
const subscribeViewport = (onChange: () => void) => {
  const media = window.matchMedia?.(mobileQuery);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
};
const mobileSnapshot = () => window.matchMedia?.(mobileQuery).matches ?? false;
const desktopSnapshot = () => false;

export const ReparacionesPage = () => {
  const navigate = useNavigate();
  const cambiarEstado = useCambiarEstadoMutation();
  const dashboard = useDashboardQuery('inline');
  const isMobile = useSyncExternalStore(subscribeViewport, mobileSnapshot, desktopSnapshot);
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
  const [changing, setChanging] = useState<Reparacion | null>(null);
  const [nextState, setNextState] = useState<EstadoReparacion | ''>('');
  const [transitionNotice, setTransitionNotice] = useState<{ order: string; fase: FaseMeta; estado: EstadoReparacion } | null>(null);
  const noticeRef = useRef<HTMLButtonElement>(null);

  const vista = (searchParams.get('vista') ?? (isMobile ? 'list' : 'board')) as Vista;
  const fase = FASES.find(({ key }) => key === searchParams.get('etapa')) ?? FASES[0];
  const filteredCounts = useReparacionesStateCountsQuery({ q: debouncedQ });
  const searching = debouncedQ.trim() !== '';
  const countQuery = searching ? filteredCounts : dashboard;
  const counts = searching ? filteredCounts.counts : dashboard.isError ? undefined : dashboard.data?.reparacionesPorEstado;
  const filtro = (searchParams.get('estado') ?? 'TODOS') as Filtro;
  const nuevoParam = searchParams.get('nuevo') === '1';
  const formOpen = localOpen || nuevoParam;
  const setVista = useCallback((nextVista: Vista) => {
    updateSearchParams((next) => {
      next.set('vista', nextVista);
    });
  }, [updateSearchParams]);
  const setFase = (key: string, showBoard = false) => {
    updateSearchParams((next) => {
      setCanonicalSearchParam(next, 'etapa', key, 'INGRESO');
      if (showBoard) next.set('vista', 'board');
    });
  };
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
  useEffect(() => {
    // La respuesta puede llegar mientras se completa otro formulario.
    // El aviso no debe sacar el foco de un diálogo ni recuperarlo al cerrarlo.
    if (transitionNotice && !document.querySelector('[role="dialog"][aria-modal="true"]')) {
      noticeRef.current?.focus();
    }
  }, [transitionNotice]);

  const requestStateChange = (reparacion: Reparacion, estado: EstadoReparacion) => {
    if (transitionLock.current || cambiarEstado.isPending) return;
    transitionLock.current = true;
    setTransitionInFlight(true);
    cambiarEstado.mutate(
      { id: reparacion.id, estado },
      {
        onSuccess: () => {
          setChanging(null);
          const destination = FASES.find((item) => item.estados.includes(estado));
          if (destination) setTransitionNotice({ order: ordenLabel(reparacion), fase: destination, estado });
        },
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
    if (next) requestStateChange(r, next);
  };
  const chooseState = (r: Reparacion) => {
    setTransitionNotice(null);
    setChanging(r);
    setNextState(getEstadoMeta(r.estado).next ?? transicionesDesde(r.estado)[0] ?? '');
  };

  const allCountsKnown = ESTADOS_LIST.every(({ key }) => counts?.[key] !== undefined);
  const chips: { key: Filtro; label: string; count?: number }[] = [
    { key: 'TODOS', label: 'Todas', count: allCountsKnown ? ESTADOS_LIST.reduce((total, { key }) => total + counts![key]!, 0) : undefined },
    ...ESTADOS_LIST.map((e) => ({ key: e.key as Filtro, label: e.label, count: counts?.[e.key] })),
  ];

  return (
    <DashboardLayout title="Reparaciones" wide>
      <div className="ofx-in space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-surface-3 p-1">
            {REPARACION_VISTAS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                aria-pressed={vista === v}
                className={`min-h-11 rounded-md px-3.5 py-1.5 text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] ${
                  vista === v ? 'bg-surface text-text shadow-sm' : 'text-text-2'
                }`}
              >
                {v === 'board' ? 'Etapas' : 'Lista'}
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

        {transitionNotice && (
          <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-primary bg-primary-soft px-4 py-3 text-[13px] text-primary-soft-fg">
            <span>{transitionNotice.order} pasó a {getEstadoMeta(transitionNotice.estado).label.toLowerCase()}.</span>
            <button ref={noticeRef} type="button" onClick={() => setFase(transitionNotice.fase.key, true)} className="min-h-11 rounded-lg px-2 font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]">
              Ver {transitionNotice.fase.label}
            </button>
            <button type="button" aria-label="Cerrar aviso de cambio de estado" onClick={() => setTransitionNotice(null)} className="ml-auto min-h-11 rounded-lg px-2 font-semibold">Cerrar</button>
          </div>
        )}

        {countQuery.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-warning bg-warning-soft px-3 py-2 text-[13px] text-warning">
            <span>No pudimos actualizar los contadores.</span>
            <button type="button" disabled={countQuery.isFetching} onClick={() => void countQuery.refetch()} className="min-h-11 rounded-lg px-2 font-bold underline">Reintentar contadores</button>
          </div>
        )}

        {vista === 'list' && isMobile && (
          <div>
            <label htmlFor="filtro-estado" className="mb-1.5 block text-[13px] font-bold">Estado</label>
            <Select id="filtro-estado" value={filtro} onChange={(event) => setFiltro(event.target.value as Filtro)}>
              {chips.map((item) => <option key={item.key} value={item.key}>{item.label}{item.count != null ? ` · ${item.count}` : ''}</option>)}
            </Select>
          </div>
        )}

        {vista === 'list' && !isMobile && (
          <div className="flex flex-wrap gap-2 pb-1">
            {chips.map((c) => {
              const active = filtro === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFiltro(c.key)}
                  aria-pressed={active}
                  className={`min-h-11 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition ${
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
            fase={fase}
            counts={counts}
            countsLoading={countQuery.isLoading}
            countsFetching={countQuery.isFetching}
            onSelectFase={setFase}
            transitionsDisabled={transitionPending}
            onOpen={open}
            onAdvance={advance}
            onChangeState={chooseState}
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

      <Modal isOpen={changing !== null} onClose={() => setChanging(null)} title="Cambiar estado" size="sm" preventClose={transitionPending} restoreFocusOnClose={transitionNotice === null}>
        {changing && (
          <form onSubmit={(event) => { event.preventDefault(); if (nextState && transicionesDesde(changing.estado).includes(nextState)) requestStateChange(changing, nextState); }} className="space-y-4">
            <p className="break-words text-[13px] text-text-2">{ordenLabel(changing)} · {equipoLabel(changing)}<br />Estado actual: {getEstadoMeta(changing.estado).label}</p>
            <div>
              <label htmlFor="nuevo-estado" className="mb-1.5 block text-[13px] font-bold">Nuevo estado</label>
              <Select id="nuevo-estado" value={nextState} onChange={(event) => setNextState(event.target.value as EstadoReparacion)} disabled={transitionPending}>
                {transicionesDesde(changing.estado).map((estado) => <option key={estado} value={estado}>{getEstadoMeta(estado).label}</option>)}
              </Select>
            </div>
            <FormActions>
              <button type="button" className={btnGhost} onClick={() => setChanging(null)} disabled={transitionPending}>Cancelar</button>
              <button type="submit" className={btnPrimary} disabled={transitionPending || !nextState}>{transitionPending ? 'Guardando…' : 'Guardar estado'}</button>
            </FormActions>
          </form>
        )}
      </Modal>

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

/* Sólo la etapa elegida monta consultas de órdenes. Los contadores pertenecen
   al conjunto completo del servidor, aunque haya páginas sin cargar. */
const Board = ({
  q, fase, counts, countsLoading, countsFetching, onSelectFase,
  transitionsDisabled, onOpen, onAdvance, onChangeState,
}: {
  q: string;
  fase: FaseMeta;
  counts: Partial<Record<EstadoReparacion, number>> | undefined;
  countsLoading: boolean;
  countsFetching: boolean;
  onSelectFase: (key: string) => void;
  transitionsDisabled: boolean;
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
  onChangeState: (r: Reparacion) => void;
}) => {
  const boardFetching = useIsFetching({ queryKey: queryKeys.reparaciones.boards });
  const boardTransitionsDisabled = transitionsDisabled || boardFetching > 0;

  return (
    <div role="region" aria-label="Reparaciones por etapas" className="min-w-0 space-y-5">
      <div role="group" aria-label="Etapas de reparación" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {FASES.map((item) => {
          const known = item.estados.every((estado) => counts?.[estado] !== undefined);
          const count = known ? item.estados.reduce((sum, estado) => sum + counts![estado]!, 0) : undefined;
          const active = item.key === fase.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              aria-controls="ordenes-etapa"
              aria-label={`${item.label}: ${countsLoading ? 'cargando' : count === undefined ? 'cantidad no disponible' : `${count} reparaciones`}`}
              onClick={() => onSelectFase(item.key)}
              className={`min-w-0 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] ${active ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-border bg-surface text-text-2 hover:border-border-strong hover:bg-surface-2'}`}
            >
              <span className="block text-[13px] font-bold">{item.label}</span>
              {countsLoading ? <span aria-hidden="true" className="ofx-skel mt-2 block h-7 w-10 rounded" /> : <span className="mt-1 block font-mono text-2xl font-extrabold tabular-nums">{count ?? '—'}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`fase-${fase.key}`} className="text-lg font-extrabold">{fase.label}</h2>
        <span className="text-[13px] text-text-3">{q.trim() ? `Resultados para “${q.trim()}”` : 'Órdenes agrupadas por estado'}</span>
        {countsFetching && !countsLoading && <span role="status" className="text-[12px] text-text-3">Actualizando contadores…</span>}
      </div>
      <div id="ordenes-etapa" aria-labelledby={`fase-${fase.key}`} className={`grid min-w-0 items-start gap-4 ${fase.estados.length === 3 ? 'xl:grid-cols-3' : fase.estados.length === 2 ? 'xl:grid-cols-2' : ''}`}>
        {fase.estados.map((estado) => (
          <EstadoZona
            key={estado}
            meta={getEstadoMeta(estado)} q={q}
            cardColumns={fase.estados.length === 1 ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-1'}
            transitionsDisabled={boardTransitionsDisabled}
            openDisabled={transitionsDisabled}
            onOpen={onOpen} onAdvance={onAdvance} onChangeState={onChangeState}
          />
        ))}
      </div>
    </div>
  );
};

interface StateActions {
  transitionsDisabled: boolean;
  openDisabled: boolean;
  onOpen: (id: number) => void;
  onAdvance: (r: Reparacion) => void;
  onChangeState: (r: Reparacion) => void;
}

const EstadoZona = ({
  meta, q, cardColumns, transitionsDisabled, openDisabled, onOpen, onAdvance, onChangeState,
}: { meta: EstadoMeta; q: string; cardColumns: string } & StateActions) => {
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
      className="min-w-0 rounded-2xl border border-border bg-surface-2 p-3 sm:p-4"
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
            aria-label={!hasData || refetchError ? `Cantidad de ${meta.label} no disponible` : undefined}
          >
            {hasData && !refetchError ? total : '—'}
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
              message={`No pudimos consultar ${meta.label.toLowerCase()}. Reintentá sin perder la etapa elegida.`}
            />
          </div>
        ) : (
          <>
            <div className={`grid min-w-0 items-start gap-3 ${cardColumns}`}>
              {items.map((r) => (
                <article
                  key={r.id}
                  data-testid={`card-${r.id}`}
                  className="relative flex min-w-0 flex-col rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:border-border-strong"
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
                  <div className="pointer-events-none relative z-10 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <div className="min-w-0 flex-1 text-[14px] font-extrabold [overflow-wrap:anywhere]">{equipoLabel(r)}</div>
                    <span className="font-mono text-[11px] font-bold text-text-3">{ordenLabel(r)}</span>
                  </div>
                  <div className="pointer-events-none relative z-10 mt-1 text-[12.5px] font-semibold text-text-2 [overflow-wrap:anywhere]">{clienteLabel(r)}</div>
                  <div className="pointer-events-none relative z-10 mt-2 line-clamp-2 text-[12.5px] leading-snug text-text-3 [overflow-wrap:anywhere]">{r.descripcionProblema}</div>
                  <div className="pointer-events-none relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-3">
                    <span className="max-w-full font-mono text-[13.5px] font-extrabold [overflow-wrap:anywhere]" style={{ color: meta.cssVar }}>
                      {formatMoney(r.total ?? r.precioFinal ?? r.precioEstimado)}
                    </span>
                    <PagoChip estadoPago={r.estadoPago} saldo={r.saldo} excedente={r.excedente} requiereRevision={r.requiereRevision} />
                  </div>
                  {transicionesDesde(r.estado).length > 0 && (
                    <div className="relative z-20 mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <button type="button" aria-label={`Cambiar estado de ${ordenLabel(r)}`} onClick={() => onChangeState(r)} disabled={interactionsDisabled}
                        className="min-h-11 rounded-lg px-2 text-[12px] font-bold text-text-2 transition hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60">
                        Cambiar estado
                      </button>
                      {meta.next && (
                        <button type="button" onClick={() => onAdvance(r)} disabled={interactionsDisabled} aria-busy={interactionsDisabled}
                          className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-[12px] font-bold text-text-2 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60">
                          Avanzar
                          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
            {items.length === 0 && total === 0 && (
              <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-[12.5px] text-text-3">
                {q.trim() ? 'Sin coincidencias en este estado' : 'Sin reparaciones'}
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
