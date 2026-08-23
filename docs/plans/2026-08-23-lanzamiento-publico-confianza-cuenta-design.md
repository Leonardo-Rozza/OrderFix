# Diseño — Lanzamiento público, Centro de Confianza y ciclo de vida de la cuenta

Fecha: 2026-08-23

Estado: decisiones de producto aprobadas; contrato técnico propuesto para handoff y validación con backend

Repositorio implementador de interfaz: `/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend`

El backend Java se mantiene fuera de este trabajo. Este documento define el contrato que deberá entregarse a su chat responsable, pero no autoriza cambios en `/Volumes/DiscoExtern/Desktop/mvrg-backend`.

## Contexto

OrdenFix se prepara para un lanzamiento público pago. La aplicación ya permite crear un taller, administrar empleados, registrar reparaciones y contratar PRO, pero todavía no cuenta con un sistema completo para:

- informar y registrar las condiciones aceptadas al crear una cuenta;
- distinguir las obligaciones del administrador, los empleados y los clientes del taller;
- publicar documentos legales estables, legibles y versionados;
- registrar una autorización contextual antes de cargar fotos o credenciales de un equipo;
- explicar el precio y la renovación de PRO desde una única fuente contractual;
- cancelar la renovación sin quitar anticipadamente el período ya pagado;
- solicitar arrepentimiento o revisión de un cobro;
- exportar datos y cerrar la cuenta con recuperación temporal;
- impedir un despliegue público con identidad legal o configuración crítica incompleta.

Un checkbox aislado en React no alcanza como evidencia. La aceptación debe vincularse con el texto exacto, su versión, el actor, el taller y la fecha del servidor. Del mismo modo, un botón visual de baja no alcanza si el backend no conserva el estado de la gestión y su número de referencia.

## Decisión aprobada

Se implementará un **Centro de Confianza con consentimiento contextual**.

El usuario acepta una sola vez las reglas generales que le corresponden. La aplicación vuelve a interrumpirlo únicamente cuando:

- se publica una versión que exige nueva aceptación;
- intenta cargar información opcional sensible de un equipo;
- contrata o modifica una obligación económica;
- solicita una acción destructiva o irreversible.

Se descartaron:

1. **Aceptación única ultracompacta:** rápida de implementar, pero mezcla responsabilidades y no ofrece evidencia suficiente sobre cada documento.
2. **Onboarding legal completo en varios pasos:** ofrece mucha explicación inicial, pero agrega abandono y burocracia a un registro que debe funcionar bien desde un teléfono.
3. **Workflow legal genérico/event-sourced:** permitiría modelar cualquier gestión, pero introduce complejidad prematura. Se prefieren recursos explícitos y auditables.

## Objetivos

1. Permitir que una persona comprenda qué acepta sin enfrentar una pared de texto.
2. Registrar evidencia versionada y verificable de cada aceptación.
3. Mantener separadas las responsabilidades del taller, sus empleados, sus clientes y OrdenFix.
4. Dar acceso permanente a Términos, Privacidad, tratamiento de datos, condiciones PRO, baja, arrepentimiento y cierre.
5. Hacer que precio, período, renovación y fechas concretas provengan del backend.
6. Diseñar flujos móviles, accesibles, reintentables e idempotentes.
7. Bloquear el lanzamiento público mientras queden placeholders legales o configuración productiva insegura.

## Fuera de alcance

- Asesoramiento jurídico o contable definitivo.
- Decidir unilateralmente si cada relación comercial es B2B, de consumo o está alcanzada por una excepción legal.
- Emitir facturas o comprobantes fiscales.
- Procesar automáticamente cualquier solicitud de reembolso sin validación de procedencia.
- Obtener consentimiento directo del cliente final dentro de OrdenFix.
- Guardar secretos financieros, credenciales de Mercado Pago o datos bancarios privados del taller.
- Modificar el backend Java desde este repositorio o esta conversación.

## Modelo de responsabilidades

### OrdenFix

OrdenFix provee la infraestructura técnica del servicio. Respecto de los datos que el taller carga sobre sus clientes y equipos, el diseño parte de la hipótesis operativa de que OrdenFix actúa como proveedor encargado del tratamiento y el taller decide los fines de uso. Esta calificación debe ser confirmada por asesoría profesional antes de publicar.

OrdenFix debe:

- tratar los datos únicamente para prestar y proteger el servicio;
- aplicar aislamiento por taller, control de acceso, minimización, retención y auditoría;
- facilitar exportación, corrección, eliminación y gestión de incidentes;
- informar proveedores y transferencias relevantes;
- no reutilizar datos de clientes del taller para marketing propio.

### Administrador del taller

El `ADMIN` crea el tenant y representa al taller. Acepta:

- Términos y Condiciones de OrdenFix;
- Política de Privacidad;
- Acuerdo de Tratamiento de Datos;
- condiciones comerciales de PRO cuando corresponda;
- declaración de que puede representar al taller y que el taller informará a sus clientes.

Sólo el `ADMIN` titular puede contratar o cancelar PRO, gestionar empleados, exportar toda la cuenta, solicitar reembolsos administrativos y cerrar el taller. En el modelo actual existe un único administrador propietario y los empleados se crean siempre como `USER`. Promover otro administrador o transferir la titularidad requiere un flujo futuro explícito; no se resuelve cambiando un rol desde la interfaz de empleados.

### Empleado

El rol `USER` opera dentro del taller. No acepta en nombre del administrador el acuerdo comercial ni el acuerdo entre OrdenFix y el taller. En su primer ingreso acepta:

- términos de uso aplicables al empleado;
- aviso de privacidad del usuario;
- compromiso de confidencialidad y uso autorizado.

Puede confirmar que el taller obtuvo autorización para cargar fotos o credenciales porque actúa como operador del taller en una reparación concreta.

### Cliente del taller

El cliente final:

- no crea una cuenta OrdenFix;
- no contrata PRO;
- no acepta los Términos comerciales de OrdenFix;
- se relaciona comercialmente con el taller;
- puede recibir un enlace de seguimiento o resumen digital.

