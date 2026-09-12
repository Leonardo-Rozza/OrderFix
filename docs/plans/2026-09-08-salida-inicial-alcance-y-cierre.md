# OrdenFix — alcance y criterios de la salida inicial

Fecha: 2026-09-08

Estado: cuenta, taller/empleados, reparación/presupuesto y control opcional de cobros verificados
localmente con navegador → HTTP → PostgreSQL. Los cortes y sus límites se documentan abajo.
En Evidencia y documentos, resumen, fotos y confirmación contextual están verificados localmente.
Quedan la acreditación de Cloudinary real y la limpieza identificada de los datos históricos de
prueba, autorizada el 2026-09-12 en lugar de migrarlos. Confianza y cuenta y Operación real conservan sus pendientes;
todavía no se acredita disponibilidad en staging.

## Ajuste de prioridades — 2026-09-12

El titular del proyecto confirma que las cuentas y datos históricos existentes son
de prueba y autoriza descartarlos. Para preparar la salida se elige limpiar ese
conjunto en lugar de construir una migración de fotos/usuarios legacy. Primero se
identificarán la base, las cuentas y los objetos concretos del proveedor afectados;
esta decisión no ejecuta todavía un borrado, no autoriza borrar bases ajenas y no
modifica los esquemas o migraciones congelados. Quitar las cuentas no acredita por
sí mismo que se hayan eliminado sus archivos externos.

La identidad del prestador y su alta se definirán al final, después de completar
MP y Email. Los contactos y textos definitivos se cerrarán en esa etapa; no se
volverán a pedir como condición para continuar con el desarrollo técnico. Siguen
siendo necesarios antes de habilitar la salida pública, sin publicar borradores.

Se continúa con las capacidades técnicas que no dependen de esos datos. Para fotos,
la implementación privada se conserva y el próximo paso de integración requiere
un entorno Cloudinary identificado y sus credenciales sólo en backend: cloud name,
API key y API secret. Se probarán carga, lectura autenticada, denegación de acceso
anónimo y borrado con imágenes sintéticas. La política de retención de futuros
clientes sigue pendiente; descartar datos de prueba no la reemplaza.

MP conserva su alcance de suscripción del taller a OrdenFix. No se incorpora cobro,
validación de acreditaciones ni facturación fiscal del taller a sus clientes.
Este ajuste documental se valida por revisión del diff, sin repetir suites de
runtime, sin activar servicios externos ni realizar push.

## Email — continuación acordada el 2026-09-12

El usuario confirmó propiedad de `orden-fix.com.ar`. Vercel muestra el dominio raíz
y `www` vinculados al proyecto `order-fix`, con redirección a `www` y certificados
administrados. El repositorio conectado es `Leonardo-Rozza/OrderFix` y producción sigue `main`;
el antiguo nombre del remoto redirige a ese mismo repositorio. Falta acreditar la
versión nueva desplegada y el recorrido con la API.
El dominio de envío `cuenta.orden-fix.com.ar` ya está Verified en Resend, región São
Paulo, con los tres registros DNS publicados bajo autorización explícita del usuario.
La API key conserva permisos de envío, sin acceso administrativo a dominios.

Se divide el trabajo restante de Email en tres cortes acotados:

- **A cerrado localmente:** credenciales conectadas al SMTP existente, launcher que
  importa secretos sólo al arrancar, TLS obligatorio/timeouts y recuperación enviada
  después del commit con HTML escapado y errores sanitizados. Backend: 61 pruebas
  focalizadas aprobadas y cuatro escenarios del launcher simulado. No hubo envío real.
- **B cerrado:** dominio Verified, DKIM/SPF/MX publicados y
  remitente `notificaciones@cuenta.orden-fix.com.ar` configurado localmente. Un único
  correo sintético autorizado, enviado por el adaptador Java real, figura Sent/Delivered
  en Resend (2026-09-12 10:12 -03). El titular confirmó la recepción; no especificó
  Recibidos/Spam. No se realizó otro envío.
- **C pendiente de staging:** registro, verificación y recuperación de contraseña con
  frontend/backend reales, enlaces HTTPS y operación del correo.

La implementación quedó en backend `93860d4`; su evidencia está en
`docs/plans/2026-09-12-email-transaccional-implementation.md`. El corte B se registra en
`docs/plans/2026-09-12-email-dominio-entrega-implementation.md`; los pasos operativos en
`docs/operations/email.md`. La API key se conserva sólo en backend, nunca en `VITE_*`.
El remitente de cuenta no se presenta como canal de soporte o privacidad. Identidad,
alta y contactos definitivos conservan su fase al final, después de MP y Email.
Este corte frontend es documental, se valida por revisión de diff y no repite runtime.

## Integración a main y siguiente trabajo — 2026-09-12

Se actualizaron las referencias con `git fetch origin` en ambos repositorios, sin
merge ni push. Ramas a integrar:

| Repositorio GitHub | Rama de trabajo | Destino |
| --- | --- | --- |
| `Leonardo-Rozza/OrderFix-B` | `codex/lanzamiento-publico-backend` | `main` |
| `Leonardo-Rozza/OrderFix` | `codex/frontend-refactor-checkpoint` | `main` |

Los `main` locales y remotos son ancestros de las ramas de trabajo: no hay commits
exclusivos de main que deban incorporarse antes. Las otras ramas locales del backend
ya están contenidas en la de lanzamiento y no requieren merges separados.
`origin` del frontend conserva el nombre `mvgr-reparaciones-frontend`; GitHub redirige
esa URL a `OrderFix`, el mismo repositorio conectado a Vercel. No se cambió el remoto.

El usuario realizará el push y merge. Para revisión por PR, publicar cada rama desde
su repositorio y abrir el PR contra main:

```sh
git -C /Volumes/DiscoExtern/Desktop/mvrg-backend push -u origin codex/lanzamiento-publico-backend
git -C /Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend push -u origin codex/frontend-refactor-checkpoint
```

Vercel `order-fix` sigue **main** para Production y tiene asignación automática de
los dominios productivos activada. Se recomienda revisar primero el preview/API del
entorno y sus gates antes de fusionar frontend a main. Integrar código no sustituye
la preparación del despliegue ni publica secretos locales.

La ejecución local de `npm run check:public-release`, actualizada tras el corte B de
pulido, continúa bloqueada por URL API HTTPS, contactos legal/privacidad/soporte y
manifiesto de publicación no configurado. El precio literal PRO ya fue retirado.
Es un resultado de la configuración local,
no una inspección de valores privados del entorno Vercel. No se omite el guard.

Se puede continuar en local: los recorridos principales cuentan con evidencia previa.
Aún faltan Email C con enlaces reales, integración y borrado de fotos contra Cloudinary
real, prueba MP contra el proveedor y operación de staging/backup-restauración. Identidad
y contactos definitivos conservan su fase posterior a MP y Email.

MP ya implementa suscripción PRO, firma/inbox de webhooks, duplicados/reintentos,
conciliación y cancelación, con pruebas locales; su sandbox real sigue pendiente.
El siguiente corte debe preparar aplicación/cuentas/credenciales de prueba y HTTPS
para retorno/webhook (túnel local o staging), y acreditar alta/retorno/activación,
rechazo, cancelación y reintentos según el runbook backend. El corte B de pulido ya
resuelve la oferta/contratación apagada en Planes y el precio literal señalado por el
guard, con pruebas locales. MP sigue limitado a la suscripción del taller
al SaaS; no interviene en cobros a sus clientes. No se activaron flags de MP.

## Decisión de producto

### Continuación local — pulido de experiencia, 2026-09-12

