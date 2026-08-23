# Plan de implementación — Identidad del taller, control de cobros y resumen digital

Fecha: 2026-08-23

Diseño aprobado: `docs/plans/2026-08-23-identidad-cobros-resumen-digital-design.md`

## Objetivo

Implementar de extremo a extremo la identidad Taller → Usuario, corregir la inconsistencia que permite y muestra pendientes negativos, delimitar Cobros como registro manual, guardar datos públicos de cobro por tenant y convertir el recibo imprimible en un resumen digital interno y responsive.

La implementación abarca dos repositorios locales:

- Frontend: `/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend`.
- Backend: `/Volumes/DiscoExtern/Desktop/mvrg-backend`.

No se hará push. Los commits se mantendrán atómicos en cada repositorio. En frontend no se tocarán `.agents/` ni `public/OrdenFix project naming/`.

## Contratos finales

### Perfil actual

```http
GET /api/perfil
```

```json
{
  "usuario": {
    "id": 12,
    "username": "Juan Pérez",
    "email": "juan@celexpress.com",
    "role": "ADMIN"
  },
  "taller": {
    "id": 7,
    "nombre": "CelExpress",
    "telefono": "1133334444"
  }
}
```

La respuesta no se persiste en Zustand. React Query será la única fuente remota.

### Estado de cobro

```text
saldo = max(total - cobrado, 0)
excedente = max(cobrado - total, 0)
requiereRevision = excedente > 0
pagado = total > 0 && cobrado >= total
```

`saldo` mantiene compatibilidad y nunca es negativo. `excedente` y `requiereRevision` son campos aditivos en reparación, resumen de cobros y resumen digital.

### Errores de dominio

`ApiError` conserva sus campos actuales y agrega opcionalmente:

```json
{
  "code": "COBRO_SUPERA_SALDO",
  "details": {
    "reparacionId": 10,
    "total": 50000,
    "cobrado": 20000,
    "monto": 40000,
    "pendiente": 30000
  }
}
```

Códigos iniciales:

- `COBRO_SUPERA_SALDO`;
- `TOTAL_MENOR_QUE_COBRADO`;
- `COBRO_YA_ANULADO`;
- `QR_COBRO_INVALIDO`;
- `QR_COBRO_NO_CONFIGURADO`;
- `ARCHIVO_DEMASIADO_GRAN`.

### Datos públicos de cobro

```http
GET    /api/taller/datos-cobro
PUT    /api/taller/datos-cobro                 # sólo ADMIN
GET    /api/taller/datos-cobro/qr
PUT    /api/taller/datos-cobro/qr              # multipart `file`, sólo ADMIN
DELETE /api/taller/datos-cobro/qr              # sólo ADMIN
```

```json
{
  "alias": "celexpress.mp",
  "titular": "Juan Pérez",
  "entidad": "Mercado Pago",
  "mostrarEnResumen": true,
  "qrDisponible": true,
  "qrVersion": "sha256-hex-completo"
}
```

`PUT /datos-cobro` reemplaza el recurso completo y devuelve `200` con este mismo DTO. `alias` (120), `titular` (160) y `entidad` (120) aceptan `null`; se aplica trim y blanco → `null`. `mostrarEnResumen` es obligatorio y los talleres existentes parten de `true`.

`PUT /qr` recibe una parte multipart llamada `file` y devuelve `200` con el DTO actualizado. `DELETE /qr` también devuelve `200`, con `qrDisponible=false` y `qrVersion=null`. `GET /qr` devuelve `image/png`, ETag basado en el SHA-256 completo y `Cache-Control: private, no-store`; si el tenant actual no tiene imagen, responde `404` con `QR_COBRO_NO_CONFIGURADO`.

El QR se guarda como PNG normalizado en una tabla separada por `taller_id`. No se aceptan URLs externas ni SVG. Metadatos y QR son guardados independientes: el frontend sólo confirma cada operación que terminó bien, mantiene abierto el modal ante un fallo parcial y conserva el estado pendiente de la otra.

