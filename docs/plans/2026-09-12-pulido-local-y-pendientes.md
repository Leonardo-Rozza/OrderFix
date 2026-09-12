# OrdenFix — pulido local y pendientes de salida

Fecha: 2026-09-12. Estado: corte A implementado y verificado localmente; B–D pendientes.
Este documento responde al pedido de mejorar la experiencia
y el Excel, con un alcance que se pueda terminar.

Base del diagnóstico: frontend `5a86605`, backend `35ecb8f`. Esa revisión inicial
inspeccionó código, pruebas existentes y actas. La evidencia nueva del corte A se
detalla al final; la evidencia funcional anterior conserva sus límites.

## Qué está resuelto y qué falta

Los recorridos de cuenta, taller/empleados, reparación/presupuesto/entrega y registro
manual de cobros tienen evidencia previa con navegador, HTTP y PostgreSQL locales.
También existen fotos privadas, documentos y baja del acceso del empleado. Esto
permite trabajar sobre la experiencia sin reconstruir el núcleo de reparaciones.
No acredita todavía todas las integraciones reales ni el cierre completo del taller.

El backend necesita dos cambios de producto identificados en este diagnóstico:
mejorar la generación del Excel e informar precio/disponibilidad de contratación
para que Planes represente lo que realmente puede hacer. Además conserva los
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
| Fotos | Flujo privado local; credenciales Cloudinary verificadas por ping. | Carga/lectura/denegación anónima/borrado reales, configuración del rol y política de retención. Identificar antes de limpiar cuentas y assets históricos de prueba autorizados. |
| Email C | SMTP Resend y dominio verificado; correo autorizado recibido. | Registro, verificación y recuperación desde la app desplegada, enlaces HTTPS y operación del envío. La recepción de una prueba no cierra este recorrido. |
| Datos, cierre y publicación legal | Cuenta, baja del empleado, bloqueo de enlaces de talleres inactivos y runbook de atención. | Vía ejecutable y ensayada de solicitudes/entrega/cierre del taller, retención y contactos atendidos. No alcanza cambiar una bandera ni entregar este Excel. Identidad/alta y textos definitivos conservan la etapa final acordada, después de MP y Email. |
| Despliegue y recuperación | Ramas identificadas y Vercel conectado a main. | Configurar y acreditar versión frontend/API en staging, gates de publicación, recorrido móvil, backup restaurado y recuperación del despliegue. El usuario hará push/merge. |

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
preservando los archivos no versionados ajenos. El siguiente corte es **B — Planes**;
integraciones, identidad y despliegue conservan su orden y pendientes.
