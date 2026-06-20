/**
 * El backend paginó los listados (Spring): ahora devuelven
 * `{ content: [...], page: { size, number, totalElements, totalPages } }`.
 * El front arma joins/kanban/dashboard client-side, así que por ahora
 * necesitamos la lista completa.
 */

export interface Page<T> {
  content: T[];
  page?: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

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

/** Arma el objeto de query params (omite q vacío). */
export const toQueryParams = (p: ListParams) => ({
  q: p.q && p.q.trim() !== '' ? p.q.trim() : undefined,
  page: p.page,
  size: p.size,
  sort: p.sort,
});
