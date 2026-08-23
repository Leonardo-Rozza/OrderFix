# Plan de implementación — Carga incremental del Kanban

**Fecha:** 2026-08-23

**Diseño aprobado:** `docs/plans/2026-08-23-kanban-incremental-loading-design.md`

**Rama:** `codex/frontend-refactor-checkpoint`

**Estado:** pendiente de implementación

## Objetivo

Reemplazar el recorte fijo de 100 reparaciones por estado por una carga incremental explícita. Cada zona del Kanban debe iniciar con 20 reparaciones, permitir agregar el lote siguiente, conservar lo ya visible ante errores y reconciliarse con las mutaciones existentes sin compartir estructuras incompatibles de caché.

## Restricciones de arquitectura

- La consulta infinita usa una key exclusiva bajo el prefijo `['reparaciones']`.
- `useQuery<Page<Reparacion>>` y `useInfiniteQuery<...>` nunca comparten la misma key.
- El backend es la autoridad: no se agrega movimiento optimista.
- Cada request usa `sort=id,desc`, `size=20`, `estado`, `q`, `pageParam`, `signal` y `errorMode: 'inline'`.
- La metadata de página es obligatoria mediante `requirePageMeta`; no se infiere continuación por `content.length`.
- Las páginas se acumulan en orden y se deduplican por `Reparacion.id`.
- No se usa `maxPages` ni se persiste el número de lotes en la URL.
- Mientras el board consulta una página, se bloquean transiciones y cargas, pero no la apertura de una tarjeta ya visible.
- Un error incremental nunca reemplaza las páginas exitosas.
- `.agents/` y `public/OrdenFix project naming/` permanecen fuera de todos los commits.
- No se hace push.

## API objetivo

### Key de caché

Extender `queryKeys.reparaciones` con:

```ts
boards: ['reparaciones', 'board'],
boardState: (estado) => ['reparaciones', 'board', estado],
board: (estado, params) => [
  'reparaciones',
  'board',
  estado,
  params,
],
```

La key final recibe sólo valores estables: `q`, `size` y `sort`. `page` queda a cargo de `pageParam`.

### Hook infinito

Agregar `useReparacionesBoardInfiniteQuery` a `src/api/queries/reparaciones.queries.ts`.

Entrada:

```ts
{
  estado: EstadoReparacion;
  q: string;
  size?: number; // default 20
  sort?: string; // default id,desc
}
```

Salida: resultado nativo de `useInfiniteQuery`, con cada página normalizada como `Page<Reparacion> & { page: PageMeta }`.

El hook debe:

- iniciar en página cero;
- abortar requests sustituidos;
- pedir la página siguiente sólo cuando `number + 1 < totalPages`;
- evitar cargas paralelas desde el control consumidor;
- mantener la invalidación por prefijo compatible con la reconciliación actual.

### Proyección del board

Crear un helper puro, junto al hook o en un módulo acotado, que reciba las páginas y devuelva:

- `items`: reparaciones únicas en orden de aparición;
- `total`: `totalElements` de la última página;
- `visible`: cantidad de IDs únicos;
- `remaining`: `max(total - visible, 0)`;
- `nextBatchSize`: `min(size, remaining)`.

Un ID repetido conserva la posición original y actualiza su contenido con la versión más reciente.

## Tarea 1 — Contrato de caché y consulta infinita

### Archivos

- Modificar `src/api/queryKeys.ts`.
- Modificar `src/api/queries/reparaciones.queries.ts`.
- Ampliar `src/api/queries/reparaciones.queries.test.tsx`.

### Ciclo TDD

1. Agregar pruebas que fallen para la key separada, request inicial y página siguiente.
2. Verificar que la query envía `page=0/1`, `size=20`, `sort=id,desc`, `estado`, `q`, `signal` y `errorMode: 'inline'`.
3. Agregar casos de metadata ausente, una sola página y última página.
4. Implementar la mínima API hasta dejar verdes esos casos.
5. Confirmar que la query normal conserva su key y comportamiento previos.

### Casos mínimos