### Cobro

```json
{
  "monto": 20000,
  "metodo": "TRANSFERENCIA",
  "referencia": "OP-123",
  "observaciones": "Seña"
}
```

`referencia` tiene un máximo de 120 caracteres. `observaciones` continúa siendo una nota interna y no forma parte del documento dirigido al cliente.

### Anulación de un cobro

```http
POST /api/reparaciones/{reparacionId}/cobros/{cobroId}/anulacion
```

```json
{ "motivo": "Carga duplicada" }
```

El motivo es obligatorio, se normaliza con trim y admite hasta 255 caracteres. El endpoint canónico toma lock sobre la reparación y el cobro, devuelve `200` con el `CobroResponseDTO` actualizado y responde `409 COBRO_YA_ANULADO` ante una segunda transición. El alias legado `DELETE /api/reparaciones/{reparacionId}/cobros/{cobroId}` conserva `204`, registra el motivo de sistema “Anulación mediante endpoint legado” y es idempotente.

`CobroResponseDTO` mantiene `id`, `reparacionId`, `monto`, `metodo`, `observaciones` y `fecha`, y agrega `referencia`, `estado` (`ACTIVO` o `ANULADO`), `anuladoAt`, `anuladoPorNombre` y `motivoAnulacion`. `GET /cobros` incluye ambos estados para preservar la historia; `cobrado`, Caja, Dashboard y el resumen digital consideran sólo activos. La protección contra borrar una reparación considera todo cobro histórico, incluso anulado.

### Resumen digital

Se agrega `GET /api/reparaciones/{id}/resumen-digital`. `/recibo` se mantiene temporalmente como alias autenticado para compatibilidad y ambos devuelven exactamente el mismo DTO.

```json
{
  "numeroOrden": "OF-000123",
  "codigoSeguimiento": "ABC123",
  "fecha": "2026-08-23T14:30:00",
  "estado": "LISTO",
  "taller": { "nombre": "CelExpress", "telefono": "1133334444" },
  "cliente": { "nombre": "Ana", "apellido": "Pérez", "telefono": "1122223333" },
  "equipo": { "marca": "Samsung", "modelo": "A54", "descripcionProblema": "No enciende" },
  "detalle": {
    "repuestos": [{ "nombre": "Módulo", "cantidad": 1, "precioUnitario": 30000, "subtotal": 30000 }],
    "manoDeObra": 20000,
    "totalRepuestos": 30000
  },
  "importes": {
    "total": 50000,
    "cobrado": 20000,
    "saldo": 30000,
    "excedente": 0,
    "requiereRevision": false,
    "pagado": false
  },
  "pagos": [{ "fecha": "2026-08-23T14:00:00", "monto": 20000, "metodo": "TRANSFERENCIA", "referencia": "OP-123" }],
  "datosCobro": {
    "alias": "celexpress.mp",
    "titular": "Juan Pérez",
    "entidad": "Mercado Pago",
    "qrDisponible": true,
    "qrVersion": "sha256-hex-completo"
  },
  "documentoFiscal": false,
  "leyenda": "Documento informativo. No es factura ni comprobante fiscal y no reemplaza los emitidos por ARCA."
}
```

`pagos` contiene sólo cobros activos, sin IDs ni observaciones. `datosCobro` es `null` salvo que exista pendiente, `mostrarEnResumen=true` y al menos un dato público o QR. La imagen se obtiene aparte por el endpoint protegido y sólo cuando `qrDisponible=true`; `qrVersion` forma parte de su cache key.

Todos los endpoints de datos de cobro, QR, cobros y resumen digital —incluidos los alias— requieren `PlanFeature.COBROS`. La autorización por rol es adicional: ambos roles consultan y sólo `ADMIN` modifica o anula.

## Tarea 0 — Preparar los dos repositorios

### Frontend

- Confirmar rama `codex/frontend-refactor-checkpoint`.
- Confirmar que sólo estén sin rastrear los directorios del usuario ya conocidos.
- Mantener los commits previos sin reescritura.

