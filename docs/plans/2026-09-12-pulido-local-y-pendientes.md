# OrdenFix — pulido local y pendientes de salida

Fecha: 2026-09-12. Estado: cortes A–D completos; pulido local cerrado.
Este documento responde al pedido de mejorar la experiencia
y el Excel, con un alcance que se pueda terminar.

Base del diagnóstico: frontend `5a86605`, backend `35ecb8f`. Esa revisión inicial
inspeccionó código, pruebas existentes y actas. La evidencia nueva de los cortes A–D se
detalla al final; la evidencia funcional anterior conserva sus límites.

## Qué está resuelto y qué falta

Los recorridos de cuenta, taller/empleados, reparación/presupuesto/entrega y registro
manual de cobros tienen evidencia previa con navegador, HTTP y PostgreSQL locales.
También existen fotos privadas, documentos y baja del acceso del empleado. Esto
permite trabajar sobre la experiencia sin reconstruir el núcleo de reparaciones.
El cierre y la restauración del acceso ya tienen API y pantalla ensayadas en local
(corte E, detrás de flags apagados). Todavía falta completar la eliminación integral
y acreditar las integraciones y operación reales de salida; ver el acta de E al final.

El backend completó los dos cambios de producto identificados en este diagnóstico:
mejoró la generación del Excel e informa precio/disponibilidad de contratación
para que Planes represente lo que realmente puede hacer. Conserva los
pendientes operativos e integraciones enumerados al final. Una auditoría acotada
no garantiza ausencia de otros defectos; sólo se incorporarán bloqueos reproducibles.

Se mantiene el acuerdo de producto: cobros cargados manualmente, recibidos fuera de
OrdenFix; resumen informativo sin validez fiscal; MP sólo para la suscripción del
taller al SaaS. ADMIN administra el taller y sus empleados USER.

## Hallazgos que justifican los cortes

| Hallazgo observado | Fuente | Tratamiento |
| --- | --- | --- |
| Excel con encabezado en negrita, sin filtros ni formato de importes; fechas escritas como texto y anchos sin límite. | Backend `service/impl/ExportService.java` | Corte A. |
| El botón promete «todos los datos», pero el archivo contiene cuatro resúmenes operativos. Un error 500 de descarga puede emitir dos avisos: interceptor GET y mutation. | `ExportExcelButton.tsx`, `export.mutations.ts`, `api/axios.ts` | Corte A. |
| Planes fija `$24.900` y permite intentar checkout sin conocer si está habilitado. El DTO actual no ofrece precio ni disponibilidad; backend rechaza la operación apagada. | `PlanesPage.tsx`; backend `SuscripcionResponseDto.java`, `MercadoPagoService.java` | Corte B. |
| Promociones PRO también invitan al empleado a contratar; CANCELADA comparte rótulo «VENCIDO» y la cancelación menciona «backend». | `Sidebar.tsx`, `LimitePlanModal.tsx`, `PlanesPage.tsx` | Corte B. |
| Inicio oculta los estados de reparación y cobro en móvil, mientras conserva el importe. Clientes mantiene columnas fijas y oculta contacto; requiere inspección visual antes de afirmar desbordamiento. | `DashboardPage.tsx`, `ClientesPage.tsx` | Corte C. |

Ya existen tokens de marca, estados vacíos/error, protección de formularios y
adaptaciones móviles. `index.css` aplica objetivos táctiles de 44 px. No se abre
otro refactor global ni trabajo sobre `DataTable.tsx`, sin consumidores encontrados.

## Enfoque recomendado

Se recomienda mejorar los recorridos existentes en cuatro cortes. Sólo cambiar
colores del Excel dejaría pendientes su uso como planilla y las acciones engañosas
de Planes. Un rediseño completo o una nueva plataforma de reportes aumentaría el
alcance sin resolver mejor estos hallazgos.

La persona del taller necesita ubicar un equipo, reconocer su estado, consultar un
presupuesto y distinguir los cobros que registró. Se conserva la identidad existente:
verde de marca `#0D9488`, blanco de las fichas `#FFFFFF`, gris claro de superficie
`#F6F8FB`, tinta `#0E1726` y ámbar de atención `#D9870B`. El número de orden y el estado
operativo guían la lectura. Se reutilizan tipografía, espaciado y componentes actuales.
En móvil se priorizan equipo/cliente/estado; en Excel, columnas filtrables y legibles.
No se agregan tarjetas decorativas, una portada antes de las tablas ni botones de
contratación desconectados de la disponibilidad real.