- La key del board no coincide con `queryKeys.reparaciones.list`.
- Dos estados generan caches distintas.
- Cambiar `q` genera otra sesión infinita desde página cero.
- `fetchNextPage` usa exactamente el número informado por metadata.
- `totalPages=0` o `1` no ofrece continuación.
- Metadata ausente rechaza la respuesta con el mensaje contractual.
- AbortSignal llega al cliente HTTP.
- El interceptor no muestra un toast adicional por un GET inline.

### Verificación

```bash
npm test -- src/api/queries/reparaciones.queries.test.tsx src/api/pagination.test.ts
npm run typecheck
npm run lint -- src/api/queryKeys.ts src/api/queries/reparaciones.queries.ts src/api/queries/reparaciones.queries.test.tsx
git diff --check
```

### Commit

```text
feat(api): pagina estados del kanban
```

## Tarea 2 — Proyección incremental y estados de la zona

### Archivos

- Modificar `src/pages/ReparacionesPage.tsx`.
- Modificar `src/pages/ReparacionesPage.test.tsx`.
- Crear un helper y prueba separados sólo si la proyección vuelve ruidoso al módulo de queries.

### Ciclo TDD

1. Reemplazar el test del aviso de 100 por expectativas de progreso y continuación.
2. Agregar una segunda página con un ID nuevo y uno repetido en la frontera.
3. Comprobar append, orden, actualización last-write-wins y ausencia de duplicados.
4. Agregar pruebas de loading y error incremental antes de construir el pie visual.
5. Implementar la UI mínima reutilizando los tokens actuales.

### Flujo de render

- `EstadoZona` consume `useReparacionesBoardInfiniteQuery`.
- Las páginas se proyectan con `useMemo`.
- El encabezado muestra el total contractual.
- El pie sólo aparece cuando existe otra página o un error incremental recuperable.
- El progreso usa `aria-live="polite"`.
- El botón visible dice `Cargar N más`.
- El nombre accesible agrega `en <estado>`.
- `isFetchingNextPage` conserva las tarjetas y muestra `Cargando más…`.
- `isFetchNextPageError` conserva las tarjetas, presenta un `role="alert"` compacto y reintenta con `fetchNextPage`.
- El error inicial conserva el `ErrorState` actual.
- Un error de refetch con datos conserva contenido y exige actualizar antes de transicionar.

### Coordinación de acciones

- `Board` conoce si alguna query con prefijo `queryKeys.reparaciones.boards` está fetching mediante `useIsFetching`.
- Ese indicador se combina con el lock de mutación existente para desactivar drag, drop, “Avanzar” y “Cargar más”.
- El botón invisible que abre la tarjeta no usa ese bloqueo de carga; sólo se desactiva si la navegación realmente no es segura.
- `fetchNextPage` se llama una sola vez por interacción y no compite con un refetch activo.

### Foco

- Antes de cargar se guarda la cantidad visible actual.
- Tras un append exitoso, la acción “Abrir reparación…” de la primera tarjeta nueva recibe foco.
- No se mueve el foco durante refetch, error, deduplicación sin elementos nuevos ni cargas iniciadas por otra causa.
- El elemento enfocado conserva `focus-visible` y un nombre contextual existente.

### Casos mínimos

- La primera query pide 20, no 100.
- `20 de 42 visibles` y `Cargar 20 más`.
- Con 35 de 42, el botón dice `Cargar 7 más`.
- Con 42 de 42 no existe botón.
- Página dos agrega tarjetas sin borrar página uno.
- Un ID fronterizo se renderiza una sola vez con su valor más reciente.
- Doble activación no genera dos requests.
- Error de página dos conserva la primera y reintenta página dos.
- Cambiar búsqueda desmonta el progreso anterior y vuelve a página cero.
- Mientras carga, todas las transiciones están bloqueadas y abrir sigue disponible.
- El foco aterriza en la primera tarjeta realmente nueva.
- Loading y error inicial continúan sin anunciar cero/vacío falso.

### Verificación

```bash
npm test -- src/pages/ReparacionesPage.test.tsx src/api/queries/reparaciones.queries.test.tsx
npm run typecheck
npm run lint -- src/pages/ReparacionesPage.tsx src/pages/ReparacionesPage.test.tsx
git diff --check
```

### Commit

```text
feat(kanban): carga reparaciones por estado
```

