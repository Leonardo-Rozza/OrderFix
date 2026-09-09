# OrdenFix — alcance y criterios de la salida inicial

Fecha: 2026-09-08

Estado: ajuste de prioridad acordado con el titular; control manual de cobros y registro
con consentimiento cerrados localmente. Los cortes de implementación se documentan abajo; todavía
no se acredita disponibilidad en staging.

## Decisión de producto

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

Cada fila requiere evidencia del flujo completo en el entorno elegido. Todas siguen pendientes de
esa acreditación; “pendiente” no significa que toda su implementación deba construirse nuevamente.

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