El titular pide priorizar claridad del frontend y utilidad/presentación del Excel
mientras se completan las dependencias de salida. El diagnóstico y la propuesta de
cuatro cortes locales se documentan en
[Pulido local y pendientes](2026-09-12-pulido-local-y-pendientes.md): Excel, Planes y
permisos, Inicio/Clientes en móvil y comprobación final. Este ajuste prioriza ese
trabajo antes del sandbox de MP descrito arriba; no lo declara terminado ni activa
el proveedor. **A está cerrado localmente:** Excel con formato/tipos útiles y descarga
con alcance y errores claros; 5 tests backend, 13 Vitest y 3 Playwright aprobados.
Los límites de la revisión visual y de integración están en el acta enlazada.
**B también está cerrado localmente:** precio/disponibilidad del servicio y acciones
de Planes acordes al rol, conservando capacidades y cancelación. Pasaron 51 pruebas
backend, 48 Vitest y 7 Playwright; capturas móvil/escritorio, typecheck y lint revisados.
No se activó MP ni se acreditó su sandbox. **C–D siguen pendientes; el próximo es
Inicio y Clientes en móvil.**

La base funcional conserva su evidencia local previa. Fotos contra Cloudinary real,
Email C, MP, solicitudes/cierre y despliegue/recuperación mantienen sus pendientes.
La identidad y los contactos definitivos siguen reservados para la etapa acordada.

### Alcance de la primera salida

La prioridad es completar una primera salida controlada con pocos talleres y recorridos utilizables.
Este documento ordena el trabajo pendiente de los planes de lanzamiento y del bloque 15. Los planes
anteriores conservan contratos y evidencia histórica; su lista completa de mejoras deja de representar
lo imprescindible para esta salida. Cada trabajo nuevo debe resolver un criterio de cierre de abajo.

### Presupuestos, cobros y documentos

- El taller define el presupuesto. OrdenFix permite presentarlo y registrar su aceptación o rechazo.
  Aceptar un presupuesto no inicia un pago ni registra automáticamente un cobro.
- El cliente paga al taller por fuera de OrdenFix, por el medio que acuerden entre ellos.
  OrdenFix no procesa fondos, verifica acreditaciones, concilia pagos ni interviene en ese acuerdo.
- El taller puede cargar después lo recibido si quiere utilizar el módulo de trazabilidad y control.
  Registrar cobros es opcional para utilizar la gestión de reparaciones; no se debe exigir un pago
  procesado por OrdenFix para aceptar un presupuesto, trabajar o entregar el equipo.
- Importes, medios, referencias y estados de cobro describen lo declarado por el taller. Un saldo
  calculado o un movimiento registrado no prueban acreditación bancaria.
- Se conservan las validaciones de datos, permisos y consistencia del registro manual. La aclaración
  de producto no autoriza eliminar esas protecciones ni alterar contratos existentes sin revisar el flujo.
- Los documentos de reparación son presupuestos y resúmenes digitales operativos. El resumen debe
  identificarse como informativo y sin validez fiscal; no se presenta como factura ni comprobante fiscal.
  Esto no declara que una aceptación de presupuesto carezca de efectos entre taller y cliente.
- La suscripción del taller al SaaS OrdenFix es una relación distinta de estos cobros. PRO/Mercado Pago
  y las ampliaciones de email mantienen sus fases posteriores. Este acuerdo no elimina funcionalidades
  existentes de suscripción ni decide su modalidad comercial; antes de la salida se comprobará qué queda
  accesible y qué debe permanecer deshabilitado.

### Protecciones que se conservan

El titular es el único ADMIN y crea empleados USER. Se mantienen aislamiento entre talleres,
autenticación, permisos, integridad de evidencia, reintentos seguros, privacidad y vías de gestión
de datos y baja. V27/V28 y los contratos congelados conservan su protección.

## Evidencia disponible al ajustar el alcance

- Backend: `74764df`, rama `codex/lanzamiento-publico-backend`, árbol limpio. M3B completo;
  la integración de registro HTTP/replay M3C sigue pendiente. El cierre previo registró 8.591 pruebas
  del integral; ese resultado no acredita un recorrido frontend ni un despliegue.
- Frontend: baseline `7545201`, rama `codex/frontend-refactor-checkpoint`. La lectura de código
  confirma carga manual de cobros, resumen digital y respuesta a presupuestos ya existentes.
- `src/pages/CajaPage.tsx` declara el carácter manual del registro. El resumen digital explica que
  no confirma acreditaciones. Los campos de método/alias/QR de un taller no son una integración de pagos.
- Se identificó una revisión de texto acotada: “Cobrar” y “Pagado” deben distinguir registro declarado
  de recepción verificada. La revisión de código no sustituye la prueba funcional del recorrido.

## Lista de cierre de la salida inicial

Cada fila requiere evidencia del flujo completo en el entorno de salida. Las comprobaciones locales
se detallan abajo; su validación en staging sigue pendiente. “Pendiente” no significa que toda la
implementación deba construirse nuevamente.

| Criterio | Evidencia necesaria para cerrar |
| --- | --- |
| Cuenta utilizable | Registro con consentimiento de la versión presentada, ingreso y reintento sin cuentas duplicadas; errores recuperables en frontend. |
| Taller y empleados | ADMIN crea empleado; USER opera lo permitido y no puede ejecutar funciones del titular ni acceder a otro taller. |
| Reparación y presupuesto | Crear reparación, emitir presupuesto, registrar aceptación/rechazo y avanzar hasta entrega sin procesar un pago en OrdenFix. Probar también el recorrido sin usar Cobros. |
| Control opcional de cobros | Registrar un cobro externo, consultar pendiente e historial y corregir según permisos; importes y textos describen registros del taller. Aceptar presupuesto no genera cobro. |
| Evidencia y documentos | Evidencia accesible sólo a quien corresponde, consentimiento aplicable y resumen informativo sin presentación fiscal. |
| Confianza y cuenta | Textos definitivos correspondientes al alcance, identidad/contactos reales, privacidad, uso de datos y camino operativo comprobado para solicitudes de datos y baja. |
| Operación real | Staging con configuración coherente, recorridos completos en móvil, seguridad y errores críticos cubiertos, backup restaurado y recuperación del despliegue comprobada. |

La salida permanece pendiente mientras haya un bloqueo de estas filas. La etiqueta “controlada”
no habilita omitir seguridad, privacidad o publicar borradores legales.

## Cómo continúa el trabajo

1. Verificar el recorrido cuenta → taller/empleado → reparación → presupuesto → entrega, con y sin
   registro manual de cobros. Registrar únicamente faltantes observados, con su criterio afectado.
2. Resolver esos faltantes en cortes pequeños de extremo a extremo. La integración M3C ya pendiente
   se evalúa dentro de Cuenta utilizable; el cierre de un servicio interno no cierra esa fila.
3. Acreditar en staging la lista anterior y resolver los bloqueos restantes antes de proponer la salida.

Se reutiliza lo construido. No se agregan nuevas generalizaciones editoriales, automatizaciones ni
requisitos de capacidad hipotéticos como condición de esta salida. Las pruebas de concurrencia,
integridad y capacidad necesarias para el despliegue elegido siguen siendo parte de la verificación.
La retención de datos requiere una política y operación comprobables aunque su automatización se difiera.

N/O/P/Q del bloque 15 se revisan contra esta lista antes de abrir nuevos cortes. Esta decisión documental
no elimina sus controles ni cambia flags, guards, retenciones, rutas o contratos. Si un guard actual
requiere capacidades diferidas, se registra el conflicto y se resuelve explícitamente antes de desplegar.
No se activa bloqueo por aceptación pendiente sin frontend y vías de salida compatibles.

