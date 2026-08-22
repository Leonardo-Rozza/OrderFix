# Diseño — Selectores asincrónicos y paginados para formularios

**Fecha:** 2026-08-22  
**Estado:** Aprobado

## Contexto

OrdenFix precarga hasta 200 clientes, equipos y artículos, y hasta 1000 reparaciones para alimentar selectores que luego buscan sólo dentro del arreglo recibido. Cuando el taller supera esos límites, una entidad válida deja de aparecer sin que la interfaz comunique que el catálogo está truncado. Esto puede impedir crear un equipo, abrir una reparación o asociar un repuesto aunque el dato exista en el backend.

El contrato actual ya ofrece `q`, `page`, `size` y, según el recurso, `sort`. Por lo tanto, el problema puede resolverse en frontend sin aumentar límites ni descargar catálogos completos.

## Objetivo

Todo selector de relaciones usado por los formularios debe consultar el backend bajo demanda, encontrar registros más allá de la primera página, conservar una selección válida y comunicar carga, vacío y error sin bloquear el resto del formulario innecesariamente.

El primer bloque alcanza:

- cliente al crear o editar un equipo;
- equipo al crear una reparación en modo existente;
- reparación al asociar un repuesto;
- artículo de inventario al crear un repuesto.

## Dirección de interfaz

### Dominio

Los conceptos que guían el componente son: cliente, equipo, orden de trabajo, estado operativo, inventario, repuesto y disponibilidad. El usuario es un administrador o empleado del taller que suele cargar datos desde el mostrador o el banco de trabajo, frecuentemente desde un teléfono y con interrupciones.

### Mundo visual

Se conserva el sistema existente: grafito para información primaria, superficies claras para jerarquía, teal para acciones, ámbar para advertencias, rojo para fallos recuperables y verde para disponibilidad. No se incorporan colores ni tipografías nuevas.

### Firma

Cada resultado se presenta como una referencia operativa del taller, no como una opción genérica:

- cliente + teléfono;
- equipo + cliente o IMEI;
- orden + equipo, cliente y estado;
- artículo + SKU y stock.

### Defaults descartados

- Precargar cientos de registros se reemplaza por búsqueda paginada bajo demanda.
- Un spinner que vacía el desplegable se reemplaza por una superficie estable con estados locales.
- Un dropdown angosto de escritorio se reemplaza en móvil por un picker amplio adaptado al teclado virtual.

### Checkpoint del componente

- **Intento:** permitir identificar rápidamente una relación correcta sin abandonar el formulario ni dudar si el catálogo está completo.
- **Paleta:** únicamente tokens existentes de superficie, texto, borde, primario y semánticos; el color comunica acción o estado.
- **Profundidad:** borde sutil y la elevación ya usada por el popover actual, porque debe sentirse unido al formulario y por encima de él.
- **Superficies:** control inset, popover elevado y footer estable para paginación/reintento.
- **Tipografía:** jerarquía actual; label principal legible y contexto secundario más tenue.
- **Espaciado:** escala existente basada en 4 px; filas táctiles de al menos 44 px.

## Enfoques considerados

### 1. Aumentar los límites fijos

Es el cambio más pequeño, pero sólo desplaza el problema, aumenta el tiempo de carga y sigue ocultando datos al alcanzar el límite siguiente.

### 2. Buscar remotamente sólo la primera página

Permite encontrar términos específicos, pero navegar sin búsqueda continúa incompleto y una coincidencia válida puede quedar en páginas posteriores.

### 3. Componente asincrónico con paginación explícita — elegido

Conservar el `Combobox` local y extraer una base compartida de presentación, foco y teclado. Sobre esa base, `AsyncCombobox` administrará búsqueda debounced y páginas remotas mediante React Query. Así se preservan los selectores pequeños existentes y se reduce el riesgo de regresión.

## Arquitectura

### Presentación

`ComboboxBase` será responsable de:

- disparador, portal y posicionamiento con `visualViewport`;
- input de búsqueda y listbox;
- navegación por teclado y opción activa por `value` estable;
- filas de resultado;
- estados de carga, error, vacío y paginación;
- restauración de foco al cerrar.

`Combobox` conservará su API actual y filtrado local. `AsyncCombobox` compondrá la misma base con una fuente remota paginada. Ninguno de los componentes visuales conocerá endpoints ni DTOs del backend.

### Datos y caché

Cada dominio expondrá una consulta infinita con:

- `size: 20`;
- debounce de 350 ms;
- `initialPageParam: 0`;
- página siguiente cuando `page.number + 1 < page.totalPages`;
- `signal` de React Query pasado a Axios para cancelar búsquedas obsoletas;
- deduplicación por ID mediante `Map`;
- sin `placeholderData` entre términos de búsqueda.

Las requests del selector declararán un modo de error inline. El interceptor de Axios deberá:

