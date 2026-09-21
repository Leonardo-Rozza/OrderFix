# Etapa 2 — Contraseña, selects y código de seguimiento

Fecha: 2026-09-18. Alcance aprobado: puntos 3, 7 y 8 del plan gradual.
Estado: cerrada localmente.

## Criterio de diseño

La persona que recibe y repara equipos necesita escribir y seleccionar valores
sin espacios engañosos ni iconos pegados al borde. El cliente que consulta el
seguimiento necesita reconocer primero el equipo y su estado.

Se conserva la identidad existente: grafito de superficies, turquesa de foco y
acción, colores de estado y tipografía del proyecto. Bordes y superficies siguen
los tokens compartidos. El espacio usa la escala actual: padding de 14 px, flecha
de 16 px y reserva derecha de 44 px. El código usa tamaño secundario de 12 px y
color de texto secundario para seguir siendo legible en claro y oscuro.

## Cambios

- **Contraseña:** el login elimina el candado y el padding izquierdo extra. El
  email mantiene su icono. `PasswordInput` conserva el ojo, padding derecho de
  48 px, ref de formulario, autocompletado y comportamiento mostrar/ocultar.
  Los demás usos del componente ya tenían el padding izquierdo normal.
- **Selects:** nuevo componente `src/components/Select.tsx` compartido por los
  nueve usos nativos del código: ordenamiento, método de cobro, estado del
  formulario de reparación, cuenta vinculada, técnico asignado, tipo de
  presupuesto, tipo de ítem, calidad del repuesto y cambio de estado en detalle.
  `SortSelect` se reutiliza en Clientes, Equipos y Reparaciones.
- El select conserva elemento, opciones, eventos, nombre, ref, estados y atributos
  accesibles nativos. La flecha SVG es decorativa, no intercepta clics y queda
  centrada respecto del control. El margen exterior del selector de estado se
  aplica al contenedor, para que no desplace el centro de la flecha.
- Ordenamiento tiene nombre accesible «Ordenar» también en móvil, donde la etiqueta
  visual está oculta. Los buscadores `Combobox`/`AsyncCombobox` conservan su
  comportamiento y presentación: ya disponían de icono centrado y espacio propio.
- **Seguimiento público:** «Código de seguimiento» pasa al bloque de datos junto
  a las fechas, con valor monoespaciado seleccionable. Se mantiene el identificador,
  el enlace público, la consulta API y las acciones de presupuesto. El código no se
  presenta como número de orden ni como una búsqueda manual nueva.

No se agregaron dependencias, endpoints ni cambios de backend. Dashboard compacto,
calendario y Reparaciones por etapas corresponden a los siguientes cortes.

## Comprobación

- 53 pruebas de componentes/páginas aprobadas: formularios de reparación,
  presupuesto y cobro; detalle de reparación; accesibilidad de campos; contraseña,
  login y seguimiento.
- 15 casos Chromium aprobados: accesibilidad, alta y cambio de estado de reparación,
  presupuesto público y páginas Inicio/Clientes en diferentes tamaños y temas.
- 5 E2E de seguimiento aprobados: desktop, 320, 390, landscape y WebKit; el nombre
  largo del taller y la fila del código no desbordan.
- Typecheck, ESLint y build aprobados. Se conserva el aviso existente de tamaño
  del bundle principal (594 kB).
- 32 casos adicionales aprobados de ordenamiento/filtros en URL y formularios
  móviles, en Chromium y WebKit. Total de navegador de esta etapa: 52 casos.
- Revisión visual de controles en Chromium a 1280/320/390 px, claro y oscuro, y
  WebKit a 390 px en ambos temas. La flecha tiene diferencia vertical menor a 0,1 px
  respecto del centro del select; inset de 14 px y reserva de texto de 44 px.
  Sin desborde horizontal con textos largos, foco visible y controles deshabilitados.
  El ojo de contraseña responde al teclado; WebKit usa Option+Tab para incluir
  botones según su preferencia nativa de navegación, seguido de Space.

Las comprobaciones usaron datos sintéticos y API simulada en navegador; no se
modificaron registros de la cuenta local.

## Evidencia visual

- [Contraseña móvil oscura](../evidence/2026-09-18-stage2/password-chromium-320-dark.png)
- [Selector de reparación desktop oscuro](../evidence/2026-09-18-stage2/select-formulario-chromium-1280-dark.png)
- [Ordenamiento móvil claro](../evidence/2026-09-18-stage2/select-ordenamiento-chromium-320-light.png)
- [Selector en WebKit](../evidence/2026-09-18-stage2/select-detalle-webkit-390-dark.png)
- [Seguimiento desktop oscuro](../evidence/2026-09-18-stage2/seguimiento-1280-dark.png)
- [Seguimiento móvil claro](../evidence/2026-09-18-stage2/seguimiento-320-light.png)

Logs locales: `/private/tmp/ordenfix-stage2-unit.log`,
`/private/tmp/ordenfix-stage2-browser.log`,
`/private/tmp/ordenfix-stage2-mobile-sort.log` y
`/private/tmp/ordenfix-stage2-build.log`.

Próxima etapa: dashboard compacto con resumen por etapas y «Ver todos los estados».
