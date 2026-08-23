# Diseño — Estado de listados persistido en URL

**Fecha:** 2026-08-23  
**Estado:** Aprobado

## Contexto

Clientes, Equipos, Reparaciones, Repuestos e Inventario mantienen búsqueda, página y orden dentro de estado local. Caja hace lo mismo con su rango de fechas. Al recargar, compartir un enlace, abrir un detalle o usar Atrás/Adelante, el técnico pierde el recorte de trabajo que estaba consultando.

Reparaciones agrega dos dificultades: alterna tablero/lista y filtro de estado, y ya usa `?nuevo=1` para abrir el alta desde Dashboard. React Router no acumula varios `setSearchParams` en el mismo tick, por lo que dos escritores independientes pueden borrar parámetros o generar una navegación distinta de la solicitada por el guard de cambios sin guardar.

## Objetivo

La URL será la fuente de verdad del estado navegable de los listados. Volver, avanzar, recargar o compartir un enlace debe recuperar la misma búsqueda, página, orden, vista, filtro o rango de Caja, sin duplicar estado ni afectar modales y formularios protegidos.

La mejora alcanzará:

- Clientes;
- Equipos;
- Reparaciones;
- Repuestos;
- Inventario;
- Caja.

Usuarios y los sublistados sin controles quedan fuera porque actualmente no tienen búsqueda, filtros ni paginación.

## Dirección de interfaz

### Dominio

- bandeja de órdenes;
- mesa de diagnóstico;
- recorte de trabajo;
- etiqueta de estado;
- historial de consulta;
- libro de caja;
- regreso al puesto exacto.

### Mundo de color

- grafito de herramientas para estructura y texto;
- acero del banco de trabajo para bordes;
- papel marfil de la orden impresa para superficies;
- teal de alfombra antiestática para acción y foco;
- ámbar de etiqueta preventiva para filtros o rangos inválidos;
- rojo de riesgo para errores;
- verde de control aprobado para resultados correctos.

No se agregan colores ni una capa visual nueva. La mejora es de continuidad de navegación y reutiliza los tokens actuales.

### Firma

La firma será la **bandeja recuperable**: la URL representa el recorte operativo activo. Al volver a una pantalla, el técnico encuentra la misma posición y los mismos criterios, como si regresara a una orden que había dejado marcada sobre el banco.

### Defaults reemplazados

- Estado efímero duplicado en cada página → URL tipada como única fuente de verdad.
- Una entrada de historial por tecla → búsqueda con `replace` y request debounced.
- Strings arbitrarios enviados al backend → codecs y allowlists por pantalla.
- Varios escritores de `searchParams` → una transacción atómica que clona y fusiona parámetros.

### Checkpoint de componentes

- **Intent:** un técnico o encargado necesita filtrar, abrir una orden y regresar sin reconstruir su contexto; debe sentirse continuo, predecible y rápido.
- **Palette:** se conservan `primary`, `warning`, `danger`, `success`, superficies y jerarquías de texto existentes porque la persistencia no introduce un significado visual nuevo.
- **Depth:** bordes discretos y sombras suaves actuales; no cambia la elevación.
- **Surfaces:** toolbars, listados y controles conservan sus superficies actuales.
- **Typography:** se conserva Manrope y la jerarquía existente.
- **Spacing:** base de 4 px y targets móviles de 44 px ya validados.

## Enfoques considerados

### 1. Adaptar mínimamente `useListParams`

Mover `q`, `page` y `sort` a `useSearchParams` reduce el cambio inicial, pero deja a Reparaciones con un segundo escritor para `vista`, `estado` y `nuevo`. Las actualizaciones simultáneas pueden pisarse y cada página tendría validaciones distintas incrustadas en el hook.

### 2. Codec tipado y un único hook transaccional — elegido

Funciones puras parsean y serializan parámetros según una configuración explícita. Un hook compartido deriva el estado desde la URL y aplica cada interacción sobre una copia de `URLSearchParams` en una sola navegación.

Ventajas:

- URL como fuente de verdad sin efectos de sincronización bidireccional;
- validación y canonicalización comprobables de forma aislada;
- preservación de parámetros ajenos como `nuevo`;
- callbacks estables para `Pagination`, `SortSelect` y `usePageBounds`;
- reglas PUSH/REPLACE consistentes;
- extensible sin introducir un provider global.