Cada corte conserva un commit atómico por repositorio, sin push, y preserva cambios ajenos y archivos
no versionados. Las pruebas son focalizadas según el riesgo; el integral se reserva para el cierre
coordinado o para cambios transversales/fallos que lo justifiquen. Un corte documental se verifica
con revisión del diff y de sus referencias, sin repetir suites de runtime.

## Fuentes

- [Plan general de lanzamiento](2026-08-23-lanzamiento-publico-confianza-cuenta-plan.md).
- [Diseño de cobros manuales y resumen digital](2026-08-23-identidad-cobros-resumen-digital-design.md).
- Backend: `docs/plans/2026-09-06-legal-account-consent-implementation.md` y su diseño asociado,
  en `/Volumes/DiscoExtern/Desktop/mvrg-backend`.

## Corte cerrado — control manual de cobros y entrega opcional

Fecha: 2026-09-08. Baseline frontend `5f251ea`; backend conservado en `74764df`.

- La acción del detalle pasa de “Cobrar” a “Registrar cobro”. Detalle y formulario explican que se
  cargan pagos recibidos por fuera de OrdenFix; el estado completo se presenta como “Cobro completo
  registrado”, también en los lugares que reutilizan `PagoChip`.
- Se conservan APIs, validaciones de importes, permisos, límites de plan y cálculos. La aceptación
  de presupuesto y la entrega continúan separadas del registro manual de cobros.
- Dos pruebas nuevas de navegador entregan una reparación con saldo pendiente y cero cobros, con
  el módulo habilitado y deshabilitado. Comprueban que la única escritura es el cambio de estado;
  cuando el módulo está deshabilitado tampoco se consulta Cobros. La prueba de aprobación pública
  ahora comprueba que sólo se envía la respuesta al presupuesto, sin cargar cobros ni iniciar checkout.
- El mock de cambio de estado conserva la transición para el siguiente GET, de modo que la prueba
  comprueba el estado visible tras el refetch. No representa persistencia PostgreSQL.

Validación aprobada: **40 Vitest focalizados, 9 Playwright desktop y 6 móviles** (320/390 px),
typecheck, ESLint de archivos afectados y revisión de diff. Playwright usa Vite con API simulada.
No se ejecutó Maven ni se acreditó staging. Los casos de aprobación y entrega son recorridos
separados; queda pendiente el recorrido integrado con backend real.

Comandos ejecutados:

```sh
npx vitest run src/components/PagoChip.test.tsx src/components/CobroFormModal.test.tsx src/pages/ReparacionDetallePage.test.tsx src/pages/ResumenDigitalPage.test.tsx src/pages/DashboardPage.test.tsx src/pages/SeguimientoPage.test.tsx src/api/mutations/cobros.mutations.test.tsx src/api/mutations/presupuestos.mutations.test.tsx
npm run typecheck
npx eslint src/components/PagoChip.tsx src/components/CobroFormModal.tsx src/pages/ReparacionDetallePage.tsx src/components/PagoChip.test.tsx src/pages/ReparacionDetallePage.test.tsx src/pages/ResumenDigitalPage.test.tsx src/pages/DashboardPage.test.tsx e2e/helpers.ts e2e/presupuesto.spec.ts e2e/reparacion.spec.ts e2e/mobile.spec.ts
npx playwright test e2e/reparacion.spec.ts e2e/presupuesto.spec.ts e2e/resumen-digital.spec.ts --project=chromium --workers=2
npx playwright test e2e/mobile.spec.ts --project=mobile-320 --project=mobile-390 --grep 'smoke móvil:|detalle con excedente:|resumen digital:' --workers=2
```

### Faltantes observados que orientan el siguiente trabajo

1. **Cuenta utilizable:** `RegisterPage` y su mutación sólo envían los cinco campos legacy.
   `AuthController.register` sigue delegando en `RegistroService`. El siguiente trabajo conecta
   el GET público de requisitos y el consentimiento visible con el servicio de registro ya construido:
   integración HTTP M3C, clave de idempotencia, revisión/actos, recuperación de errores y sesión.
   Después debe probarse navegador → backend → PostgreSQL real. No requiere otra generalización interna.
2. **Acceso de los primeros talleres:** la lectura de `PlanLimitService`, `UsuarioService` y
   `SuscripcionScheduler` confirma que empleados y registro de cobros requieren TRIAL/PRO;
   FREE permite sólo titular y hasta 25 reparaciones por mes. Antes de salir con Mercado Pago diferido
   se debe definir y comprobar qué capacidades tendrán los talleres iniciales. Este corte no modifica
   esa política ni los estados de suscripción.
3. **Recorrido real sin Cobros:** la lectura de `PresupuestoService` y `ReparacionServiceImpl`
   confirma que aprobación y entrega no exigen saldo pagado ni llaman al checkout. Hay pruebas backend
   de esos caminos, pero no se ejecutaron en este corte. La prueba existente
   `EstadoPagoTests.reparacionFreeSinCobrosQuedaSinCobrar` inicia en TRIAL, por lo que su nombre no
   acredita FREE/ACTIVA. La verificación real pendiente debe usar el plan explícito.

El próximo criterio prioritario es **Cuenta utilizable**. Esta comprobación frontend cierra el ajuste
de lenguaje y aporta evidencia de opcionalidad; las siete filas siguen requiriendo acreditación en el
entorno elegido. Commit: `fix(cobros): aclara registro externo y acredita entrega opcional`.

## Corte cerrado localmente — registro con consentimiento visible

Fecha: 2026-09-08. Baselines: frontend `aadfcf9`, backend `74764df`.
Se conecta el registro existente con el contrato legal disponible. Alcance: GET público de requisitos
y textos exactos, confirmaciones explícitas, POST con clave y bloque legal, reintentos seguros y sesión.
`VITE_REGISTRATION_CONSENT=true` habilita el flujo; ausente/false conserva rollout legacy y un valor
inválido bloquea el registro. La pantalla falla cerrada si no puede obtener las condiciones.
Los textos Markdown se leen completos como texto seguro, sin HTML activo ni nuevas dependencias.

Archivos frontend nominales: API y tests `src/api/registrationConsent.*`,
`src/hooks/useRegistrationConsent.ts`, `src/components/RegistrationConsent.tsx`,
`src/pages/RegisterPage.tsx` y su test, mutación/test de auth, `.env.example`, este plan y README.
Pruebas de navegador aisladas en `e2e-registration/registro.spec.ts` y
`playwright.registration.config.ts`, para activar el rollout sin modificar los E2E legacy.
Backend integra M3C sobre la ruta existente; su apertura nominal está en su plan del bloque 15.

La clave y el payload del intento viven sólo en memoria. Los reintentos conservan ambos ante
respuesta perdida; editar o revisar condiciones crea otra clave y las revisiones nuevas requieren
confirmaciones nuevas. No se publican borradores ni se activa el flujo en producción en este corte.

Validación frontend terminada el 2026-09-09: **46 Vitest focalizados**, typecheck, ESLint de los
archivos afectados, **6 Playwright de registro** (3 desktop y 3 móvil de 320 px) y **8 Playwright de
regresión** de autenticación, reparación y presupuesto. Todos aprobaron con la fuente final.
El build con `VITE_REGISTRATION_CONSENT=true` también aprobó; conserva el aviso de chunk mayor a
500 kB. Los guards de release y artefactos públicos quedaron `SKIPPED` por ser un build local:
este resultado no acredita preparación para publicación.