## Cortes locales

### A — Excel operativo legible (backend + frontend)

- Mantener endpoint, acceso ADMIN en cualquier plan, aislamiento y las cuatro hojas:
  Clientes, Órdenes, Cobros y Presupuestos. Conservar nombres, orden de columnas,
  cálculos y cobros anulados en su historial; no convertirlo en exportación integral.
- Usar encabezado de marca, filas alternadas discretas, filtros y encabezado congelado.
  Limitar anchos y ajustar textos largos. Evitar celdas fusionadas dentro de las tablas.
- Escribir fechas nativas de Excel: `dd/MM/yyyy` para fechas y `dd/MM/yyyy HH:mm`
  para fechas con hora, conservando la hora visible de Cobros y Presupuestos.
  Usar importes numéricos con dos decimales y moneda ARS. Mantener teléfonos, IMEI y números de orden como
  texto literal. Documentar el cambio de tipo de las fechas para consumidores del archivo.
- Identificar el alcance operativo y el carácter manual de los cobros/sin validez
  fiscal, sin inventar nuevos totales. Corregir la promesa de «todos los datos».
- Mantener descarga y estado Generando; resolver el aviso duplicado de error sin
  alterar el tratamiento compartido de sesiones revocadas o permisos.

**Cierre:** libro sintético abierto e inspeccionado, filtros utilizables, fechas e
importes con tipos correctos, cero pérdida de datos y descarga con un solo aviso por
fallo. `ExportTests` debe conservar aislamiento, rechazo USER, saldos y anulaciones;
agregar sólo los casos de formato/tipos/libro vacío necesarios. Adaptar assertions
monetarias a valores numéricos, no a su representación visual. Ejecutar mutation/E2E
de descarga focalizados; el E2E actual usa bytes simulados y no valida un XLSX real.

Commits previstos: backend `feat(export): mejora el Excel operativo`; frontend
`fix(export): aclara alcance y errores de descarga`.

### B — Planes coherentes con el servicio y el rol (backend + frontend)

- Extender de forma compatible la lectura autenticada de suscripción con precio,
  moneda y disponibilidad de contratación, sin exponer credenciales. Reutilizar la
  configuración del backend; no elegir un nuevo precio comercial ni activar MP.
- Representar carga, error y contratación no disponible. Si la disponibilidad no
  puede confirmarse, no iniciar checkout. Evitar el precio literal del frontend.
- Mantener capacidades del plan separadas de la posibilidad de contratar: apagar
  altas no debe revocar PRO ni impedir una cancelación que el backend permita.
- Mostrar al empleado que la gestión corresponde al titular; al ADMIN, la acción
  realmente disponible. Distinguir cancelación/vencimiento y usar texto cotidiano.
- Conservar validación servidor de checkout y activación por estado confirmado.
  La información que muestra la UI no sustituye esos controles.

**Cierre:** matriz local ADMIN/USER, FREE/PRO, checkout disponible/apagado y fallo de
lectura; sin solicitudes de checkout cuando no corresponde. Precio/moneda coinciden
con backend. Pruebas de contrato, Planes y sus consumidores focalizadas, más revisión
del guard de publicación: desaparece el literal PRO, conservando los demás bloqueos
reales de configuración. Sandbox de MP sigue pendiente.

Commits previstos: backend `feat(suscripcion): informa oferta y disponibilidad`;
frontend `fix(planes): refleja disponibilidad y permisos del titular`.

### C — Inicio y Clientes legibles en móvil (frontend)

- Reubicar estado de reparación y control manual del cobro en las filas de Inicio,
  siguiendo el patrón existente de Reparaciones. Conservar navegación y consultas.
- Inspeccionar Clientes a 320/390 px con nombres largos; priorizar identificación
  y contacto, ubicando metadatos secundarios en otra línea sólo si la revisión lo
  justifica. No se afirma todavía un defecto visual sin ver el resultado.
- Mantener coherencia de acciones, foco, carga, vacío y reintento en esas pantallas;
  acortar textos redundantes sin quitar información útil ni aclaraciones de cobros.

**Cierre:** inspección antes/después en escritorio y móvil, claro/oscuro, nombres e
importes largos y estados carga/error/vacío. Sin pérdida de acciones, desbordamiento
horizontal de la página ni cambio de permisos. Tests de las pantallas y recorridos
afectados; no rehacer formularios, navegación o listados que ya cumplen.

