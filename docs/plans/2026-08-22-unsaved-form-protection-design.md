# Diseño — Protección completa de formularios con cambios sin guardar

**Fecha:** 2026-08-22  
**Estado:** Aprobado

## Contexto

Los formularios operativos de OrdenFix sólo impiden cerrar sus modales mientras una mutación o una subida está pendiente. Antes de guardar, Escape, backdrop, el botón X, Cancelar, una navegación interna, volver atrás o recargar la pestaña pueden descartar silenciosamente datos ya escritos.

El riesgo es mayor en la reparación: el formulario puede contener datos de cliente y equipo, diagnóstico, precios, fechas, fotos, riesgos de ingreso y credenciales efímeras. En móvil, un toque accidental fuera del panel puede borrar varios minutos de trabajo.

## Objetivo

Todo formulario operativo activo debe detectar cambios reales y pedir confirmación antes de perderlos, sin interferir con un cierre limpio ni con un guardado exitoso.

La protección alcanzará:

- cliente;
- equipo;
- reparación;
- repuesto;
- artículo de inventario;
- empleado;
- presupuesto;
- cobro;
- ajuste de stock;
- reclamo en garantía.

Login y registro quedan fuera: son flujos breves de autenticación y no forman parte de la operación autenticada del taller.

## Enfoques considerados

### 1. Hook compartido por formulario — elegido

Un hook recibe estado neutral (`isDirty`, `isOpen`, `isBusy`) y coordina cierre local, navegación del router y `beforeunload`. Cada formulario conserva la propiedad de sus datos y decide cómo calcular `dirty`.

Ventajas:

- no acopla `Modal` a React Hook Form;
- evita falsos positivos en modales informativos;
- permite cubrir formularios con estado manual;
- hace explícitos los casos especiales de reparación;
- se prueba de forma aislada.

### 2. Protección dentro de `Modal`

Reduce cableado, pero obliga al componente visual genérico a conocer dirty state, router, `beforeunload` y guardado. También afectaría confirmaciones y modales sin formulario.

### 3. Registro global de borradores

Un provider podría coordinar múltiples formularios, pero agrega ownership, limpieza y concurrencia que la aplicación todavía no necesita. No habrá autosave ni múltiples editores simultáneos.

## Arquitectura

### Hook neutral

`useUnsavedChangesGuard` será independiente de React Hook Form y recibirá:

- `isDirty`: hay cambios locales respecto del estado inicial;
- `isOpen`: el formulario está activo y puede bloquear;
- `isBusy`: existe una mutación o subida crítica en curso;
- `onClose`: cierre definitivo del formulario;
- copy opcional para el caso parcial de reparación.

Expondrá:

- `requestClose`: entrada única para Cancelar, X, Escape y backdrop;
- estado y handlers del diálogo de descarte;
- `commitAndClose` o una liberación equivalente para cerrar después de un éxito sin disparar la confirmación;
- estado de suspensión accesible del formulario inferior.

El hook no guarda valores de campos. Sólo coordina intenciones de cierre/navegación y referencias de control.

### Cierre local

1. Sin cambios, `requestClose` llama `onClose` inmediatamente.
2. Con cambios, registra una intención local y abre la confirmación.
3. “Seguir editando” cancela la intención.
4. “Descartar cambios” libera el guard una vez y ejecuta `onClose`.

Todos los puntos de cierre del modal y el botón Cancelar usarán el mismo `requestClose`.

### Navegación interna

`useBlocker` interceptará enlaces, botones de navegación, atrás/adelante del navegador y llamadas a `navigate` mientras el formulario esté abierto y sucio.

- “Seguir editando” ejecuta `blocker.reset()`.
- “Descartar cambios” ejecuta `blocker.proceed()`.
- La ruta solicitada permanece bajo control del router; el hook no reconstruye URLs manualmente.
- Una operación crítica pendiente no puede descartarse ni quedar encolada silenciosamente.

### Recarga o cierre de pestaña

`useBeforeUnload`/`beforeunload` se registrará únicamente mientras el formulario esté abierto y sucio. El navegador mostrará su aviso nativo; su texto no se puede personalizar de forma confiable.

No se usarán `localStorage`, `sessionStorage` ni IndexedDB. La protección evita el descarte accidental, pero no persiste borradores.

### Guardado exitoso y fallido

- Antes de cerrar o navegar por un éxito confirmado, el formulario libera el guard de forma explícita.
- Un error de mutación conserva `isDirty`, valores, foco y protección.
- Mientras `isBusy`, se conservan las restricciones actuales de `preventClose` y también se bloquea la navegación interna.
- La recarga/cierre de pestaña continúa protegida durante una operación no confirmada.

## Interfaz y accesibilidad

Se creará una confirmación específica de descarte con:

- título “¿Descartar los cambios?”;
- mensaje “Los datos que modificaste todavía no se guardaron.”;
- acción segura “Seguir editando”, enfocada inicialmente;
- acción destructiva “Descartar cambios”.