### 3. Loaders por ruta

Los loaders podrían validar search params antes del render, pero cada tecla revalidaría la ruta y solaparía responsabilidades con React Query. El costo y el acoplamiento no se justifican para estado de presentación cliente.

## Contrato de URL

| Ruta | Parámetros navegables | Defaults omitidos |
|---|---|---|
| `/clientes` | `q`, `page`, `sort` | `q` vacío, `page=0`, `sort=nombre,asc` |
| `/equipos` | `q`, `page`, `sort` | `q` vacío, `page=0`, `sort=id,desc` |
| `/reparaciones` | `q`, `page`, `sort`, `vista`, `estado`, `nuevo` | `q` vacío, `page=0`, `sort=id,desc`, `vista=board`, `estado=TODOS` |
| `/repuestos` | `q`, `page` | `q` vacío, `page=0` |
| `/inventario` | `q`, `page` | `q` vacío, `page=0` |
| `/caja` | `desde`, `hasta` | ambos vacíos, que representan hoy |

`size=20` seguirá fijo y no se publicará porque la interfaz no ofrece un selector de tamaño. Esto evita valores no contractuales y fragmentación innecesaria de caché.

La página continuará siendo 0-based, igual que el backend. `page` aceptará únicamente enteros seguros no negativos.

## Arquitectura

### Codec puro

El núcleo definirá helpers sin React para:

- leer el primer valor efectivo de un parámetro;
- parsear página segura;
- validar enums y sorts mediante allowlists;
- omitir defaults al serializar;
- clonar y actualizar `URLSearchParams` sin mutar la referencia del router;
- conservar parámetros desconocidos;
- detectar cuándo una URL necesita canonicalización.

Los valores inválidos no llegarán a las queries. Se reemplazarán por el default correspondiente y se limpiarán de la URL mediante `replace`.

### Hook de listado

`useUrlListParams` recibirá una configuración con `size`, sort inicial y sorts permitidos. Derivará directamente:

- `q` para el control visible;
- `debouncedQ` para React Query;
- `page`;
- `size`;
- `sort`;
- setters estables.

No habrá una copia de `q`, `page` ni `sort` en `useState`. El debounce afectará únicamente el valor enviado a la consulta. Una navegación POP o una carga directa restaurará la consulta sin una espera artificial; una edición del buscador conservará los 350 ms actuales.

Cada setter realizará una única transacción:

- buscar: actualizar `q`, quitar `page` y usar `replace`;
- ordenar: actualizar `sort`, quitar `page` y usar `push`;
- paginar: actualizar `page` y usar `push`;
- corregir una página fuera de rango: actualizar `page` con `replace`;
- canonicalizar: limpiar sólo parámetros propios inválidos con `replace`.

Las navegaciones usarán `preventScrollReset` para evitar saltos al inicio mientras se cambia el criterio dentro de la misma pantalla.

### Historial híbrido

- La escritura de búsqueda usa `replace`, evitando una entrada por cada tecla.
- Página, orden, estado, vista y fechas son decisiones explícitas y usan `push`.
- Back/Forward restaura controles y consulta desde la URL.
- Correcciones automáticas nunca agregan historial.

### Estado adicional de Reparaciones

Reparaciones extenderá el contrato base con:

- `vista`: `board` o `list`;
- `estado`: `TODOS` o uno de los estados contractuales;
- `nuevo`: sólo el valor `1` abre el alta desde una URL.

`q` afecta tablero y lista. `page`, `sort` y `estado` se conservan al alternar vistas para que volver a Lista recupere su posición. Cambiar estado reinicia la página en la misma transacción.

El flujo `?nuevo=1` seguirá estas reglas:

- cualquier cambio del listado preserva `nuevo`;
- cerrar elimina únicamente `nuevo` mediante una copia y `replace`;
- un valor distinto de `1` se limpia sin abrir el formulario;
- descartar por una navegación bloqueada deja que el blocker complete el destino sin ejecutar un segundo cambio de URL;
- crear desde `?nuevo=1` navega al detalle con `replace`, evitando que Atrás reabra un alta vacía;
- crear desde el botón local navega al detalle con `push`, permitiendo volver al listado filtrado.

