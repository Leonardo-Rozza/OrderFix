import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AriaAttributes,
  type FocusEventHandler,
  type ForwardedRef,
  type ReactElement,
  type RefAttributes,
} from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Combobox, type ComboboxOption } from './Combobox';

export type AsyncComboboxValue = number;

export interface AsyncComboboxOption<
  Value extends AsyncComboboxValue = number,
  Meta = unknown,
> {
  value: Value;
  label: string;
  sublabel?: string;
  meta?: Meta;
}

export interface AsyncComboboxPage<
  Value extends AsyncComboboxValue = number,
  Meta = unknown,
> {
  options: AsyncComboboxOption<Value, Meta>[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface AsyncComboboxQueryParams {
  query: string;
  size: number;
}

export interface AsyncComboboxLoadArgs {
  query: string;
  page: number;
  size: number;
  signal: AbortSignal;
}

export interface AsyncComboboxSource<
  Value extends AsyncComboboxValue = number,
  Meta = unknown,
> {
  queryKey: (params: AsyncComboboxQueryParams) => readonly unknown[];
  loadPage: (args: AsyncComboboxLoadArgs) => Promise<AsyncComboboxPage<Value, Meta>>;
  /** Salto inicial acotado para una página cuyo DTO crudo no produjo opciones. */
  maxAutomaticPages?: 0 | 1;
}

type AsyncComboboxAriaProps = Pick<
  AriaAttributes,
  'aria-describedby' | 'aria-invalid' | 'aria-label' | 'aria-required'
>;

export interface AsyncComboboxProps<
  Value extends AsyncComboboxValue = number,
  Meta = unknown,
> extends AsyncComboboxAriaProps {
  source: AsyncComboboxSource<Value, Meta>;
  value: Value | undefined;
  onChange: (value: Value | undefined, option?: AsyncComboboxOption<Value, Meta>) => void;
  selectedOption?: AsyncComboboxOption<Value, Meta>;
  enabled?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  searchAriaLabel: string;
  emptyLabel?: string;
  entityName: string;
  entityNamePlural: string;
  emptyMessage?: string;
  partialEmptyMessage?: string;
  errorMessage?: string;
  pageSize?: number;
  debounceMs?: number;
  hasError?: boolean;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  onOpenChange?: (open: boolean) => void;
}

const normalizeQuery = (value: string): string => value.trim().replace(/\s+/g, ' ');

const AsyncComboboxInner = <
  Value extends AsyncComboboxValue = number,
  Meta = unknown,
>({
  source,
  value,
  onChange,
  selectedOption,
  enabled = true,
  disabled = false,
  id,
  name,
  placeholder,
  searchPlaceholder = 'Buscar…',
  searchAriaLabel,
  emptyLabel,
  entityName,
  entityNamePlural,
  emptyMessage,
  partialEmptyMessage,
  errorMessage,
  pageSize = 20,
  debounceMs = 350,
  hasError,
  onBlur,
  onOpenChange,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  'aria-required': ariaRequired,
}: AsyncComboboxProps<Value, Meta>, forwardedRef: ForwardedRef<HTMLButtonElement>) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sessionSelected, setSessionSelected] = useState<AsyncComboboxOption<Value, Meta>>();
  const automaticLoadRef = useRef({ key: '', count: 0 });

  useEffect(() => {
    if (!open) return;

    const normalized = normalizeQuery(search);
    const timeout = window.setTimeout(() => setDebouncedQuery(normalized), debounceMs);
    return () => window.clearTimeout(timeout);
  }, [debounceMs, open, search]);

  const queryKey = source.queryKey({ query: debouncedQuery, size: pageSize });
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => source.loadPage({
      query: debouncedQuery,
      page: pageParam,
      size: pageSize,
      signal,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (
      lastPage.page.number + 1 < lastPage.page.totalPages
        ? lastPage.page.number + 1
        : undefined
    ),
    enabled: enabled && open,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const loadedOptions = useMemo(() => {
    const byValue = new Map<Value, AsyncComboboxOption<Value, Meta>>();
    query.data?.pages.forEach((page) => {
      page.options.forEach((option) => byValue.set(option.value, option));
    });
    return Array.from(byValue.values());
  }, [query.data]);

  const normalizedSearch = normalizeQuery(search);
  const searchSettling = open && normalizedSearch !== debouncedQuery;
  const options = searchSettling ? [] : loadedOptions;
  const lastPage = query.data?.pages.at(-1);
  const rawTotal = lastPage?.page.totalElements;
  const hasRawResults = (rawTotal ?? 0) > 0;
  const isPartialEmpty = options.length === 0 && hasRawResults;

  const automaticKey = `${open ? 'open' : 'closed'}:${debouncedQuery}:${pageSize}`;
  useEffect(() => {
    if (automaticLoadRef.current.key !== automaticKey) {
      automaticLoadRef.current = { key: automaticKey, count: 0 };
    }
    const limit = source.maxAutomaticPages ?? 0;
    if (
      !open
      || searchSettling
      || query.isPending
      || query.isError
      || query.isFetchingNextPage
      || loadedOptions.length > 0
      || !query.hasNextPage
      || automaticLoadRef.current.count >= limit
    ) return;

    automaticLoadRef.current.count += 1;
    void query.fetchNextPage();
  }, [
    automaticKey,
    loadedOptions.length,
    open,
    query,
    searchSettling,
    source.maxAutomaticPages,
  ]);

  const resolvedSelected = loadedOptions.find((option) => option.value === value)
    ?? (sessionSelected?.value === value ? sessionSelected : undefined)
    ?? (selectedOption?.value === value ? selectedOption : undefined);

  const handleChange = useCallback((
    nextValue: number | undefined,
    option?: ComboboxOption,
  ) => {
    const typedValue = nextValue as Value | undefined;
    const typedOption = option as AsyncComboboxOption<Value, Meta> | undefined;
    setSessionSelected(typedOption);
    onChange(typedValue, typedOption);
  }, [onChange]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setSearch('');
      setDebouncedQuery('');
    }
    onOpenChange?.(next);
  }, [onOpenChange]);

  const retry = useCallback(() => {
    if (query.isFetchNextPageError) void query.fetchNextPage();
    else void query.refetch();
  }, [query]);

  const statusMessage = searchSettling
    ? `Buscando ${entityNamePlural}…`
    : query.isFetchingNextPage
      ? `Cargando más ${entityNamePlural}…`
      : query.isFetching && !query.isPending
        ? `Actualizando ${entityNamePlural}…`
        : query.isSuccess
          ? `${options.length} ${options.length === 1 ? entityName : entityNamePlural} cargado${options.length === 1 ? '' : 's'}.`
          : undefined;

  const settledEmptyMessage = isPartialEmpty
    ? (partialEmptyMessage ?? `No hay ${entityNamePlural} disponibles entre los resultados cargados.`)
    : emptyMessage
      ?? (debouncedQuery
        ? `No encontramos ${entityNamePlural} para “${debouncedQuery}”.`
        : `Todavía no hay ${entityNamePlural} cargados.`);

  return (
    <Combobox
      ref={forwardedRef}
      id={id}
      name={name}
      value={value}
      onChange={handleChange}
      options={options as ComboboxOption[]}
      selectedOption={resolvedSelected as ComboboxOption | undefined}
      filterMode="remote"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      searchAriaLabel={searchAriaLabel}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
      disabled={disabled}
      hasError={hasError}
      onBlur={onBlur}
      isLoading={enabled && open && (query.isPending || searchSettling)}
      isFetchingNextPage={query.isFetchingNextPage}
      isError={query.isError}
      errorMessage={errorMessage ?? `No pudimos cargar ${entityNamePlural}.`}
      emptyMessage={settledEmptyMessage}
      statusMessage={statusMessage}
      totalOptions={source.maxAutomaticPages ? undefined : rawTotal}
      hasNextPage={!searchSettling && !!query.hasNextPage}
      onLoadMore={() => void query.fetchNextPage()}
      onRetry={retry}
      onOpenChange={handleOpenChange}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-label={ariaLabel}
      aria-required={ariaRequired}
    />
  );
};

type AsyncComboboxComponent = <
  Value extends AsyncComboboxValue = number,
  Meta = unknown,
>(props: AsyncComboboxProps<Value, Meta> & RefAttributes<HTMLButtonElement>) => ReactElement;

export const AsyncCombobox = forwardRef(AsyncComboboxInner) as AsyncComboboxComponent;
