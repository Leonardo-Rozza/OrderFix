# Diseño — Carga incremental del Kanban de reparaciones

Fecha: 2026-08-23

## Contexto

El tablero de Reparaciones agrupa los doce estados contractuales en seis fases. Cada estado ejecuta hoy una consulta independiente con `page=0` y `size=100`. Si el backend informa más resultados, la interfaz sólo advierte que el tablero carga hasta 100 órdenes y no permite continuar.

Este límite es el último bloque funcional pendiente del refactor general del frontend. Además de ocultar reparaciones antiguas, la estrategia actual puede descargar y renderizar hasta 1.200 tarjetas al abrir el tablero, algo especialmente costoso en teléfonos.

El backend ya ofrece todo el contrato necesario:

- búsqueda por `q`;
- filtro por `estado`;
- paginación base cero con `page` y `size`;
- orden estable mediante `sort`;
- metadata `number`, `size`, `totalElements` y `totalPages`.

No se requiere ningún cambio de backend.

## Decisión aprobada

Cada estado cargará sus reparaciones bajo demanda mediante un botón explícito **“Cargar 20 más”**. La primera consulta y cada lote adicional tendrán 20 elementos.

Se eligió esta alternativa porque:

- limita el tablero inicial a un máximo teórico de 240 tarjetas en lugar de 1.200;
- hace alcanzable el control de continuación en una columna móvil;
- conserva el contexto de las tarjetas anteriores;
- funciona con mouse, tacto, teclado y lectores de pantalla;
- evita la imprevisibilidad del scroll infinito en un tablero con desplazamiento horizontal y vertical.

Se descartaron:

1. Mantener lotes de 100: reduce clics, pero conserva el mayor costo inicial y coloca la continuación demasiado lejos en móvil.
2. Reemplazar el lote con un paginador: acota el DOM, pero pierde contexto y complica el drag-and-drop entre páginas.
3. Acumular páginas manualmente sobre `useQuery`: reduce cambios de API, pero duplica responsabilidades de caché y es más vulnerable a búsquedas, invalidaciones y carreras.

## Dirección de interfaz

### Dominio

- Recepción del equipo.
- Orden de trabajo y folio.
- Mesa de diagnóstico.
- Banco de reparación.
- Espera de repuestos o aprobación.
- Control final y entrega.

### Mundo de color

- Papel claro para la orden.
- Acero y grafito para estructura y jerarquía.
- Teal de la alfombra antiestática para acciones.
- Azul y cyan para ingreso y diagnóstico.
- Ámbar para trabajo y atención.
- Violeta para esperas.
- Verde para listo y entregado.

No se agregará una paleta nueva. Se reutilizarán los tokens y colores de estado existentes.

### Firma

Cada zona tendrá un pie operativo propio: **“20 de 142 visibles”** junto a la acción contextual **“Cargar 20 más”**. El progreso pertenece al estado, no al tablero global, y mantiene el acento visual de esa etapa sin convertirse en una advertencia.

### Defaults reemplazados

- Scroll infinito invisible → acción explícita y accesible.
- Paginación global → progreso aislado por estado.
- Advertencia amarilla sin salida → pie operativo con continuación.
- Reemplazo de tarjetas al paginar → acumulación deduplicada.

### Checkpoint de componentes

- **Intent:** un técnico necesita encontrar y mover órdenes sin perder reparaciones antiguas; la interacción debe sentirse rápida, controlada y propia de un tablero de taller.
- **Palette:** superficies, textos, bordes y colores de estado existentes; el teal continúa reservado para la acción principal.
- **Depth:** bordes discretos y sombras suaves ya presentes en las tarjetas; el pie de progreso permanece en el plano de la zona.
- **Surfaces:** columna en `surface-2`, tarjetas en `surface` y control de continuación integrado al final del estado.
- **Typography:** Manrope para interfaz y monoespaciada para folios/importes, sin introducir otra voz visual.
- **Spacing:** base de 4 px y objetivo táctil mínimo de 44 px.

## Arquitectura

### 1. Consulta infinita exclusiva

Se agregará un hook `useReparacionesBoardInfiniteQuery` basado en `useInfiniteQuery`.

La consulta normal y la infinita no compartirán la misma key porque almacenan estructuras incompatibles (`Page` frente a `InfiniteData`). La jerarquía será equivalente a:

```text
['reparaciones', 'board', estado, { q, size, sort }]
```

La key permanece bajo el prefijo `['reparaciones']`, por lo que las invalidaciones existentes de altas, ediciones, transiciones y bajas seguirán alcanzando el tablero.

Parámetros fijos:

- `initialPageParam: 0`;
- `size: 20`;
- `sort: id,desc`;
- `estado` obligatorio;
- `q` normalizado por la pantalla.

El número de página no formará parte de la key: será `pageParam`. Cada respuesta deberá incluir la metadata contractual. `getNextPageParam` devolverá `number + 1` sólo si es menor que `totalPages`.

La función de consulta recibirá `AbortSignal` y usará errores inline para que una falla de columna no duplique notificaciones globales.

### 2. Composición y deduplicación

Las páginas se aplanarán en orden y se deduplicarán por `reparacion.id`. Ante un ID repetido, prevalecerá la versión de la página más reciente.

Esto evita tarjetas duplicadas si una alta, baja o transición remota desplaza los offsets entre dos requests. La paginación por offset todavía puede omitir un elemento bajo concurrencia extrema; resolverlo completamente requeriría cursores o versionado del backend y queda fuera de este cambio front-only.

El total visible se derivará del número de IDs únicos. El total contractual vendrá de la metadata más reciente.

### 3. Búsqueda e invalidación

