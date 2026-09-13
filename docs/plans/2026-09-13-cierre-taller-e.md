# Cierre del taller E — API, Cuenta y verificación local

Fecha: 2026-09-13. Baselines backend `4754f5f`, frontend `e2bd741`.
Ramas: `codex/lanzamiento-publico-backend` y `codex/frontend-refactor-checkpoint`.
E cerrado en local: API, pantalla y verificación aprobadas. D sigue parcial;
activación productiva apagada.

## Resultado y decisiones

Cuenta incorpora `/cuenta/cierre` para el titular ADMIN, con contraseña actual,
frase específica y lectura reciente del servidor antes de confirmar. Se elige una
página propia para reunir consecuencias, respaldo opcional, estado y constancia
durable; reutiliza el diseño de Cuenta. No cambia el plazo de recuperación de siete
días. La pantalla diferencia restricción/restauración de eliminación o efectos
MP/email confirmados. OrdenFix continúa sin procesar pagos taller–cliente.

Tras cerrar o restaurar se exige iniciar sesión nuevamente porque se revocan las
épocas JWT del taller. Si el comando pierde su respuesta o devuelve un resultado
incierto, se consulta el estado durable después del login; no se reenvía a ciegas.
Contraseña, prueba de reautenticación e identidad del comando permanecen sólo en
memoria del formulario. No se guardan en cachés, URL o storage del navegador.

El perfil remoto informa `accesoTaller`. Se valida antes de mostrar datos operativos:
un taller restringido accede a Cuenta sin consultar suscripción ni exponer navegación
operativa. Los errores de perfil permiten reintentar sin mostrar esos datos. El campo
ausente mantiene compatibilidad con el backend anterior; null o valores desconocidos
fallan cerrado. Los permisos efectivos permanecen en backend.

Exportación restringida permite únicamente un ZIP previo READY y vigente, con nueva
contraseña. No genera ZIP ni Excel ni amplía el vencimiento original del archivo.
Restaurar no reactiva usuarios dados de baja ni renueva automáticamente OrdenFix.

## Activación y contrato

Backend: `ordenfix.cuenta.cierre.http-enabled`, false por omisión, acepta true/false
exactos. Frontend: `VITE_WORKSHOP_CLOSURE_ENABLED`, habilita sólo con `true` exacto.
Los archivos reales de configuración permanecen sin cambios. El gate de release
público rechaza el flag frontend activo con `WORKSHOP_CLOSURE_NOT_RELEASED`.

El contrato documentado en `FRONTEND_INTEGRATION.md` del backend contiene GET
`/api/cuenta/cierre` y POST `/api/cuenta/cierre/reauthenticaciones` y
`/api/cuenta/cierre/operaciones`. Exige ADMIN/email verificado, JWT actual, UUID
canónicos, prueba ligada a propósito/operación/referencia y confirmación exacta.
Estado y constancia llevan `private, no-store`. No se modifican V27–V34.

El plan backend `docs/plans/2026-09-12-cierre-taller-implementation.md` registra
transacciones, gates, parser acotado y límites por instancia. El estado devuelto no
acredita borrado terminal ni cancelación remota.

## Verificación reproducible

- `npm test`: 819 pruebas Vitest en 105 archivos y 43 controles de release aprobados.
- `npm run typecheck`, `npm run lint` y `npm run build`: aprobados. El primer
  typecheck encontró una opción de Testing Library no admitida por sus tipos; se
  corrigió el test y la repetición aprobó. Vite conserva el aviso de chunk mayor
  de 500 kB; el harness avisó sobre Node 20.15.1 anterior al rango recomendado.
  Ningún aviso impidió esta corrida; el build local no acredita un release público.
- Playwright existente: 135 casos acreditados por integral y repetición focal.
  La integral tuvo 131 aprobados y cuatro expectativas móviles antiguas fallidas;
  se actualizó el caso que permitía dashboard con `/perfil` 500 para exigir bloqueo
  y recuperación explícita. El archivo móvil completo pasó luego 48/48 en cuatro
  proyectos. No se presenta esa consolidación como una única integral verde.
- Navegador con backend/HTTP/PostgreSQL 16 reales: 2/2 recorridos (escritorio y
  móvil 320), más 1/1 verificación JUnit de estado y efectos persistidos. Incluye
  contraseña incorrecta sin comando, cierre, login restringido, rechazo de JWT
  anterior/empleado, ZIP previo descargable, restauración, nueva sesión y constancia.
  Se comprobaron los plazos y exactamente dos comandos por taller. No hubo llamadas
  a proveedores ni uso de datos reales.
- Revisión visual de las cuatro capturas: controles completos, fechas legibles,
  referencias largas ajustadas y sin desborde horizontal a 320 px.

El harness se ejecuta con `npm run test:e2e:closure-real`, Java 21 y Docker. Crea una
base descartable, Tomcat aleatorio en 127.0.0.1 y Vite aislado en 5178 sin cargar
`.env`; termina sus procesos. El backend normal en 8080 continúa detenido.

Logs locales: `/private/tmp/ordenfix-closure-e-frontend-integral.log`,
`/private/tmp/ordenfix-closure-e-frontend-e2e-integral.log`,
`/private/tmp/ordenfix-closure-e-frontend-e2e-mobile-recheck.log` y
`/private/tmp/ordenfix-closure-e-browser-real.log`.
Capturas e informe sintéticos en
`/var/folders/j4/ym6p76r56xq1tcv775vjckq40000gn/T/ordenfix-closure-browser-9441598395334438824`.
Son artefactos temporales, no recibos de un proveedor.

## Pendientes y entrega

La activación productiva requiere completar las dependencias concretas de D:
conservación por categoría, supresión de negocio/identidad, recibos de eliminación
remota y recuperación/conciliación externa. La identidad/alta, contactos y textos
definitivos mantienen la etapa final acordada. Este corte no publica el cierre.

Backend integral: `./mvnw -B clean verify` aprobado el 2026-09-13 a las 00:36:01 -03
(34:01 min): **7.900 unitarias y 1.771 IT**, 380 clases, sin fallos, errores ni
omisiones. Control de empaquetado sin propiedades secretas aprobado. Log
`/private/tmp/ordenfix-closure-e-backend-clean-verify.log` y consolidación
`/private/tmp/ordenfix-closure-e-backend-integral-results.json`.

Commit backend: `2d73e39` — `feat(cuenta): expone cierre y restauracion del taller`.
El commit frontend de esta acta es `feat(cuenta): integra cierre y restauracion del taller`.
Revisión final de código, contrato y formato aprobada. Los ocho hashes V27–V34 se
mantienen. Puertos 8080, 5178 y 62907 comprobados sin listener al cerrar el ensayo.
Se conservan los 77 archivos ajenos no versionados. Un commit atómico por repositorio,
sin push ni merge.