Commit previsto: `fix(ui): mejora lectura movil de inicio y clientes`.

### D — Comprobación y cierre del pulido local

Revisar juntos Excel, Planes e Inicio/Clientes, registrar las versiones y evidencias
y corregir sólo regresiones reproducibles de A–C. Reutilizar los recorridos locales
de registro → reparación → presupuesto → entrega, con y sin cobros, y ADMIN/USER.
No reenviar correos, activar proveedores ni borrar datos para probar presentación.

**Cierre:** criterios A–C cumplidos, typecheck/lint/build local y pruebas pertinentes
aprobadas, documento de evidencia y pendientes externos intactos. El integral completo
se reserva para el cierre coordinado de salida o un cambio transversal/fallo que lo
justifique, según la política acordada. No se repiten suites sin cambios o inquietudes
nuevas. Si una revisión no encuentra un defecto, se cierra sin inventar más trabajo.

Commit previsto para el acta: `docs(calidad): cierra pulido local`.

## Pendientes posteriores para habilitar la salida

Estos cinco frentes continúan abiertos; terminar A–D no los marca como resueltos.

| Frente | Lo construido | Qué falta acreditar o resolver |
| --- | --- | --- |
| MP | Checkout, firma/inbox, reintentos, conciliación y cancelación con pruebas locales. | Aplicación/cuentas de prueba, retorno y webhook HTTPS; probar alta, activación/rechazo, cancelación y matriz de eventos contra el proveedor. No procesa pagos taller–cliente. |
| Fotos | Flujo privado local; adapter productivo contra Cloudinary real acreditado con PNG/JPEG: carga, lectura exacta, HTTP 401 anónimo y borrado confirmado. | Recorrido completo en staging, configuración del rol y política de retención/backups/CDN. Identificar antes de limpiar cuentas y assets históricos de prueba autorizados. |
| Email C | SMTP Resend y dominio verificado; correo autorizado recibido. | Registro, verificación y recuperación desde la app desplegada, enlaces HTTPS y operación del envío. La recepción de una prueba no cierra este recorrido. |
| Datos, cierre y publicación legal | Cuenta, baja del empleado y reporte operativo ensayados localmente; bloqueo de enlaces de talleres inactivos y runbook con casos sintéticos. Exportación integral A–D implementada: reautenticación, captura consistente, ZIP cifrado con fotos permitidas, vencimiento/limpieza, API y pantalla; descarga de ZIP/Excel protegida. Integral backend D aprobado: 7.578 unitarias y 1.475 IT; secuencia A–D en el plan backend `2026-09-12-exportacion-integral-implementation.md`. Cierre E incorpora API/pantalla ADMIN, restricción/restauración y descarga previa; ensayo real local aprobado, flags apagados. | Completar D (conservación, supresión de negocio/identidad, recibos remotos y recuperación), acreditar capacidad/operación del despliegue y vía real de solicitudes/entrega con contactos atendidos. La baja USER y el Excel no resuelven esos pedidos. Identidad/alta y textos definitivos conservan la etapa final acordada, después de MP y Email. |
| Despliegue y recuperación | Ramas identificadas y Vercel conectado a main. | Configurar y acreditar versión frontend/API en staging, gates de publicación, recorrido móvil, backup restaurado y recuperación del despliegue. El usuario hará push/merge. |

Exportación integral B queda cerrado localmente con 7 unitarias y 102 de integración
focalizadas aprobadas; acta y límites en el plan backend mencionado. La captura y
el manifiesto no habilitan entrega. C queda cerrado localmente con generación
temporal, archivos, cifrado y limpieza. La validación consolidada cubre 7.537
unitarias y 1.446 casos de integración; el integral detectó dos expectativas
históricas V31/V32, corregidas y revalidadas con sus clases completas y `verify`
aprobado. El acta backend conserva comandos y resultados separados. Queda D para
API/pantalla y descarga autorizada. El worker continúa deshabilitado por defecto.
Este cambio frontend es documental.

El titular pospuso MP y se completó la prueba sintética de almacenamiento real de
fotos el 2026-09-12: 2 casos aprobados y ambos assets eliminados. Se registra en el
acta backend `docs/plans/2026-09-12-cloudinary-almacenamiento-real-implementation.md`.
No se activaron flags de la app ni se envió otro correo. Esto no acredita todavía
el recorrido desplegado de fotos ni cierra los cinco frentes de esta tabla.

