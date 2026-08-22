# Plan de implementación — Protección completa de formularios con cambios sin guardar

**Fecha:** 2026-08-22  
**Diseño aprobado:** `docs/plans/2026-08-22-unsaved-form-protection-design.md`  
**Rama:** `codex/frontend-refactor-checkpoint`  
**Estado:** Listo para implementar

## Objetivo

Implementar una protección uniforme contra la pérdida accidental de cambios en los diez formularios operativos de OrdenFix. La solución debe cubrir cierres locales, navegación SPA, historial del navegador y recarga/cierre de pestaña; conservar los valores ante errores; permitir el cierre inmediato cuando el formulario está limpio; y no mostrar confirmaciones después de un éxito.

El trabajo se entregará en commits atómicos y no se hará push.

## Restricción técnica descubierta

React Router 7.9.6 registra cada llamada a `useBlocker`, incluso si recibe `false`, y el router sólo soporta correctamente un blocker a la vez. `ReparacionDetallePage` mantiene montados varios formularios cerrados en paralelo, por lo que llamar el hook incondicionalmente desde todos ellos produciría advertencias y permitiría que el último blocker registrado reemplace al formulario realmente activo.

La integración seguirá estas reglas:

- cada formulario que recibe `isOpen` conservará un wrapper exportado;
- el wrapper devolverá `null` cuando esté cerrado;
- sólo al estar abierto montará un componente interno que llama `useUnsavedChangesGuard`;
- nunca se llamará un hook de forma condicional dentro del mismo componente;
- `AjusteStockModal` ya es montado condicionalmente por su página y puede usar el hook en su sesión activa;
- se mantendrá la premisa existente de un solo editor operativo abierto a la vez;
- no se usará `unstable_usePrompt`, porque no ofrece un control confiable de intentos repetidos de atrás/adelante;
- no se introducirá un registro o provider global de borradores.

Los tests de formularios deberán usar un Data Router creado con `createMemoryRouter` y `RouterProvider`; `MemoryRouter` por sí solo no satisface el contrato de `useBlocker`.

## Contrato común

La sesión activa del guard recibe:

- `isDirty`: cambios respecto de la base inicial;
- `isBusy`: mutación o subida crítica en curso;
- `onClose`: cierre definitivo del formulario;
- copy opcional para una situación especial.

La sesión expone:

- `requestClose`: única entrada de Cancelar, X, Escape y backdrop;
- `commitAndClose`: libera de manera síncrona el guard antes de cerrar después de un éxito;
- estado de suspensión del modal inferior;
- props y acciones del diálogo de descarte.

Reglas de ciclo de vida:

1. Si no hay cambios ni una operación crítica, `requestClose` cierra inmediatamente.
2. Si hay cambios, abre una intención de cierre local y la confirmación.
3. Si existe una navegación bloqueada, el router conserva su destino; continuar editando hace `reset()` y descartar hace `proceed()`.
4. Una nueva intención no reemplaza otra mientras la confirmación está abierta.
5. `commitAndClose` marca una referencia de liberación antes de `onClose` o de cualquier `navigate` del mismo tick.
6. Si dirty vuelve legítimamente a `false`, una intención pendiente se cancela de forma segura; nunca se navega por sorpresa.
7. Mientras `isBusy`, la navegación y `beforeunload` siguen protegidos, y la acción destructiva no puede interrumpir la operación.
8. Los métodos de `blocker` sólo se llaman después de estrechar su estado a `blocked`.
9. Al desmontar se eliminan listeners y el blocker activo.
10. No se serializan ni persisten valores del formulario.

## Tarea 1 — Fundación del guard y entorno de pruebas

### Archivos

- Crear `src/hooks/useUnsavedChangesGuard.ts`.
- Crear `src/hooks/useUnsavedChangesGuard.test.tsx`.
- Crear `src/test/renderWithProviders.tsx`.

### Implementación

