# OrdenFix — plan único de salida a producción

Fecha de referencia: 2026-10-02. Estado: T1 cerrada; T2 con evidencia local y bloqueos abiertos; T3–T7 pendientes; producción no acreditada.

Este documento concentra el trabajo de salida de frontend y backend. Reutiliza las capacidades terminadas y sus actas; no declara aprobado un despliegue por tener pruebas locales verdes.

**Ruta de salida:** T1 orden documental → T2 candidato local → T3 staging → T4 recorridos → T5 recuperación → T6 publicación/gates → T7 apertura. La preparación editorial puede avanzar en paralelo, pero no se activa una capacidad antes de cerrar sus dependencias.

## Objetivo y alcance autorizado

- Objetivo: cerrar una release conjunta, verificable y recuperable, sin una reescritura arquitectónica ni funcionalidades nuevas ajenas a la salida.
- Autorizado: T1 documental y, por confirmación explícita posterior, T2 de validación local con copias/recursos descartables y registro de evidencia.
- No autorizado: modificar comportamiento, activar flags/proveedores, operar bases reales, usar credenciales remotas, borrar datos, hacer push/PR/merge o desplegar.
- T3–T7 siguen como backlog no autorizado automáticamente. T2 no autoriza corregir código/tests ni operar servicios externos; cada operación externa requiere destino, operación y credencial/sesión explícitos.
- Mercado Pago permanece pausado; el cierre integral continúa deshabilitado para salida pública. No se publica contenido legal de prueba.
- Se preservan las actas históricas, ambas carpetas `.atl/` y el cambio previo del backend en `odd/tasks/v38-deploy-fixes.md`.

## Baseline y evidencia

| Área | Baseline o evidencia | Límite |
| --- | --- | --- |
| Frontend | `fd92975`, rama de código `codex/charge-retry-recovery`; 10 commits sobre `main` local | No se consultaron refs remotas ni despliegue |
| Backend | `f2141f6`, misma rama de código; 17 commits sobre `main` local; esquema V40 | No se acredita imagen/base desplegadas |
| Frontend, auditoría 2026-10-02 | 1.107 Vitest, 43 tooling, 13 Chromium con API simulada; lint, TypeScript y build técnico aprobados | No es un build público ni un recorrido de staging |
| Backend, auditoría 2026-10-02 | Compilación completa y 56 pruebas focalizadas aprobadas en copia temporal sin secretos | Auditoría inicial; integral posterior registrado en T2 |
| Integración local documentada V40 | 14 registro, 4 fotos y 2 exportación aprobados | Evidencia previa; repetición actual registrada en T2 |
| Cloudinary real, 2026-09-19 | Cuatro recorridos locales completos documentados | Falta acreditar rol/configuración de staging, retención/backups/CDN |

Las actas de septiembre sobre Vercel, Resend, dominios y proveedores son evidencia fechada, no consultas actuales a sus paneles. Deben revalidarse con autorización antes de operar. Precio PRO remoto, subida privada vía backend, APIs legales y exportación ya están implementados; sus pendientes actuales son publicación, configuración y prueba operativa, no reconstrucción funcional.

## Decisiones pendientes

- Acceso de los primeros talleres después del TRIAL de 14 días: FREE/ACTIVA conserva titular único y hasta 25 reparaciones mensuales; empleados y Cobros necesitan TRIAL/PRO. No se promete PRO permanente con MP pausado.
- Modalidad y entorno de apertura, versiones a integrar, retenciones y responsables deben quedar confirmados antes del go/no-go.
- Identidad/contactos y publicación definitiva conservan su cierre posterior a la evidencia técnica aplicable; no bloquean preparar el trabajo local.

## Matriz coordinada de configuración

Esta matriz describe el contrato y el objetivo de cada gate; **no aplica valores ni autoriza activaciones**. Las propiedades backend son nombres canónicos, no aliases de entorno inventados. Los flags legales backend y las capacidades opt-in indicadas permanecen apagados por defecto.