No se fija un porcentaje ni una fecha de lanzamiento sin acreditar estos recorridos.
La lista de salida canónica sigue siendo
[alcance y cierre](2026-09-08-salida-inicial-alcance-y-cierre.md). Runbooks backend:
`docs/operations/email.md`, `docs/operations/private-photos.md`,
`docs/runbooks/mercadopago-release.md` y `docs/runbooks/solicitudes-datos-y-cierre.md`.

## Disciplina de trabajo

Un corte a la vez y un commit atómico por repositorio afectado, sin push ni merge.
Preservar cambios ajenos, `.agents/` y `public/OrdenFix project naming/`. V27/V28 y los
contratos congelados no se modifican. No agregar arquitectura, reportes nuevos ni
automatizaciones de baja como requisito del pulido. Un nuevo bloqueo se registra con
reproducción y efecto sobre la salida antes de alterar esta lista.

El diagnóstico inicial fue documental (`5761b2a`). La implementación aprobada del
corte A y su validación se registran a continuación.

## Corte A cerrado localmente — 2026-09-12

El titular aprobó comenzar por Excel. Backend conserva cuatro hojas/columnas/cálculos
y acceso ADMIN por taller; agrega filtros, bandas, encabezado verde oscuro, fuente
Arial, anchos limitados y ajuste de texto. Las fechas pasan de cadenas a valores Excel
sin conversión de zona; se conservan horas y segundos subyacentes. Importes mantienen
su valor numérico con formato ARS de dos decimales, y los identificadores de texto
mantienen ceros/prefijos. No se modifica la semántica de cobros ni se agregan totales.

Frontend aclara el alcance, reutiliza `btnGhost` y comunica generación con `aria-busy`.
La descarga utiliza manejo local de errores y deja sesiones/permisos al interceptor:
no duplica avisos. Puede leer un mensaje breve de un error JSON Blob; respuestas de
servidor/red/inesperadas usan texto local. Conserva nombre de archivo, descarga y
liberación de URL temporal; sólo ADMIN ve la acción en Inicio.

Validación aprobada: **5 tests backend** (`ExportTests` y `ExportServiceTest`, H2/mocks),
**13 Vitest**, **3 Playwright Chromium**, typecheck, ESLint focalizado y revisión de
diff. Los E2E comprueban descarga/nombre, acción oculta a USER y error JSON Blob único;
usan API simulada. No se ejecutó integral ni se acreditó PostgreSQL/staging en este corte.

Se generó un XLSX sintético con el servicio y se inspeccionó el render de las cuatro
hojas. El visor omite algunas características e interpreta mal identificadores
numéricos almacenados como texto; POI y una lectura independiente del OOXML comprueban
los valores completos, ceros/prefijos y ausencia de fórmulas. La apertura en Numbers
agotó el tiempo de espera y no se acredita. No se cambió el archivo para acomodar
esa limitación del visor. Backend quedó en `2cbffd1` (`feat(export): mejora el Excel
operativo`). El acta backend amplía la compatibilidad de fechas y los
límites de revisión en `docs/plans/2026-09-12-export-excel-operativo-implementation.md`.

Comandos frontend ejecutados:

```sh
npx vitest run src/components/ExportExcelButton.test.tsx src/api/mutations/export.mutations.test.ts
npx eslint src/components/ExportExcelButton.tsx src/components/ExportExcelButton.test.tsx src/api/mutations/export.mutations.ts e2e/export.spec.ts
npm run typecheck
npx playwright test e2e/export.spec.ts --project=chromium --workers=1
```

El primer intento Playwright no pudo abrir el puerto local dentro del sandbox;
la ejecución autorizada completó los tres casos. No hubo fallo de aplicación.
Cambios y actas se guardan en un commit atómico por repositorio, sin push ni merge,
preservando los archivos no versionados ajenos. Al cerrar A, el siguiente corte era **B — Planes**;
integraciones, identidad y despliegue conservan su orden y pendientes.

## Corte B cerrado localmente — 2026-09-12

Baselines: backend `2cbffd1`, frontend `41b0f64`. La suscripción autenticada agrega
`ofertaPro` con `precioMensual`, `moneda` y `contratacionDisponible`. Usa el importe
de la configuración existente y normaliza la moneda; la disponibilidad requiere
MP y checkout habilitados. No se eligió otro precio comercial ni se activó MP.
La oferta describe las altas actuales, no el precio pactado de una suscripción previa.