El primer foco encontró que un segundo submit podía liberar `isSubmitting` mientras el primer POST
seguía pendiente. Se corrigió con estado de envío propio y exclusión por intento, y se repitieron
el foco, typecheck, lint y navegador después de la corrección. No se debilitó la prueba.

```sh
npx vitest run src/api/registrationConsent.test.ts src/pages/RegisterPage.test.tsx src/api/mutations/auth.mutations.test.tsx src/store/auth.store.test.tsx
npm run typecheck
npx playwright test --config=playwright.registration.config.ts --workers=2
npx playwright test e2e/auth.spec.ts e2e/reparacion.spec.ts e2e/presupuesto.spec.ts --project=chromium --workers=2
VITE_REGISTRATION_CONSENT=true npm run build
```

Playwright usa API simulada; las pruebas separadas de backend utilizan MockMvc y PostgreSQL 16.
No constituyen un recorrido navegador → servidor → PostgreSQL ni acreditan staging. **Cuenta
utilizable** queda implementada localmente y requiere esa acreditación con publicación y
configuración reales. El siguiente trabajo se limita a resolver los faltantes observados de la lista
de salida; no abre automáticamente N/O/P/Q ni modifica TRIAL/PRO, cobros o email.

Cierre coordinado backend `d6e99d2` el 2026-09-09: **8.661 pruebas** en `clean verify` fresco, 7.327 Surefire y
1.334 Failsafe, sin fallos, errores, omitidas ni reintentos internos. Incluye las 55 integraciones del
foco de registro/sesión/legacy; no se suman corridas como casos diferentes. La revisión cruzada del
JSON, enums, errores y headers no encontró incompatibilidades con la pantalla. El backend mantiene
V27/V28/V29 congeladas y los flags apagados por defecto.

Commits atómicos de este cierre, uno por repositorio, sin push:
`feat(legal): integra consentimiento en el registro` y
`feat(registro): incorpora consentimiento de cuenta`. Se conservan `.agents/` y
`public/OrdenFix project naming/` fuera del commit.

## Corte cerrado — registro completo en laboratorio local

Fecha: 2026-09-09. Baselines: frontend `76fdcdd`, backend `d6e99d2`.
El titular autorizó continuar con la comprobación navegador → servidor → PostgreSQL. No hay un
staging identificado en la configuración versionada ni una publicación legal definitiva; se pidió
identificar ese entorno y se avanza con un laboratorio local aislado, sin usar datos reales.

Diseño: PostgreSQL 16 efímero y servidor Spring Boot HTTP real, con seguridad, CORS y sesión
productivos; fixtures técnicas de publicación y roles restringidos existentes. Playwright ejecuta
el frontend con consentimiento activado en loopback. El harness de pruebas es dueño del servidor
y de la base, valida después las filas durables y libera los recursos. No añade endpoints de control
ni cambia configuración productiva, migraciones, suscripciones o transportes de email.

Se elige este recorrido local reproducible porque reutiliza los fixtures y acredita la conexión
que faltaba. Repetir sólo los mocks no resolvería ese faltante; el staging remoto requiere las URLs,
la configuración y el contenido aprobado del entorno. La prueba local no sustituye esa acreditación.

Casos focales en escritorio y móvil 320 px: alta con lectura/confirmación explícita y sesión real;
pérdida de una respuesta 201 ya recibida del backend y reintento con la misma clave/payload;
fallo de red al leer requisitos que impide registrar sin fallback legacy. La interrupción de red es
una inyección de fallo de Playwright; las respuestas de negocio no se simulan. PostgreSQL debe
acreditar una única cuenta/evidencia por alta y ninguna escritura del caso bloqueado.

Lista nominal frontend: `playwright.registration-real.config.ts`,
`e2e-registration-real/registro.spec.ts`, `scripts/run-registration-real.mjs`, `package.json`,
README y este plan. Backend agrega un test opt-in `LegalRegistrationBrowserE2E` y su documentación,
reutilizando fixtures existentes; la lista exacta se registra en su plan antes de editar.
El nombre opt-in evita agregar dependencias de Node/navegador al gate Maven habitual.

Validación prevista: compilación de tests backend y ejecución focal de ese E2E, lint de archivos
frontend nuevos y revisión del diff. Sólo se amplía a pruebas de runtime o integral si un fallo o
cambio transversal lo exige. Un commit por repositorio, sin push y con archivos ajenos preservados.

### Evidencia de cierre

Ejecución final aprobada el **2026-09-09 a las 07:36:06 -03:00** mediante
`JAVA_HOME=<Java 21> npm run test:e2e:registration-real`. La compilación de los tests tomó 17.871 s
y el foco Failsafe 27.601 s. El XML registra **un harness JUnit aprobado que ejecuta y verifica seis
casos Playwright**, sin fallos, errores, omisiones ni reintentos; no se cuentan como siete recorridos.
Playwright terminó `passed`, con cero tests fallidos.

- Navegador Chromium de escritorio y móvil 320 px; frontend Vite real, aplicación completa con
  Tomcat y PostgreSQL **16.14**. Seguridad, CORS, JWT, tenant y servicios de perfil/suscripción/dashboard
  participaron del recorrido. El rate limiter estuvo activo, con límite de registro de 20 para
  permitir la matriz de prueba; no se acredita el límite productivo por defecto de cinco.
- Se leyó el texto visible exacto de cada documento, se confirmaron los requisitos obligatorios y
  se contrastaron revisión, actos y digests enviados. Las consultas privadas del frontend devolvieron
  200 con el JWT real y la identidad del titular creado.
- PostgreSQL confirmó cuatro usuarios/talleres/suscripciones nuevos y ninguno para los dos casos
  bloqueados. Se verificaron lotes, actos, documentos, HMAC de idempotencia, metadata cifrada y un
  token de verificación por cuenta. Perder y recuperar la respuesta no duplicó esos registros.
- Se acreditaron cuatro roles físicos distintos y no privilegiados: aplicación, registro,
  requisitos públicos y documentos públicos. Los grants adicionales pertenecen sólo a la base efímera.
- Lint y TypeScript focales aprobaron. El guard de configuración rechazó URL ausente y remota;
  con loopback enumeró exactamente seis casos sin iniciar servicios durante esa comprobación.
- El contenedor exclusivo fue eliminado y los puertos de Vite, Tomcat y PostgreSQL quedaron cerrados.

Dos corridas previas no se presentan como aprobadas: la primera encontró una consulta de secuencias
que asumía `id` en `reparacion_fotos`; la segunda pasó navegador/SQL pero falló al cerrar manualmente
el contexto antes de los callbacks de Spring. Se corrigieron sólo el harness y su ciclo de vida.
La revisión también reforzó identidad de procesos al limpiar, normalización de URL y comparación
literal de los documentos. La fuente final pasó el foco completo después de esas correcciones.

Este corte modifica pruebas, su runner y documentación. La lógica productiva, dependencias y
migraciones congeladas conservan sus versiones; no se repitió `clean verify`. Las 8.661 pruebas
del corte anterior siguen siendo baseline, no evidencia nueva de éste.

**Cuenta utilizable tiene ahora evidencia local del recorrido completo.** Staging sigue pendiente:
hay que identificar las URLs/entorno, configurar los recursos y usar contenido legal aprobado.
Las fixtures técnicas no se publican. Tampoco se acreditan HTTPS/proxy, entrega de email, cobros,
Mercado Pago ni los demás recorridos de la lista mediante estos seis casos.

Backend verificado y cerrado en `a252aba`. Commits del corte, uno por repositorio y sin push: backend
`test(legal): acredita registro completo con navegador` y frontend
`test(registro): verifica alta real y recuperacion`. Archivos ajenos preservados.