### Backend

- Partir del HEAD limpio de `codex/backend-hardening-release`.
- Crear `codex/cobros-identidad-resumen` para aislar este bloque.
- No reescribir ni mezclar los commits de hardening existentes.

### Verificación

```bash
git status --short --branch
git log -8 --oneline
```

No se crea un commit para esta tarea.

## Tarea 1 — Exponer el perfil autenticado en backend

### Archivos backend

- Crear `controller/PerfilController.java`.
- Crear `service/impl/PerfilService.java`.
- Crear DTOs bajo `service/dto/perfil/`.
- Ampliar `UserRepository` con una consulta de perfil que incluya taller.
- Agregar pruebas de flujo y aislamiento tenant.

### Implementación

1. Resolver el usuario desde el principal autenticado, no desde un ID del request.
2. Cargar usuario y taller en una sola consulta con `@EntityGraph`.
3. Devolver únicamente identidad visible; no devolver password, tokenVersion u otros campos internos.
4. Permitir `ADMIN` y `USER`.
5. Mantener `/api/auth/**` exclusivamente para flujos públicos; `/api/perfil` queda protegido por la regla general.

### Pruebas backend

- ADMIN recibe su usuario y taller.
- USER recibe su propio nombre/rol y el mismo taller.
- Dos talleres no cruzan identidad.
- Token ausente, revocado o usuario desactivado conserva las respuestas de sesión actuales.

### Verificación

```bash
./mvnw -Dtest=PerfilTests,AuthTests,TenantIsolationTests test
```

### Commit backend

```text
feat(perfil): expone usuario y taller actuales
```

## Tarea 2 — Incorporar el perfil como dato remoto en frontend

### Archivos frontend

- Modificar `src/types/index.ts`.
- Modificar `src/api/queryKeys.ts`.
- Crear `src/api/queries/perfil.queries.ts`.
- Crear `src/hooks/useSessionIdentity.ts`.
- Modificar `src/router/guards.tsx`.
- Modificar `src/api/axios.ts`.
- Ampliar `e2e/helpers.ts`.
- Crear/ampliar pruebas de query, hook, guards, interceptor y store.

### Implementación

1. Definir `Perfil` con el contrato exacto aprobado.
2. Consultar `/perfil` con `AbortSignal` y `errorMode: 'inline'`.
3. Habilitar la query únicamente cuando haya una sesión/token vigente; logout y rutas públicas no disparan requests tardías.
4. Iniciar perfil y suscripción en paralelo dentro del gate; sólo suscripción bloquea la primera pintura privada.
5. Tratar un `403` de `/perfil` como sesión inválida porque el endpoint no tiene restricciones de rol.
6. Derivar en `useSessionIdentity` nombre, taller, email, rol visible, iniciales, carga, fallback y reintento.
7. Fijar fallbacks: email completo en cuenta, prefijo del email en saludo, “Mi taller” o frase genérica para taller desconocido y rol desde JWT.
8. Conservar autorización crítica en `useAuth`; el perfil sólo aporta identidad visible.
9. No persistir el perfil en localStorage y conservar el `staleTime` global.
10. Agregar a `e2e/helpers.ts` `defaultPerfil`, `MockData.perfil` y el handler explícito de `GET /api/perfil`; el catch-all no puede ocultar un contrato ausente.

### Pruebas frontend

- Request, señal y error inline.
- Dos observadores comparten una sola query.
- Perfil válido y fallback por email.
- Sin sesión no consulta `/perfil`.
- Perfil fallido no oculta la aplicación.
- Cambiar tenant/rol/email y logout purgan la key.
- `403 /perfil` cierra la sesión sin una segunda validación.
- `src/api/cacheConsistency.test.ts` registra `queryKeys.perfil.all === ['perfil']`.

### Verificación

```bash
npm test -- src/api/queries/perfil.queries.test.tsx src/hooks/useSessionIdentity.test.tsx src/router/guards.test.tsx src/api/axios.test.ts src/api/cacheConsistency.test.ts src/store/auth.store.test.tsx
npm run typecheck
npm run lint
```