El taller debe informarle cómo utiliza sus datos. OrdenFix facilitará un modelo editable de aviso/autorización, pero el taller será responsable de adaptarlo y utilizarlo.

## Dirección de interfaz

### Intención

- **Usuario principal:** dueño o encargado de un taller, frecuentemente desde el teléfono y entre tareas operativas.
- **Verbo:** comprender, aceptar, verificar, gestionar y conservar una constancia.
- **Sensación:** transparente, sobria, directa y operativa; más cercana a una orden de trabajo que a un contrato bancario.

### Conceptos del dominio

- orden o ficha de reparación;
- taller como espacio aislado;
- responsable y operadores;
- custodia de clientes, equipos, fotos y credenciales;
- autorización y alcance;
- trazabilidad y sello de tiempo;
- período del plan y próximo cobro;
- cierre, recuperación y respaldo de datos.

### Mundo de color

No se agrega una estética jurídica nueva. Se reutilizan los tokens actuales:

- verde esmalte de herramienta: `--primary`;
- tinta azul-negra: `--text`;
- blanco papel de ficha: `--surface`;
- gris metálico: `--bg` y `--border`;
- ámbar preventivo: `--warning`;
- verde de confirmación: `--success`;
- rojo reservado para consecuencias y acciones destructivas: `--danger`.

### Firma propia

La firma será la **Ficha de compromiso OrdenFix**: un resumen con filas clave-valor que muestra documento, alcance, versión, fecha y, cuando corresponda, número de gestión. Se comporta como una constancia de orden de trabajo y aparece antes del texto extenso o de una decisión irreversible.

### Defaults reemplazados

- Pared legal en un modal → resumen claro, índice navegable y documento completo en una ruta estable.
- Checkbox diminuto o preseleccionado → aceptación explícita, nunca marcada por defecto, con área táctil mínima de 44 px y error asociado.
- Diálogo genérico “Aceptar y continuar” → ficha con consecuencias, importe, frecuencia, fechas y versión aplicable.
- Zona de peligro completamente roja → jerarquía gradual; el rojo queda reservado al último paso destructivo.
- Checkbox en cada reparación → atestación sólo cuando se incorporan fotos o credenciales opcionales.

## Arquitectura de información

### Rutas públicas

| Ruta | Propósito |
|---|---|
| `/legal` | Índice del Centro de Confianza. |
| `/terminos` | Términos y Condiciones vigentes e históricos publicados. |
| `/privacidad` | Política de Privacidad. |
| `/tratamiento-datos` | Acuerdo aplicable entre OrdenFix y el taller. |
| `/condiciones-pro` | Precio, renovación, cambios y cancelación de PRO. |
| `/cancelaciones-reembolsos` | Diferencia entre cancelar renovación, arrepentirse y revisar un cobro. |
| `/cerrar-cuenta` | Consecuencias, recuperación, eliminación y retenciones. |
| `/aviso-clientes-taller` | Modelo editable que el taller puede adaptar para sus clientes. |
| `/arrepentimiento` | Inicio público de una gestión, cuando resulte aplicable. |
| `/legal/documentos/:versionId` | Versión histórica exacta, recargable y compartible. |

Las rutas deben estar disponibles desde registro, login, seguimiento público y el pie de toda superficie pública. No deben requerir una cuenta para leer su contenido.

### Rutas autenticadas

| Ruta o superficie | Propósito |
|---|---|
| `Más → Cuenta` | Datos de cuenta, aceptaciones, Centro de Confianza y acciones de privacidad. |
| `Plan` | Oferta contractual, estado de renovación y cancelación. |
| `Cuenta y privacidad → Exportar` | Generar y descargar un paquete de datos. |
| `Cuenta y privacidad → Cerrar cuenta` | Solicitar, consultar o revocar el cierre. |

### Componentes reutilizables

- `LegalShell`
- `LegalDocument`
- `LegalSummarySheet`
- `LegalTableOfContents`
- `LegalVersionBadge`
- `LegalLinks`
- `LegalConsentField`
- `LegalRequirementGate`
- `SensitiveDataAttestationSheet`
- `SubscriptionDisclosureCard`
- `SubscriptionConsentDialog`
- `CaseReferenceCard`
- `AccountClosureStatus`

El contenido legal completo se renderiza como HTML accesible. Un PDF puede ofrecerse como descarga secundaria, pero nunca será la única fuente. En registro y contratación, el documento se abre en una capa de pantalla completa que mantiene montado el formulario; la contraseña nunca se persiste en `localStorage`, `sessionStorage` ni una URL.

## Documentos y publicación

### Fuente de verdad

Una versión publicada es inmutable. El backend será la fuente contractual para versión, contenido, digest y vigencia. El frontend puede conservar borradores editables para revisión y documentación, pero no debe inventar una versión local aceptable ni sustituir silenciosamente un documento que no pudo descargar.

La publicación inicial y cada actualización usan un artefacto revisado con tipo, locale, contextos, versión, `vigenteDesde`, contenido y digest. Un comando backend autenticado para operación/CI realiza dry-run, publica la versión inmutable y promueve su vigencia; no hace falta construir una UI administrativa. Retirar o reemplazar crea una transición auditada, nunca modifica el contenido ya aceptado.

Cada versión publicada contiene como mínimo:

- identificador estable;
- tipo de documento;
- versión humana;
- título;
- contenido Markdown sanitizable;
- digest SHA-256;
- fecha de vigencia;
- alcance y contexto;
- indicador de nueva aceptación obligatoria.

Las versiones históricas aceptadas continúan disponibles para consulta.

El ciclo documental usa `BORRADOR → PUBLICADA/VIGENTE → REEMPLAZADA | RETIRADA`. Sólo puede existir una versión vigente por tipo, locale y contexto. El conjunto exigido expone `requiredSetRevision` y `ETag` para detectar cambios sin confiar en el reloj del cliente.

La evidencia no registra únicamente documentos. Cada checkbox o acción se representa mediante un **requisito legal versionado** con:

- `requisitoLegalId`;
- texto exacto de la afirmación mostrada;
- `tipoActo`: `ACEPTACION`, `LECTURA` o `DECLARACION`;
- documentos y digests vinculados;
- contexto y rol al que aplica;
- vigencia y obligación de reaceptar.

