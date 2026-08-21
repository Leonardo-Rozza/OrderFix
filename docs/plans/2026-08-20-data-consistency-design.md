# Diseño — Consistencia operativa de datos

**Fecha:** 2026-08-20  
**Estado:** Aprobado

## Contexto

OrdenFix usa React Query con cinco minutos de `staleTime` y respuestas que contienen datos denormalizados. Una misma entidad aparece en varias superficies: el nombre de un cliente también vive en equipos, reparaciones, dashboard, recibos y seguimiento; la marca de un equipo aparece en reparaciones y repuestos; el estado y los importes de una reparación alimentan listas, tablero, dashboard, cobros y recibos.

Las invalidaciones principales de reparaciones, repuestos y cobros ya existen, pero algunas mutaciones sólo refrescan su dominio directo. También hay pantallas que convierten una consulta pendiente o fallida en `[]`, `0` o “sin registros”. Esto permite que la aplicación muestre información contradictoria aunque el backend sea correcto.

## Objetivo

Después de una mutación exitosa, todas las vistas activas que dependan del dato deben reconciliarse con el backend antes de habilitar otra acción incompatible. Si una consulta falla o todavía no respondió, la interfaz debe comunicar que el valor es desconocido, nunca presentarlo como cero o vacío.

## Enfoques considerados

### 1. Invalidaciones puntuales

Agregar claves faltantes dentro de cada mutación. Es el cambio más pequeño, pero mantiene dependencias duplicadas y hace probable que una función futura vuelva a olvidar una copia denormalizada.

### 2. Capa central de consistencia — elegido

Definir factories de query keys y helpers de reconciliación por dominio. Las mutaciones siguen siendo dueñas de su flujo, pero delegan en una matriz explícita de dependencias. El enfoque mejora la trazabilidad sin introducir otro store ni normalizar manualmente todas las respuestas.

### 3. Caché normalizada global

Guardar entidades por ID y derivar todas las vistas. Es robusto, pero implica reescribir consultas, paginación y formularios, y duplica parte del trabajo de React Query. No se justifica en esta etapa.

## Arquitectura

Se agregará un módulo de claves tipadas y un módulo de consistencia de caché. Las claves singulares y plurales dejarán de repetirse como literales en las mutaciones modificadas.

La capa expondrá operaciones acotadas por evento, por ejemplo:

- cliente cambiado;
- equipo creado, editado o eliminado;
- reparación creada, editada, eliminada o con estado cambiado;
- presupuesto modificado;
- cobro modificado;
- plan degradado a FREE.

Cada operación invalidará únicamente prefijos afectados y removerá claves exactas cuando el recurso ya no exista. Las invalidaciones de vistas activas se esperarán cuando la acción siguiente dependa de datos reconciliados; las copias inactivas quedarán marcadas stale para refrescarse al montarse.

## Matriz de dependencias

### Cliente

Editar un cliente refresca:

- listas, opciones y detalle de clientes;
- equipos y sus datos denormalizados;
- reparaciones y detalle activo;
- últimas reparaciones del dashboard;
- recibos y seguimiento que puedan estar montados.

Crear o eliminar mantiene sincronizados los listados y contadores que dependan del total de clientes.

### Equipo

Crear, reasignar o eliminar un equipo refresca:

- listas, opciones y detalle de equipos;
- clientes y `equiposCount`;
- reparaciones que copian marca, modelo o cliente;
- repuestos que muestran `reparacionEquipo`;
- dashboard, recibos y seguimiento.

### Reparación

Crear o editar refresca listas, tablero, detalle, dashboard, agregados de cliente/equipo y datos monetarios asociados. Si cambia el equipo también refresca los labels de repuestos.

Eliminar espera el `204` del backend y luego:

- remueve la query exacta del detalle;
- remueve o invalida repuestos, presupuestos, cobros y recibo de esa reparación;
- refresca listas, tablero, dashboard y agregados.

Ante error no se elimina ni altera ninguna copia válida.

### Presupuestos y cobros

Un presupuesto puede cambiar automáticamente el estado de la reparación. Por eso refresca presupuesto, reparación, listas, dashboard, recibo y seguimiento.

