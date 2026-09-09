# OrdenFix — alcance y criterios de la salida inicial

Fecha: 2026-09-08

Estado: ajuste de prioridad acordado con el titular. Este corte documenta el alcance; no acredita
disponibilidad en staging ni cambia el comportamiento de la aplicación.

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
