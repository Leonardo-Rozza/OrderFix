# Plan de implementación — Estado de listados persistido en URL

**Fecha:** 2026-08-23  
**Diseño aprobado:** `docs/plans/2026-08-23-url-list-state-design.md`  
**Rama:** `codex/frontend-refactor-checkpoint`  
**Estado:** completado y validado

## Objetivo

Convertir la URL en la fuente de verdad de los controles recuperables de Clientes, Equipos, Reparaciones, Repuestos, Inventario y Caja. La búsqueda, página, orden, vista, filtros y rango de fechas deben sobrevivir recargas, enlaces directos y navegación atrás/adelante sin introducir estados duplicados ni romper las protecciones de formularios.

## Restricciones de arquitectura

- Toda interacción escribe la URL en una única transacción. React Router no acumula varias llamadas a `setSearchParams` hechas en el mismo tick.
- Nunca se muta el objeto `URLSearchParams` entregado por React Router; cada cambio parte de una copia.
- Los parámetros desconocidos se preservan para que los módulos puedan convivir, especialmente `nuevo=1` en Reparaciones.
- Los defaults se omiten de la URL, pero siempre se materializan antes de consultar al backend.
- Escribir búsqueda usa `REPLACE`; cambiar página, orden, filtro, vista o fecha usa `PUSH`.
- Las correcciones automáticas —parámetros inválidos, página fuera de rango— usan `REPLACE`.
- `size=20` permanece interno y no se expone en la URL.
- Las pruebas de integración usan un router real; no se simula `useSearchParams`.

## API compartida objetivo

### Codec puro

Crear `src/lib/urlSearchParams.ts` con primitivas para:

- leer un único valor y eliminar repeticiones;
- normalizar enteros no negativos;
- validar enums y órdenes mediante allowlists;
- validar fechas ISO reales sin depender de la zona horaria;
- omitir defaults;
- componer normalizadores;
- aplicar cambios sobre una copia y conservar parámetros ajenos.

El codec debe devolver tanto el valor efectivo para la aplicación como la representación canónica de la URL.

### Sesión transaccional

Crear `src/hooks/useUrlSearchParams.ts` con:

- parámetros ya normalizados;
- una función estable `updateParams(recipe, { replace })`;
- canonicalización automática sólo cuando el string resultante difiera del actual;
- preservación de parámetros desconocidos;
- `preventScrollReset` para cambios de controles del listado.

### Hook de listas

Migrar `src/hooks/useListParams.ts` para recibir una configuración estable:

```ts
useListParams({
  size: 20,
  defaultSort: 'id,desc',
  allowedSorts: ['id,desc', 'marca,asc', 'modelo,asc'],
  normalizeExtraParams,
});
```

El retorno incluye:

- `q`, `debouncedQ`, `page`, `size` y `sort`;
- `onSearch`, que reemplaza la entrada actual y reinicia página de forma atómica;
- `setPage` y `setSort`, que crean entradas navegables;
- `replacePage`, para correcciones internas de `usePageBounds`;
- acceso a la misma sesión URL cuando una pantalla necesita parámetros adicionales.

La caja de búsqueda muestra el valor literal de `q`; sólo la consulta usa `q.trim()`. Al restaurar una entrada con `POP`, la consulta adopta de inmediato el valor restaurado; al escribir, conserva el debounce de 350 ms.

## Tarea 1 — Codec, sesión URL y hook base

### Archivos

- Crear `src/lib/urlSearchParams.ts`.
- Crear `src/lib/urlSearchParams.test.ts`.
- Crear `src/hooks/useUrlSearchParams.ts`.
- Crear `src/hooks/useUrlSearchParams.test.tsx`.
- Modificar `src/hooks/useListParams.ts`.
- Modificar `src/hooks/useListParams.test.tsx`.

### Casos mínimos

- `page` negativa, decimal, enorme, repetida o no numérica.
- `sort` y enums fuera de allowlist.
- fechas inexistentes aunque tengan forma ISO.
- defaults omitidos y parámetros desconocidos preservados.
- búsqueda vacía o compuesta sólo por espacios.
- una sola escritura para búsqueda más reinicio de página.
- diferencias entre `PUSH`, `REPLACE` y restauración con `POP`.
- callbacks estables para no reactivar efectos consumidores.

### Verificación