- ignorar cancelaciones (`axios.isCancel` o `ERR_CANCELED`) sin toast ni telemetría;
- conservar el tratamiento global de `401`, `402` y `403`;
- evitar el toast genérico para una consulta que ya presenta recuperación inline;
- mantener la captura de fallos inesperados/5xx, sin duplicar el mensaje visible.

Las query keys mantendrán los prefijos históricos. Por ejemplo, `queryKeys.clientes.options` seguirá siendo `['clientes', 'options']` y una factory `optionSearch(params)` agregará `q`, `size` y `sort`. Las invalidaciones actuales por dominio seguirán alcanzando todas las búsquedas.

Los DTOs se transformarán en opciones cerca de su query de dominio. La caché del selector no debe almacenar secretos ni respuestas de detalle sensibles.

### Ownership

Los formularios serán dueños de sus selectores remotos. Las páginas dejarán de precargar catálogos y de pasar arreglos, loading, error y retry a través de varias capas.

Las consultas sólo se habilitan cuando se necesitan:

- modal de equipo abierto y relación editable;
- modal de reparación abierto, alta y modo `existente`;
- modal de repuesto abierto y reparación no fijada;
- alta de repuesto, inventario habilitado y selector visible.

Consultas independientes de artículo y reparación podrán ejecutarse en paralelo.

## Contrato por selector

### Clientes

`GET /clientes?q=&page=&size=20&sort=nombre,asc`

- Label: nombre y apellido.
- Sublabel: teléfono.
- La ficha de cliente que abre un alta de equipo pasa su cliente conocido como selección inicial, sin otro request.

### Equipos

`GET /equipos?q=&page=&size=20&sort=id,desc`

- Label: marca y modelo.
- Sublabel: cliente e IMEI cuando estén disponibles.
- Una reparación editada conserva la opción denormalizada que ya recibió; no necesita buscarla.

### Inventario

`GET /inventario?q=&page=&size=20`

- Label: nombre.
- Sublabel: SKU, stock y precio según disponibilidad.
- No se enviará `sort` porque la guía no lo garantiza para inventario.
- La entidad seleccionada se conserva en un `Map` para autocompletar nombre, precio y cantidad del repuesto.
- Un fallo del selector opcional no debe impedir cargar el repuesto manualmente.

### Reparaciones

`GET /reparaciones?q=&page=&size=20&sort=id,desc`

- Label: número de orden o ID seguro, más equipo.
- Sublabel: cliente, problema resumido y estado.
- `ENTREGADO`, `ABANDONADO` y `CANCELADO` no se ofrecen para nuevas asociaciones.
- Una reparación cerrada ya asociada se conserva al editar.
- `hasNextPage` se calcula con la página cruda antes de filtrar estados cerrados.
- Si la primera página contiene únicamente órdenes cerradas y todavía quedan páginas, se puede solicitar automáticamente **una sola** página adicional y se anuncia “Buscando órdenes abiertas…”. No se encadenan requests sin límite.
- Si las páginas cargadas todavía no contienen órdenes abiertas, se comunica “No hay órdenes abiertas entre las cargadas” y se mantiene `Cargar más`; nunca se presenta ese estado parcial como un vacío definitivo.
- Cada acción explícita de `Cargar más` solicita exactamente una página.

El endpoint `GET /reparaciones/{id}` no se usará para hidratar opciones: su respuesta puede contener PIN o patrón y está reservada para la ficha segura. La selección se construirá con el DTO denormalizado ya disponible. Como mejora futura, el backend podría aceptar `activa=true` o varios estados para evitar recorrer páginas cerradas.

## Selección e hidratación

La opción seleccionada vive separada de las páginas visibles. Cambiar la búsqueda no borra ni renombra el valor del formulario.

Prioridad para resolver la etiqueta:

1. opción seleccionada durante la sesión;
2. DTO denormalizado recibido por el formulario;
3. detalle por ID sólo para recursos cuyo endpoint sea seguro;
4. error explícito si no existe una etiqueta segura.

No se inventará una etiqueta como `#123` cuando el contexto operativo real sea desconocido, salvo que el contrato defina ese ID como identificación visible de la orden.

## Estados de interfaz y errores

El error se maneja en el nivel donde el usuario puede recuperarse:

- **carga inicial:** skeleton o estado dentro del popover;
- **buscando:** mantiene la superficie y anuncia actividad sin mostrar resultados del término anterior;
- **sin coincidencias:** mensaje contextual con el término asentado;
- **catálogo vacío:** mensaje distinto de una búsqueda sin resultados;
- **error inicial:** alerta inline y `Reintentar`;
- **error de página siguiente:** conserva resultados válidos y ofrece reintentar el bloque;
- **cargando más:** mantiene seleccionables las opciones ya cargadas;
- **selección válida durante refetch:** el formulario puede seguir enviándose;
- **selector opcional fallido:** mantiene disponible el flujo manual.