### Caja

Caja leerá `desde` y `hasta` directamente de la URL.

- Cada fecha válida usa `push`.
- “Hoy” elimina ambas fechas en una sola navegación.
- Se aceptan fechas ISO reales `YYYY-MM-DD`.
- Un formato inválido se elimina con `replace`.
- Un rango ISO válido pero invertido permanece visible, muestra el error actual y mantiene la query deshabilitada para que el usuario pueda corregirlo.

## Privacidad y seguridad

La búsqueda pasa a formar parte de la URL y, por decisión de producto, puede quedar en historial o enlaces compartidos. Esto permite recuperar búsquedas por nombre, teléfono, IMEI, equipo o problema.

No se persistirán datos de formularios, PIN, patrón, contraseñas, fotos ni credenciales. El codec sólo reconoce parámetros de navegación. Los valores siguen requiriendo una sesión válida para consultar información del taller.

## Errores y casos límite

- `page` decimal, negativo, infinito, duplicado o fuera del rango seguro vuelve a 0.
- Un sort, estado o vista fuera de su allowlist vuelve al default sin llegar al backend.
- Una página válida que dejó de existir se corrige con metadata asentada y `replace`.
- Los parámetros desconocidos se conservan para compatibilidad y para no borrar `nuevo`.
- Búsqueda, orden o estado reinician página atómicamente.
- Cambios de URL no generan efectos circulares porque no existe una segunda copia local.
- Un guard de cambios sin guardar conserva la autoridad sobre su navegación bloqueada.

## Pruebas

### Codec y hook

- defaults omitidos;
- parseo de página y fechas;
- allowlists de sort, vista y estado;
- preservación de parámetros desconocidos;
- canonicalización mediante replace;
- búsqueda debounced con replace;
- cambios explícitos con push;
- actualización atómica que reinicia página;
- Back/Forward y carga directa;
- setters estables y corrección de límites.

### Integración

- Clientes y Equipos restauran búsqueda, orden y página;
- Repuestos e Inventario restauran búsqueda y página;
- Reparaciones restaura vista, estado, búsqueda, orden y página sin perder `nuevo`;
- Caja restaura fechas, valida ISO y conserva el error de rango invertido;
- las queries reciben sólo valores normalizados.

### E2E

- deep link y recarga conservan la vista;
- detalle → Atrás devuelve al listado exacto;
- Back/Forward recorre página, orden, filtro, vista y fechas;
- escribir varias teclas no agrega varias entradas;
- parámetros inválidos se limpian;
- `?nuevo=1` convive con filtros y no se reabre después de crear;
- 320 px, 390 px, landscape y WebKit conservan la matriz móvil existente.

## Entrega y commits

La implementación se separará en commits atómicos para:

1. diseño aprobado;
2. plan técnico;
3. codec y hook con pruebas;
4. listados estándar;
5. Reparaciones y `?nuevo=1`;
6. Caja;
7. E2E, regresión y cierre documental.

No se hará push. `.agents/` y `public/OrdenFix project naming/` seguirán fuera de los commits.

## Fuera de alcance

- selector de tamaño de página;
- persistencia de modales locales o entidades seleccionadas;
- listados sin controles en Usuarios, Dashboard o fichas;
- cambios del contrato backend;
- autosave o persistencia de formularios;
- carga incremental del Kanban.

## Criterios de aceptación

- Recargar, compartir o volver restaura el estado navegable de las seis pantallas.
- La URL es la única fuente de verdad y no existen efectos de sincronización bidireccional.
- Parámetros inválidos nunca llegan al backend.
- Defaults se omiten y la URL queda canónica.
- Buscar no contamina el historial; decisiones explícitas sí son navegables.
- Las actualizaciones preservan parámetros desconocidos y `nuevo=1`.
- Una página fuera de rango se corrige sin agregar historial.
- El alta desde Dashboard no se reabre al volver desde un detalle creado.
- El guard de cambios sin guardar conserva el destino original.
- Tests, TypeScript, lint, build y Playwright quedan verdes.
- Sólo se versionan archivos del alcance y no se hace push.