Así puede reconstruirse, por ejemplo, que una persona aceptó Términos, declaró haber leído Privacidad y afirmó representar al taller, sin inferirlo posteriormente desde un booleano genérico.

### Placeholders editables

Mientras no esté definida la identidad jurídica, los borradores usarán marcadores visibles:

- `[RAZÓN SOCIAL]`
- `[CUIT]`
- `[DOMICILIO]`
- `[EMAIL LEGAL]`
- `[EMAIL PRIVACIDAD]`
- `[JURISDICCIÓN]`
- `[HORARIO DE ATENCIÓN]`

El build local y los previews pueden conservarlos. `build:public` debe fallar si un archivo incluido conserva marcadores o si faltan URL de backend HTTPS y emails de contacto. La existencia de versiones legales publicadas se comprueba mediante el readiness remoto antes de promover el despliegue.

Los textos serán borradores originales y operativos, no una copia literal de términos de otra empresa. Antes de cobrar públicamente deben ser revisados por abogado y contador.

### Contenido mínimo

Los Términos describen:

- identidad y contacto del proveedor;
- objeto y alcance de OrdenFix;
- creación de cuenta, roles y seguridad;
- responsabilidad del taller por la información cargada;
- usos permitidos y prohibidos;
- disponibilidad, mantenimiento y soporte;
- plan FREE y PRO, precio, renovación y cambios;
- cancelación, arrepentimiento y reembolsos;
- propiedad intelectual;
- terminación, cierre y efectos;
- límites de responsabilidad que sean jurídicamente válidos;
- ley aplicable y mecanismo de contacto.

Privacidad describe:

- responsable y contacto;
- categorías de datos y origen;
- finalidades y bases aplicables;
- datos obligatorios y opcionales;
- proveedores, destinatarios y transferencias;
- conservación;
- medidas de seguridad;
- derechos de acceso, rectificación, actualización y supresión;
- tratamiento de datos cargados por talleres;
- cookies o almacenamiento técnico;
- cambios de versión y canal de reclamo.

El Acuerdo de Tratamiento de Datos delimita:

- instrucciones del taller;
- confidencialidad;
- seguridad y subencargados;
- asistencia para derechos e incidentes;
- exportación, devolución y eliminación;
- auditoría razonable;
- prohibición de usos propios incompatibles.

## Registro del administrador

El formulario actual continúa en una sola pantalla. Debajo de la contraseña aparecen dos aceptaciones obligatorias e independientes:

1. “Acepto los Términos y Condiciones y confirmo haber leído la Política de Privacidad.”
2. “Declaro que puedo representar al taller y acepto el Acuerdo de Tratamiento de Datos.”

Los documentos se abren sin perder los campos ya escritos. Ninguna casilla aparece preseleccionada. Un consentimiento futuro de marketing deberá ser opcional y separado.

Antes de enviar, el frontend obtiene el conjunto requerido vigente. El registro envía los requisitos versionados, el tipo de acto y los identificadores/digests vinculados junto con una clave de idempotencia. El backend crea cuenta, taller y evidencias en una sola transacción. El digest enviado por el navegador sólo permite detectar un formulario desactualizado: el backend siempre compara contra su propia versión vigente.

Si la versión cambia mientras el formulario está abierto, el backend responde `409 DOCUMENTOS_LEGALES_DESACTUALIZADOS`; el frontend conserva los campos, desmarca únicamente las aceptaciones afectadas, presenta las nuevas versiones y solicita revisión.

Si los documentos no están disponibles, el registro no permite aceptar y ofrece reintento. Nunca se muestra contenido parcial ni un fallback contractual desactualizado.

## Invitación y primera entrada de empleados

El administrador no acepta por el empleado ni debe conocer una contraseña reutilizable que le permita suplantarlo. El alta crea una invitación de un solo uso y vencimiento corto. El empleado verifica el acceso mediante el enlace recibido, define su propia contraseña y completa la verificación de email antes del gate legal. Como transición, una contraseña temporal sólo es admisible si obliga a cambiarla y verificar el email antes de cualquier aceptación.

Al iniciar sesión por primera vez, o cuando exista una actualización material, `LegalRequirementGate` bloquea la navegación privada y muestra:

- un resumen de las reglas de uso;
- el aviso de privacidad;
- el compromiso de confidencialidad;
- los enlaces a los documentos completos.

El empleado puede aceptar o cerrar sesión. No puede operar hasta completar el requisito. Una corrección editorial que no marque `requiereNuevaAceptacion` no vuelve a bloquearlo.

Cada empleado puede solicitar la baja de su propio acceso o encontrar un canal claro para pedirla al administrador/privacidad. Esa acción desactiva únicamente su usuario y sesiones; nunca cierra ni elimina el taller completo.

Bajo `428 ACEPTACION_LEGAL_REQUERIDA`, la sesión sigue permitiendo exclusivamente documentos públicos, requisitos actuales, registro de aceptación, verificación de email y logout. El gate no puede bloquear los endpoints necesarios para resolver su propio estado.

## Fotos, PIN y patrón

Una reparación común no exige una confirmación adicional.

Antes de agregar por primera vez fotos, PIN o patrón en una reparación, una hoja inferior móvil informa:

> Estos datos son opcionales. Confirmá que el taller informó al cliente y tiene autorización para cargarlos en OrdenFix.

Acciones:

- `Confirmo y continuar`;
- `No cargar estos datos`;
- enlace al modelo de aviso/autorización.

El alcance se registra por reparación, versión y actor:

- `FOTOS`;
- `CREDENCIALES`;
- ambos cuando se autorizan juntos.

Si primero se confirmaron fotos y luego se agrega un PIN, se solicita la ampliación. Los reintentos conservan una clave idempotente y no duplican la evidencia.

Una carga a un proveedor externo y una transacción de base de datos no pueden ser atómicas. El protocolo será:

