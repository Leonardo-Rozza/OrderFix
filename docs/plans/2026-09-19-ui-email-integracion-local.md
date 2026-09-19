# UI y verificación de email — integración local

Fecha: 2026-09-19. Corte de validación autorizado después del ensayo de backups.
Baseline frontend `0d04e05`, backend `00ec1b0`. Las mejoras de las etapas 0–5 y la
verificación de email están en el working tree; se conserva su implementación.

## Alcance y criterio de cierre

Comprobar juntos los cambios existentes, sin agregar funciones ni rediseñar la UI.
El pendiente de distintos tipos de equipo conserva su etapa posterior. Se elige
reutilizar las suites y el harness real: revisar sólo capturas no acredita el
contrato HTTP, mientras un despliegue remoto requiere las tareas de salida aún
pendientes. La revisión React usa la guía del repositorio.

- Frontend: pruebas, controles de publicación, tipos, lint y build de la versión
  actual; navegador para email, Dashboard, fechas, etapas y navegación.
- Backend: regresiones focalizadas de email, perfil, roles y excepciones de cuenta.
- Integración real: registro/verificación de titular y empleados, reparación,
  presupuesto, entrega y cobros manuales en PostgreSQL descartable; buzón sintético,
  sin enviar correos ni contactar proveedores reales.
- Corregir sólo defectos reproducibles de estos recorridos. Registrar resultados,
  límites, fallos iniciales y repeticiones sin contar dos veces los casos.
- Conservar cambios previos, archivos no versionados y migraciones congeladas.
  Commits atómicos sólo del corte, sin push ni merge. Detener al terminar los
  servidores efímeros iniciados por las pruebas.

No se acredita producción ni entrega real de correo. Un resultado focal no se
presentará como integral backend. Si aparece un defecto transversal que lo exija,
se ampliará la regresión y se documentará el motivo.

## Resultado y correcciones

**Cerrado localmente el 2026-09-19.** Se consolida el código existente de UI y email
en un commit frontend y su contrato de verificación en otro backend, sin push.
Esto conserva las mejoras previas: perfil autoritativo/vista previa, controles
compartidos, Dashboard compacto, calendario con fechas ISO y Reparaciones por
etapas. Los documentos históricos y capturas locales del usuario se conservan.

Se reprodujo dos veces una carrera en Cobros: «Hoy» cambiaba la URL antes del
render de React; Atrás podía restaurar la misma entrada de historial mientras los
borradores seguían vacíos. El arreglo conserva el rango canónico hasta confirmar
la navegación y agrupa ambos cambios en `startTransition`. La prueba nueva ejecuta
Hoy y Atrás sin esperar el render intermedio; las pruebas existentes comprueban
que descartar un rango inválido no dispara una consulta adicional del rango viejo.
No se cambia el formato ISO, la validación ni el significado de los cobros.

También se cambia «Ver tablero» por «Ver reparaciones», coherente con la Lista por
defecto en móvil. El test de Dashboard distingue los selects Ordenar/Estado y
comprueba el filtro elegido en móvil. El test de calendario espera hasta cinco
segundos la primera importación diferida, sin cambiar el componente ni las
aserciones. El resto conserva su contenido original.

La nueva prueba de navegador cubre los accesos directos a reparación nueva y Cobros
con fechas, en 1280 y 320 px. La vista previa no consulta registros ni abre el
formulario; una nueva lectura confirmada del perfil habilita la misma URL y sesión.
El harness real cambia ahora el primer estado desde Etapas, con búsqueda por
teléfono, destino explícito y apertura de la orden. Conserva las mismas escrituras,
permisos, cobros externos y comprobaciones PostgreSQL del recorrido anterior.

## Evidencia final