Un cobro refresca cobros, caja, recibo, reparación, listas y dashboard. El ID de reparación tendrá una única fuente para que request e invalidación no puedan apuntar a recursos distintos.

### Suscripción

Al volver a FREE se reemplaza la suscripción y se eliminan o invalidan caches restringidas de inventario, caja, cobros y recibos para impedir que datos fresh reaparezcan después de perder el entitlement.

## Transiciones de estado

Se quitará el parche optimista que modifica objetos dentro de páginas filtradas sin moverlos entre columnas. Ese parche actualmente puede dejar una tarjeta en el filtro anterior y no restaura el detalle en un rollback.

La transición será confirmada por el backend:

1. se bloquean las acciones de estado concurrentes;
2. se envía el PATCH;
3. en éxito, la respuesta actualiza el detalle seguro y se reconcilian listas, tablero y derivados;
4. en error, la caché anterior permanece intacta y se muestra el mensaje contractual.

La latencia esperada no justifica mantener un optimismo incompleto. Si en el futuro se necesita movimiento instantáneo, deberá implementarse una transacción que snapshottee origen, destino, metadatos y detalle.

## Estados de interfaz

Las superficies con datos remotos distinguirán cuatro estados:

- **loading:** skeleton o indicador local;
- **error:** mensaje específico y reintento;
- **empty:** sólo después de una respuesta exitosa vacía;
- **success:** datos reales.

Se aplicará primero a:

- repuestos, presupuestos y cobros del detalle de reparación;
- ficha de cliente y reparaciones de un equipo;
- KPIs y recientes del dashboard;
- resumen y movimientos de caja;
- columnas del tablero.

Las acciones que dependen de una consulta desconocida o fallida quedarán deshabilitadas hasta cargar o reintentar. Una búsqueda o página con `keepPreviousData` conservará estabilidad visual, pero expondrá “Actualizando…”, `aria-busy` y bloqueará acciones sobre filas del criterio anterior.

## Errores y concurrencia

- Los errores conservan formularios y datos válidos anteriores.
- No se traducen errores de red en listas vacías o importes cero.
- Los reintentos se presentan en la sección afectada, sin derribar toda la pantalla cuando las demás consultas siguen siendo útiles.
- Las mutaciones sensibles no admiten una segunda acción incompatible mientras estén pendientes.
- Las respuestas exitosas son la fuente de verdad; las invalidaciones amplias funcionan como reconciliación, no como sustituto de la respuesta.

## Pruebas

### Unitarias e integración

- Matriz de invalidación de cliente y equipo.
- Edición de reparación refresca repuestos derivados.
- Baja exitosa purga detalle e hijos; una baja fallida conserva todas las caches.
- Cambio de estado exitoso reconcilia detalle y filtros; un error no deja estado falso.
- Presupuestos refrescan recibo y seguimiento.
- Dashboard, Caja y subconsultas no muestran cero o vacío durante loading/error.
- Fichas y columnas presentan error con reintento.
- Datos placeholder se anuncian como actualización y no son accionables.

### Regresión

- Suite unitaria completa.
- E2E de flujos críticos y móvil.
- TypeScript, ESLint, build y `git diff --check`.

## Fuera de alcance

- Búsqueda server-side o paginación de selectores que superan 200/1000 elementos.
- Tablero incremental para más de 100 reparaciones por estado.
- Endurecimiento exhaustivo de DTOs históricos y validación runtime de todas las respuestas.
- Regeneración del OpenAPI del backend.
- Idempotency keys, que requieren soporte backend.

Estos puntos se mantienen como etapas independientes para no mezclar consistencia operativa con escalabilidad o cambios contractuales amplios.

## Criterios de aceptación

- Una edición de cliente o equipo se refleja en todas sus copias denormalizadas sin recargar manualmente.
- Una reparación eliminada no puede reaparecer desde una caché fresh ni conservar hijos accesibles.
- Una transición fallida nunca deja lista y detalle en estados distintos.
- Loading y error no se representan como cero, vacío o ausencia real.
- Las acciones dependientes quedan bloqueadas mientras su fuente de datos es desconocida.
- Las pruebas verifican caches sembradas, no sólo llamadas a `invalidateQueries`.