Los aborts por cambio de búsqueda son control de concurrencia esperado y no deben mostrarse como errores. Un fallo recuperable se comunica una sola vez en el selector, sin duplicar mensajes locales.

## Teclado y accesibilidad

- El disparador mantiene semántica estable de botón con `aria-haspopup="listbox"` y `aria-expanded`.
- El input abierto es el único `combobox` de búsqueda y usa una etiqueta específica, por ejemplo “Buscar cliente”.
- Flechas recorren opciones habilitadas; Enter selecciona sin enviar el formulario.
- Escape cierra sin cambiar el valor y devuelve el foco; un segundo Escape puede cerrar el modal.
- Cuando no hay un footer accionable, Tab y Shift+Tab cierran y continúan el recorrido del diálogo como hoy.
- Cuando existe `Cargar más` o `Reintentar`, Tab desde la búsqueda/lista enfoca ese botón; Tab desde el footer cierra y continúa al campo siguiente, y Shift+Tab vuelve a la búsqueda.
- Flecha abajo desde la última opción también carga una página y, al llegar, activa la primera opción nueva habilitada. Si la página no aporta opciones abiertas, el foco permanece estable y se anuncia el estado parcial.
- La opción activa se identifica por `value`, no por índice, para sobrevivir a páginas nuevas.
- Loading, error, vacío y `Cargar más` no tienen rol de opción.
- El listbox usa `aria-busy`; una región `aria-live="polite"` anuncia resultados asentados.
- El botón `Cargar más` permanece accesible aunque luego se agregue precarga automática.

## Responsive

- En escritorio se conserva el popover anclado actual.
- Debajo de `sm` ocupa casi todo el ancho disponible con margen de 8 px respecto del `visualViewport`.
- No crea un segundo diálogo: sigue siendo un listbox descendiente del modal existente.
- Buscador y footer quedan visibles mientras la lista se desplaza.
- Las filas miden al menos 44 px y la búsqueda usa 16 px para evitar zoom de iOS.
- Se respeta el safe area inferior y se evita propagar el scroll al modal.

## CI y commits

La matriz Playwright declara `mobile-webkit`, pero CI sólo instala Chromium. El arreglo se hará en un commit independiente instalando exactamente `chromium webkit`; Firefox queda fuera porque no existe un proyecto que lo use.

La implementación se separará en commits atómicos para:

1. diseño y plan;
2. instalación de WebKit en CI;
3. base compartida y pruebas del selector;
4. queries infinitas, keys y pruebas de caché;
5. migración de formularios y pruebas de integración;
6. cobertura E2E y documentación contractual si corresponde.

No se hará push.

## Pruebas

### Unitarias

- Preservar búsqueda local, Escape, Tab y apertura hacia arriba del `Combobox` actual.
- Debounce: una sola consulta después de 350 ms.
- Cambio de término: nueva key, página cero y cancelación de la anterior.
- Página siguiente, deduplicación por ID y retry.
- Selección fuera de las páginas cargadas.
- Error inicial y error al cargar más.
- IDs estables, foco y opciones no seleccionables.

### Integración

- Requests con `q`, `page`, `size` y `sort` contractuales.
- Ninguna consulta con modal cerrado o relación fija.
- Cliente/equipo encontrados después del antiguo límite 200.
- Reparación encontrada después del límite 1000.
- Órdenes cerradas excluidas y selección histórica conservada.
- Artículo seleccionado autocompleta el repuesto.
- Fallo de inventario opcional permite carga manual.
- Mutaciones invalidan también búsquedas infinitas activas.

### E2E

- Selección desde página dos dentro de cada flujo crítico.
- Búsqueda rápida sin respuestas cruzadas.
- Selector dentro de modal en 320, 390 y WebKit móvil.
- Scroll, teclado, Escape, restauración de foco y reintento.
- Suite completa de Chromium y WebKit configurada en CI.

## Fuera de alcance

- Cambios del contrato backend.
- Filtro backend de múltiples estados o `activa=true`.
- Selectores de usuarios, cuyo endpoint actual devuelve un array simple.
- Carga incremental del tablero Kanban.
- Persistencia de filtros de listados en URL.
- Protección global de formularios con cambios sin guardar.

## Criterios de aceptación

- Ningún selector alcanzado depende de un límite total de 200 o 1000 elementos.
- Una entidad válida puede encontrarse mediante búsqueda y paginación remota.
- El valor seleccionado permanece estable aunque cambie la búsqueda o la caché se invalide.
- Loading, vacío y error son distinguibles y recuperables.
- Los formularios opcionales conservan su alternativa manual.
- El selector mantiene teclado, foco y comportamiento móvil del componente actual.
- Datos sensibles de una reparación nunca entran a la caché de opciones.
- Las invalidaciones existentes alcanzan las nuevas queries infinitas.
- CI instala y ejecuta los navegadores declarados.