1. crear una intención de carga vinculada a reparación, alcance, requisito y atestación;
2. recibir autorización backend para una carga privada o en cuarentena;
3. subir el archivo con credenciales efímeras;
4. finalizar la intención en backend y asociar el asset a la reparación;
5. borrar mediante job cualquier asset huérfano o intención vencida;
6. eliminar el asset remoto cuando el usuario lo quite o venza su retención.

La garantía es que ninguna foto queda **asociada ni visible** en una reparación sin atestación vigente. Un fallo intermedio puede dejar temporalmente un asset privado en cuarentena, nunca una URL pública utilizable.

El preset público unsigned actual no es apto para este protocolo ni para garantizar borrado remoto. PIN y patrón se envían únicamente en el write protegido de la reparación; nunca aparecen en auditoría, telemetría o payloads de error y deben eliminarse cuando el equipo se entrega según la política aprobada. Las fotos tienen una política de retención independiente: pueden conservarse como evidencia operativa durante el plazo informado, admiten borrado remoto explícito y se incluyen en el proceso de cierre de cuenta.

## PRO: oferta, contratación y cancelación

### Oferta contractual

El importe `$24.900` no debe quedar escrito en React. El frontend solicita una oferta que contiene:

- `ofertaId`;
- plan;
- importe y moneda;
- frecuencia;
- período o prueba aplicable;
- prestaciones;
- fecha de vigencia;
- versiones legales requeridas.

La ficha contractual aparece antes de redirigir a Mercado Pago. El checkout envía `ofertaId` y aceptaciones, nunca un monto decidido por el cliente.

Estados visibles:

- consultando oferta;
- lista para aceptar;
- oferta o precio no disponible, con checkout bloqueado;
- redirigiendo;
- error recuperable;
- retorno aprobado;
- retorno pendiente;
- cancelado por el usuario;
- rechazado;
- sesión expirada o estado no confirmado.

### Cancelar renovación

La acción visible será **Cancelar renovación**, no “Cancelar PRO”. Sólo está disponible para `ADMIN`.

La primera confirmación solicita detener la renovación y muestra la fecha estimada. Mientras el proveedor todavía no confirmó, la interfaz dice “Estamos procesando la cancelación” y no garantiza que se hayan detenido los cobros. Recién en estado `PROGRAMADA`, después de confirmación durable, muestra:

> No se realizarán nuevos cobros. Tu taller conservará PRO hasta el 18/09/2026 y luego pasará a FREE.

El backend debe exponer `renovacionAutomatica`, `periodoActualFin`, `accesoProHasta` y `cancelacionActual`. Este último nombre representa también estados todavía no programados. La máquina es:

```text
SOLICITADA
  → PENDIENTE_PROVEEDOR
  → PROGRAMADA
  → EJECUTADA

SOLICITADA | PENDIENTE_PROVEEDOR → FALLIDA
PROGRAMADA → REVOCADA
```

Hasta la fecha efectiva, el plan continúa como `PRO/ACTIVA` con todas sus funciones. Después pasa a `FREE/ACTIVA`. Una respuesta pendiente usa `202 Accepted`; `PROGRAMADA` sólo se alcanza después de persistir la confirmación del proveedor.

La interfaz sólo ofrece “Mantener PRO” cuando el proveedor y el contrato backend garantizan que la renovación puede reanudarse sin crear una suscripción distinta. En caso contrario, explica que será necesario volver a contratar.

El comportamiento backend actual que baja inmediatamente a FREE no es compatible con esta promesa. La UI no se habilitará en producción hasta alinear el contrato.

Cancelar la renovación no genera devolución proporcional automática. El taller conserva PRO hasta finalizar el período pagado. Sólo se abre una revisión separada ante un cobro erróneo, un arrepentimiento aplicable o una obligación legal.

## Arrepentimiento y revisión de cobro

Cancelar una renovación evita cobros futuros. No equivale a pedir devolución de un pago ya realizado.

La acción pública y autenticada será:

**Solicitar arrepentimiento o revisión de un cobro**

Flujo:

1. Identificar la cuenta mediante un mecanismo seguro y razonable.
2. Elegir un pago interno cuando exista sesión, nunca exponer IDs de Mercado Pago.
3. Elegir motivo: arrepentimiento, duplicado, no reconocido, problema con el servicio u otro.
4. Confirmar un email de contacto.
5. Enviar la solicitud.
6. Mostrar y enviar una constancia con número de gestión.

Una solicitud se registra aunque requiera evaluación posterior. La UI no promete automáticamente que el reembolso será aprobado. La versión pública aplica rate limit, inicia siempre en `PENDIENTE_VERIFICACION`, envía un token de un solo uso por email y responde con un mensaje genérico que no revela si una cuenta existe. La referencia completa se muestra después de consumir correctamente ese token. La verificación puede emitir una credencial de consulta separada, de sólo lectura y vencimiento limitado, para recuperar el estado sin reutilizar el token consumido.

Estados comunes:

```text
PENDIENTE_VERIFICACION
  → RECIBIDA
  → EN_REVISION
      ├─ RECHAZADA → CERRADA
      └─ APROBADA → REEMBOLSO_EN_PROCESO → REEMBOLSADA → CERRADA
```

La ubicación, denominación final y aplicabilidad de los mecanismos públicos deben validarse profesionalmente. El diseño adopta una postura conservadora para no esconderlos.

El procedimiento para derechos o reclamos del cliente final permite contactar privacidad/soporte, verifica identidad de manera razonable, deriva al taller cuando éste deba decidir sobre el dato, conserva un número de gestión y comunica el resultado. La derivación no puede transformarse en una respuesta circular entre OrdenFix y el taller.

## Exportación y cierre de cuenta

### Exportación

La exportación completa es asíncrona, sólo para `ADMIN` y requiere reautenticación. Incluye datos operativos del taller en formatos documentados, pero excluye:

- contraseñas y hashes;
- tokens y sesiones;
- PIN y patrón;
- secretos o credenciales de proveedores;
- datos internos de seguridad que creen un riesgo.

Estados:

```text
PENDIENTE → GENERANDO
                 ├─ LISTA → EXPIRADA
                 └─ FALLIDA → REINTENTO o nueva exportación
```