- Modelar la intención como una unión discriminada local/navegación.
- Mantener una `releasedRef` sincrónica para evitar prompts después de un éxito cuando `isPending` todavía no se actualizó.
- Usar `useBlocker` para PUSH, REPLACE y POP dentro del Data Router.
- Usar `useBeforeUnload` con `preventDefault()` y `returnValue` sólo cuando la sesión deba proteger.
- Capturar el elemento que originó el intento local para restaurar foco al continuar editando.
- Hacer estables los callbacks públicos para no reinstalar lógica por cada render.
- No reconstruir URLs: conservar el destino del blocker del router.
- Crear un helper de tests que envuelva UI con `QueryClientProvider`, `createMemoryRouter` y `RouterProvider`, y permita configurar ruta inicial y rutas auxiliares.

### Pruebas focales

- formulario limpio cierra sin confirmar;
- cierre local sucio abre la intención correcta;
- continuar conserva valores y cancela la intención;
- descartar ejecuta exactamente un cierre;
- link/PUSH, REPLACE y atrás/adelante quedan bloqueados;
- continuar hace reset y descartar llega al destino original;
- un segundo intento no reemplaza el primero;
- busy bloquea y no permite descartar una operación;
- `commitAndClose` evita un prompt espurio aunque busy siga true ese render;
- dirty que vuelve a false cancela el bloqueo sin navegar;
- `beforeunload` se previene sólo mientras corresponde;
- desmontar limpia la protección;
- varios wrappers cerrados y uno abierto no generan la advertencia de múltiples blockers.

### Verificación

```bash
npm test -- src/hooks/useUnsavedChangesGuard.test.tsx
npm run typecheck
```

Esta tarea comparte commit con la Tarea 2 porque el hook y su diálogo forman una única unidad utilizable.

## Tarea 2 — Diálogo de descarte y Modal apilable

### Archivos

- Crear `src/components/DiscardChangesDialog.tsx`.
- Crear `src/components/DiscardChangesDialog.test.tsx`.
- Modificar `src/components/Modal.tsx`.
- Modificar `src/components/Modal.test.tsx`.

### Implementación de `Modal`

- Agregar un modo `suspended` neutral respecto de dirty state.
- Cuando el modal inferior está suspendido:
  - mantenerlo visible como contexto;
  - aplicar `inert` y `aria-hidden`;
  - retirar temporalmente su semántica de diálogo;
  - desactivar Escape, Tab/focus trap, backdrop y X;
  - evitar que robe o restaure foco mientras la confirmación está arriba.
- Agregar foco inicial explícito para el diálogo superior.
- Soportar una capa visual superior para el guard sin competir con el modal de límite de plan.
- Hacer el bloqueo de scroll del body seguro para dos modales simultáneos mediante conteo de instancias, restaurando los estilos cuando cierra la última.
- Mantener compatibles todos los usos actuales de `Modal`.

### Implementación de `DiscardChangesDialog`

- Renderizarlo como hermano posterior del modal del formulario, nunca anidado dentro de él.
- Usar título “¿Descartar los cambios?”.
- Usar mensaje “Los datos que modificaste todavía no se guardaron.”.
- Enfocar inicialmente “Seguir editando”.
- Usar “Descartar cambios” como acción destructiva.
- Hacer que Escape y backdrop equivalgan a seguir editando.
- Deshabilitar o impedir la acción destructiva mientras una operación crítica está pendiente.
- Permitir copy seguro alternativo para la reparación parcial.
- Conectar el mensaje mediante `aria-describedby`.
- Garantizar botones de al menos 44 px y distribución contenida a 320 px.

### Pruebas focales

- sólo queda un elemento con rol `dialog` cuando la confirmación está abierta;
- el modal inferior queda `inert`, oculto a asistencia e inactivo;
- el modal suspendido no responde a Escape, Tab, backdrop ni X;
- “Seguir editando” recibe foco inicial;
- Tab queda contenido en la confirmación;
- Escape y backdrop llaman sólo a continuar;
- descartar llama sólo a la acción destructiva;
- continuar devuelve el foco al elemento que inició el intento;
- descartar no refocaliza el formulario antes de una navegación;
- abrir/cerrar dos modales libera correctamente el scroll del body en cualquier orden;
- el diálogo no desborda a 320/390 px.

### Verificación y commit