Cambiar `q` produce una key diferente y reinicia el estado en la primera página. Los lotes cargados no se codificarán en la URL: son detalle efímero de presentación, no una decisión navegable. La búsqueda sí continúa persistida por el trabajo anterior.

Las mutaciones conservarán el modelo confirmado actual:

- no habrá movimiento optimista incompleto;
- la respuesta del backend será la autoridad;
- el prefijo de reparaciones invalidará listas, detalles y boards;
- las páginas retenidas se reconciliarán antes de liberar la transición.

No se aplicará `maxPages`, porque expulsar páginas iniciales rompería el contexto acumulado y exigiría navegación bidireccional.

## Interacción

### Carga inicial

- La zona mantiene sus dos skeletons actuales.
- El contador no anuncia cero hasta disponer de una respuesta válida.
- El error inicial conserva `ErrorState` y reintento aislado.
- Un resultado realmente vacío conserva la zona droppable “Sin reparaciones”.

### Página adicional

- El pie muestra `N de total visibles`.
- El botón indica cuántas reparaciones puede agregar: `Cargar 20 más` o el remanente menor.
- Su nombre accesible incluye el estado: `Cargar 20 reparaciones más en Ingresado`.
- Durante el request conserva todas las tarjetas y cambia a `Cargando más…`.
- Doble clic, Enter repetido o una carga concurrente no disparan páginas superpuestas.
- Al completar, un live region anuncia el nuevo progreso.
- El foco pasa a la acción principal de la primera tarjeta nueva, evitando que el usuario de teclado salte el contenido agregado.

Cuando no quedan páginas, el botón desaparece. El contador del encabezado continúa mostrando el total del backend.

### Transiciones durante una carga

Mientras alguna página del board está en vuelo:

- se bloquean drag-and-drop;
- se bloquean los botones “Avanzar”;
- se bloquean nuevas cargas;
- se permite abrir una reparación ya visible.

Esta separación evita carreras sobre la paginación por offset sin impedir consultar una ficha.

## Errores y recuperación

Se distinguirán tres estados:

1. **Error inicial:** reemplaza sólo el contenido de esa zona por el estado de error actual y ofrece reintento.
2. **Error de página siguiente:** conserva las tarjetas anteriores y muestra un mensaje compacto “No pudimos cargar más” con “Reintentar”.
3. **Error de reconciliación/refetch con datos previos:** conserva los datos visibles, los identifica como no actualizados y ofrece refrescar antes de permitir transiciones.

Si la metadata falta o es incoherente, la consulta falla de forma explícita. Nunca se inferirá una página siguiente sólo por la longitud de `content`.

## Responsive y accesibilidad

- La fase cabrá completa en los 288 px útiles de una pantalla de 320 px.
- Se conservará el desplazamiento horizontal deliberado entre fases, sin overflow del documento.
- El botón tendrá al menos 44 px de alto en 320 px, 390 px, landscape y dispositivos coarse-pointer.
- Fases y estados tendrán jerarquía semántica y nombres accesibles contextuales.
- `aria-busy` reflejará carga inicial, actualización y página adicional.
- Los mensajes de progreso usarán `aria-live="polite"`.
- El error incremental usará `role="alert"` sin eliminar contenido válido.
- La carga no dependerá del drag, hover ni visibilidad automática de un sentinel.

## Rendimiento

- El lote de 20 reduce red, memoria y DOM iniciales.
- El aplanado/deduplicado se memorizará por páginas recibidas.
- Las queries de los doce estados seguirán siendo paralelas e independientes.
- No se agregará virtualización en esta etapa; la carga manual limita el crecimiento y la vista Lista sigue siendo la herramienta para recorridos exhaustivos.

## Pruebas

### Unitarias e integración

- key de board separada de la lista normal;
- request inicial y página siguiente con `estado`, `q`, `size=20` y `sort=id,desc`;
- cálculo de `getNextPageParam` con metadata obligatoria;
- corte correcto en la última página;
- append de páginas y deduplicación por ID;
- cantidad visible y remanente menor a 20;
- error incremental conserva tarjetas y reintenta la misma página;
- cambio de búsqueda reinicia en página cero;
- carga bloquea transiciones pero no la apertura de fichas;
- foco y live region después de agregar contenido;
- invalidación raíz alcanza la nueva key infinita.

### E2E y regresión

- una zona con más de 20 órdenes pide sólo su página siguiente;
- el progreso cambia de 20 a 40 sin duplicados;
- la tarjeta de la segunda página puede abrirse y avanzar después de estabilizarse;
- error y reintento incremental no eliminan la primera página;
- botón completo y táctil en 320 px y 390 px;
- comportamiento estable en landscape y WebKit móvil;
- sin overflow horizontal del documento;
- TypeScript, ESLint, build, suite unitaria completa y Playwright quedan verdes.

## Fuera de alcance

- Scroll infinito o precarga por intersección.
- Virtualización de columnas.
- Cursores, snapshots o versionado de paginación en backend.
- Actualizaciones realtime entre empleados.
- Persistir en URL cuántos lotes abrió cada estado.
- Reescribir el drag-and-drop HTML5 para soporte táctil.
- Invalidar únicamente los estados origen y destino; la invalidación raíz actual prioriza corrección.

## Criterios de aceptación

- Ningún estado queda truncado en 100 reparaciones.
- El tablero inicial solicita como máximo 20 reparaciones por estado.
- Cada carga agrega el lote siguiente sin reemplazar ni duplicar tarjetas.
- Las tarjetas cargadas sobreviven a un error incremental.
- Buscar comienza nuevamente desde la página cero.
- Una carga concurrente no puede competir con una transición de estado.
- El flujo es operable y comprensible con tacto, mouse, teclado y lector de pantalla.
- La matriz móvil y toda la regresión permanecen verdes.
- Los cambios quedan documentados en commits atómicos y no se hace push.