El archivo se guarda cifrado, aislado por tenant y sin URL pública permanente. Tanto la generación como cada descarga vuelven a comprobar autorización y reautenticación; la respuesta usa `Cache-Control: private, no-store`, la URL firmada tiene vencimiento corto y puede revocarse. La descarga se audita. Un error de exportación no inicia automáticamente el cierre. El endpoint Excel existente puede mantenerse temporalmente como exportación operativa, pero no puede quedar como descarga directa que evada reautenticación; debe integrarse al flujo seguro o retirarse.

### Solicitud de cierre

La sección se denomina **“Cerrar el taller y eliminar su cuenta OrdenFix”**, está separada visualmente y sólo disponible para `ADMIN`. La primera pantalla aclara que alcanza a todos los empleados y datos del tenant. Exportación y cierre usan páginas completas; no se fuerzan dentro de modales largos en 320 px.

Flujo:

1. Explicar que se desactivarán taller, empleados y renovaciones.
2. Ofrecer exportar y describir exactamente qué incluye.
3. Mostrar fechas concretas de recuperación y eliminación prevista.
4. Reautenticar con contraseña.
5. Pedir escribir el nombre del taller o la frase indicada.
6. Crear la solicitud con clave de idempotencia.
7. Mostrar un número de gestión persistente.

Al solicitar el cierre:

- se persiste la intención de detener la renovación y un outbox coordina su confirmación con el proveedor;
- se revocan las sesiones de empleados;
- se invalidan inmediatamente seguimiento público, resumen digital, URLs firmadas y cualquier acceso público a datos del taller;
- la cuenta queda restringida;
- durante siete días se puede restaurar;
- después comienza la eliminación o anonimización y desde ese fin de gracia corre el plazo operativo comunicado, inicialmente hasta 30 días;
- sólo se retienen registros fiscales, de pago, seguridad o reclamos que tengan fundamento y plazo documentados.

Estados:

```text
PROGRAMADA → REVOCADA
          → EN_PROCESO → COMPLETADA
                       → RETRY_REQUERIDO
```

`RETRY_REQUERIDO` dispara reintentos, alerta operativa y una nueva fecha comunicada; nunca queda como fallo terminal silencioso.

Durante la ventana de siete días, el inicio de sesión sólo muestra:

- estado y fechas;
- descargar una exportación ya disponible;
- restaurar cuenta;
- cerrar sesión.

Pasada la ventana, no se ofrece recuperación. Una cuenta en cierre responde de forma consistente con `423 CUENTA_EN_CIERRE` para otras operaciones.

Restaurar la cuenta recupera acceso y datos durante la gracia, pero no reactiva silenciosamente una renovación de Mercado Pago que ya haya sido detenida. La UI muestra el estado comercial real y, si corresponde, exige una contratación nueva.

### Sesión restringida y reautenticación

El estado de cuenta se resuelve antes de cualquier perfil, suscripción o dato tenant-scoped mediante `AccountLifecycleGate`. Login o el recurso de sesión exponen `estadoCuenta: ACTIVA | REQUIERE_ACEPTACION | CIERRE_PROGRAMADO | ELIMINACION_EN_PROCESO` y las acciones permitidas.

Bajo `423 CUENTA_EN_CIERRE` permanecen accesibles únicamente:

- estado y referencia del cierre;
- exportación ya disponible y su descarga autorizada;
- reautenticación;
- revocación durante la gracia;
- documentos legales y soporte;
- logout.

La allowlist incluye de forma explícita `POST /api/cuenta/reauthenticaciones` para los propósitos `RESTAURAR` y `DESCARGAR_EXPORTACION`; el propio estado restringido no puede impedir resolver la recuperación.

`POST /api/cuenta/reauthenticaciones` devuelve una credencial opaca ligada a usuario, sesión, taller y propósito (`EXPORTAR`, `DESCARGAR_EXPORTACION`, `CERRAR` o `RESTAURAR`). Tiene TTL corto, un solo uso y se consume en el endpoint sensible; un booleano local nunca autoriza la operación.

Email verificado es requisito antes de contratar PRO, solicitar un reembolso, exportar, cerrar o restaurar. La verificación suave actual puede mantenerse para la operación cotidiana, pero no para estas acciones.

## Seguimiento público y aviso al cliente

La pantalla pública de seguimiento identifica al taller como prestador del servicio y a OrdenFix como plataforma técnica. Incluye un enlace breve:

> Tus datos fueron cargados por el taller para gestionar esta reparación. Conocé cómo se utilizan y cómo ejercer tus derechos.

El enlace explica:

- qué información puede mostrar el seguimiento;
- que el taller originó los datos;
- cómo contactar al taller;
- cómo contactar a OrdenFix por cuestiones técnicas o de privacidad;
- que el enlace no debe compartirse;
- que no existe una relación de cobro entre el cliente final y OrdenFix por esa reparación.

La página no expone fotos, PIN, patrón, notas internas ni datos de otros clientes.

## Contrato API para handoff

Los nombres son una propuesta estable para coordinar ambos repositorios. El chat del backend debe validarlos contra sus convenciones antes de implementar.

### Documentos y aceptaciones

```http
GET  /api/public/documentos-legales?contexto=REGISTRO&locale=es-AR
GET  /api/public/documentos-legales/{versionId}
GET  /api/public/requisitos-legales?contexto=REGISTRO&locale=es-AR
GET  /api/requisitos-legales
POST /api/aceptaciones-legales
```

El registro incluye:

```json
{
  "requiredSetRevision": "registro-es-AR-r7",
  "aceptacionesLegales": [
    {
      "requisitoVersionId": "uuid",
      "tipoActo": "ACEPTACION",
      "afirmacionSha256": "sha256-hex",
      "documentos": [
        {
          "documentoVersionId": "uuid",
          "sha256": "sha256-hex"
        }
      ],
      "confirmado": true
    }
  ]
}
```

El backend usa su reloj y registra requisito, afirmación exacta, acto, documentos y digests en la misma transacción que usuario y taller.

### Atestación sensible

La creación de una intención de foto o la escritura protegida de credenciales incluye:

```json
{
  "atestacion": {
    "tipo": "AUTORIZACION_DATOS_CLIENTE",
    "requisitoVersionId": "uuid",
    "alcances": ["FOTOS"],
    "confirmada": true
  }
}
```

Si falta, responde `428 ATESTACION_REQUERIDA` con los requisitos actuales. Para fotos, el backend crea una intención, entrega autorización efímera de upload privado, recibe una finalización y recién entonces asocia el asset; un job limpia intenciones y assets huérfanos.

Al crear una reparación con fotos, primero se guarda el núcleo de la orden sin archivos y luego se inicia cada carga usando el ID resultante. Si una foto falla, la reparación permanece creada y la UI permite reintentarla.

```http
POST   /api/reparaciones/{reparacionId}/cargas-foto
GET    /api/reparaciones/{reparacionId}/cargas-foto/{intencionId}
POST   /api/reparaciones/{reparacionId}/cargas-foto/{intencionId}/finalizaciones
DELETE /api/reparaciones/{reparacionId}/fotos/{fotoId}
```

La creación recibe nombre, tamaño, MIME, checksum cuando esté disponible, momento y atestación. Devuelve:

```json
{
  "id": "uuid",
  "estado": "AUTORIZADA",
  "expiresAt": "2026-08-23T18:10:00Z",
  "upload": {
    "method": "POST",
    "url": "https://upload-provider.example",
    "fields": {
      "opaqueSignedField": "opaque-value"
    }
  },
  "limites": {
    "maxBytes": 8000000,
    "mimeTypes": ["image/jpeg", "image/png", "image/webp"]
  }
}
```

La finalización recibe únicamente el identificador opaco devuelto por el proveedor y el checksum; backend verifica tenant, firma, MIME, tamaño y estado antes de asociar. Estados:

```text
CREADA → AUTORIZADA → SUBIDA → ASOCIADA
       → EXPIRADA | FALLIDA | LIMPIEZA_PENDIENTE
```

URLs, firmas y campos del proveedor son opacos y efímeros; no se persisten en caché duradera del navegador.

### Suscripción

```http
GET  /api/suscripcion/ofertas/pro
POST /api/suscripcion/checkouts
GET  /api/suscripcion/checkouts/{checkoutId}
GET  /api/suscripcion
POST /api/suscripcion/cancelaciones
GET  /api/suscripcion/cancelaciones/{id}
POST /api/suscripcion/cancelaciones/{id}/revocaciones
GET  /api/suscripcion/pagos
```

El endpoint vigente `POST /api/pagos/suscripcion` se mantiene temporalmente como alias deprecado durante la migración. El cliente nuevo usa `/api/suscripcion/checkouts`; telemetría confirma que no quedan clientes antiguos antes de retirar el alias. `Idempotency-Key` identifica el request HTTP del navegador. La clave privada que el backend use frente a Mercado Pago se genera y protege del lado servidor y nunca se expone al frontend.

Crear un checkout devuelve `checkoutId` opaco, `initPoint` y `expiresAt`. El retorno sólo transporta ese `checkoutId`; `GET /api/suscripcion/checkouts/{checkoutId}` valida tenant y devuelve `CREADO`, `PENDIENTE`, `APROBADO`, `RECHAZADO`, `CANCELADO`, `EXPIRADO` o `FALLIDO`. Los parámetros de estado enviados por el navegador o Mercado Pago nunca son autoridad.

El endpoint legado `POST /api/pagos/suscripcion/cancelar` también se depreca. Durante la transición debe crear la misma cancelación coordinada y devolver una representación compatible con `cancelacionActual`; nunca puede conservar la baja inmediata a FREE. Se retira después de migrar el frontend y verificar telemetría.

`GET /api/suscripcion` agrega:

```json
{
  "renovacionAutomatica": false,
  "periodoActualFin": "2026-09-23T03:00:00Z",
  "accesoProHasta": "2026-09-23T03:00:00Z",
  "cancelacionActual": {
    "id": "uuid",
    "estado": "PROGRAMADA",
    "solicitadaAt": "2026-08-23T18:00:00Z",
    "efectivaAt": "2026-09-23T03:00:00Z"
  }
}
```

### Gestiones

```http
POST /api/public/arrepentimientos
POST /api/public/arrepentimientos/verificaciones
POST /api/cuenta/arrepentimientos
GET  /api/cuenta/arrepentimientos/{id}
POST /api/cuenta/reembolsos
GET  /api/cuenta/reembolsos/{id}

POST /api/exportaciones
GET  /api/exportaciones/{id}
GET  /api/exportaciones/{id}/archivo

GET  /api/cuenta/estado
POST /api/cuenta/reauthenticaciones
POST /api/cuenta/solicitudes-cierre
GET  /api/cuenta/solicitudes-cierre/actual
POST /api/cuenta/solicitudes-cierre/{id}/revocaciones
```

Una creación asíncrona responde `202 Accepted`, encabezado `Location` y:

```json
{
  "id": "uuid",
  "numeroGestion": "CIE-2026-P7H4M2",
  "estado": "PROGRAMADA",
  "creadaAt": "2026-08-23T18:00:00Z"
}
```

`POST /api/public/arrepentimientos` responde siempre `202` con un mensaje genérico. Si los datos permiten continuar, envía por email un token aleatorio, de un solo uso y vencimiento corto. `POST /api/public/arrepentimientos/verificaciones` consume `{ "token": "opaque-token" }`; al validarlo devuelve la referencia y el estado `RECIBIDA`. Token inválido o vencido usa una respuesta genérica que no confirma la existencia de la cuenta y ofrece reiniciar el flujo.

`POST /api/cuenta/reauthenticaciones` es autenticado y queda fuera del wildcard público `/api/auth/**`. Recibe contraseña y propósito y devuelve:

```json
{
  "reauthToken": "opaque-single-use-token",
  "proposito": "CERRAR",
  "expiresAt": "2026-08-23T18:05:00Z"
}
```

El endpoint sensible consume esa credencial mediante `X-Reauth-Token`. El token queda ligado a usuario, sesión, tenant y propósito, tiene TTL corto y no puede reutilizarse.