### Commit frontend

```text
feat(perfil): incorpora contexto remoto del taller
```

## Tarea 3 — Mostrar Taller → Usuario en la interfaz

### Archivos frontend

- Modificar `src/components/Sidebar.tsx`.
- Modificar `src/components/Navbar.tsx`.
- Modificar `src/pages/DashboardPage.tsx`.
- Crear `Sidebar.test.tsx` y `Navbar.test.tsx`.
- Ampliar `DashboardPage.test.tsx`, E2E de auth y matriz móvil.

### Implementación

1. Sidebar: OrdenFix y taller en cabecera; usuario, rol y email en el pie.
2. Navbar móvil: isotipo, marca y taller en dos líneas con elipsis accesible.
3. Navbar desktop: usuario real en lugar de un segundo email aislado.
4. Dashboard: `Hola, {username}` y `Esto es lo que pasa hoy en {taller}`.
5. Skeleton corto durante carga y fallback al email ante error.
6. Reintento disponible en Sidebar para desktop y Navbar para móvil.

Las pruebas cubren skeleton sin bloquear indicadores, reintento efectivo, `USER → Empleado`, iniciales `Juan Pérez → JP`, username distinto del prefijo del email y nombre de taller largo con valor completo accesible.

### Responsive

- 320 px y 390 px sin overflow.
- Nombre largo truncado visualmente y completo en `title`/nombre accesible.
- Objetivos táctiles de 44 px.

### Verificación

```bash
npm test -- src/components/Sidebar.test.tsx src/components/Navbar.test.tsx src/pages/DashboardPage.test.tsx
npm run test:e2e -- e2e/auth.spec.ts
npm run test:e2e -- e2e/mobile.spec.ts --project=mobile-320 --project=mobile-390 --project=mobile-landscape
npm run typecheck
npm run lint
git diff --check
```

### Commit frontend

```text
feat(ui): muestra la identidad del taller
```

## Tarea 4 — Estandarizar errores de dominio en backend

### Archivos backend

- Modificar `exceptions/ApiError.java`.
- Modificar `exceptions/BadRequestException.java`.
- Modificar `exceptions/ConflictException.java`.
- Modificar `exceptions/GlobalExceptionHandler.java`.
- Agregar pruebas unitarias/MockMvc de compatibilidad.

### Implementación

1. Agregar `code` y `details` sin quitar los campos existentes.
2. Mantener un constructor compatible para todos los handlers actuales.
3. Permitir que `BadRequestException` y `ConflictException` lleven código estable y mapa inmutable de detalles.
4. Usar `400` para contenido inválido —por ejemplo un QR que no sea raster válido— y `409` para una operación válida que compite con el estado actual.
5. No reportar errores de negocio esperados como fallos internos.

### Verificación

```bash
./mvnw -Dtest=ApiErrorContractTests,EstadoTransicionTests,CobroCajaReciboTests test
```

### Commit backend

```text
feat(api): agrega códigos estables a conflictos de negocio
```

## Tarea 5 — Hacer transaccional la invariancia de cobros

### Archivos backend

- Crear `service/finanzas/EstadoCuentaOrden.java`.
- Crear `service/finanzas/CobroInvariantPolicy.java`.
- Modificar `ReparacionRepository` con lock pesimista por tenant.
- Modificar `RepuestoRepository` con `findByIdAndTallerIdForUpdate` y agregar locks de `Articulo` para las mutaciones de stock.
- Modificar `CobroRepository` y `CobroService`.
- Modificar `ReparacionServiceImpl` y `RepuestoServiceImpl`.
- Endurecer DTOs monetarios para no aceptar importes negativos.
- Crear `V21__validaciones_monetarias_nuevas.sql`.
- Ampliar pruebas de flujo y agregar prueba concurrente PostgreSQL.

### Implementación

