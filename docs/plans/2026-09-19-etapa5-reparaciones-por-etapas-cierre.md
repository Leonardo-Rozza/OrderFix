# Etapa 5 — Reparaciones por etapas

Fecha: 2026-09-19. Estado: cerrada en local, sin publicación.

## Resultado

Reparaciones reemplaza el tablero horizontal por seis controles: Ingreso,
Diagnóstico, Aprobación, En trabajo, Listo y Cerradas. Todos están disponibles
sin desplazamiento horizontal y muestran sus totales. Al seleccionar una etapa,
se muestran únicamente sus órdenes, agrupadas por estado y distribuidas en una,
dos o tres columnas según el ancho disponible. Los estados vacíos son compactos.

En desktop los dos o tres estados de una misma etapa comparten una fila; cuando
la etapa tiene un solo estado, sus tarjetas aprovechan hasta tres columnas.
En móvil se apilan los grupos. Los nombres extensos se parten sin desbordar ni
estirar la altura de las tarjetas vecinas. Lista usa un select de Estado en móvil
para no ocupar la pantalla con trece filtros antes de la primera orden.

La pantalla aprovecha un ancho de hasta 1800 px de contenido. El resto de las
pantallas conserva su límite anterior. Se mantienen los colores, tipografía y
controles compartidos de OrdenFix.

Cada tarjeta permite abrir la orden, avanzar al siguiente estado o elegir otra
transición válida mediante «Cambiar estado». Esta última acción abre un diálogo
con select nativo y guardado explícito. Las acciones funcionan con teclado y en
móvil sin depender de arrastrar. Una transición confirmada conserva la etapa
actual y ofrece «Ver [etapa destino]»; no mueve al usuario automáticamente.
El aviso recibe foco cuando corresponde, sin interrumpir otro diálogo abierto.

## Datos y navegación

- Sin búsqueda, los seis contadores suman el mapa de estados del dashboard.
- Con búsqueda, se consultan los totales paginados de los doce estados usando
  el mismo término que las tarjetas, página 0 y tamaño 1. La caché guarda sólo
  los números, separada de las páginas del tablero. No se agregó un endpoint.
- Sólo los estados de la etapa activa montan consultas de órdenes. Cada uno
  conserva lotes de 20, deduplicación, reintento y foco en la primera orden nueva.
- Las cargas muestran esqueletos; los fallos muestran cantidades no disponibles
  y reintento. No se presentan como ceros. Un error al reconciliar órdenes
  conserva las tarjetas y pausa sus transiciones hasta actualizar.
- La invalidación existente refresca órdenes y contadores tras cambiar el estado;
  las etapas inactivas se actualizan al volver a abrirlas.
- `vista=board` sigue siendo compatible y ahora muestra Etapas. Ambas elecciones
  explícitas, `board` y `list`, se conservan en la URL.
- Sin vista explícita, la pantalla inicia en Lista hasta 1023 px y en Etapas desde
  1024 px. Una elección explícita prevalece al cambiar el tamaño de pantalla.
- `etapa` admite las seis claves de fase; ausencia o valor inválido usa Ingreso.
  Se conservan búsqueda, filtro de estado, página y orden al alternar vistas,
  junto con el historial del navegador. Cambiar la búsqueda sigue reiniciando
  la página de Lista, como antes.

Los doce conteos de búsqueda son consultas independientes: no representan una
instantánea atómica si otro usuario modifica órdenes al mismo tiempo. No se
modificaron backend ni registros de la cuenta.

## Validación y evidencia

La validación usa Vite local y API interceptada para reproducir volúmenes,
errores y transiciones de forma determinista. Las capturas se guardan en
`docs/evidence/2026-09-19-stage5/`.

- **87 pruebas unitarias/integración aprobadas:** 32 de la página, 9 del nuevo
  hook de conteos y 46 de regresión de proyección de páginas, consistencia de
  caché, parámetros URL, dashboard y vista previa de email.
- Chromium y WebKit: selección de etapas, cambio de estado, destino explícito,
  búsqueda filtrada, consultas sólo de estados activos, carga de 42 órdenes en
  lotes de 20, deduplicación, foco, reintento, preferencias e historial.
- Geometría y revisión visual a 320, 390, 1280, 1440 y 1920 px, temas claro y
  oscuro, nombres extensos y cero/pocas/muchas órdenes. Reflow a 640 CSS px,
  equivalente al espacio de 1280 px con zoom de 200%; no se automatizó el zoom
  nativo del navegador.
- El vacío de escritorio conserva las seis etapas sin generar scroll horizontal
  ni vertical por altura artificial. La última tanda focal de navegador tras el
  ajuste de columnas y filtro móvil pasó 10/10.
- Typecheck, lint completo, build y diff-check aprobados. Se mantiene el aviso
  previo del bundle principal mayor a 500 kB; no se agregaron dependencias.

La tanda amplia tuvo un fallo intermitente en el caso existente de Cobros
«Hoy → Atrás»; el escenario aislado pasó sin cambios de producción. No se
modificó el calendario en esta etapa. No se reejecutó el harness de backend real.

Capturas finales:

- [Desktop 1440 oscuro](../evidence/2026-09-19-stage5/etapas-realista-1440-dark.png).
- [Lista móvil 390 oscuro](../evidence/2026-09-19-stage5/lista-realista-390-dark.png).
- [Vacío 1280 claro](../evidence/2026-09-19-stage5/etapas-vacio-1280-light.png).
- [Reflow 640 claro](../evidence/2026-09-19-stage5/etapas-640-light.png).

## Archivos principales

- `src/pages/ReparacionesPage.tsx`: etapas, cuadrícula, acciones y preferencias URL.
- `src/layouts/DashboardLayout.tsx`: ancho amplio opcional, usado por Reparaciones.
- `src/api/queries/reparacionesCounts.queries.ts` y `src/api/queryKeys.ts`:
  consultas de totales filtrados y claves de caché.
- Pruebas de página, conteos, tablero, navegación URL y matriz móvil.