Escape y backdrop sobre la confirmación equivalen a seguir editando.

Mientras la confirmación está abierta:

- el formulario inferior permanece visible como contexto, pero queda `inert` y fuera del árbol accesible;
- sólo existe un diálogo activo para tecnologías de asistencia;
- el foco queda contenido en la confirmación;
- al continuar, vuelve al control o acción que intentó cerrar;
- al descartar, el modal original restaura el foco según su comportamiento normal.

En móvil se mantienen targets de 44 px, safe areas, ancho contenido en el viewport y texto de controles legible. No se introduce una segunda navegación ni un toast redundante.

## Integración por tipo de formulario

### React Hook Form

Cliente, equipo, reparación, repuesto, artículo, empleado, presupuesto y cobro usarán `formState.isDirty`.

- Cada `reset` de apertura establece la nueva base limpia.
- Cambios que vuelven exactamente al valor inicial dejan de considerarse sucios según React Hook Form.
- Los valores cargados asincrónicamente por selección o autofill cuentan como cambios cuando corresponda.

### Estado manual

Ajuste de stock y reclamo en garantía calcularán dirty sin migrarse forzosamente a React Hook Form:

- ajuste: tipo distinto del default, cantidad escrita o motivo escrito;
- reclamo: descripción no vacía respecto de la apertura.

### Reparación parcial

Si el ingreso rápido ya creó cliente, equipo y reparación pero falló la actualización de detalles, la confirmación usará copy específico:

- la orden ya existe;
- no se elimina ni se duplica;
- sólo se perderán los detalles locales todavía no guardados;
- “Cerrar y completar después” sigue siendo posible, pero es una decisión confirmada.

PIN, patrón y fotos no se copian al diálogo, logs, analytics ni almacenamiento persistente.

## Errores y concurrencia

- No se abre más de una confirmación por intención.
- Una nueva intención mientras el diálogo está abierto no reemplaza el destino bloqueado.
- Si el componente deja de estar sucio por un `reset` legítimo, cualquier bloqueo pendiente se libera de forma segura.
- Si el formulario se desmonta, se eliminan listeners de `beforeunload` y bloqueos del router.
- Logout o expiración de sesión gestionados por seguridad no deben quedar atrapados por un guard obsoleto después del desmontaje.
- Una mutación en curso no puede interrumpirse con “Descartar cambios”.

## Pruebas

### Unitarias del hook

- cierre inmediato cuando está limpio;
- confirmación para cierre local sucio;
- seguir editando y descartar;
- navegación interna bloqueada, reset y proceed;
- atrás/adelante;
- `beforeunload` sólo cuando corresponde;
- operación pendiente;
- liberación tras éxito;
- limpieza al desmontar.

### Componente de confirmación y Modal

- un solo diálogo accesible;
- formulario inferior inert/oculto para asistencia;
- foco inicial seguro;
- Escape y backdrop;
- restauración de foco;
- targets y viewport móvil.

### Integración

- `reset` inicial no dispara aviso;
- editar un campo sí lo dispara;
- revertir cambios elimina el aviso;
- error de guardado conserva protección;
- éxito cierra sin aviso;
- estado manual de stock y garantía;
- fotos, credenciales e ingreso rápido parcial de reparación.

### E2E

- conservar valores con “Seguir editando”;
- descartar y completar la navegación solicitada;
- botón X, Cancelar, Escape y backdrop;
- volver atrás con el historial;
- confirmación dentro del viewport a 320/390 px y WebKit móvil;
- guardado exitoso sin prompt espurio.

## Entrega y commits

La implementación se separará en commits atómicos para:

1. diseño y plan;
2. hook, diálogo y suspensión accesible;
3. formularios estándar;
4. reparación y formularios con estado manual;
5. E2E, regresión y cierre documental.

No se hará push. `.agents/` y los assets de naming ajenos al alcance seguirán fuera de los commits.

## Fuera de alcance

- autosave o recuperación de borradores después de cerrar la pestaña;
- persistir PIN, patrón, fotos o cualquier valor del formulario;
- proteger login y registro;
- colaboración multiusuario o bloqueo de edición concurrente;
- persistencia de filtros/listados en URL;
- carga incremental del Kanban.

## Criterios de aceptación

- Ningún formulario operativo sucio puede cerrarse o abandonar su ruta sin confirmación.
- Un formulario limpio conserva el cierre actual sin pasos adicionales.
- Guardar con éxito nunca muestra una confirmación espuria.
- Un fallo de guardado mantiene datos y protección.
- Navegación interna, atrás/adelante y `beforeunload` están cubiertos.
- Sólo un diálogo queda activo y el foco se restaura correctamente.
- Operaciones pendientes no pueden interrumpirse.
- No se persisten datos sensibles ni borradores.
- La suite completa, TypeScript, lint, build y Playwright permanecen verdes.