| Control | Default | Condición para el candidato de salida |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Fallback sólo en desarrollo | API HTTPS pública explícita, alineada con CORS y `APP_PUBLIC_URL` |
| `VITE_REGISTRATION_CONSENT` | Ausente/`false`: legacy | `true` sólo con requisitos publicados y escritor de consentimiento disponible |
| `ordenfix.legal.public-documents.enabled` | `false` | Lectura documental publicada, rol dedicado y preflight acreditados |
| `ordenfix.legal.public-requirements.enabled` | `false` | Conjunto `REGISTRO/es-AR` vigente y rol dedicado acreditados |
| `ordenfix.legal.registration-consent.enabled` | `false` | Escritor restringido, keyrings y metadata propios acreditados |
| `ordenfix.legal.registration-enforcement.enabled` | `false` | Activar sólo después de frontend compatible, consentimiento y ambas lecturas públicas |
| `ORDENFIX_LEGAL_PUBLICATION_MANIFEST` y contactos `VITE_*_EMAIL` | Sin publicación/contactos definitivos | Release inmutable aprobado y contactos coincidentes; gates públicos de T6 |
| `photos.private.enabled` | `false` | Rol y publicación contextual, Cloudinary, retención y recorridos T3–T5 acreditados |
| `exports.jobs.enabled` | `false` | Claves propias, capacidad, limpieza y recuperación acreditadas; Excel operativo no necesita este worker |
| `MAIL_ENABLED` | `false` | Remitente/dominio y enlaces HTTPS acreditados; secreto sólo en backend |
| `MP_ENABLED` / `MP_CHECKOUT_ENABLED` | `false` / `false` | Mantener la pausa; activación futura con gate específico, no parte automática de este plan |
| `VITE_WORKSHOP_CLOSURE_ENABLED` / `ordenfix.cuenta.cierre.http-enabled` | `false` / `false` | Mantener cierre integral fuera de salida pública; no encender workers/borrados para completarlo |
| `ORDENFIX_RECOVERY_QUARANTINE` | Ausente/`false` | `true` externo antes de conectar una restauración; además aislamiento de red/proveedores |

La secuencia aditiva para staging es: acreditar publicación y lectores → habilitar consentimiento → desplegar frontend compatible → verificar registro/replay → habilitar enforcement. El candidato público requiere comprobar el conjunto coordinado, no solamente que el build esté verde. El guard público actual no valida `VITE_REGISTRATION_CONSENT`: su coordinación se acredita explícitamente en T3/T4.

- Frontend legacy + enforcement `false`: el backend permite legacy sólo si faltan los tres elementos legales.
- Frontend legacy + enforcement `true`: registro sin esos elementos devuelve `428`; es la combinación que no se debe promover.
- Bloque legal completo + consentimiento `false`: devuelve `503` sin crear cuenta. Un bloque parcial devuelve `400`, incluso en rollout aditivo.
- Enforcement sin consentimiento o sin ambas lecturas públicas impide el arranque; no es una forma válida de exigir aceptación.

Los lectores usan `ordenfix.legal.public-document-read.*` y `ordenfix.legal.public-requirements.*`; registro usa `ordenfix.legal.registration-consent.*`, sin heredar credenciales del datasource principal. Seguir los preflights y keyrings del [contrato backend](../../../mvrg-backend/FRONTEND_INTEGRATION.md); no copiar SQL de laboratorios a una base compartida ni asumir que un alias de entorno configura un keyring.

## Tareas y criterios de cierre

- [x] **T1 Unificar el plan y los puntos de entrada documentales.**
  - Ruta: escritor delegado; preparación requiere más de cuatro archivos entre ambos repositorios y edición de dos documentos no triviales.
  - Alcance: este documento, `DEPLOY.md` y referencias breves desde README, acta inicial y README legal.
  - Aceptación: un solo backlog actual, pendientes verdaderos separados de actas históricas, comandos/flags contrastados y referencias válidas.
  - Checks aprobados (2026-10-02): 51 enlaces/anchors locales válidos, `git diff --check`, alcance de cinco archivos documentales y contraste de flags/runbooks. Suites y harness runtime N/A: no cambia comportamiento.
  - Commit de unidad: `beed4301d6cb640ceb7d500eb8c5fe6272780cba`, `docs(release): unify production launch plan`; 279 adiciones + 49 eliminaciones = 328 líneas autoradas.
  - Disposición nativa: `passive`, motivo `non_executable_only`, `review_due=false`, sobre `fd92975..beed430`. No requiere revisores ni representa aprobación de las features heredadas.
  - Assessment inicial no evaluable por inventario/permisos; preflight y reintento con inventario canónico de `.atl/` excluido y permisos del índice temporal completaron la evaluación. Sin fallos documentales pendientes.