## Corte cerrado — taller y empleados en laboratorio local

Fecha: 2026-09-09. Baselines: frontend `1df6756`, backend `a252aba`.
Se continúa el criterio **Taller y empleados** de la salida inicial autorizada. El corte acredita
el comportamiento existente: titular ADMIN único, alta de USER, operación permitida, restricciones
por rol, aislamiento entre talleres y desactivación. No redefine capacidades ni política comercial.

Diseño: ampliar el laboratorio existente con un recorrido por dispositivo, conservando los seis
casos de registro. Cada recorrido crea un titular mediante el registro real, comprueba TRIAL y la
capacidad de empleados, crea el USER por UI e inicia su sesión real. El empleado crea un cliente
por UI. Se contrastan operaciones permitidas (200) con administración prohibida (403), promoción
de rol rechazada (400) y acceso de otro titular a IDs existentes (404). Lecturas posteriores
comprueban identidad y valores sin cambios; al final el titular desactiva al empleado desde la UI,
y se rechazan tanto su token anterior como un nuevo login. PostgreSQL contrasta pertenencia,
roles, estado final, cliente y evidencia de las altas, sin duplicaciones.

Se reutiliza el titular sintético de otro taller ya presente en el laboratorio. No se añaden
fixtures de negocio, endpoints de control, dependencias ni respuestas simuladas. La alternativa
de otra matriz MockMvc no probaría el navegador; crear un harness nuevo duplicaría infraestructura.
Los helpers de registro se extraen sin cambiar sus aserciones para usarlos en el nuevo recorrido.

Lista nominal frontend: `e2e-registration-real/helpers.ts`, `e2e-registration-real/registro.spec.ts`,
`e2e-registration-real/empleados.spec.ts`, README y este plan. Backend amplía únicamente
`LegalRegistrationBrowserE2E`, README y su plan. Configuración, lógica productiva y migraciones
V27/V28/V29 permanecen congeladas. Un commit atómico por repositorio, sin push.

Validación prevista: lint y TypeScript de las fuentes E2E; compilación de tests y el único harness
opt-in, que debe ejecutar ocho casos de navegador en escritorio y móvil 320 px. Revisión del diff,
resultados SQL y liberación de recursos. El gate integral se reserva para cambios transversales o
fallos que lo requieran. Esta evidencia local no acredita staging ni FREE/ACTIVA, cuyo acceso a
empleados múltiples sigue sujeto a la decisión pendiente para los talleres iniciales.

### Evidencia de cierre

Gate aprobado el **2026-09-09 a las 09:06:24 -03:00**. Se ejecutaron secuencialmente las dos fases
del runner `test:e2e:registration-real`: `./mvnw -B -DskipTests test-compile` (18.368 s) y
`./mvnw -B -Dit.test=LegalRegistrationBrowserE2E -Dordenfix.browser.frontend=<frontend> failsafe:integration-test failsafe:verify`
(42.202 s), con Java 21. El XML registra **un harness JUnit que ejecutó y verificó ocho casos
Playwright**, cero fallos/errores/omisiones, sin reintentos. Lint y TypeScript de los tres archivos
E2E aprobaron; `--list` enumeró los ocho casos. La revisión confirmó que la extracción conserva
los cuerpos y aserciones de las seis pruebas de registro anteriores.

- Titulares nuevos FREE/TRIAL con `funciones.empleadosMultiples=true`; creación de USER por UI
  (201), login real y creación de cliente por UI (200) en escritorio y móvil 320 px, sin overflow.
- USER no consulta automáticamente la gestión de empleados ni muestra su formulario. El servidor
  rechaza listar empleados, desactivar al titular y borrar un cliente (403); el titular tampoco
  puede promover al USER (400 `ROL_USUARIO_INMUTABLE`).
- Otro ADMIN autenticado recibe 404 al leer/modificar esos empleados y clientes existentes.
  Las lecturas propias posteriores devuelven 200 y conservan los valores. La desactivación desde
  la UI deja al empleado inactivo, rechaza el JWT original (403) y un nuevo login (401).
- PostgreSQL **16.14** acredita seis altas legales completas, ocho usuarios nuevos (seis titulares
  y dos empleados) y dos clientes en sus talleres. Cada taller mantiene un único ADMIN. Las filas
  y versiones físicas del titular baseline y su taller permanecen iguales. Se conservan los
  controles de no duplicación por replay y ausencia de alta cuando falla la lectura de condiciones.
- El contenedor PostgreSQL exclusivo fue eliminado; Vite, Tomcat y PostgreSQL liberaron sus puertos.

Sólo cambian pruebas y documentación: no se modifica la lógica de producto ni se repite el gate
integral. V27/V28/V29 mantienen sus hashes congelados. Los cambios ajenos siguen preservados.
Commits previstos de este cierre: backend `test(usuarios): acredita empleados y aislamiento real`;
frontend `test(empleados): verifica permisos y acceso real`, uno por repositorio y sin push.

**Taller y empleados queda acreditado localmente durante TRIAL.** Staging y la política para los
primeros talleres siguen pendientes. El siguiente criterio operativo es el recorrido real de
reparación → presupuesto → entrega, manteniendo los cobros externos y el registro manual opcional.

## Corte cerrado — reparación, presupuesto y entrega sin Cobros

Fecha: 2026-09-09. Baselines: frontend `8a7b3d4`, backend `2d73445`.
Se continúa el recorrido autorizado de salida inicial con cuatro casos nuevos: aprobación y rechazo
del presupuesto en escritorio y móvil 320 px. Se conservan los ocho casos reales de cuenta/empleados.
El objetivo es comprobar la operación completa sin utilizar Cobros, con importes positivos pendientes.

Diseño: el harness prepara dos titulares sintéticos, uno por dispositivo, en talleres FREE/ACTIVA
antes de medir deltas. Se preserva el titular baseline usado como testigo del corte anterior.
La configuración del plan se limita a esa base efímera: permite acreditar `funciones.cobros=false`
y el cupo real de FREE, mientras que TRIAL habilitaría Cobros y dejaría sin resolver ese faltante.
No se agregan endpoints de control ni se modifica la política comercial del producto.

Cada caso inicia sesión desde la UI y crea cliente/equipo/reparación con precio estimado de 50.000.
El titular crea un presupuesto ORIGINAL por el mismo importe. Otro contexto de navegador, sin sesión,
lee el seguimiento y aprueba o rechaza el presupuesto. El taller verifica el estado resultante y
entrega desde la UI; el caso aprobado pasa antes por COMPLETADO. Se comprueban las respuestas HTTP,
valores posteriores, ausencia de consultas/escrituras a Cobros o checkout y saldo pendiente positivo.
PostgreSQL verifica pertenencia, importes, presupuesto e ítems, respuesta, entrega, consumo del cupo
y ausencia de registros de cobros y pagos. El precio estimado se carga explícitamente porque aprobar
un presupuesto no lo sincroniza con el total de la reparación en el contrato actual.

Se reutilizan el runner, las fixtures legales y el laboratorio de PostgreSQL 16. La alternativa de
otra prueba con API simulada no acreditaría persistencia real; reutilizar TRIAL tampoco comprobaría
el módulo deshabilitado. El corte no publica contenidos ni contacta clientes, email o Mercado Pago.

Lista nominal frontend: `e2e-registration-real/reparacion.spec.ts`, `e2e-registration-real/helpers.ts`,
`e2e-registration-real/empleados.spec.ts`, README y este plan. Se extraen los helpers de sesión del
spec de empleados sin modificar sus controles. Backend amplía `LegalRegistrationBrowserE2E`, README
y su plan. Lógica productiva y migraciones V27/V28/V29 permanecen congeladas salvo un fallo observado
que exija y justifique una corrección acotada.