El bloque es nulo si el importe no es positivo o la moneda no tiene tres letras;
el resto del plan sigue disponible. Frontend acepta también que un backend anterior
omita el bloque: no muestra un precio alternativo ni permite contratar, conserva las
capacidades y ofrece reintentar la consulta. La oferta no reemplaza los controles
servidor de rol, estado, suscripciones pendientes e idempotencia.

Planes muestra precio/moneda del servicio y sólo ofrece contratar al ADMIN cuando
hay disponibilidad confirmada y no tiene PRO activo. USER consulta el plan y recibe
una explicación de quién lo administra. Sidebar y el modal de límite usan acciones
de consulta acordes al rol; CANCELADA y VENCIDA tienen rótulos distintos. El diálogo
de cancelación explica el paso a FREE y conserva PRO, el diálogo y un único aviso
ante un fallo, permitiendo reintentar. Apagar altas u omitir oferta no oculta esa
cancelación permitida al titular; el servidor conserva la decisión final.

Validación aprobada: **51 pruebas backend** (16 servicio, 7 HTTP/H2 de plan/permisos,
28 contrato MP con proveedor simulado), **48 Vitest** (17 Planes, 11 Sidebar, 6 límite,
14 validador de oferta), **7 Playwright Chromium**, typecheck y ESLint focalizado.
Los E2E verifican precio dinámico/altas apagadas a 390 px, consulta de empleado,
un único checkout y retorno que no concede PRO, cancelación y capacidades FREE/TRIAL.
Se revisaron capturas de móvil y escritorio; los dos casos visuales se repitieron
para persistir las imágenes y capturar con la animación de entrada terminada.
La página móvil no presenta desbordamiento horizontal. API y retornos son sintéticos
locales; no se enviaron correos ni hubo llamadas al proveedor real.

`npm run check:public-release` ya no informa `PRO_PRICE_LITERAL_FOUND`. Continúa
bloqueado en esta configuración local por API HTTPS, contactos legal/privacidad/soporte
y manifiesto de publicación; no se modificó ni eludió el guard. Este corte no acredita
staging, PostgreSQL ni sandbox MP. Build/cierre conjunto permanecen en D; no se repitió
el integral. El acta backend detalla el contrato en
`docs/plans/2026-09-12-oferta-pro-disponibilidad-implementation.md`.

Comandos frontend:

```sh
npx vitest run src/pages/PlanesPage.test.tsx src/components/Sidebar.test.tsx src/components/LimitePlanModal.test.tsx
npx vitest run src/utils/ofertaPro.test.ts
npm run typecheck
npx eslint src/types/index.ts src/utils/ofertaPro.ts src/utils/ofertaPro.test.ts src/pages/PlanesPage.tsx src/pages/PlanesPage.test.tsx src/components/Sidebar.tsx src/components/Sidebar.test.tsx src/components/LimitePlanModal.tsx src/components/LimitePlanModal.test.tsx e2e/planes.spec.ts
npx playwright test e2e/planes.spec.ts e2e/gating.spec.ts --project=chromium --workers=1
npm run check:public-release
```

Un commit por repositorio afectado, sin push ni merge. Se preservan los 77 archivos
ajenos no versionados y las migraciones congeladas. Backend quedó en `39a0890`
(`feat(suscripcion): informa oferta y disponibilidad`). El siguiente corte es
**C — Inicio y Clientes legibles en móvil**; después queda D para cerrar este pulido.

## Corte C cerrado localmente — 2026-09-12

El [acta de Inicio/Clientes](2026-09-12-inicio-clientes-movil-implementation.md)
documenta capturas previas y finales a 320/390/1280 px, claro/oscuro y ADMIN/USER.
Inicio ahora muestra equipo, cliente, estados de reparación/cobro e importe en móvil.
Clientes prioriza nombre/teléfono y reubica cantidades/última visita. Se conserva
la distribución de escritorio y se corrige el retorno de foco de la ficha.
Los errores de lectura se comunican en página con reintento, sin toasts repetidos.