1. Bloquear la reparación con `PESSIMISTIC_WRITE` antes de calcular y guardar un cobro.
2. Calcular total, cobrado activo, saldo y excedente en un único value object.
3. Rechazar `monto > saldo` con `COBRO_SUPERA_SALDO`.
4. Rechazar cualquier cobro nuevo si la orden legacy ya tiene excedente.
5. Bloquear también las reparaciones afectadas al cambiar precio o repuestos.
6. Tomar lock sobre el repuesto y los artículos cuyo stock cambia; para mover un repuesto, bloquear origen y destino por ID ascendente.
7. Proyectar el total antes de mutar; rechazar si aumenta un excedente o crea uno nuevo.
8. Permitir en registros legacy cambios neutros o que reduzcan el excedente.
9. Añadir checks `NOT VALID` en PostgreSQL para que los registros previos no bloqueen la migración pero los writes nuevos sí. No declararlos plenamente validados: una migración futura ejecutará `VALIDATE CONSTRAINT` después de corregir los datos auditados.

### Caminos que deben quedar cubiertos

- precio estimado/final;
- crear, editar, mover, desasignar y borrar repuesto;
- cantidad y precio de repuesto;
- dos cobros concurrentes;
- datos legacy con sobrepago.

### Verificación

```bash
./mvnw -Dtest=CobroCajaReciboTests,EstadoPagoTests,InventarioStockTests test
./mvnw -Dit.test=PostgresMigrationIT,CobroConcurrencyIT,InventarioConcurrencyIT verify
```

La prueba de concurrencia usa Testcontainers/PostgreSQL; si Docker no está disponible se informa por separado, sin sustituirla por una falsa garantía secuencial.

### Commits backend

```text
fix(cobros): impide sobrepagos concurrentes
fix(reparaciones): protege totales ya cobrados
```

## Tarea 6 — Exponer excedentes y referencias de cobro

### Archivos backend

- Modificar `Cobro`, request/response y repositorio.
- Modificar DTOs y mapeos de Reparación, Cobros, Dashboard y Exportación.
- Crear `V22__referencia_cobros.sql`.
- Ampliar pruebas de contrato/exportación.

### Implementación

1. Agregar `referencia` nullable de hasta 120 caracteres.
2. Exponer `saldo`, `excedente` y `requiereRevision` de forma consistente.
3. Mantener `estadoPago` sin agregar un enum incompatible.
4. Dar prioridad visual/contractual a `requiereRevision` sobre `PAGADO`.
5. Agregar referencia y revisión a Exportación; las sumatorias excluyen anulados, pero la hoja `Cobros` conserva activos y anulados con estado, fecha, usuario y motivo.

### Verificación

```bash
./mvnw -Dtest=CobroCajaReciboTests,EstadoPagoTests,ExportTests test
```

### Commit backend

```text
feat(cobros): expone referencias y excedentes legacy
```

## Tarea 7 — Representar pendiente y excedente en frontend

### Archivos frontend

- Modificar `src/types/index.ts` y `ApiErrorBody`.
- Modificar `src/components/PagoChip.tsx` y agregar pruebas.
- Modificar `src/components/CobroFormModal.tsx` y pruebas.
- Modificar `src/pages/ReparacionDetallePage.tsx` y pruebas.
- Propagar campos en Reparaciones y Dashboard.
- Modificar mutaciones de cobros y manejo de errores.

### Implementación

1. Mostrar “Pendiente de cobro”, nunca “Saldo” aislado.
2. Mostrar “Excedente a revisar” antes de cualquier estado Pagado.
3. Bloquear Cobrar si `saldo <= 0` o existe revisión pendiente.
4. Validar localmente `monto <= saldo` sin pisar un formulario sucio tras refetch.
5. Conservar el formulario y mostrar el conflicto junto al monto ante una carrera.
6. Agregar referencia separada de observaciones.
7. No duplicar toast y error de campo para el mismo conflicto.

### Verificación

```bash
npm test -- src/components/PagoChip.test.tsx src/components/CobroFormModal.test.tsx src/pages/ReparacionDetallePage.test.tsx src/pages/ReparacionesPage.test.tsx src/pages/DashboardPage.test.tsx
npm run typecheck
npm run lint
```