- [ ] **T2 Cerrar la regresión local del candidato.**
  - Depende de T1. Ruta: verificadores delegados frontend y backend; preparación abarca más de cuatro archivos de runners/configuración/empaquetado. Padre conserva tracking, espejo y commits.
  - Candidatos: frontend `6f972d6389f016510f01c9b96fda159a3a065b84` y backend `f2141f60f2023405ae7ddec5987f13784dd2e76b`; copias de esos commits sin secretos, Node compatible y Java 21. Docker exclusivamente local, imágenes existentes y sin descargas/proveedores.
  - Aceptación: suites aplicables frontend/backend, empaquetado sin secretos e imagen/arranque V40 del candidato exacto; laboratorios aislados cuando corresponda.
  - Checks fallidos, omitidos o no disponibles se registran; no sumar reportes históricos como si fueran un integral fresco.
  - Separar integral backend, labs reales locales y build público: son tres evidencias distintas. Conservar reportes por comando/candidato antes de que otro runner los sobrescriba.
  - TDD ON heredado, runners Vitest/Playwright y Maven Surefire/Failsafe; ejecución de verificación, sin cambio de comportamiento ni nuevo ciclo RED/GREEN. RDD ON global; boundary documental previo `6f972d6`. Forecast T2 actualizado: 35–50 líneas de tracking, incluido registro de disposición, sin source/tests; recalcular antes de cada commit, sin comprimir evidencia para alcanzar un umbral.
  - Checks y limpieza observados se registran abajo; T2 permanece abierta por cuatro fallos móviles simulados e imagen/arranque Docker pendientes. Un fallo no autoriza su corrección ni marcar T2 cerrada.
  - Commit parcial de evidencia: `f2351bd96f888bf31229979f0a70e28f9ef39b36`, `docs(release): record isolated candidate verification`; 27 adiciones + 7 eliminaciones = 34 líneas autoradas. No modifica fuentes ni cierra la aceptación de T2.
  - Disposición nativa: `passive`, motivo `non_executable_only`, `review_due=false`, sobre `6f972d6..f2351bd`. No requiere revisores ni aprueba las features heredadas o la release.
  - Evidencia local preservada: `/private/tmp/ordenfix-t2-frontend-RbUT0I` y `/private/tmp/ordenfix-t2-backend-proof.uzUNUd`. No mezclar fallos de configuración temporal con defectos del candidato; el integral backend y los labs conservan reportes separados.
  - Frontend observado: 1.107 Vitest en 114 archivos y 43 tooling aprobados; lint, TypeScript y build técnico con exit 0. Bundle principal 665,81 kB / 191,61 gzip; advertencia de tamaño, no fallo. Gates públicos omitidos automáticamente; no se acredita build público.
  - Playwright simulado completo: 163 aprobados / 4 fallidos de 167, sin skips/flaky; desktop 95/95, cada uno de los cuatro proyectos móviles 17/18. Falla el smoke `e2e/mobile.spec.ts:378`: JWT de `e2e/helpers.ts:8` sin `tallerId`; `pendingCharge.ts:29–31` rechaza ese alcance y Cobros bloquea correctamente el CTA. No se corrigió el fixture ni se debilitó la protección.
  - Prueba frontend: `results/frontend-summary.json`, `results/playwright.json` y logs/traces bajo la raíz indicada. Los 31 PNG generados se preservaron aparte; copia de fuentes verificada idéntica antes/después y puerto 15173 liberado. Intentos iniciales de configuración/permisos y error transitorio de lectura Git no son defectos del candidato; no hubo reparación del repositorio.
  - Backend integral observado sobre `f2141f60f2023405ae7ddec5987f13784dd2e76b`: `./mvnw -o -B clean verify`, Java 21, exit 0 / `BUILD SUCCESS`, duración 1 h 39 min. Surefire: 8.206 tests en 283 XML; Failsafe: 2.106 en 137 XML; total 10.312, sin fallos, errores ni omisiones.
  - Prueba integral preservada antes de los labs bajo `/private/tmp/ordenfix-t2-backend-proof.uzUNUd`: `reports/full-surefire`, `reports/full-failsafe`, `full-verify-summary.json` y `full-verify.log`. No se sustituye por reportes focalizados posteriores.
  - Empaquetado: `verify-no-secret-properties-in-jar` aprobó tres JAR; `jar-packaging-proof.json` confirma ausencia de entradas prohibidas de configuración, recursos de tests y helpers de ejecución externa, y coincidencia de `application.properties` y V40 con el source versionado. Es un guard de entradas acotado, no una certificación exhaustiva de ausencia de secretos; no acredita la imagen Docker.
  - Smoke del JAR principal exacto, SHA-256 `74905d30eee62e2bd37dbe3c2fd738b7aa2eb1bf4af2d2e2af2226915085078b`: 40 migraciones, última V40, arranque JPA con `ddl-auto=validate`, health/readiness/liveness `UP` y exit 0. Prueba: `jar-smoke-{artifact.txt,app.log,exit,schema.txt,health.json,readiness.json,liveness.json,cleanup-verification.txt}` bajo la raíz backend. No certifica imagen Docker.
  - El primer intento de conectividad de puertos con red `--internal` falló antes de ejecutar Java y se preservó separado. El reintento usó bridge efímero propio y puerto publicado sólo en loopback, sin modificar el candidato; ese fallo no es un defecto de arranque de la app.
  - Labs reales locales ejecutados en serie: Registration 14, Photos 4 y Export 2 casos aprobados; sus tres orquestadores Java aprobaron un test cada uno por separado. Cada Maven terminó exit 0, sin fallos, errores, omisiones ni flaky. Fotos usó almacenamiento local; proveedores apagados.
  - Prueba de labs: `labs-summary.json` y reportes independientes en `labs/<nombre>` bajo la raíz backend. `cleanup-final.txt` confirma seis contenedores preexistentes sin cambios, ningún contenedor añadido y ausencia de listeners en 5175, 5176, 5177 y 50792.
  - Integridad: 1.281 archivos versionados del snapshot backend y 590 del frontend verificados byte a byte; HEAD original backend y cambios locales preexistentes preservados. No hubo cambios de fuentes/pruebas/Dockerfile ni operaciones T3–T7.
  - Rollback del registro T2: revertir sólo sus cambios documentales en este tracker; no revertir fuentes ni eliminar artefactos de prueba, recursos preexistentes o datos de usuarios.
  - Imagen Docker original: build offline con bases cacheadas, `pull=false` y `network=none` falló por falta de `org.mapstruct:mapstruct-processor:pom:1.6.3` en la caché de la capa Maven (`docker-build.log`). Imagen/arranque de imagen pendientes; no demuestra un defecto de código ni fallo de CI remoto. Sin descargas ni modificación del Dockerfile.