```bash
npm test -- src/lib/urlSearchParams.test.ts src/hooks/useUrlSearchParams.test.tsx src/hooks/useListParams.test.tsx
npm run typecheck
git diff --check
```

### Commit

```text
feat(lists): agrega estado URL tipado
```

## Tarea 2 — Clientes, Equipos, Repuestos e Inventario

### Archivos

- Modificar `src/pages/ClientesPage.tsx` y su prueba.
- Modificar `src/pages/EquiposPage.tsx` y su prueba.
- Modificar `src/pages/RepuestosPage.tsx` y su prueba.
- Modificar `src/pages/InventarioPage.tsx`.
- Crear o ampliar `src/pages/InventarioPage.test.tsx`.

### Configuración

- Clientes: default `nombre,asc`; permitir sólo las cuatro opciones visibles.
- Equipos: default `id,desc`; permitir sólo sus tres opciones visibles.
- Repuestos e Inventario: sólo `q` y `page`.
- Declarar configuraciones y allowlists a nivel de módulo.
- Pasar `replacePage` a `usePageBounds` para no contaminar el historial.
- Mantener `size=20` y la UI actual sin cambios visuales.

### Casos mínimos

- Un deep link completa controles y consulta con valores seguros.
- Buscar u ordenar reinicia página en la misma navegación.
- Recargar y volver desde un detalle recupera el listado.
- Una página huérfana se corrige con `REPLACE`.
- El estado de entitlement de Inventario no genera navegaciones repetidas.

### Verificación

```bash
npm test -- src/pages/ClientesPage.test.tsx src/pages/EquiposPage.test.tsx src/pages/RepuestosPage.test.tsx src/pages/InventarioPage.test.tsx
npm run typecheck
git diff --check
```

### Commit

```text
refactor(lists): persiste búsquedas y paginación
```

## Tarea 3 — Reparaciones

### Archivos

- Modificar `src/pages/ReparacionesPage.tsx`.
- Modificar `src/pages/ReparacionesPage.test.tsx`.

### Estado URL

- `q`, `page` y `sort` mediante el hook base.
- `vista=list`; `board` se omite por ser el default.
- `estado=<enum>`; `TODOS` se omite por ser el default.
- `nuevo=1`; cualquier otro valor se elimina.

### Comportamiento

- Retirar los `useState` duplicados de vista y filtro.
- Usar la misma sesión transaccional; no montar un segundo escritor de search params.
- Cambiar filtro reinicia página de forma atómica.
- La búsqueda afecta ambas vistas y cada cambio conserva los demás parámetros.
- Cerrar un alta abierta por `nuevo=1` elimina sólo `nuevo` con `REPLACE`.
- Crear desde `nuevo=1` reemplaza la entrada por el detalle para que Atrás no reabra el formulario.
- Crear desde el botón local navega al detalle con `PUSH`.
- Descartar una navegación pendiente limpia sólo el estado local y no compite con el destino del blocker.

### Casos mínimos

- Vista, filtro, orden y página se hidratan desde un deep link.
- Atrás/Adelante reproduce las elecciones explícitas.
- `nuevo=1` convive con el resto del estado.
- Cerrar elimina sólo `nuevo`.
- Guardar desde un deep link y volver no reabre el alta.
- Descartar conserva exactamente el destino solicitado.

### Verificación

```bash
npm test -- src/pages/ReparacionesPage.test.tsx
npm run typecheck
git diff --check
```

### Commit

```text
feat(reparaciones): persiste vista y filtros en URL
```

## Tarea 4 — Caja

### Archivos

- Modificar `src/pages/CajaPage.tsx`.
- Modificar `src/pages/CajaPage.test.tsx`.

### Estado URL

- `desde=YYYY-MM-DD`.
- `hasta=YYYY-MM-DD`.
- Ninguna fecha por default.

### Comportamiento

- Fechas válidas se muestran y consultan desde la URL.
- Fechas inválidas se eliminan con `REPLACE`.
- Un rango válido pero invertido permanece visible y no dispara la consulta.
- Cambiar cada fecha crea una entrada navegable.
- “Hoy” elimina ambas fechas en un único `PUSH`.
- El bloqueo por plan se conserva sin navegación adicional.

### Casos mínimos