Validación prevista: lint y TypeScript E2E; compilación serial y Failsafe opt-in con doce casos reales,
revisión independiente del diff y comprobación de recursos liberados. Un commit por repositorio,
sin push y preservando archivos ajenos. Esta evidencia local no acredita staging ni define el acceso
comercial de los primeros talleres; los demás criterios conservan su alcance pendiente.

### Evidencia de cierre

Ejecución final aprobada el **2026-09-09 a las 09:27:13 -03:00** con
`JAVA_HOME=<Java 21> npm run test:e2e:registration-real`, desde el frontend con Node 24.14.0.
La compilación tomó 17.564 s y Failsafe 55.861 s. El XML registra **un harness JUnit que ejecutó
y verificó doce casos Playwright**, cero fallos/errores/omisiones y sin reintentos. Se conservaron
los seis casos de registro y dos de empleados; los cuatro nuevos aprobaron en escritorio y móvil
320 px. Lint, TypeScript, listado de doce casos y revisión independiente también aprobaron.

- Ingreso y presupuesto por UI devolvieron 201; la respuesta pública sin JWT devolvió 200 y el
  estado correspondiente. Aprobar permitió completar y entregar; rechazar permitió entregar sin
  reparar. Las lecturas privadas y públicas posteriores confirmaron ENTREGADO.
- La UI mantuvo Cobros oculto y no consultó sus endpoints. Las únicas escrituras del recorrido
  fueron ingreso, presupuesto, respuesta pública y transiciones de estado. No hubo llamadas a
  checkout ni a proveedores de pago. Total y saldo derivados permanecieron en 50.000, con cobrado
  cero; esos valores describen el estimado cargado, no prueban una deuda ni un pago acreditado.
- PostgreSQL **16.14** confirmó cuatro clientes/equipos/reparaciones/presupuestos nuevos con sus
  ítems, pertenencia y respuesta exactas; sellos de conformidad y garantía del comportamiento
  existente; dos usos del cupo por taller FREE. No se crearon cobros ni registros de pagos.
  Las comprobaciones de cuentas, consentimiento, roles y aislamiento anteriores siguieron pasando.
- Se verificó la liberación de los contenedores y puertos de ambas ejecuciones del corte.

La primera ejecución no fue aprobada: los ocho casos anteriores pasaron y los cuatro nuevos se
detuvieron antes del ingreso porque `src/test/resources/application.properties` del backend define
un cupo de 50, frente al default productivo de 25. El harness ahora fija explícitamente 25 sin tocar
configuración productiva ni relajar aserciones. La repetición final usó el runner documentado desde
el frontend, con Node compatible, y volvió a compilar y ejecutar toda la matriz. No se acredita
agotamiento del cupo, expiración automática del TRIAL ni cruce de mes mediante este foco.

Sólo cambiaron pruebas y documentación. V27/V28/V29 conservan sus hashes; no se repitió `clean verify`,
porque el fallo fue de preparación del laboratorio y no requirió cambios de runtime. Un commit
por repositorio, sin push: backend `test(reparaciones): acredita presupuesto y entrega real`;
frontend `test(reparaciones): verifica entrega sin cobros`. Archivos ajenos preservados.

**Reparación y presupuesto queda acreditado localmente sin Cobros.** El siguiente criterio es el
registro manual opcional de un cobro externo, su historial y corrección según permisos. Staging,
documentos/evidencia y los demás criterios de salida mantienen los pendientes de esta lista.

## Corte cerrado localmente — registro manual, historial y corrección de cobros externos

Fecha: 2026-09-09. Baselines: frontend `a63db58`, backend `e2d7760`.
Se continúa el criterio autorizado de control opcional de cobros con un recorrido nuevo en escritorio
y otro en móvil 320 px, conservando los doce casos anteriores. El taller declara lo recibido por fuera
de OrdenFix; este corte no introduce procesamiento, verificación o conciliación de pagos.

Diseño: cada caso registra desde la UI un titular FREE/TRIAL, comprueba Cobros habilitado y crea
un empleado USER. El titular ingresa una reparación de 50.000 y la entrega antes de registrar cobros,
para acreditar también la opcionalidad con el módulo habilitado. El empleado inicia sesión y registra
una transferencia externa de 50.000. Puede consultar el movimiento, pero la UI no permite anularlo y
el servidor rechaza esa acción con 403. Otro titular habilitado recibe 404 al consultar/anular esos IDs.

El titular corrige la carga mediante la operación existente: anula con motivo y luego registra un
nuevo movimiento de 30.000. Se conserva el cobro original de 50.000 y su auditoría de anulación;
el historial muestra ambos y el saldo derivado pasa a 20.000. Repetir la anulación devuelve 409 sin
cambiar su auditoría. La vista por período incluye sólo el movimiento activo. La reparación sigue
entregada, con la misma conformidad, y no se inicia checkout ni se llama a proveedores de pagos.

Se reutilizan registro, sesión, formularios y laboratorio existentes, sin nuevas cuentas sembradas,
endpoints de control ni infraestructura. La alternativa de edición directa del importe no corresponde
al contrato vigente: la corrección es anulación más nueva carga. La autoría USER del registro se
acredita por su sesión y petición HTTP; la base identifica al autor de la anulación y no tiene una
columna de autoría del alta. No se atribuye una protección general de inmutabilidad que no existe.

PostgreSQL verificará cuatro cobros nuevos exactos, dos anulados por sus titulares y dos activos,
con sus importes/referencias/talleres y fechas. Las cuatro reparaciones FREE del corte anterior
conservan cero cobros; las demás filas de cobros, inventario y tablas de pagos permanecen sin cambios.
Se mantienen los controles completos de alta y consentimiento para los dos titulares nuevos.

Lista nominal frontend: `e2e-registration-real/cobros.spec.ts`, `e2e-registration-real/helpers.ts`,
README y este plan. Backend amplía `LegalRegistrationBrowserE2E`, README y su plan. El laboratorio
fija el límite de login en 20 para admitir las 14 autenticaciones de la matriz sin depender de su
duración, manteniendo activo el filtro. El default productivo de 10 no cambia ni se acredita aquí.

Validación prevista: lint/TypeScript, compilación y Failsafe serial con catorce casos reales, revisión
del diff, evidencia SQL y recursos liberados. Un commit atómico por repositorio, sin push; cambios
ajenos preservados. No se modifican lógica productiva, migraciones V27/V28/V29 ni planes comerciales.
El resultado será evidencia local; staging y los siguientes criterios conservan sus pendientes.

### Evidencia de cierre

Ejecución final aprobada el **2026-09-09 a las 09:53:49 -03:00**, con
`JAVA_HOME=<Java 21> npm run test:e2e:registration-real` desde el frontend y Node 24.14.0.
La compilación tomó 17.058 s y Failsafe aproximadamente 71 s. El XML registra **un harness JUnit
que ejecutó y verificó catorce casos Playwright**, cero fallos/errores/omisiones y sin reintentos
internos. La suite JUnit tomó 69.517 s. Lint, TypeScript, listado de catorce casos y revisión
independiente del frontend y Java también aprobaron.

- Los dos casos nuevos, escritorio y móvil 320 px, entregaron antes de registrar cobros. El USER
  cargó 50000 por UI y obtuvo 201. Su intento de anulación recibió 403 y el titular ajeno obtuvo
  404; las lecturas posteriores conservaron el movimiento original.