- [ ] **T3 Preparar staging y la matriz coordinada.**
  - Depende de T1; despliegue sólo después de T2. Ruta prevista: preparación delegada, aprobación operativa del titular.
  - Aceptación: URLs, roles dedicados, permisos/preflights, keyrings, flags y SHAs/digests identificados. No aplicar scripts de laboratorio a una base compartida.
  - Para probar lectores y consentimiento, identificar publicación, hashes y audiencia/entorno permitidos. La preparación editorial de T6 puede avanzar en paralelo; T3 no exige dar T6 por cerrada. Una prueba sintética sólo puede acreditar staging privado aislado, sin usuarios reales ni apertura pública; no satisface T6, no convierte fixtures en publicación aprobada ni autoriza eludir el guard o fabricar aprobaciones.
  - Requiere autorización de destino, operaciones y credencial/sesión antes de cualquier acceso remoto.
- [ ] **T4 Acreditar los recorridos de staging.**
  - Depende de T3. Ruta prevista: verificación delegada con datos sintéticos y alcance autorizado.
  - Aceptación: cuenta/consentimiento/replay, email HTTPS, ADMIN/USER y aislamiento, reparación/presupuesto/entrega con y sin Cobros, fotos privadas y exportación según activación; móvil y escritorio.
  - Incluir fallo de lectura legal, revisión desactualizada, ETag/CORS y `428`; lectura de fotos sólo por backend, denegación anónima y borrado/reintento. No confundir ausencia del asset con eliminación de backups/CDN.
  - No se ejecutan email, Cloudinary ni MP por disponer de credenciales ambientales.