## Idempotencia, autorización y errores

Registro, aceptaciones, atestaciones/intenciones sensibles, checkout, cancelaciones, revocaciones, exportaciones, arrepentimientos, reembolsos y cierre usan `Idempotency-Key` UUID.

- misma clave y mismo payload: devuelve la respuesta original;
- misma clave y payload distinto: `409 IDEMPOTENCY_KEY_REUTILIZADA`;
- repetir una creación `202` devuelve el mismo recurso y encabezado `Location`; el estado actual se consulta mediante `GET`;
- para invitaciones, verificaciones y reautenticación, backend resuelve primero un replay por misma clave/fingerprint y recién después valida si el token de un solo uso fue consumido; una clave distinta con token ya usado falla;
- el fingerprint incluye método, ruta normalizada, actor/tenant y payload canónico;
- registro y endpoints públicos usan email o challenge verificado como scope sin permitir enumeración;
- el backend conserva sólo el hash de la clave durante un plazo documentado que cubre toda la ventana de reintento;
- además de la clave técnica existe unicidad de negocio: un cierre activo por taller, una cancelación activa por suscripción y una gestión activa equivalente por pago/motivo.

Una intención de foto todavía utilizable conserva su clave durante reintentos. Si quedó `EXPIRADA` o `FALLIDA`, el usuario inicia una intención lógica nueva con una clave nueva; reutilizar la anterior sólo reproduce el recurso terminal original.

Permisos:

| Recurso | Público | USER | ADMIN titular |
|---|---:|---:|---:|
| Documentos publicados | Leer | Leer | Leer |
| Requisitos de registro | Leer | — | — |
| Aceptación personal | — | Crear/leer propia | Crear/leer propia |
| Acuerdo del taller | — | — | Aceptar/leer |
| Atestación por reparación | — | Crear/leer dentro del tenant | Crear/leer dentro del tenant |
| Oferta PRO | — | Leer | Leer |
| Checkout, pagos y cancelación | — | — | Crear/leer/revocar |
| Arrepentimiento público | Crear con challenge | — | — |
| Reembolso autenticado | — | — | Crear/leer |
| Exportación integral y archivo | — | — | Crear/leer/descargar con reauth |
| Estado y cierre de cuenta | — | Sólo estado restringido propio | Crear/leer/revocar con reauth |

Los recursos de otro tenant responden `404`, no `403`.

Códigos contractuales mínimos:

- `403 ROL_INSUFICIENTE`
- `409 DOCUMENTOS_LEGALES_DESACTUALIZADOS`
- `409 IDEMPOTENCY_KEY_REUTILIZADA`
- `409 CIERRE_NO_REVOCABLE`
- `409 EXPORTACION_NO_LISTA`
- `410 EXPORTACION_EXPIRADA`
- `423 CUENTA_EN_CIERRE`
- `428 ACEPTACION_LEGAL_REQUERIDA`
- `428 ATESTACION_REQUERIDA`
- `428 EMAIL_VERIFICADO_REQUERIDO`
- `428 REAUTENTICACION_REQUERIDA`
- `429 DEMASIADAS_SOLICITUDES`
- `502 PROVEEDOR_PAGOS_NO_DISPONIBLE`

Todos respetan la forma existente:

```json
{
  "status": 409,
  "code": "DOCUMENTOS_LEGALES_DESACTUALIZADOS",
  "message": "Las condiciones cambiaron. Revisá la nueva versión.",
  "details": {}
}
```

## Auditoría y minimización

Se registran como eventos append-only:

- documento publicado y aceptado;
- atestación operativa;
- checkout iniciado;
- cancelación programada, revocada y ejecutada;
- gestión creada y cada transición de estado;
- exportación generada, descargada y expirada;
- cierre programado, revocado y completado.

Cada evento conserva tenant, actor, recurso, estado anterior y nuevo, fecha del servidor, `requestId`, digest del requisito y de sus documentos, y hash de la clave idempotente.

Nunca se registran:

- contraseñas;
- tokens completos;
- PIN o patrón;
- payloads sensibles completos;
- IDs privados de proveedor cuando no sean necesarios;
- contenido de fotos.

Los datos técnicos como IP y User-Agent, si se conservan como evidencia, deben minimizarse, protegerse y tener una política de retención documentada.

Las versiones legales inmutables pueden usar caché pública por contenido/digest. El manifiesto de versión vigente se revalida con ETag. Requisitos autenticados, aceptaciones, gestiones, cuenta y exportaciones usan caché privada o `no-store` según sensibilidad; un archivo de exportación siempre usa `private, no-store`.

## Estados de error y recuperación

- Documento indisponible: bloquear aceptación y ofrecer reintento.
- Versión reemplazada: conservar formulario y pedir aceptación de la nueva versión.
- Aceptación pendiente: impedir doble envío y conservar la clave idempotente.
- Oferta PRO incompleta: bloquear checkout; nunca usar un precio local de fallback.
- Retorno de Mercado Pago no confirmado: mostrar estado pendiente y consultar backend; la URL no decide el plan.
- Cancelación pendiente: mostrar estado persistido y permitir reintento seguro.
- Gestión creada pero email fallido: mostrar igualmente la referencia; el email no es la fuente de verdad.
- Exportación fallida: permitir reintento; no avanzar al cierre por defecto.
- Cierre solicitado: mostrar fechas y referencia tras recargar.
- Cuenta restringida: montar `AccountLifecycleGate` antes de consultar suscripción y mantener la allowlist de recuperación.
- Intención de foto creada pero upload fallido: conservar la clave idempotente, no asociar el asset y dejar que expire o se limpie.

## Móvil y accesibilidad

- Diseño de una columna desde 320 px.
- Inputs con fuente mínima de 16 px para evitar zoom involuntario.
- Acciones y checkboxes con target mínimo de 44 px.
- Footer de acciones fijo con `safe-area-inset-bottom` en hojas y diálogos largos.
- `header`, `main`, `article`, `nav` y jerarquía real `h1`–`h3`.
- Índice sticky en desktop y `<details>` al comienzo en móvil.
- Checkbox asociado al texto y error mediante `aria-describedby`.
- Estados pendientes en `aria-live="polite"` y errores en `role="alert"`.
- Foco atrapado y restaurado en modales.
- Nada exige llegar al final del documento para habilitar una aceptación.
- Color nunca es el único indicador.
- Soporte para tema oscuro y `prefers-reduced-motion`.