Pasaron 41 Vitest distintos, 6 recorridos Chromium, typecheck y lint focalizado.
El acta registra los fallos encontrados/corregidos y los límites de esta evidencia:
API simulada, sin validación de proveedores ni staging. Backend sin cambios; un commit
frontend sin push/merge, preservando los archivos ajenos. Al cerrar C quedaba D para
la comprobación conjunta. Los cinco frentes de salida posteriores siguen abiertos.

## Corte D cerrado localmente — 2026-09-12

El [acta final](2026-09-12-pulido-local-cierre.md) acredita typecheck, lint completo,
build local, 16 recorridos Chromium de A–C/accesibilidad y el laboratorio de 14
recorridos navegador → HTTP → PostgreSQL 16 sobre su fixture V29. Se verificaron
registro, titular/empleados, presupuesto/entrega sin cobros y control manual externo.
No se encontraron regresiones nuevas y el corte es documental; las versiones
funcionales permanecen en frontend `affaffa` y backend `39a0890`.

**El pulido local A–D está terminado.** No quedan otros cortes de pulido abiertos
en este plan. El guard público conserva sus bloqueos de configuración y no se
acreditan fotos V30, proveedores reales, identidad, staging o recuperación por esta
validación. Esos cinco frentes siguen siendo los pendientes de salida enumerados
arriba. Al cerrar el pulido se había previsto MP en entorno de pruebas; el titular
lo pospuso después y se continúa con exportación integral A–D, según la tabla
actualizada de pendientes. No hubo push ni merge.


## Exportación integral — corte D cerrado localmente, 2026-09-12

Continúa exportación A–D del plan backend; no reabre los cortes homónimos de pulido.
Cuenta incorpora página ADMIN de exportación y el acceso Excel de Inicio lleva allí.
Confirmación de contraseña nueva por solicitud/descarga, estados, recuperación tras
recarga y vencimiento; formulario accesible y layout comprobado a 320 px y escritorio,
en ambos temas. Cobros permanecen manuales y el Excel operativo sin validez fiscal.

API/servicios: cuotas y permiso compartido con worker, no-store, prueba única dentro
de la transacción, aislamiento y límites de Excel. GET legado retirado. Pruebas
focalizadas backend 84 unitarias/69 IT aprobadas; dos recorridos reales PG/HTTP/browser
con ZIP y XLSX propios y exclusión del otro taller. Frontend completo 730 Vitest +42
tooling, lint y build local aprobados; 16 Playwright focalizados aprobados. El gate
productivo del build se omite en local. Integral backend `clean verify` aprobado en
28:56 min: 7.578 unitarias y 1.475 IT, sin fallos, errores ni omisiones; incluye control
de empaquetado sin secretos. Acta completa en el plan backend de exportación.
A–D cerrado localmente; commit atómico por repositorio, sin push ni merge.

El probe de capacidad acredita codec/JDBC cerca del máximo de 128 MiB, no el proceso
web completo. Worker apagado por defecto; Excel protegido independiente de ese flag.
El runbook backend `docs/operations/exports.md` conserva límites, claves, recuperación
y requisitos de despliegue. V27–V32 no cambian. Sin activación real de MP/email,
secretos o datos de clientes. Cierre ADMIN y operación real continúan separados.

## Cierre coordinado del taller — corte A cerrado, 2026-09-12

Después de exportación A–D, el usuario autorizó continuar con cierre ADMIN. Se divide
en A (preparación consistente y reglas), B (estado durable y bloqueo coordinado),
C (solicitud/restauración y outbox), D (eliminación y recuperación operativa) y
E (API/pantalla y gate integral). Plan backend:
`docs/plans/2026-09-12-cierre-taller-implementation.md`.

A quedó cerrado localmente: titular verificado, resumen de empleados y trabajos,
evidencia comercial conservadora y reglas de siete días de gracia. La preparación
no inicia plazos, no es una autorización para cerrar, no cancela renovaciones ni
ejecuta borrados. No agrega pantallas, endpoints o comandos de cierre. El estado
actual de Cuenta continúa siendo correcto: el cierre todavía no está disponible.

MP y Email no bloquean esta lectura local; la coordinación con proveedores y las
políticas de retención/backups siguen siendo requisitos de sus cortes y activación.
No se reabre el alcance de exportación ni se alteran migraciones congeladas.