### Commit frontend

```text
fix(cobros): evita sobrepagos y muestra excedentes
```

## Tarea 8 — Convertir la anulación en un movimiento auditable

### Archivos backend

- Modificar `Cobro`, repositorio, servicio, controller y DTO.
- Crear `V23__anulacion_auditable_cobros.sql`.
- Modificar Caja, Exportación y sumatorias para considerar sólo cobros activos.
- Ampliar pruebas de permisos, tenant y auditoría.

### Implementación

1. Agregar `anuladoAt`, `anuladoPor` y `motivoAnulacion`, exponiendo sólo `anuladoPorNombre`.
2. Crear endpoint canónico `POST /api/reparaciones/{reparacionId}/cobros/{cobroId}/anulacion` con body `{ "motivo": "..." }`, motivo obligatorio y máximo 255; devuelve `200` y el cobro actualizado.
3. Mantener DELETE temporalmente como alias deprecado que también registra la anulación.
4. Validar conjuntamente `reparacionId`, `cobroId` y `tallerId`; tomar lock pesimista sobre la reparación y el cobro.
5. Excluir anulados de sumas, Caja, Dashboard y pagos del resumen.
6. Conservarlos en `GET /cobros` y en la hoja `Cobros` de la exportación, con estado, fecha, usuario y motivo; cualquier cobro histórico continúa bloqueando el borrado físico de la reparación.
7. Hacer idempotente el alias DELETE con motivo explícito del sistema y devolver `409 COBRO_YA_ANULADO` en el endpoint canónico si ya estaba anulado.

### Frontend

- Reemplazar la confirmación simple por una anulación que conserva el movimiento.
- Mostrar fecha, usuario y motivo en la historia.
- Mantener la acción sólo para ADMIN.

### Verificación

```bash
./mvnw -Dtest=CobroCajaReciboTests,RolTests,TenantIsolationTests,ExportTests test
npm test -- src/pages/ReparacionDetallePage.test.tsx src/api/mutations/cobros.mutations.test.tsx
```

### Commits

Backend:

```text
feat(cobros): conserva anulaciones auditables
```

Frontend:

```text
feat(cobros): muestra el historial de anulaciones
```

## Tarea 9 — Guardar datos públicos de cobro y QR por taller

### Archivos backend

- Agregar campos de configuración livianos a `Taller`.
- Crear DTO, controller y service bajo `/api/taller/datos-cobro`.
- Crear entidad/repositorio `TallerQrCobro` separado.
- Crear normalizador raster con `ImageIO`.
- Configurar límites multipart y manejar `MaxUploadSizeExceededException` como `413 ARCHIVO_DEMASIADO_GRAN`.
- Crear `V24__datos_cobro_taller.sql` y `V25__qr_cobro_taller.sql`.
- Agregar pruebas de permisos, tenant, MIME, tamaño y reemplazo.

### Reglas del QR

- máximo de entrada: 1 MiB;
- PNG o JPEG raster;
- máximo 1024×1024 y 1 megapíxel;
- inspección de dimensiones antes de decodificar completamente;
- re-encode a PNG;
- máximo final de 1 MiB;
- SHA-256 para versión/ETag;
- `qrVersion` usa el SHA-256 completo;
- `Cache-Control: private, no-store`;
- GET de otro tenant: `404`;
- una subida inválida nunca pisa el QR anterior.
- mapear el PNG de PostgreSQL explícitamente como `BYTEA` (`@JdbcTypeCode(SqlTypes.VARBINARY)` o equivalente), no como OID de `@Lob`, y cubrirlo en `PostgresMigrationIT`.
- `mostrar_en_resumen BOOLEAN NOT NULL DEFAULT TRUE`; alias, titular y entidad se normalizan con trim, blanco → `null` y los máximos definidos en el contrato.

### Frontend