## Tarea 3 — Ajuste responsive y semántico

### Archivos

- Modificar `src/pages/ReparacionesPage.tsx`.
- Modificar `src/pages/ReparacionesPage.test.tsx` si la semántica necesita cobertura adicional.

### Cambios

- Ajustar el ancho de fase para entrar en los 288 px útiles de un viewport de 320 px sin perder el ancho actual en pantallas mayores.
- Conservar el scroll horizontal del tablero y evitar overflow del documento.
- Agregar una región identificable para el tablero y encabezados semánticos para fase/estado sin alterar la jerarquía visual.
- Garantizar 44 px mínimos para cargar/reintentar en móvil y coarse-pointer.
- Mantener colores, tipografía, superficies y profundidad existentes.

### Casos mínimos

- El tablero tiene nombre accesible.
- Los múltiples botones de carga tienen nombres distintos por estado.
- El mensaje incremental es anunciado sin duplicar alertas.
- El control no se recorta a 320 px.

### Verificación

```bash
npm test -- src/pages/ReparacionesPage.test.tsx
npm run typecheck
npm run lint -- src/pages/ReparacionesPage.tsx
git diff --check
```

### Commit

```text
fix(kanban): adapta carga incremental a movil
```

## Tarea 4 — E2E desktop y móvil

### Archivos

- Ampliar `e2e/kanban.spec.ts`.
- Crear `e2e/kanban.mobile.spec.ts` si separar la matriz mejora su legibilidad.
- Modificar `e2e/helpers.ts` sólo si el mock paginado necesita observar o provocar errores por página.

### Datos

- Generar al menos 42 reparaciones `INGRESADO` con IDs estables.
- Mantener los otros estados pequeños para probar que sólo la zona elegida pagina.
- Incluir, en un escenario controlado, un ID repetido entre páginas si el mock personalizado no invalida el contrato principal.

### Escenarios desktop

- La apertura solicita `page=0&size=20&sort=id,desc` para Ingresado.
- “Cargar 20 más” solicita `page=1` sólo para Ingresado.
- El progreso pasa de 20 a 40 y no hay IDs duplicados.
- La primera tarjeta nueva recibe foco.
- La tarjeta cargada en página dos abre su detalle.
- Un error de página dos conserva 20 tarjetas; Reintentar termina en 40.
- Después de estabilizarse, “Avanzar” de una tarjeta nueva conserva el flujo contractual.

### Matriz móvil

- Chromium 320 px.
- Chromium 390 px.
- Chromium landscape.
- WebKit móvil.

En cada viewport:

- la primera fase y el botón aparecen completos;
- el objetivo táctil mide al menos 44 px;
- la carga añade el siguiente lote;
- no existe overflow horizontal del documento;
- el scroll horizontal interno del tablero sigue operativo;
- no aparece drag como única acción necesaria.

### Verificación

```bash
npx playwright test e2e/kanban.spec.ts e2e/kanban.mobile.spec.ts
npm run lint -- e2e/kanban.spec.ts e2e/kanban.mobile.spec.ts e2e/helpers.ts
git diff --check
```

### Commit

```text
test(e2e): cubre carga incremental del kanban
```

## Tarea 5 — Regresión y cierre documental

### Archivos

- Actualizar este plan con hashes y resultados reales.
- Actualizar el diseño únicamente si la implementación aprobada necesitó una corrección de decisión.
- Actualizar la documentación general que todavía enumere el Kanban incremental como pendiente.

### Regresión final

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
git diff --check
git status --short
```

### Revisión manual

- Confirmar que `.agents/` y `public/OrdenFix project naming/` siguen sin trackear.
- Confirmar que no se realizó push.
- Confirmar que cada commit contiene sólo su tarea.
- Revisar los requests del navegador y el foco después de cargar.

### Commit

```text
docs(kanban): registra carga incremental validada
```

## Criterio de cierre

La etapa queda completa cuando ningún estado se trunca, la primera carga baja a 20 elementos, cada continuación acumula y deduplica, los errores incrementales son recuperables, las mutaciones permanecen consistentes, la matriz móvil y WebKit pasan, toda la regresión queda verde y el historial contiene únicamente commits atómicos locales sin push.