Validación final backend: 57 unitarias y 41 IT contra PostgreSQL 16, cero fallos,
errores u omisiones, más empaquetado sin propiedades secretas. Se cubren aislamiento,
captura consistente, cero DML, prueba de descarga sin consumir y evidencia comercial
contradictoria o histórica (PRO sin respaldo no se justifica por un historial cancelado).
Frontend sólo cambió documentación. Al cerrar A quedaron B–E pendientes, con B como
siguiente paso. Se mantiene un commit por repositorio, sin push ni merge.

## Cierre coordinado del taller — corte B cerrado

El trabajo se pausó ante el rechazo de la revisión automática al alcance de V33.
Tras la autorización explícita del usuario («Sí, vamos»), se retomó la nueva
migración, la adaptación de verificadores y las pruebas en PostgreSQL descartable.
V27–V32 permanecen congeladas.

B incorpora estado e historial durables y coordinación entre cierre, escrituras
en vuelo y admisión operativa. V33 protege **28 tablas**; el inventario incluye
`legal_idempotencia_sin_actos_referencias`. Además agrega y completa `taller_id`
en `reparacion_fotos`, `presupuesto_items` y `auth_tokens`, con claves foráneas para
conservar la pertenencia al taller durante las cascadas. Los accesos preventivos
privados y públicos acompañan la protección SQL; la consulta de cuenta conserva
su acceso separado del uso operativo.

Se implementaron la compatibilidad exacta de esquema, el control de roles y las
pruebas de alteraciones del esquema, cascadas y concurrencia. El gate B quedó
cerrado el 2026-09-12 a las 21:10:19 -03: la corrida integral ejecutó 7.754 unitarias
y 1.586 IT; sus fallas de fixtures se corrigieron y las 12 clases afectadas se
repitieron completas (215 IT + 3 unitarias, BUILD SUCCESS). Los informes consolidados
quedaron sin fallos, errores ni omisiones; el código productivo y las migraciones
no cambiaron entre ambas corridas. No se presenta el primer clean verify fallido
como una ejecución exitosa. El acta técnica detallada está en el plan backend
`docs/plans/2026-09-12-cierre-taller-implementation.md`.

C–E continúan pendientes: todavía no hay API ni pantalla para solicitar o restaurar el cierre,
y este corte no habilita eliminación de datos ni operaciones reales de proveedores.
Frontend sólo actualiza estos planes; se preservan los archivos ajenos y no se
realizan push ni merge.

Backend consolidado en `1fa29e0` (`feat(cuenta): coordina estado y acceso del cierre`),
sobre `codex/lanzamiento-publico-backend`. Próximo corte C: confirmación específica,
propósitos de reautenticación e intención durable/outbox; sin adelantar la UI de E.

## Cierre coordinado del taller — corte C cerrado

C quedó cerrado localmente el 2026-09-12 a las 21:44:11 -03. Backend
`f4ab0d2` (`feat(cuenta): confirma cierre y restauracion del taller`), en
`codex/lanzamiento-publico-backend`. El acta está en
`docs/plans/2026-09-12-cierre-taller-implementation.md` del backend.

Implementa confirmaciones propias CERRAR/RESTAURAR, contraseña/prueba temporal,
frase escrita y constancia inmutable. El reintento con sesión vigente devuelve
REUSED sin DML, revocaciones duplicadas ni ampliación de fechas. La transición y
las intenciones de notificación/cancelación se confirman juntas o se revierten.
V34 mantiene V27–V33 congeladas y queda congelada al cerrar este corte.

Los vínculos anteriores de MP conservan su marca tras restaurar: no conceden
nuevos beneficios ni se reutiliza su checkout. Restaurar conserva el plan
registrado; una cancelación remota validada conserva su tratamiento anterior.
Avisos ambiguos, objetivos sin ID y coordinación incierta siguen pendientes de
conciliación. No hay scheduler ni adaptadores reales del nuevo worker.

Gate consolidado: **397 pruebas focales aprobadas** (79 unitarias/servicio y 318 IT
PostgreSQL16), más diagnóstico de catálogo y empaquetado sin secretos. Las fallas
intermedias de fixtures se corrigieron y las clases afectadas se repitieron; el
acta conserva el detalle sin presentar esas corridas como exitosas. El integral
final queda reservado para E. Frontend sólo documenta C, sin build ni navegador.

Quedan **D, eliminación por categorías y recuperación operativa**, y **E, API,
pantalla y gate integral**. El cierre todavía no está disponible en Cuenta.
Las integraciones/ensayos reales y decisiones legales/retención conservan su
etapa pendiente; este corte no habilita borrado ni operaciones de proveedores.
Se preservan las 77 rutas ajenas no versionadas. Sin push ni merge.


