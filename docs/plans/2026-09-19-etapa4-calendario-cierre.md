# Etapa 4 — Calendario compartido

Fecha: 2026-09-19. Estado: cerrada en local, sin publicación.

## Resultado

Los cuatro campos de fecha usan `DateInput`: Desde/Hasta en Cobros, Fecha de
ingreso y Entrega estimada en Reparación. La fecha se muestra y escribe como
`dd/mm/aaaa`; al escribir sólo números se agregan los separadores. Los valores
confirmados siguen usando `YYYY-MM-DD` en la API y la URL.

El calendario está en español, comienza la semana en lunes y permite cambiar mes
y año, seleccionar un día, elegir Hoy o limpiar el campo. Usa los tokens de color,
tipografía, bordes, foco y selects compartidos del proyecto. Distingue hoy, fecha
seleccionada y días deshabilitados.

El campo conserva los borradores incompletos o imposibles y explica el error al
perder foco. La validación del formulario bloquea el envío de fechas inválidas.
Cobros suspende la consulta y oculta los resultados mientras se corrige un borrador
o un rango invertido; no escribe esos valores en la URL. Al confirmar, conserva
otros parámetros y la navegación atrás/adelante.

## Interacción y límites

- Alt+↓ abre desde el campo. El calendario permite recorrer días con flechas,
  seleccionar con Enter y cerrar con Escape, incluso durante la carga inicial.
- Seleccionar, limpiar o cerrar devuelve el foco al botón de calendario. Escape
  no cierra el modal de Reparación ni abre el aviso de descarte.
- El popup se monta fuera del cuerpo desplazable del formulario, pero dentro
  del ámbito de foco del modal. Se reposiciona dentro del viewport y puede
  superponerse al campo cuando el espacio es reducido.
- Min/max son inclusivos y afectan tanto escritura como selección. Cobros
  conserva los límites recíprocos Desde/Hasta. No se agregó una restricción
  nueva entre ingreso y entrega estimada.
- Los días se convierten con componentes del calendario local, sin interpretar
  `YYYY-MM-DD` como un instante UTC. Se validan días reales, años bisiestos y
  siglos. El botón Hoy usa el día local del navegador.

Se conserva el contrato previo de Cobros: cada extremo ausente se completa con
hoy en el servidor; el botón Hoy de la página borra ambos filtros. No se
modificaron el backend ni los registros de la cuenta.

## Base elegida

Se incorporaron `@daypicker/react` 10.0.1 y `@floating-ui/react` 0.27.20, con
versiones exactas en package.json/lock. DayPicker aporta navegación y selección;
Floating UI aporta posicionamiento y manejo del popup. El diseño y la validación
de borradores se mantienen en componentes del proyecto.

Se revisaron las fuentes oficiales antes de instalar:
[instalación](https://daypicker.dev/start),
[campos editables](https://daypicker.dev/guides/input-fields),
[accesibilidad](https://daypicker.dev/guides/accessibility) y
[portales](https://floating-ui.com/docs/floatingportal).

El calendario y sus estilos se cargan al abrirlo. El build genera un chunk de
calendario de aproximadamente 77 kB (23 kB gzip); el principal queda en unos
653 kB (188 kB gzip). Sigue presente el aviso de chunk principal mayor a 500 kB.
La auditoría de npm no señaló las dependencias nuevas; sí mantiene avisos en
dependencias de herramientas ya existentes, que no se actualizaron en este corte.

## Validación

- **160 pruebas unitarias/integración:** 59 de conversión y validación de fechas,
  20 del control real, 33 de Caja/Reparación y 48 de regresión de Modal, guardado
  pendiente, parámetros URL y utilidad de fecha existente.
- Las utilidades se comprobaron en Buenos Aires y Auckland. Un escenario de
  navegador fija un instante en que UTC ya cambió de día y Argentina todavía no.
- **15 escenarios Chromium:** 9 nuevos del calendario y 6 de regresión de URL.
  Incluyen borradores sin consulta, bisiestos, límites, historial, envío ISO,
  navegación por teclado y Escape con carga diferida retenida.
- **3 escenarios WebKit:** teclado/rango y geometría, selección y cierre en
  320/390 px. La revisión Chromium también incluye 1280/1440 px y ambos temas.
- Geometría y hit testing verifican que encabezado, mes/año, días y pie sean
  alcanzables. Se corrigieron el recorte provocado por medir el fallback de carga
  y el truncamiento del año en el select.
- Typecheck del proyecto, ESLint focalizado, build y diff-check aprobados.

Los E2E usan API interceptada sobre Vite local. Se actualizaron dos comprobaciones
de formato visible en el harness de Cobros real; ese harness no se volvió a
ejecutar. Un typecheck adicional de los E2E sigue detectando seis errores previos
de fixtures en `e2e/helpers.ts`, fuera del typecheck normal del proyecto.

## Evidencia y archivos

- [Reparación, 320 px claro](../evidence/2026-09-19-stage4/reparacion-320-light-calendario.png).
- [Reparación, 390 px oscuro](../evidence/2026-09-19-stage4/reparacion-390-dark-calendario.png).
- [Cobros, 1440 px oscuro](../evidence/2026-09-19-stage4/cobros-1440-dark-calendario.png).
- [Cobros, 1280 px claro](../evidence/2026-09-19-stage4/cobros-1280-light-calendario.png).

Las capturas Chromium y WebKit están en `docs/evidence/2026-09-19-stage4/`.
Los logs locales de esta ejecución usan `/private/tmp/ordenfix-stage4-*`.

Producción: `DateInput.tsx`, `DateCalendar.tsx`, `date-calendar.css`,
`utils/dateInput.ts`, `CajaPage.tsx`, `ReparacionFormModal.tsx` y dependencias.
Pruebas: utilidades/control, las dos pantallas, `e2e/date-input.spec.ts` y
comprobaciones de fechas en los escenarios de URL/Cobros.

La próxima etapa es la vista de Reparaciones por etapas elegida en el plan.