- [ ] **T5 Cerrar operación y recuperación.**
  - Depende de T3/T4. Ruta prevista: verificación operativa delegada; decisiones de retención/responsables del titular.
  - Aceptación: restore real, preservación de claves, cuarentena antes de reapertura, rollback, alertas y responsables, retenciones y circuito atendido de datos/baja.
  - Restaurar primero en un entorno aislado; documentar RPO/RTO, responsables y prueba de reapertura. Una comparación compatible de cierres no autoriza por sí sola reabrir la base.
  - Limpieza histórica exige inventario concreto y autorización independiente; no equivale a una eliminación integral de backups/CDN.
- [ ] **T6 Publicación definitiva y gates públicos.**
  - Depende de evidencia técnica/operativa aplicable. Ruta prevista: preparación documental delegada y aprobación profesional/operativa.
  - Aceptación: identidad/contactos/oferta/retenciones coherentes, revisión profesional, publicación inmutable/hashes, importación/promoción/readiness y gates públicos aprobados.
  - Registrar `publicationId`, hashes, resultados editoriales y build público del mismo candidato, sin guardar secretos. Readiness editorial `READY` no reemplaza readiness público de staging.
  - La activación pública exige el release inmutable realmente aprobado y repetir registro y checks públicos contra esa publicación y sus hashes; una prueba sintética previa no reemplaza esta evidencia.
  - Fixtures y borradores nunca reemplazan publicación real; operación editorial remota requiere autorización específica.
  - Hallazgo T2: el build copia el prototipo `public/OrdenFix project naming/OrdenFix.dc.html`; el diagnóstico de artefactos emite `PRO_PRICE_LITERAL_FOUND` (líneas 299/611). Precio remoto de la app ya existe, pero eso no limpia los archivos estáticos. Resolver el alcance del artefacto antes del gate, sin borrado autorizado por este hallazgo.
- [ ] **T7 Release conjunta y apertura.**
  - Depende de T1–T6. Ruta prevista: coordinación del titular y ejecución acotada autorizada.
  - Aceptación: versiones/digests exactos, CI aprobado, revisión pendiente resuelta según política, go/no-go, smokes y rollback.
  - Antes de promover: T1–T6 aplicables cerradas, decisión TRIAL/FREE resuelta y ninguna omisión bloqueante. T7 se cierra después de la release y el smoke autorizados, con vigilancia y rollback a artefacto/configuración identificados.
  - Push, PR, merge y deploy no están autorizados por este documento.

## Comandos de verificación previstos

**No ejecutados por T1.** Antes de cada corrida, identificar el candidato, recursos locales y configuración efectiva, excluir secretos/proveedores y autorizar cualquier descarga necesaria. No reutilizar una base compartida. Los E2E reales requieren Java 21, Docker local y backend hermano; conservar almacenamiento local y Cloudinary opt-in ausente.

```sh
# Desde frontend: suite Vitest + guard, estáticos y build técnico local
npm test
npm run lint
npm run typecheck
npm run build

# Desde backend, con entorno aislado y Java 21: integral y empaquetado
./mvnw -o -B clean verify

# Desde frontend: labs locales descartables, uno por vez
npm run test:e2e:registration-real
npm run test:e2e:photos-real
npm run test:e2e:export-real

# Sólo con publicación real/configuración autorizada de T6
npm run check:public-release
npm run build:public
```

`-o` exige dependencias Maven ya cacheadas; si faltan, registrar el bloqueo, no descargar implícitamente. El build técnico local omite el gate público; CI/preview comprueban runtime HTTPS y producción ejecuta el guard completo. Los runners reales no autorizan activar email/MP/Cloudinary ni el laboratorio de cierre. Para el entorno mínimo y runner Failsafe sin reuso de recursos, ver el [tracker V40](integrated-browser-harness-v40.md). Los smokes HTTP de staging/producción y los diagnósticos de restore se definirán cuando exista autorización operativa explícita.

## Política de trabajo y verificación