## 2026-09-12 — avance D de mantenimiento y recuperación

El backend local se detuvo a pedido del usuario. Continúa apagado mientras se
verifica este avance con bases PostgreSQL 16 descartables.

Se agregan tres servicios internos: limpieza de temporales vencidos por taller en
lotes, inventario por categorías y comparación de estados de una copia restaurada
contra evidencia aportada. Conservan historial y confirmaciones usadas; no llaman
proveedores ni exponen endpoints. El comparador siempre indica NO_AUTORIZA_REAPERTURA.

D sigue parcial: la eliminación de negocio/identidad, política real de conservación,
recibos de archivos remotos y recuperación productiva requieren trabajo posterior.
V27–V34 continúan congeladas. El acta del backend explica por qué un ledger nuevo o
una limpieza sin pendientes no acreditan eliminación integral. No se publica el
cierre ni se lo presenta como completado. E mantiene API/pantalla y gate integral
pendientes. Este repositorio sólo documenta el avance, sin cambios funcionales.

Backend: `3f907b3` — `feat(cuenta): prepara limpieza y recuperacion operativa`.
Gate consolidado: **125 pruebas aprobadas** (34 unitarias y 91 IT en PostgreSQL16),
con corrección del límite SQL de lotes y dos ajustes de fixtures; el acta del backend
conserva los resultados intermedios y la repetición final. Empaquetado sin secretos
aprobado. Integral reservado para E. Las 77 rutas ajenas no versionadas se preservan;
frontend sólo cambia documentación, sin necesidad de build o navegador. Sin push.


## 2026-09-12 — mantenimiento legal vencido 15O

Backend `4754f5f` — `feat(legal): mantiene retencion de evidencia tecnica`, en
`codex/lanzamiento-publico-backend`. Completa el servicio interno previsto en 15O:
limpia metadata y resultados de reintentos cuyos plazos ya vencieron, conservando
aceptaciones, documentos y reservas de nonce. Usa un rol separado, transacciones
acotadas, lotes finitos y coordinación con replay/cierre. No necesita nuevas
claves ni decide retención de negocio o identidad.

La configuración y el scheduler opcional quedan apagados. No se importa desde la
aplicación ni expone endpoints. No ejecutó limpieza sobre datos reales ni llamó
proveedores; el backend local sigue detenido. V27–V34 permanecen congeladas.
Acta y runbook en backend: `docs/plans/2026-09-06-legal-account-consent-implementation.md`
(apartado 15O) y `docs/runbooks/legal-account-consent-postgresql.md`.

Gate consolidado: **351 pruebas aprobadas**, 272 unitarias y 79 IT PostgreSQL 16,
trece clases, sin fallos/errores/omisiones finales. Incluye la corrección de tipos
de tests y de un fixture que duplicaba una aceptación. Los resultados intermedios
y repeticiones quedan documentados; empaquetado sin secretos y revisión
independiente aprobados. Clean verify final reservado para E.

**D permanece parcial** por conservación real, supresión de negocio/identidad,
recibos remotos y recuperación/conciliación externa. El siguiente avance local
puede ser **E: API y pantalla de solicitud, restricción y restauración**, apagadas
para producción y sin prometer eliminación completa o efectos externos confirmados.
No se amplía la gracia de siete días. Frontend sólo documenta este corte, sin build
ni navegador; sus 77 archivos ajenos no versionados se preservan. Sin push ni merge.


## 2026-09-13 — cierre del taller E

Backend `2d73e39`; E cerrado en local con integral backend y recorrido real aprobados.
E incorpora API, pantalla ADMIN y navegación restringida, detrás de flags apagados.
El circuito permite confirmar con contraseña/frase, volver a ingresar, consultar
la constancia, descargar un ZIP previo vigente y restaurar durante los siete días
originales. El perfil remoto se valida antes de mostrar datos operativos.

El [acta de E](2026-09-13-cierre-taller-e.md) concentra diseño, contrato, evidencias,
comandos y commits de este corte. Sustituye la indicación histórica anterior de
API/pantalla pendientes. No habilita cierre productivo ni declara borrado completo:
D conserva sus pendientes de retención, supresión, recibos remotos y recuperación.
Sin push ni merge; se preservan cambios ajenos y configuración real.