- Crear query/mutaciones de datos de cobro.
- Crear tarjeta y modal de edición dentro de Cobros.
- `ADMIN` edita; `USER` ve sólo el resumen configurado.
- Texto explícito: OrdenFix guarda referencias, no accede a la cuenta ni confirma pagos.
- Fetch del QR como blob autenticado; crear y revocar el object URL correctamente.
- Preview, reemplazo, eliminación, progreso y errores inline; metadatos y QR comunican éxito por separado y un fallo parcial no cierra el modal.
- Proteger cambios sin guardar.

### Verificación

```bash
./mvnw -Dtest=DatosCobroTests,QrCobroTests,TenantIsolationTests,RolTests,CobroCajaReciboTests test
./mvnw -Dit.test=PostgresMigrationIT verify
npm test -- src/components/DatosCobroCard.test.tsx src/components/DatosCobroFormModal.test.tsx src/components/QrCobroUploader.test.tsx
```

### Commits

Backend:

```text
feat(cobros): guarda datos de pago del taller
feat(cobros): almacena qr raster aislado por tenant
```

Frontend:

```text
feat(cobros): configura alias y qr del taller
```

## Tarea 10 — Aclarar la semántica Caja → Cobros

### Archivos frontend

- Modificar `src/config/nav.tsx`.
- Modificar `src/pages/CajaPage.tsx` y pruebas.
- Modificar textos de Planes, FeatureLocked y navegación móvil.
- Actualizar E2E de gating, navegación y estado URL.

### Implementación

1. Mantener `/caja`, el endpoint `/api/caja` y sus query keys.
2. Cambiar sólo etiquetas visibles y accesibles a Cobros.
3. Usar “Cobrado en el período” y “Cobros registrados”.
4. Añadir la explicación sobre registro manual, banco/billetera, efectivo, gastos y comisiones.
5. Renderizar `referencia` separada de observaciones.
6. Mantener filtros `desde`/`hasta`, Back/Forward y Hoy sin cambios funcionales.

### Verificación

```bash
npm test -- src/pages/CajaPage.test.tsx src/components/BottomNav.test.tsx
npm run test:e2e -- e2e/gating.spec.ts e2e/navigation-mobile.spec.ts e2e/list-url-state.spec.ts
```

### Commit frontend

```text
refactor(cobros): aclara el registro manual por período
```

## Tarea 11 — Crear el resumen digital en backend

### Archivos backend

- Crear `ResumenDigitalOrdenDTO`.
- Modificar `CobroService` o extraer `ResumenDigitalService`.
- Modificar `CobroController`.
- Integrar datos públicos del taller y pagos activos.
- Mantener `/recibo` como alias deprecado.
- Aplicar `PlanFeature.COBROS` de igual forma al endpoint canónico y al alias.

### Contenido

- `numeroOrden` y fecha;
- taller y teléfono;
- cliente y equipo;
- trabajo, repuestos y mano de obra;
- total, cobrado, saldo, excedente y revisión;
- pagos cronológicos con fecha, monto, método y referencia;
- datos públicos de cobro sólo si hay pendiente y `mostrarEnResumen=true`;
- `documentoFiscal: false` y leyenda informativa;
- sin IDs de cobro ni observaciones internas.
- `/recibo` y `/resumen-digital` devuelven exactamente el mismo `ResumenDigitalOrdenDTO`.

### Verificación

```bash
./mvnw -Dtest=CobroCajaReciboTests,TenantIsolationTests test
```

### Commit backend

```text
feat(reparaciones): expone el resumen digital de la orden
```

## Tarea 12 — Reemplazar el recibo imprimible en frontend

### Archivos frontend

- Renombrar `ReciboPage.tsx` a `ResumenDigitalPage.tsx` y crear pruebas.
- Conservar `queryKeys.recibos` como tupla canónica del resumen y hacer que el nombre nuevo sea un alias a la misma key; actualizar `src/api/cacheConsistency.ts`, pruebas y todas las mutaciones que invalidan el resumen.
- Modificar router y CTA en detalle.
- Mantener `/reparaciones/:id/recibo` como redirect o alias durante la transición.
- Agregar `/reparaciones/:id/resumen` como ruta canónica.
- Actualizar Planes y helpers E2E.