```bash
npm test -- src/hooks/useUnsavedChangesGuard.test.tsx src/components/Modal.test.tsx src/components/DiscardChangesDialog.test.tsx
npm run typecheck
npm run lint
```

Commit esperado:

```text
feat(forms): agrega guardia y diálogo de descarte
```

## Tarea 3 — Formularios RHF estándar

### Archivos

- `src/components/ClienteFormModal.tsx` y su test.
- `src/components/EquipoFormModal.tsx` y su test.
- `src/components/RepuestoFormModal.tsx` y su test.
- `src/components/ArticuloFormModal.tsx` y su test.
- `src/components/UsuarioFormModal.tsx` y su test.
- `src/components/PresupuestoFormModal.tsx` y su test.
- `src/components/CobroFormModal.tsx` y su test.

### Patrón de integración

- Separar wrapper cerrado y sesión interna activa para registrar un solo blocker.
- Tomar `formState.isDirty` como fuente de verdad.
- Conservar cada `reset` de apertura como baseline limpio.
- Conectar `requestClose` a `Modal.onClose`, X, Escape, backdrop y Cancelar.
- Pasar el estado de confirmación a `Modal.suspended`.
- Renderizar `DiscardChangesDialog` como hermano.
- Reemplazar cada cierre posterior a éxito por `commitAndClose`.
- No liberar el guard en validación inválida ni error de API.
- Migrar los helpers de test de estos formularios al Data Router compartido.

### Contratos particulares

- Cliente: busy es create o update.
- Equipo: la búsqueda remota no marca dirty; seleccionar cliente sí. `defaultCliente` y edición forman parte del baseline.
- Repuesto: el autofill de inventario ya debe seguir marcando dirty; una relación bloqueada pertenece al baseline.
- Artículo: stock inicial sólo aplica al alta; valores ocultos al editar no crean un falso positivo.
- Empleado: nunca copiar la contraseña al diálogo, logs o snapshots; busy es create.
- Presupuesto: append, remove y edición de `useFieldArray` cuentan como cambios; la fila inicial y siete días por defecto son baseline.
- Cobro: saldo sugerido y EFECTIVO son baseline. Evitar que un cambio/refetch de saldo mientras el usuario edita ejecute un reset que pise dirty.

### Pruebas por formulario

- abrir no muestra prompt;
- editar un valor sí protege;
- volver exactamente al valor inicial elimina la protección cuando RHF lo reporta limpio;
- continuar editando conserva el valor;
- descartar cierra;
- error de submit conserva valor y protección;
- éxito cierra sin confirmación;
- búsquedas de combobox no cuentan como cambios, pero una selección sí;
- presupuesto cubre filas agregadas/eliminadas;
- cobro conserva edición ante un refetch de datos relacionados.

### Verificación y commit

```bash
npm test -- src/components/ClienteFormModal.test.tsx src/components/EquipoFormModal.test.tsx src/components/RepuestoFormModal.test.tsx src/components/ArticuloFormModal.test.tsx src/components/UsuarioFormModal.test.tsx src/components/PresupuestoFormModal.test.tsx src/components/CobroFormModal.test.tsx
npm run typecheck
npm run lint
```

Commit esperado:

```text
feat(forms): protege formularios operativos estándar
```

## Tarea 4 — Reparación y formularios con estado manual

### Archivos

- `src/components/ReparacionFormModal.tsx` y su test.
- `src/components/AjusteStockModal.tsx` y su test.
- `src/components/ReclamoGarantiaModal.tsx` y un test nuevo.

### Reparación

- Dirty será `formState.isDirty || Boolean(ingresoRapidoPendiente)`.
- Busy incluirá create, update, ingreso rápido, completar ingreso rápido y ambas subidas de fotos.
- El cambio manual de modo usará `shouldDirty: true`.
- Todos los branches exitosos liberarán el guard antes de `onClose` y `onCreated`.
- Si el POST de ingreso rápido creó la orden pero el PUT de detalles falló:
  - conservar el estado parcial y la protección;
  - no repetir el POST al reintentar;
  - explicar que la orden ya existe y no será eliminada ni duplicada;
  - explicar que sólo se perderán los detalles locales no guardados;
  - usar una acción explícita “Cerrar y completar después”.