- El titular anuló con motivo y auditoría, recibió 409 al repetir y cargó el importe corregido de
  30000. Ambos usuarios vieron los dos movimientos; sólo el titular pudo anular el activo. El saldo
  derivado quedó en 20000 y la vista por período incluyó sólo 30000. La reparación mantuvo ENTREGADO
  y la misma conformidad. Esos importes describen lo declarado, sin verificar acreditaciones.
- PostgreSQL **16.14** confirmó cuatro cobros exactos, dos anulados y dos activos, con pertenencia,
  referencias, importes, autoría ADMIN de anulación y secuencia entrega → alta → anulación → nueva
  alta. Se verificaron los deltas completos de cuentas, consentimiento y reparaciones. Las cuatro
  reparaciones FREE previas conservaron cero cobros y las tablas de pagos del proveedor no cambiaron.
  El baseline de cobros estaba vacío: se exige exactamente el conjunto nuevo; la comparación de
  filas y xmin queda preparada para preservar filas anteriores, pero no acredita aquí un testigo
  previo no vacío. El ADMIN y taller ajenos sí conservan sus valores y xmin.
- La fase observada exigió seis POST canónicos, incluidos los intentos rechazados, sin checkout ni
  llamadas a proveedores. Se confirmó la eliminación de los cuatro PostgreSQL efímeros y sus
  contenedores auxiliares, y el cierre de los puertos utilizados en las cuatro ejecuciones.

Se corrigieron tres defectos del laboratorio sin cambiar el producto: los selectores de etiquetas
obligatorias debían admitir el asterisco; el email sintético del empleado excedía 64 caracteres antes
del arroba y ahora usa el prefijo `cobro-user`; AssertJ no admite un conjunto vacío como argumento de
`doesNotContainAnyElementsOf`, por lo que la exclusión de IDs usa `noneMatch`. Las primeras dos
corridas aprobaron los doce casos previos y fallaron antes de crear empleados en los nuevos; la
tercera aprobó los catorce casos de navegador y falló en esa aserción final. La cuarta recompiló y
aprobó la matriz completa y sus verificaciones SQL. No se relajaron validaciones productivas.

Sólo cambiaron pruebas y documentación. No se repitió `clean verify`: los fallos fueron del
laboratorio, sin cambios productivos o transversales. V27/V28/V29 conservan sus hashes congelados.
Un commit por repositorio, sin push y con los 77 archivos ajenos no versionados preservados:
backend `test(cobros): acredita historial y correccion real`; frontend
`test(cobros): verifica registro manual y anulacion`.

**Control opcional de cobros queda acreditado localmente.** Sigue Evidencia y documentos: acceso,
consentimiento aplicable y resumen informativo sin presentación fiscal. Staging, textos definitivos,
gestión de datos/baja y operación real conservan los pendientes de la lista de salida.

## Corte cerrado localmente — resumen digital, permisos y límites de evidencia

Fecha: 2026-09-09. Baselines: frontend `04dbede`, backend `8efa565`.
Se continúa Evidencia y documentos con una comprobación del resumen existente. La revisión detectó
que las fotos aún usan `src/lib/cloudinary.ts`: upload unsigned desde el navegador, persistencia de
URL y acceso directo desde `FotoUploader`/detalle. Quitar la referencia no borra el objeto remoto.
Backend conserva URL/momento en `reparacion_fotos`; no tiene upload, autorización de lectura ni
borrado del archivo. Tampoco existe la confirmación contextual de fotos previa a la transmisión.
El consentimiento de registro no acredita esa atestación específica.

La Tarea 9 del plan general ya identifica el upload privado y su dependencia backend. Esta revisión
no accedió a archivos de clientes ni contactó al proveedor. No acredita que una URL conocida quede
protegida por el aislamiento de la API de reparaciones. Fotos privadas y consentimiento aplicable
siguen siendo un bloqueo de Evidencia y documentos; no se sustituirán por una prueba con mocks.

Diseño del corte: ampliar los dos casos reales de cobros, conservando catorce recorridos totales,
con lecturas del resumen después de anular el original de 50000 y registrar el activo de 30000.
Titular y empleado del taller accederán por UI al contrato canónico; se comprobarán el emisor,
cliente/equipo, total 50000, cobrado 30000, pendiente 20000, movimiento activo y leyenda informativa
sin presentación fiscal. El resumen no incluirá la observación interna ni la auditoría del cobro.
Otro titular habilitado recibirá 404 y un navegador sin sesión no podrá leer el resumen privado.
El seguimiento público conservará su proyección mínima, sin fotos, credenciales ni datos internos.
La fase sólo admitirá lecturas: no nuevas altas, cambios de estado, cobros, checkout o proveedores.

Se reutilizan las órdenes y contextos reales ya creados, sin nuevos seeds ni aumento de límites.
Crear dos casos con altas duplicadas o otra infraestructura agregaría preparación sin mejorar esta
comprobación. Probar imágenes mediante respuestas simuladas no resolvería el faltante de acceso.
No se cambian APIs productivas, almacenamiento, UI, contratos comerciales ni V27/V28/V29.

Lista nominal frontend: nuevo helper `e2e-registration-real/resumen.ts`, ampliación de
`e2e-registration-real/cobros.spec.ts`, README y este plan. Backend sólo README y su plan: el harness
existente conserva sus aserciones SQL y deltas exactos, suficientes porque no se agregan escrituras.
Validación prevista: ESLint/TypeScript E2E, revisión independiente, runner real serial con Java 21,
PostgreSQL 16 y catorce casos, más recursos liberados. Un commit atómico por repositorio, sin push,
preservando archivos ajenos. Staging y el criterio completo de Evidencia y documentos siguen abiertos.

### Evidencia de cierre

Ejecución aprobada al primer intento el **2026-09-09 a las 10:44:30 -03:00** con
`JAVA_HOME=<Java 21> npm run test:e2e:registration-real`, desde frontend y Node 24.14.0.
La comprobación de compilación incremental tomó 0.788 s (Java no cambió), y Failsafe aproximadamente
75 s. El XML registra un harness JUnit que ejecutó y verificó los **catorce casos Playwright**,
cero fallos/errores/omisiones y sin reintentos; suite 74.140 s, método 62.841 s. ESLint, TypeScript,
listado exacto y revisión independiente también aprobaron.

- Titular y empleado abrieron el resumen desde el enlace de la orden y volvieron por la UI. La
  respuesta canónica coincidió en ambas sesiones, con 31 campos explícitos y pagos de cuatro campos.
  El documento conservó total 50000, cobrado 30000 y pendiente 20000, y mostró sólo EXTERNO-30000.
  El original anulado, las observaciones y el motivo de anulación no aparecieron en JSON ni pantalla.
- Se verificaron documentoFiscal=false y la leyenda informativa completa. La pantalla explica que
  los registros no confirman acreditaciones bancarias; no ofrece impresión ni muestra datos/QR de
  cobro no configurados. El titular ajeno, con sesión y capacidad válidas, recibió 404.
- El contexto sin sesión fue dirigido a login. Su GET directo, sin Authorization ni cookies, obtuvo
  **403**, que es el fallback de seguridad actual para esta ruta; no se cambió a 401. El seguimiento
  anónimo devolvió 200 y exactamente ocho campos operativos, con presupuesto=null en estas órdenes,
  sin datos del cliente, fotos, credenciales ni notas internas. Esto no acredita acceso privado a
  un archivo externo conocido ni el contenido de presupuestos de otros escenarios.
- Se conservaron las seis escrituras originales de cobros y la ausencia de consultas al resumen
  antes de la fase documental. Ésta no añadió escrituras, rutas legacy/QR, checkout ni proveedores
  de pagos. PostgreSQL 16.14 confirmó los mismos IDs, importes, auditoría y deltas del corte anterior,
  sin altas adicionales. El contenedor de base y su auxiliar fueron eliminados y los puertos de
  Vite, Tomcat y PostgreSQL quedaron cerrados.