### Implementación

1. Título “Resumen digital de la orden”.
2. Taller como emisor; “Generado con OrdenFix” en el pie.
3. Eliminar `window.print()`, CTA y estilos específicos de impresión.
4. Mostrar pagos seguros, pendiente, excedente y datos para cobrar.
5. Leyenda no fiscal visible.
6. Volver determinísticamente a la orden.
7. Layout de una columna en móvil y dos desde `sm`.
8. Textos largos y montos no generan overflow.
9. Descargar el QR sólo cuando `datosCobro.qrDisponible=true`, usando `qrVersion` en la key; cambiar metadatos o QR invalida configuración, blob versionado y resúmenes montados.
10. Agregar a `e2e/mobile.spec.ts` escenarios de resumen y configuración/preview QR con datos largos, sin overflow.

### Verificación

```bash
npm test -- src/pages/ResumenDigitalPage.test.tsx
npm run test:e2e -- e2e/resumen-digital.spec.ts
npm run test:e2e -- e2e/mobile.spec.ts --project=mobile-320 --project=mobile-390 --project=mobile-landscape
```

### Commit frontend

```text
refactor(resumen): reemplaza el recibo imprimible
```

## Tarea 13 — Actualizar contrato y runbook de excedentes

### Archivos

- Actualizar `docs/FRONTEND_INTEGRATION.md`.
- Si corresponde, sincronizar la guía fuente del backend en su repositorio.
- Documentar una consulta read-only para detectar órdenes con `cobrado > total`.
- Documentar la corrección manual segura: revisar, anular con motivo y volver a registrar si corresponde.
- Documentar que los checks de V21 quedan `NOT VALID`, la consulta previa y una migración posterior separada con `VALIDATE CONSTRAINT` sólo después de sanear los registros.

### Restricción

No ejecutar una corrección masiva ni modificar datos productivos como parte de este refactor.

### Commits

Backend:

```text
docs(api): actualiza perfil y control manual de cobros
```

Frontend:

```text
docs(api): sincroniza cobros y resumen digital
```

## Tarea 14 — Regresión completa y cierre

### Backend

```bash
./mvnw test
./mvnw -Dit.test=PostgresMigrationIT,CobroConcurrencyIT,InventarioConcurrencyIT verify
```

### Frontend

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
git diff --check
```

### Verificaciones manuales

- Sidebar y navbar en 320, 390, landscape y desktop.
- Perfil de ADMIN y USER.
- Cobro parcial, exacto, rechazado y conflicto concurrente.
- Excedente legacy visible.
- Configuración de alias y QR con permisos.
- Anulación visible sin desaparecer el historial.
- Cobros por período no se presenta como saldo disponible.
- Resumen digital sin impresión ni afirmaciones fiscales.

### Cierre Git

- Confirmar que ambos worktrees están limpios salvo archivos del usuario ya identificados.
- Listar commits de cada repositorio.
- No hacer push.

## Orden de ejecución y dependencias

```text
Perfil backend
  └─ Perfil frontend
      └─ Identidad UI

Errores backend
  └─ Invariantes monetarias
      └─ Excedentes y referencias
          ├─ UI de cobros
          ├─ Anulación auditable
          └─ Resumen digital

Datos de cobro + QR backend
  ├─ Configuración dentro de Cobros
  └─ Resumen digital
```

Las tareas independientes de identidad y control monetario pueden validarse en paralelo, pero cada commit debe quedar verde antes de avanzar al consumidor siguiente.

## Criterio de finalización

El bloque queda completo cuando identidad, cobros, datos de pago y resumen digital consumen contratos reales; ningún pendiente es negativo; sobrepagos y reducciones inválidas se rechazan bajo lock; los excedentes anteriores son visibles; las anulaciones conservan auditoría; el QR queda aislado por tenant; todas las pruebas de ambos repositorios están verdes; el historial local está ordenado y no hubo push.