- PIN, patrón, fotos y sus valores nunca aparecerán en el copy del diálogo, logs ni almacenamiento.
- Un error de entrega mantiene guard y valores, respetando la limpieza de credenciales efímeras que exija seguridad.

### Ajuste de stock

- Dirty manual será tipo distinto de `entrada`, cantidad escrita o motivo no vacío después de trim.
- Estado de error e intento de envío no cuentan como cambios.
- Enter seguirá ejecutando submit.
- Validación inválida no libera; éxito libera y cierra.

### Reclamo en garantía

- Dirty manual será descripción no vacía después de trim.
- Separar el reset actual del simple intento de cierre.
- `requestClose` no borrará la descripción antes de confirmar.
- Sólo descarte confirmado o éxito limpian el estado.
- En éxito: liberar, cerrar/limpiar y luego navegar a la reparación creada.

### Pruebas focales

- reparación protege modo, campos, selecciones, fotos y estado parcial;
- POST rápido ocurre una vez y el reintento parcial sólo ejecuta PUT;
- copy parcial no contiene credenciales ni URLs/nombres de fotos;
- busy de subida impide descarte y navegación;
- éxito con `onCreated`/navigate en el mismo tick no muestra prompt;
- ajuste detecta cada cambio manual y no confunde errores con dirty;
- reclamo conserva descripción al cancelar el descarte;
- reclamo limpia sólo después de descartar o guardar;
- los tres conservan datos y protección ante error.

### Verificación y commit

```bash
npm test -- src/components/ReparacionFormModal.test.tsx src/components/AjusteStockModal.test.tsx src/components/ReclamoGarantiaModal.test.tsx
npm run typecheck
npm run lint
```

Commit esperado:

```text
fix(forms): protege reparación parcial y formularios manuales
```

## Tarea 5 — E2E desktop, móvil y cierre documental

### Archivos

- Crear `e2e/unsaved-forms.spec.ts`.
- Crear `e2e/unsaved-forms.mobile.spec.ts`.
- Modificar `e2e/helpers.ts` sólo si hace falta un fixture reutilizable.
- Actualizar este plan con resultados y decisiones finales si la implementación obliga a desviarse.

### Escenarios desktop

- X, Cancelar, Escape y backdrop abren la misma confirmación.
- Seguir editando conserva el valor y foco.
- Descartar cierra el modal.
- Un link interno y volver atrás conservan el destino original hasta decidir.
- Continuar cancela navegación; descartar llega al destino solicitado.
- Un guardado exitoso no muestra diálogo espurio.
- Un error de API deja formulario y guard activos.
- Reparación parcial avisa que la orden ya existe.

### Escenarios móvil

- Ejecutar a 320, 390, landscape y WebKit según la matriz existente.
- Confirmación dentro del viewport visual, sin overflow horizontal.
- Acciones visibles, safe area respetada y targets de 44 px.
- Sólo la confirmación recibe foco/interacción mientras el form inferior está inert.
- Escape/continuar conserva valores y restaura foco.
- Descartar permite cerrar o completar navegación.

`beforeunload` se valida de forma unitaria porque el texto y la interacción del aviso nativo no son deterministas entre motores.

### Regresión completa

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
git diff --check
git status --short
```

### Commit esperado

```text
test(e2e): cubre descarte y navegación protegida
```

Si sólo se actualizan resultados/documentación después de la regresión, usar un commit documental separado.

## Criterios de salida

- Los diez formularios operativos quedan protegidos.
- Existe exactamente un blocker del router y un diálogo accesible activo.
- Cierre limpio y éxito siguen siendo inmediatos.
- Error, validación inválida y operación parcial conservan datos y guard.
- Busy no se puede interrumpir ni queda como navegación encolada silenciosamente.
- Atrás/adelante, links internos y `beforeunload` están cubiertos.
- El foco y el scroll se restauran en desktop y móvil.
- No se persisten ni exponen datos sensibles.
- Tests unitarios/integración, TypeScript, lint, build y Playwright quedan verdes.
- Sólo se versionan archivos del alcance; `.agents/` y `public/OrdenFix project naming/` permanecen fuera.
- No se hace push.