- Deep link y recarga conservan el rango.
- Atrás/Adelante restaura ambas fechas.
- El rango invertido no consulta.
- Una fecha inexistente se canonicaliza.
- “Hoy” elimina ambos parámetros sin tocar parámetros ajenos.

### Verificación

```bash
npm test -- src/pages/CajaPage.test.tsx
npm run typecheck
git diff --check
```

### Commit

```text
feat(caja): persiste rango de fechas en URL
```

## Tarea 5 — E2E, regresión y documentación

### Archivos

- Crear `e2e/list-url-state.spec.ts`.
- Ampliar cobertura móvil sólo donde el viewport cambie la interacción.
- Actualizar este plan con resultados y hashes reales.

### Escenarios E2E

- Buscar, ordenar, filtrar, paginar, recargar y conservar.
- Abrir un detalle y volver al listado exacto.
- Atrás/Adelante reproduce cambios explícitos.
- Escribir varias letras requiere un solo Atrás.
- Parámetros inválidos terminan en una URL canónica.
- Alta mediante `?nuevo=1`: cerrar, guardar y descartar.
- Rango de Caja persistido y restaurado.

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

### Commits

```text
test(e2e): cubre estado navegable de listados
docs(lists): registra persistencia URL validada
```

## Criterio de cierre

La etapa se considera terminada cuando las seis pantallas cumplen el diseño aprobado, todas las URLs inválidas se normalizan sin bucles, las protecciones de formularios siguen verdes, la regresión completa pasa y el historial queda compuesto por commits atómicos sin push.

## Resultado ejecutado

### Contrato entregado

| Pantalla | Parámetros persistidos | Correcciones automáticas |
|---|---|---|
| Clientes | `q`, `page`, `sort` | allowlist de cuatro órdenes y página con `REPLACE` |
| Equipos | `q`, `page`, `sort` | allowlist de tres órdenes y página con `REPLACE` |
| Repuestos | `q`, `page` | página con `REPLACE` |
| Inventario | `q`, `page` | página con `REPLACE`, sin navegación por entitlement |
| Reparaciones | `q`, `page`, `sort`, `vista`, `estado`, `nuevo` | enums, sort y flag canonicalizados; página con `REPLACE` |
| Caja | `desde`, `hasta` | fechas ISO reales canonicalizadas con `REPLACE` |

La búsqueda usa `REPLACE` y debounce de 350 ms. Una carga o navegación `POP` restaura la consulta inmediatamente. Página, orden, vista, estado y fechas usan `PUSH`. Cada interacción agrupa todos sus cambios en una receta porque React Router no encola varios escritores funcionales de search params en el mismo tick.

Reparaciones quedó con un único escritor URL. El alta `nuevo=1` preserva el listado, cerrar elimina sólo el flag y crear reemplaza la entrada por el detalle; el alta abierta localmente conserva navegación `PUSH`. Caja mantiene visible un rango invertido, muestra el error existente y no consulta hasta corregirlo.

### Commits reales

| Hash | Entrega |
|---|---|
| `25f6844` | diseño aprobado |
| `0ea2c9d` | plan técnico |
| `4c83cba` | codec, sesión URL y hook de listas tipado |
| `4e3b26f` | Clientes, Equipos, Repuestos e Inventario |
| `4651c46` | Reparaciones, filtros, vista y `nuevo=1` |
| `87146f9` | rango de fechas de Caja |
| `4396626` | E2E desktop y matriz móvil |

El cierre documental se versiona en un commit separado. No se hizo push.

### Validación final

- `npm test`: **66 archivos / 379 pruebas**, todas verdes.
- `npm run typecheck`: verde.
- `npm run lint`: verde.
- `npm run build`: verde; Vite transformó 682 módulos.
- `npm run test:e2e`: **78 escenarios**, todos verdes.
- Cobertura nueva focal: 6 escenarios Chromium y 4 ejecuciones móviles en 320 px, 390 px, landscape y WebKit.
- `git diff --check`: verde.
- `.agents/` y `public/OrdenFix project naming/` permanecen fuera de los commits.

### Cierre

Los seis listados usan la URL como única fuente de verdad para su estado recuperable. Deep links, recarga, detalle y Atrás/Adelante restauran el recorte operativo; los valores inválidos no llegan al backend; los defaults se omiten; las correcciones no contaminan el historial; y los guards de cambios sin guardar conservaron su destino original durante la regresión completa.
