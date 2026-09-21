# Etapa 1 — Verificación de email antes de operar

Fecha: 2026-09-18. Estado: cerrada localmente. Corresponde al punto 9 del plan gradual aprobado.

## Resultado implementado

El backend informa `usuario.emailVerificado` en `GET /api/perfil`. El frontend
valida que sea un booleano y espera una lectura nueva antes de montar las páginas
operativas. No usa el valor persistido en localStorage para habilitar permisos.
Un perfil incompleto o un fallo de red muestran reintento y mantienen oculta la
operación; una sesión revocada sigue cerrándose como antes.

Sin verificación, Dashboard, Reparaciones, Clientes, Equipos, Repuestos, Empleados,
Inventario y Cobros muestran una vista previa explícita, sin consultas de registros
ni formularios activos. La navegación permite conocer las secciones. Exportación
y cierre de cuenta tampoco pueden habilitarse entrando por URL directa.

El banner permite reenviar y volver a comprobar con «Ya lo confirmé». El perfil se
refresca al volver a la pestaña o recuperar conexión. Confirmar un enlace actualiza
el perfil de la sesión abierta; un enlace de otra cuenta no la desbloquea. Los
fallos transitorios de confirmación se distinguen de enlaces inválidos/vencidos.

El servidor aplica la política en el filtro JWT, después de validar el usuario y
el estado de cierre del taller. Rechaza lecturas, escrituras, enlaces, exportaciones
y checkout con `403 EMAIL_NO_VERIFICADO`, `private, no-store`. El frontend reconoce
ese código, conserva la sesión, desmonta la operación, purga los datos operativos
cacheados y vuelve a validar el perfil. Ignora avisos tardíos de otra sesión.

## Accesos conservados

| Ruta privada | Método | Acceso pendiente |
| --- | --- | --- |
| `/api/perfil` | GET | Identidad y verificación de la sesión |
| `/api/requisitos-legales` | GET | Requisitos de la propia cuenta |
| `/api/aceptaciones-legales` | GET / POST | Historial y aceptación, con validaciones existentes |
| `/api/cuenta/baja-acceso` | POST | Baja propia del empleado, conserva rol y contraseña |
| `/api/suscripcion` | GET | Sólo ADMIN, para gestionar una suscripción existente |
| `/api/pagos/suscripcion/cancelar` | POST | Sólo ADMIN, conserva condiciones de cancelación |

Auth, recuperación, verificación/reenvío, documentos públicos y seguimiento público
conservan su carácter público. Ayuda y contactos siguen disponibles en Cuenta.
Un titular pendiente que abre Plan ve un panel mínimo de consulta/cancelación;
no se monta el checkout ni la página comercial completa. El estado `RESTRICTED`
sigue reservado al cierre del taller.

## Cuentas anteriores y empleados

No hay migración masiva de flags. Una cuenta existente con `emailVerificado=true`
mantiene el acceso; una que siga pendiente debe confirmar su correo. Los nuevos
empleados ya no se crean automáticamente verificados: se envía el enlace por el
flujo existente después del commit y confirman antes de operar.

La política queda activa en el backend; no depende de una bandera apagada.
Frontend y backend deben publicarse coordinadamente, porque el nuevo contrato de
perfil es obligatorio. No se publicó ningún despliegue remoto ni se activaron
proveedores de correo o pagos. El correo real sigue dependiendo de la configuración
del entorno. Las pruebas usan exclusivamente un buzón temporal sintético.

## Verificación

- Frontend: 857 pruebas Vitest y 43 controles de publicación aprobados.
- Typecheck, ESLint y build aprobados. Persiste el aviso de tamaño del chunk
  principal (593 kB); el build no falla.
- Backend: 431 pruebas aprobadas, con matriz de métodos/rutas, cuentas verificadas
  y pendientes, JWT vigente tras verificar, tokens y excepciones de cuenta.
- Chromium con API simulada: 73 casos aprobados, incluidos accesos directos y vista
  previa a 1280/320 px sin solicitudes operativas.
- Harness real: 14 casos de navegador desktop/móvil y comprobaciones de PostgreSQL
  aprobados. Propietarios y empleados confirman por la UI con tokens emitidos por
  el backend en un buzón efímero; no se desactiva el guard ni se manipulan flags
  para saltarse la verificación. Se corrigió el orden de lectura de la respuesta
  de registro en las pruebas para conservarla antes de navegar al enlace.
- Backend local reiniciado en 8080 con la configuración existente. La cuenta
  autorizada devuelve perfil verificado y accede a Dashboard/Reparaciones. Se
  observó únicamente el POST de login, sin escrituras de negocio. El frontend
  continúa disponible en `http://127.0.0.1:5173`.
- Capturas de la vista previa con datos sintéticos, sin desborde horizontal:
  [desktop 1280](../evidence/2026-09-18-stage1/preview-reparaciones-1280.png) y
  [móvil 320](../evidence/2026-09-18-stage1/preview-reparaciones-320.png).
- Tema oscuro revisado a 1280, 390 y 320 px: sin desborde horizontal, acciones de
  44 px. A 320 px el contenido requiere 75 px de desplazamiento vertical en el
  alto probado (800 px). Ver [desktop oscuro](../evidence/2026-09-18-stage1/preview-reparaciones-oscuro-1280.png)
  y [móvil oscuro](../evidence/2026-09-18-stage1/preview-reparaciones-oscuro-320.png).

Logs de la ejecución local: `/private/tmp/ordenfix-stage1-frontend-tests.log`,
`/private/tmp/ordenfix-stage1-browser.log`,
`/private/tmp/ordenfix-stage1-registration-real-final.log` y
`/private/tmp/ordenfix-stage1-local-check.json`. La configuración local conserva
`mail.enabled=false`; la entrega real por correo requiere configurar ese servicio
en el entorno donde se pruebe o publique.

`docs/openapi.json` es un snapshot anterior que no contiene `/perfil`; el contrato
actual de esta entrega se documenta aquí y en `FRONTEND_INTEGRATION.md` del backend.

## Siguiente corte

Etapa 2: contraseña desde el padding normal, flechas de selects consistentes y
etiqueta «Código de seguimiento». Dashboard compacto, calendario y Reparaciones
por etapas siguen en los cortes posteriores acordados.
