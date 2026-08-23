/**
 * El backend paginó los listados (Spring): ahora devuelven
 * `{ content: [...], page: { size, number, totalElements, totalPages } }`.
 * Algunos sublistados heredados todavía arman joins client-side; los listados,
 * selectores y el Kanban consumen la metadata para paginar bajo demanda.
 */

export interface PageMeta {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface Page<T> {
  content: T[];
  page?: PageMeta;
}

/**
 * Los selectores paginados no pueden inferir si existe otra página a partir de
 * `content`: algunos dominios filtran opciones después de recibirla. Por eso
 * requieren la metadata que el contrato de listados declara estable.
 */
export const requirePageMeta = <T>(data: Page<T>): PageMeta => {
  if (!data.page) {
    throw new Error('La respuesta paginada no incluye metadata de página.');
  }
  return data.page;
};

/** Devuelve el array sin importar si la respuesta es array plano o paginada. */
export const unwrapList = <T>(data: T[] | Page<T> | null | undefined): T[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as Page<T>).content)) return (data as Page<T>).content;
  return [];
};

/**
 * Parámetro temporal para traer "todo" mientras los joins son client-side
 * (clientes/equipos/reparaciones, hasta que el backend denormalice los listados).
 */
export const FETCH_ALL_PARAMS = { size: 1000 } as const;

/** Parámetros de un listado paginado server-side. */
export interface ListParams {
  q?: string;
  page: number;
  size: number;
  sort?: string;
}

/** Arma query params sin publicar filtros vacíos ni un sort no contractual. */
export const toQueryParams = (p: ListParams) => ({
  ...(p.q && p.q.trim() !== '' ? { q: p.q.trim() } : {}),
  page: p.page,
  size: p.size,
  ...(p.sort ? { sort: p.sort } : {}),
});
