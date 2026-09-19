# Equipos de distintos tipos — pendiente antes del lanzamiento

Fecha: 2026-09-19. Estado: **guardado para después**, por decisión del titular.
No se implementa en el corte actual de recuperación de backups.

OrdenFix permite registrar marca, modelo, cliente y un identificador opcional de
equipo. El recorrido de ingreso, diagnóstico, presupuesto, reparación y entrega
sirve también para notebooks, consolas, PC de escritorio, monitores, televisores y
otros equipos. Hoy no existe un campo específico de tipo/categoría; algunos textos
y campos opcionales están orientados a celulares.

## Alcance acordado para retomar

- Incorporar una clasificación de equipos y su uso en búsqueda/filtros, definiendo
  el contrato backend/frontend antes de implementarlo.
- Unificar las etiquetas de número de serie / IMEI en formularios, listados,
  búsqueda, documentos y Excel. Mantener compatibilidad con el campo actual `imei`.
- Revisar los campos opcionales de PIN, patrón y cuenta vinculada según el equipo;
  no exigir datos que no correspondan ni borrar información ya cargada.
- Mantener el mismo circuito de reparación, evidencias, presupuesto y entrega.
  Los cobros siguen siendo registros manuales de pagos realizados fuera de OrdenFix.

## Criterio de cierre futuro

Registrar y recorrer una reparación de celular, notebook y consola/TV, con y sin
serie, sin campos inaplicables obligatorios. Comprobar búsquedas, edición, documentos
y exportación conservando los equipos existentes. Aplicar los permisos y aislamiento
por taller vigentes. Se dividirá en cortes pequeños al retomarlo.

Las mejoras de UI y verificación de email que ya están en el working tree son trabajo
independiente; este documento no las modifica ni acredita su validación.