Sólo cambiaron pruebas frontend y documentación de ambos repositorios. El harness Java y
V27/V28/V29 permanecen sin cambios; no se repitió clean verify al no haber cambios productivos ni
fallos. Commit frontend `test(documentos): verifica resumen digital real`; backend
`docs(lanzamiento): registra verificacion del resumen`. Sin push y con los 77 archivos ajenos no
versionados preservados.

**Resumen digital queda acreditado localmente; Evidencia y documentos sigue abierto.** El siguiente
corte debe abordar el recorrido de fotos privadas y la confirmación contextual ya previstos en
BACKEND-HANDOFF 4/Tarea 9: carga, acceso por permisos y eliminación del archivo, reutilizando las
primitivas legales existentes. No se agregan nuevas familias de infraestructura como objetivo
independiente ni se habilita el flujo unsigned para la salida. Staging conserva sus pendientes.

## Corte cerrado localmente — fotos privadas y confirmación contextual

Fecha: 2026-09-09. Baselines frontend `f29b9ba`, backend `e10070b`. Se implementó el recorrido
previsto: selección local, confirmación canónica por reparación, intención/carga/finalización,
lectura autenticada y eliminación reintentable. Se preserva la orden al fallar las fotos y se retira
el upload unsigned del navegador. Un commit por repositorio, sin push, con 77 archivos ajenos
no versionados preservados. V27–V29 no cambian; la evolución usa V30.

Aprobados cuatro recorridos de fotos en escritorio/320 px sobre V30 y la regresión de catorce
recorridos anteriores sobre su fixture V29. El frontend aprobó 566 Vitest, 42 controles de publicación,
typecheck, lint y build. El integral backend ejecutó 7.413 unitarias y 1.350 IT; sus fallos se detallan
en el [cierre de fotos](2026-09-09-fotos-privadas-implementation.md), junto con la revalidación
aprobada de las cinco suites afectadas (85 IT, incluida una prueba nueva). No se afirma que aquel
clean verify terminara verde ni se sustituyen sus incidentes por el resultado de otra corrida.

**Evidencia y documentos sigue pendiente de acreditación en el entorno de salida:** cuenta real
Cloudinary, bloqueo de acceso anónimo a originales/derivados, borrado y retención operativos,
y tratamiento explícito de las referencias legacy. También quedan Confianza y cuenta y Operación
real. El siguiente trabajo se elige de esas filas; este corte no abre otra familia de infraestructura.

## Corte cerrado localmente — Cuenta y consulta documental

Fecha: 2026-09-09. Baselines frontend `04bd706`, backend `ef8d9f4`. El
[corte de consulta de Cuenta](2026-09-09-cuenta-documentos-implementation.md) agrega
un destino único para titular y empleado: identidad remota, historial propio paginado,
lectura de versiones exactas y contactos configurados. Cuenta no consulta suscripción;
incluso un 403 del historial comprueba la sesión por perfil. El error comercial ofrece
un enlace de acceso a Cuenta. Solicitudes, exportación integral y baja no se simulan.

Pasaron 123 pruebas focalizadas, 631 Vitest + 42 controles de publicación, cinco
recorridos Chromium con API simulada en escritorio/320 px, typecheck, lint y build.
Las capturas fueron revisadas. No es evidencia de integración con PostgreSQL ni de
staging. Backend limpio y sin cambios; V27–V30 y los 77 archivos ajenos preservados.
Commit frontend `feat(cuenta): centraliza privacidad y documentos`, sin push.

**Confianza y cuenta sigue abierto:** confirmar operador/buzones reales y completar
un circuito atendido de solicitudes de datos y baja. Es el próximo pendiente concreto
de esa fila, junto con su comprobación en el entorno de salida. La acreditación real de
Cloudinary y legacy de fotos, staging, backup/restauración y recuperación operativa
siguen pendientes; este corte no altera esos límites.

## Corte cerrado localmente — baja del acceso propio del empleado

Fecha: 2026-09-09. Baselines frontend `540f619`, backend `ef8d9f4`. El
[corte de baja individual](2026-09-09-cuenta-baja-acceso-implementation.md) completa
la operación USER prevista por Tarea 14/BACKEND-HANDOFF 3: contraseña actual,
confirmación explícita, usuario inactivo y versión de sesión incrementada en la
misma transacción. Cuenta permite salir sin consultar suscripción ni requerir correo.
El titular conserva su gestión de empleados; esta acción no cierra el taller ni
elimina reparaciones, evidencia o datos personales.

La revocación se preserva ante reset, verificación de email y actualización
administrativa concurrentes. El navegador descarta la contraseña al enviar, bloquea
el doble envío y sólo confirma con 204. Un error incierto no afirma que hubo baja;
una respuesta de una sesión anterior no cierra la nueva. El cierre conserva una
constancia en login y vacía la caché privada.

Aprobaron **105 pruebas backend**, incluidas **15 PostgreSQL 16**, **661 Vitest +
42 controles de publicación**, nueve recorridos Chromium con API simulada en
escritorio/320 px, typecheck, lint y build. Las correcciones detectadas y los límites
de esta evidencia se detallan en el plan del corte. No es una acreditación de staging
ni del recorrido integrado navegador → PostgreSQL. V27–V30 y los 77 archivos ajenos
no versionados se preservaron. Un commit por repositorio, sin push.

**La baja individual queda implementada y verificada localmente.** Confianza y cuenta
sigue pendiente de identidad/contactos reales y un circuito atendido para solicitudes
de datos y cierre del taller. La acreditación del proveedor de fotos/legacy y la
operación en el entorno de salida conservan sus pendientes. No se abre una familia
adicional de infraestructura ni se retoman como imprescindibles todas las mejoras
del plan histórico.

## Corte cerrado localmente — enlaces públicos de talleres inactivos

Fecha: 2026-09-12. Baselines frontend `5c43da5`, backend `061b680`. Al preparar el
circuito de atención se detectó que un taller inactivo perdía acceso privado pero
sus códigos todavía permitían seguimiento y respuestas a presupuestos. La búsqueda
pública ahora exige taller activo en SQL: lectura, aprobación y rechazo devuelven
404 sin modificar datos y sin distinguir un código inexistente de un taller inactivo.

El [corte y sus límites](2026-09-12-taller-inactivo-enlaces-publicos-implementation.md)
registra **17 pruebas backend, incluida una PostgreSQL 16, y 4 frontend aprobadas**.
No cambia el runtime frontend, no agrega endpoints ni modifica V27–V30. Las pruebas
usan talleres sintéticos y solicitudes posteriores al commit; no acreditan carreras
de un futuro cierre, revocación definitiva de códigos o eliminación de información.

Se preparó el procedimiento `docs/runbooks/solicitudes-datos-y-cierre.md` en backend:
recepción, referencia, responsable, verificación, alcance, respuesta y evidencia.
No se considera un canal habilitado ni una baja ejecutable. Faltan prestador/buzón
reales, responsable de atención, decisiones de conservación/entrega y ejecución
comprobada del circuito. Los contactos se solicitaron al titular del proyecto; no
se fabricaron valores ni se publicaron borradores.

Esta corrección cierra el faltante de acceso público identificado. **Confianza y
cuenta permanece abierto**, junto con las comprobaciones de proveedor de fotos,
legacy, staging y recuperación operativa ya enumeradas. Se conserva un commit por
repositorio, sin push y con los archivos ajenos preservados.
