# Etapa 3 — Dashboard compacto

Fecha: 2026-09-18. Estado: cerrada en local, sin publicación.

## Resultado

El panel «Reparaciones por estado» inicia con seis contadores: Ingreso,
Diagnóstico, Aprobación, En trabajo, Listo y Cerradas. Conserva el total general
y permite desplegar los doce estados con «Ver todos los estados / Ver menos».
Se eliminaron las doce barras permanentes. El vacío de Ingresos recientes ocupa
menos altura y aparece una sola vez.

Los grupos se toman de `FASES`, la misma configuración del flujo de Reparaciones.
Cada cantidad suma los estados correspondientes del mapa global del servidor;
no se calcula a partir de las últimas cinco órdenes. Se conservan las fuentes de
los cuatro KPI, incluido `equiposListos` del backend, que actualmente cuenta sólo
COMPLETADO. La etapa Listo suma también LISTO_SIN_REPARAR.

Al expandir, cada estado enlaza a `/reparaciones?vista=list&estado=ESTADO`, incluso
cuando su cantidad es cero. Las seis etapas son contadores de resumen; el acceso
al filtro se ofrece en los estados individuales.

La expansión usa botón nativo, `aria-expanded` y `aria-controls` estable. El botón
precede a los enlaces: después de activarlo, Tab llega al primer estado y
Shift+Tab vuelve al botón. Enter y Espacio funcionan sin perder el foco.

Carga muestra seis placeholders compactos. Error o respuesta incompleta muestran
reintento; no se convierten en cantidades cero. Se conservan los ingresos
recientes, sus importes, chips de cobro y accesos a las órdenes.

## Validación

- 20 pruebas de DashboardPage aprobadas: agregación de los doce estados, total,
  despliegue, enlaces, teclado, ceros y carga/error/datos ausentes.
- 6 escenarios nuevos de navegador Chromium aprobados: vacío en 1280×800 y
  1440×900, pocos datos en 1280 y 320 px, cantidades altas en 1440 y 390 px,
  temas claro/oscuro. Verifican doce destinos exactos, navegación al listado con
  filtro aplicado, sesión conservada y orden de foco.
- 6 pruebas existentes de Inicio/Clientes aprobadas: nombres largos, importes,
  permisos ADMIN/USER, carga, error, reintento y vacío.
- Typecheck, ESLint focalizado y build aprobados. El build conserva el aviso
  existente de chunk principal superior a 500 kB (aproximadamente 595 kB).
- Revisión visual de capturas contraídas y expandidas. El vacío contraído entra
  sin desplazamiento vertical en los dos tamaños desktop comprobados; no hay
  desbordamiento horizontal en los cuatro anchos.

Las pruebas de navegador usan respuestas sintéticas interceptadas sobre la app
local. El contrato de datos se contrastó con el código backend. Esta etapa no
modifica el servidor, los datos de la cuenta ni el despliegue.

## Evidencia

- [Vacío desktop claro, contraído](../evidence/2026-09-18-stage3/vacio-1280-light-contraido.png).
- [Vacío desktop oscuro, contraído](../evidence/2026-09-18-stage3/vacio-1440-dark-contraido.png).
- [Cantidades altas, contraído](../evidence/2026-09-18-stage3/many-1440-dark-contraido.png).
- [Cantidades altas, expandido](../evidence/2026-09-18-stage3/many-1440-dark-expandido.png).
- [Móvil 320 px](../evidence/2026-09-18-stage3/few-320-light-contraido.png).
- [Móvil 390 px, expandido](../evidence/2026-09-18-stage3/many-390-dark-expandido.png).

Las doce capturas completas están en `docs/evidence/2026-09-18-stage3/`.
Los logs locales de esta ejecución usan `/private/tmp/ordenfix-stage3-*.log`.

## Archivos y continuidad

Producción: `src/components/DashboardRepairSummary.tsx` y
`src/pages/DashboardPage.tsx`. Pruebas: `src/pages/DashboardPage.test.tsx` y
`e2e/dashboard-compact.spec.ts`.

No se oculta el overflow de la página: en móvil, pantallas bajas, zoom elevado o
con el desglose abierto se permite el desplazamiento natural. La próxima etapa
es el calendario compartido; después continúa Reparaciones por etapas.
