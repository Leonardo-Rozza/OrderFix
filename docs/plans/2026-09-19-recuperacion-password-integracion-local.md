# Recuperación de contraseña — integración local

Fecha: 2026-09-19. Baselines: frontend `69e3a1c`, backend `26282ba`.
Estado: cerrado localmente, con validación focal aprobada.

## Alcance

El formato del correo y los endpoints ya existen. Este corte conecta la pantalla
de recuperación, el botón del HTML realmente generado, el login y PostgreSQL 16.
Se amplía `created` en el laboratorio de registro, conservando catorce escenarios
con Chromium desktop y móvil de 320 px y sin añadir cuentas al fixture.

Después del alta, la verificación y la lectura del historial, el navegador sale
de la sesión y pide recuperación. Un email inexistente recibe la misma respuesta
genérica que uno registrado y no genera correo. Dos pedidos sucesivos invalidan
el primer enlace; sólo el segundo permite cambiar la contraseña. Abrir el correo
usa su CTA real, comprobando previamente que apunte al frontend loopback.

El ensayo debe rechazar el JWT y la contraseña anteriores, permitir ingreso con la
nueva clave y rechazar reutilizar el enlace. Este último intento debe conservar
la nueva sesión. También revisa mensajes y ausencia de desbordamiento horizontal.
Sólo los hashes SHA-256 de ambos tokens llegan al reporte; correos y claves son
sintéticos, sin enviar mensajes reales ni exponer un buzón HTTP.

El backend contrasta el reporte con un único reset consumido por usuario,
contraseña BCrypt renovada, versión de sesión incrementada una vez y persistencia
intacta del consentimiento de registro y la verificación del email. Conserva las
comprobaciones del resto de cuentas, talleres y operaciones del laboratorio.

## Validación y límites

Plan: lint y TypeScript estricto de E2E, compilación Java 21 y harness real con
Node 24. La prueba no adelanta el reloj ni ensaya resets simultáneos. La consulta
final SQL no es un contador global de escrituras. No se amplía el gate integral.

Email C desplegado sigue pendiente: enlaces HTTPS y entrega/lectura en casillas
reales. No se acreditan clientes de correo ni modos oscuros por este navegador.
Se preservan configuración, migraciones V27–V34 y los 179 archivos no versionados.
Un commit atómico por repositorio, sin push ni despliegue.

Diseño y evidencia Java: backend
`docs/plans/2026-09-19-recuperacion-password-integracion-local-design.md`.

## Resultado

**14/14 recorridos desktop/móvil y 1/1 comprobación JUnit aprobados**, sin fallos,
errores ni omisiones. Única ejecución del harness, terminada el 2026-09-19 a las
12:28:48 -03, en 1:58 min. Java 21, Node 24.14.0 y PostgreSQL 16 descartable.
ESLint y TypeScript estricto focal aprobados; revisión independiente sin bloqueos.

El enlace vigente cambia la clave; el reemplazado y el reutilizado devuelven 400.
El JWT anterior es rechazado, el login con clave anterior devuelve 401 y el nuevo
200. Reutilizar el enlace no destruye la nueva sesión. Los mensajes se leen sin
desbordamiento en ambos tamaños; no se detectaron defectos que requieran cambiar
la UI o el backend productivo.

La verificación SQL conserva consentimiento e identidad originales y comprueba
BCrypt nuevo, versión de sesión uno y sólo el hash vigente consumido. Se mantienen
los controles de todos los demás recorridos; el delta esperado de auth_tokens pasa
de doce a catorce por las dos recuperaciones. El buzón contiene sólo los dos HTML
esperados. No se enviaron mensajes reales ni se ejecutó el gate integral.

Se preservaron los 179 archivos no versionados y las ocho migraciones congeladas.
Los servidores habituales y del ensayo quedaron detenidos. Logs del corte:
`/private/tmp/ordenfix-recovery-browser-20260919.log`,
`/private/tmp/ordenfix-recovery-e2e-eslint-20260919.log` y
`/private/tmp/ordenfix-recovery-e2e-typecheck-20260919.log`.