## Protección del lanzamiento público

La protección se divide en dos controles; el compilador no puede demostrar el estado de servicios remotos.

### Build productivo estático

`build:public` falla si:

- queda un placeholder en borradores o configuración incluidos en el release;
- falta una URL HTTPS explícita del backend;
- el frontend usaría el fallback localhost;
- faltan email legal, privacidad o soporte;
- existe un precio PRO hardcodeado;
- el bundle conserva el preset público unsigned;
- las pruebas o auditoría de dependencias incumplen el umbral acordado.

### Readiness contra staging/producción

Un comando separado consulta el entorno desplegado y el pipeline bloquea la promoción si:

- no existe una versión vigente de cada documento y requisito obligatorio;
- el precio y moneda PRO no están disponibles desde backend;
- la cancelación no soporta fin de período y confirmación del proveedor;
- el protocolo privado de fotos no está habilitado;
- faltan cabeceras de seguridad reales en la respuesta HTTP;
- email, Mercado Pago, webhook, almacenamiento, base de datos u observabilidad fallan sus smokes.

Los checks estáticos corren durante el build. Los checks remotos corren después de desplegar staging y antes de promoverlo a producción.

## Pruebas

### Unitarias e integración frontend

- documentos públicos, versión vigente e histórica;
- fallos de carga y reintento;
- checkboxes sin preselección, validación y foco accesible;
- registro con versiones y manejo de `409`;
- invitación, contraseña propia, email verificado y gate de empleado por `428`;
- `AccountLifecycleGate` anterior al gate de suscripción y allowlists de recuperación;
- atestación por alcance e intención privada antes de asociar fotos o credenciales;
- oferta PRO sin importe hardcodeado;
- checkout aprobado, pendiente, cancelado, rechazado y expirado;
- cancelación programada y fecha de acceso;
- gestiones y número de referencia;
- exportación asíncrona;
- cierre, ventana de recuperación y cuenta restringida;
- permisos ADMIN/USER;
- sanitización de telemetría.

### E2E

- registro completo en 320, 390 y desktop;
- abrir documentos sin perder el formulario;
- versión legal que cambia durante el registro;
- invitación y primer ingreso de empleado sin contraseña conocida por el administrador;
- orden normal sin interrupción y orden con foto/PIN con atestación;
- contratación y todos los retornos de Mercado Pago;
- cancelación al final del período;
- solicitud pública sin enumeración de cuentas;
- exportación y cierre con recuperación;
- cierre que invalida seguimiento público y no reactiva silenciosamente la renovación al restaurar;
- navegación por teclado y lector semántico básico;
- dos talleres consecutivos sin reutilización de caché.

### Validación compartida

Los E2E locales con API simulada no son suficientes para lanzar. Debe existir un entorno staging con:

- backend real;
- dominio verificado para email;
- credenciales sandbox de Mercado Pago;
- webhook firmado y accesible;
- almacenamiento privado o firmado para fotos;
- base PostgreSQL y pruebas de migración;
- observabilidad y alertas.

## Criterios de aceptación

- Ninguna cuenta se crea sin el conjunto legal vigente requerido.
- Cada aceptación puede reconstruir qué texto y versión se aceptó.
- El cliente final no debe aceptar condiciones comerciales de OrdenFix para una reparación.
- Una reparación sin fotos ni credenciales no agrega fricción.
- Ninguna foto queda asociada o visible y ninguna credencial se guarda sin atestación contextual.
- El importe PRO y sus condiciones proceden del backend.
- Una cancelación sólo promete ausencia de nuevos cobros después de confirmación durable y conserva PRO hasta la fecha informada.
- Arrepentimiento, revisión de cobro y cancelación son flujos diferentes.
- Cada gestión devuelve una referencia persistente.
- Sólo el ADMIN exporta o cierra el taller.
- El cierre es recuperable durante siete días y luego avanza a eliminación o anonimización.
- Una cuenta restringida siempre conserva un camino funcional para consultar, exportar cuando corresponda, restaurar o cerrar sesión.
- Las superficies públicas del taller se invalidan al programar el cierre.
- Las versiones históricas y constancias siguen siendo consultables según su retención.
- El build público no acepta placeholders ni fallbacks locales y el readiness remoto bloquea servicios incompatibles.
- La experiencia completa funciona desde 320 px, teclado y tema oscuro.
- Typecheck, lint, build, unitarios y E2E quedan en verde.

## Validaciones profesionales pendientes

Antes de cobrar públicamente deben confirmarse:

1. identidad legal, CUIT, domicilio, emails y jurisdicción;
2. aplicabilidad de normas de consumo al modelo comercial concreto;
3. texto, ubicación y alcance del botón de arrepentimiento y de baja;
4. política de reembolsos y tratamiento de servicio ya utilizado;
5. plazos de conservación fiscal, pagos, fraude, seguridad y reclamos;
6. necesidad de inscripciones o trámites ante AAIP;
7. subencargados, transferencias internacionales y contratos con proveedores;
8. tratamiento de fotos, PIN, patrón y datos que puedan ser sensibles;
9. emisión fiscal correspondiente al cobro de PRO.

Referencias oficiales de trabajo:

- AAIP, obligaciones de responsables: <https://www.argentina.gob.ar/aaip/datospersonales/responsables/obligaciones>
- AAIP, trámites y registros: <https://www.argentina.gob.ar/aaip/datospersonales/tramites>
- Disposición 954/2025: <https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-954-2025-417152/texto>
- Disposición 3/2026: <https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-3-2026-423007/texto>
- ARCA, comprobantes electrónicos: <https://www.arca.gob.ar/facturacion/comprobantes/fe-vs-cf.asp>

Estas referencias orientan el diseño y no sustituyen revisión jurídica o contable.