| Comprobación | Resultado |
| --- | --- |
| Vitest completo | 975/975 en 112 archivos, tanto con 2 workers como en el `npm test` final con paralelismo predeterminado. |
| Controles unitarios de publicación | 43/43; no equivalen a habilitar un despliegue público. |
| Typecheck, lint completo y build | Aprobados; lint focal final también aprobado. |
| Navegador con API interceptada | 167 casos cubiertos: tanda amplia 165 aprobados y 2 selectores ambiguos; archivo Dashboard completo corregido 6/6. No se afirma una única corrida integral verde ni se duplican repeticiones. |
| Backend focal de email/permisos/cuenta | 431/431, sin fallos, errores u omisiones; BUILD SUCCESS en 1:08 min. |
| Navegador + HTTP + PostgreSQL 16 | 14/14 recorridos de registro, verificación, empleados, reparaciones/presupuestos/entrega y cobros; 1/1 comprobación JUnit persistida; BUILD SUCCESS en 2:15 min. |
| Cierre/restauración con PostgreSQL real | 2/2 recorridos desktop/móvil y 1/1 comprobación JUnit; BUILD SUCCESS en 30,183 s. |

Los primeros pases concurrentes de Vitest agotaron el `findByRole` de un segundo
durante la importación inicial del calendario. El archivo aislado pasó 20/20 y la
ejecución completa final, sin Maven concurrente, pasó 975/975 con el calendario
real. No se omitieron casos ni se modificó DateInput. Para evitar que la primera
transformación del módulo vuelva a agotar esa espera bajo carga, se ajustó sólo
ese `findByRole` a cinco segundos, dentro del límite ya existente del test.
El `npm test` posterior a ese ajuste volvió a aprobar los 975 casos y los 43
controles; typecheck y lint completos también se repitieron y aprobaron.

La regresión nueva de historial primero reprodujo el fallo; una solución intermedia
volvía a consultar el rango viejo y fue corregida antes del pase final. El harness
ampliado inicialmente usó `textbox` para un `input type=search`; se corrigió a
`searchbox` y se repitió todo el recorrido. Typecheck detectó una opción de Testing
Library sólo válida en Playwright; se eliminó. Ninguno de estos pases fallidos
sustituye los resultados finales anteriores.

Revisión visual de nuevas capturas: Dashboard móvil oscuro, Etapas con nombres
extensos y calendario dentro del formulario. La matriz automatizada incluye
Chromium y WebKit, escritorio, 320/390 px y horizontal. Las 95 capturas previas
conservan sus bytes; 16 salidas diferentes del ensayo se guardaron en
`/private/tmp/ordenfix-ui-email-evidence-20260919` y se restauraron los originales.

Logs descartables bajo `/private/tmp/ordenfix-ui-email-`, sufijo `-20260919.log`:
`frontend-complete`, `release`, `typecheck`, `lint`, `lint-final`, `build`, `browser`,
`dashboard-final`, `backend-focal`, `registration-real-final`, `closure-real`,
`frontend-final-gate` y `typecheck-final`.
El ensayo de cierre dejó evidencia sintética en
`/var/folders/j4/ym6p76r56xq1tcv775vjckq40000gn/T/ordenfix-closure-browser-6131523807609304646`.

## Límites y preservación

No cambió código productivo backend en este corte; se versiona la implementación
previa de email validada en conjunto. No se ejecutó otro clean verify backend: se
acreditan exclusivamente la regresión focal y los dos harness indicados. El build
frontend mantiene el aviso previo del chunk principal de 658 kB; el control de
artefactos para despliegue se omite fuera del modo de publicación.

Los harness usan correo sintético, proveedores apagados y flags propios del
laboratorio. No acreditan Resend/MP ni el historial legal de Cuenta en el harness
de registro, cuyo lector legal privado permanece deshabilitado. Cierre productivo,
supresión integral, configuración final y recorridos desplegados conservan sus
pendientes. Equipos de otros tipos conserva su plan posterior.

Se verificaron hashes de los 18 archivos backend y 255 frontend previos, descontando
sólo los cuatro ajustes frontend descritos y la actualización de estado del plan
backend de email; V27–V34 siguen intactas. Los cambios
funcionales relacionados se consolidan conservando su contenido. `.agents/`, los
archivos de diseño, las capturas y las actas históricas frontend no se incorporan a
este commit. Los servidores efímeros se cerraron y 8080/5173/5175/5178 quedaron libres.