- TDD ON procede de la elección explícita previa, registrada en [charge-session-expiry.md](charge-session-expiry.md). Runner frontend: Vitest; backend: Maven Surefire/Failsafe. Para T1 no hay cambio de comportamiento: RED/GREEN y harness runtime son N/A; se usan checks documentales, sin desactivar TDD.
- RDD ON, fuente global, verificado con `gentle-ai review mode status`. Las revisiones previas diferidas no pasan a aprobadas. El candidato de T1 es su commit documental desde `fd92975`, no la rama funcional acumulada.
- Rama documental: `codex/production-release-plan`, creada desde `fd92975`; el backend no cambia de rama.
- Delivery: `ask-on-risk`. Forecast T1: 300–360 líneas documentales autoradas. Running count: 328 de la unidad inicial más el cierre de tracking registrado abajo. No hay PR ni estrategia de cadena elegida.
- La integración futura debe contar también los cambios funcionales heredados contra `main`: 1.597 líneas frontend y 2.751 backend autoradas (adiciones + eliminaciones locales). Resolver una estrategia de cadena y sus límites antes del gate aplicable; estas cifras no crean PRs ni autorizan push. El umbral aproximado de 400 es orientativo, no un motivo para omitir pruebas o comprimir documentación.
- Cada tarea se cierra sólo con evidencia observada, actualización de este documento/espejo y commit de unidad de trabajo. Fallos y pendientes no se ocultan con checkboxes.
- Rollback T1: retirar únicamente el plan y los cambios documentales de esta unidad; no revertir features, migraciones ni actas históricas.

## Progreso y siguiente paso

T1 cerrada: plan canónico, guía corregida y tres puntos de entrada actualizados. Los 51 enlaces/anchors locales y el whitespace pasaron; archivo y espejo se leyeron completos. El commit documental tuvo disposición pasiva; las revisiones funcionales previas siguen diferidas.

T2 conserva el integral backend, empaquetado, smoke del JAR y tres labs reales locales aprobados, con evidencia y limpieza acreditadas. Sigue abierta por cuatro fallos del fixture móvil simulado y la imagen/arranque Docker offline pendientes; el prototipo con precio fijo de T6 no se corrigió. El siguiente paso es resolver el alcance autorizado de esos bloqueos, no promover el candidato.

La política comercial pendiente debe resolverse antes de cambiar capacidades o habilitar contrataciones. No se ejecutaron operaciones T3–T7 ni se declara build público, staging o producción aprobados. La evidencia local tiene un commit documental pasivo; las revisiones funcionales previas siguen diferidas.

Conteo de cierre de tracking: 11 adiciones + 5 eliminaciones = 16 líneas; running total T1: 344 líneas autoradas. La unidad inicial conserva su identidad y evidencia aunque este registro se complete en un commit documental posterior.

Conteo T2: 34 líneas de la unidad de evidencia, más 8 de este registro de commit/disposición; running documental acumulado: 386 líneas autoradas. Sin PR ni estrategia de cadena elegida; recalcular antes del siguiente commit.

El espejo Engram usa `odd/production-release/tasks` y el locator `odd/tasks/production-release.md`; archivo y espejo se verifican por separado. El cierre documental no modifica el estado pendiente de T2–T7 ni convierte revisiones diferidas en aprobaciones.

## Referencias principales

- [Criterios y actas de salida inicial](../../docs/plans/2026-09-08-salida-inicial-alcance-y-cierre.md).
- [Laboratorios V40 y límites](integrated-browser-harness-v40.md).
- [Deploy frontend](../../DEPLOY.md).
- [Deploy backend](../../../mvrg-backend/DEPLOY.md).
- [Fotos privadas y evidencia real local](../../../mvrg-backend/docs/operations/private-photos.md).
- [Email](../../../mvrg-backend/docs/operations/email.md).
- [Exportaciones](../../../mvrg-backend/docs/operations/exports.md).
- [Datos y baja](../../../mvrg-backend/docs/runbooks/solicitudes-datos-y-cierre.md).
- [Restore y cuarentena](../../../mvrg-backend/docs/runbooks/cierre-recuperacion-backup.md).
- [Mercado Pago](../../../mvrg-backend/docs/runbooks/mercadopago-release.md).
