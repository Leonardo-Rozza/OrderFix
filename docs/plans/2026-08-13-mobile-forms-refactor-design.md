# Refactor integral de formularios y experiencia móvil

Fecha: 2026-08-13

## Contexto

OrdenFix concentra la mayor parte de sus altas y ediciones en formularios dentro de modales. La auditoría encontró catorce formularios explícitos, además de búsquedas, filtros de fecha, selectores y acciones relacionadas. En viewports de 320 × 568 y 390 × 844 se reprodujeron controles demasiado pequeños, acciones fuera de vista, contenido recortado y layouts que conservan anchos de escritorio.

También se detectaron fallas funcionales relacionadas con fechas UTC, cargas de fotos, altas parciales, invalidación de caché, asociación de repuestos, validaciones y acciones dependientes de `hover`.

## Objetivos

- Mantener prácticamente intacta la experiencia visual de escritorio.
- Dar a todos los formularios una estructura móvil consistente y estable.
- Evitar zoom automático, desbordes y controles difíciles de tocar.
- Mantener visibles o fácilmente alcanzables las acciones principales.
- Corregir los bugs funcionales encontrados durante la auditoría.
- Agregar cobertura automatizada para los escenarios móviles críticos.

## Fuera de alcance

- Rediseñar por completo la navegación de escritorio.
- Cambiar la identidad visual, la paleta o la arquitectura de datos del producto.
- Reemplazar React Hook Form, Zod, React Query o Tailwind.
- Incorporar funcionalidades nuevas ajenas a los flujos actuales.

## Dirección de interfaz

### Dominio

- Orden de trabajo.
- Mesa de diagnóstico.
- Checklist de ingreso.
- Bandeja de repuestos.
- Etiquetas de estado y riesgo.
- Entrega, recibo y garantía.

### Mundo de color

- Grafito y acero de herramientas para estructura.
- Blanco de mesa de trabajo para superficies.
- Verde teal de alfombra antiestática para acciones principales.
- Ámbar de etiqueta preventiva para advertencias.
- Verde de equipo terminado para éxito.
- Rojo de riesgo o daño para errores y acciones destructivas.

Se conserva la paleta existente porque ya representa correctamente este mundo.

### Firma

En móvil, cada formulario se comportará como una orden de trabajo: encabezado estable, secciones claras, un único cuerpo desplazable y una zona de acciones persistente. Esta firma aparecerá en altas, ediciones, presupuestos, cobros, inventario y garantías.

### Defaults reemplazados

- Modal centrado de escritorio en teléfono → panel inferior adaptable, con altura dinámica.
- Grillas rígidas de dos columnas → flujo de una columna hasta que haya ancho real.
- Acciones visibles sólo con `hover` → controles táctiles visibles o menú explícito.
- Botones al final de formularios extensos → zona de acciones persistente.

## Arquitectura de la solución

### 1. Primitivas compartidas

`Modal` será un panel flex con:

- `100dvh` y safe areas en móvil.
- Presentación inferior y bordes superiores redondeados en móvil.
- Presentación centrada actual desde `sm`.
- Encabezado que no se encoge.
- Cuerpo `min-h-0`, con un único scroll y `overscroll-contain`.
- Título flexible y cierre con área táctil mínima de 44 px.
- Opción para impedir cierres accidentales mientras se guarda o sube contenido.

Se incorporará una primitiva compartida para las acciones de formulario. En móvil será persistente, apilada y respetará el safe area; en escritorio conservará la fila alineada a la derecha.

### 2. Controles

- Inputs, selects, textareas, buscadores y botones tendrán al menos 44 px de alto en móvil.
- El texto editable será de 16 px en móvil y volverá a la densidad actual desde `sm`.
- Se normalizarán `focus-visible`, estados deshabilitados y `min-w-0`.
- `FormField` conservará y propagará `aria-invalid`, `aria-describedby` y `aria-required`.
- `MoneyInput` y `Combobox` aceptarán los atributos ARIA necesarios.

### 3. Combobox y fotos

El `Combobox` calculará si debe abrir hacia arriba o hacia abajo dentro del espacio visible. La lista tendrá altura dinámica, scroll contenido y no cerrará el modal al procesar Escape. En móvil, opciones y buscador usarán targets táctiles adecuados.

`FotoUploader` mantendrá la última lista de URLs durante subidas asíncronas, impedirá carreras entre quitar y agregar, comunicará su estado de carga al formulario y no permitirá guardar mientras haya fotos pendientes.

### 4. Adaptación de formularios

- Cliente, equipo, empleado, cobro y garantía usarán acciones compartidas y controles normalizados.
- Reparación mantendrá secciones compactas y un CTA persistente.
- Presupuesto convertirá cada ítem en una tarjeta móvil: detalle arriba; cantidad, precio y eliminación debajo; layout horizontal sólo desde `sm`.
- Artículo y repuesto evitarán grillas forzadas de dos columnas en 320 px.
- Ajuste de stock será un formulario real, validará enteros y evitará stock negativo.
- Login, registro y recuperación vincularán labels/errores correctamente y usarán altura dinámica.
- Buscadores y filtros de fecha usarán las mismas medidas táctiles.

### 5. Correcciones funcionales

- Generar fechas por calendario local, no mediante UTC.
- Hacer reintentable el segundo paso del alta rápida sin crear duplicados.
- Invalidar las consultas afectadas por cobros y repuestos.
- Permitir asociar un repuesto global a una reparación disponible.
- Validar el rango de Caja antes de consultar.
- Limitar transiciones de estado a las permitidas o mostrar el error de conflicto de forma accionable.
- Recortar valores de texto obligatorios para no aceptar sólo espacios.
- Hacer visibles en pantallas táctiles las acciones hoy dependientes de `hover`.

## Flujo de datos y errores

- Las mutaciones conservarán React Query como única fuente de estado remoto.
- Cada mutación invalidará las claves que muestran datos derivados del recurso modificado.
- Los formularios permanecerán abiertos si falla una operación y conservarán sus datos.
- En flujos de dos pasos se guardará el identificador ya creado para reintentar únicamente el paso fallido.
- No se permitirá cerrar ni reenviar mientras una operación crítica esté pendiente.
- Los errores de validación quedarán asociados al control y los errores remotos seguirán apareciendo mediante toast.

## Verificación

### Unitarios e integración

- Fecha local cerca del cambio UTC.
- Reintento del segundo paso de alta rápida.
- Carrera agregar/quitar fotos.
- Edición intermedia y pegado en `MoneyInput`.
- ARIA de controles compuestos.
- Enteros y stock negativo.
- Invalidación de caché de cobros y repuestos.

### E2E responsive

- 320 × 568 y 390 × 844.
- Sin overflow horizontal.
- Modal contenido en el viewport.
- CTA alcanzable y persistente.
- Combobox visible cerca de los bordes y Escape limitado al desplegable.
- Formularios principales navegables y enviables.
- Acciones de editar, eliminar y anular visibles en modo táctil.

La suite de escritorio se mantendrá como protección contra regresiones. Se corregirá la expectativa de fecha fija del archivo exportado.

## Criterios de aceptación

- Ningún formulario genera overflow horizontal a 320 px.
- Los campos editables no provocan zoom automático en iOS.
- Todos los targets principales tienen al menos 44 × 44 px en móvil.
- Los modales usan un solo scroll y mantienen accesible la acción principal.
- El teclado y los desplegables no recortan controles críticos.
- No se pierden ni duplican datos al reintentar operaciones parciales.
- Lint, typecheck, unitarios y E2E de escritorio/móvil quedan en verde.

