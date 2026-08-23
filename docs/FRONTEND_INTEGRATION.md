# OrdenFix — Guía de integración Frontend

Fuente de verdad del contrato entre el frontend y el backend de **OrdenFix**.
Copiá este archivo al repo del frontend (o usalo como referencia para Claude Code).

---

## ⚡ Novedades de esta versión (para actualizar un front existente)

Si venís de una versión anterior del contrato, esto es lo que cambió / se agregó:

1. **⚠️ BREAKING — Fotos**: el campo `fotos` de reparación pasó de `string[]` a
   `{ url, momento }[]` con `momento: "INGRESO" | "POST_REPARACION"` (§4.5).
2. **Máquina de estados**: `EstadoReparacion` ahora tiene **12 estados** y el backend valida las
   transiciones → un salto ilegal en `PATCH /estado` devuelve **`409`**. El front debería ofrecer
   solo los estados legales según la tabla de transiciones (§4.5).
3. **Estado de pago** en cada reparación: `cobrado`, `saldo`, `excedente`,
   `requiereRevision` y `estadoPago` (`SIN_COBRAR | PARCIAL | PAGADO`). El saldo nunca es
   negativo; un excedente histórico se muestra como inconsistencia prioritaria, no como deuda (§4.5).
4. **Ingreso enriquecido**: flags de riesgo (`mojado`, `trabajoEnPlaca`, `noTesteableAlIngreso`),
   bloqueo de cuenta (`tieneCuentaVinculada`, `clienteConoceCredenciales`) y la bandera roja
   derivada **`riesgoCuentaSinCredenciales`** (§4.5). Nuevo **`numeroOrden`** (`ORD-2026-0042`,
   lo genera el backend, solo lectura).
5. **Presupuestos pro** (§4.11): ítems con `tipoItem` (`MANO_DE_OBRA|REPUESTO`) y `calidad`,
   `tipo` (`ORIGINAL|ADICIONAL`), validez con estado **`VENCIDO`** derivado, re-presupuestar,
   aprobar/rechazar desde el taller, y auto-estado de la reparación.
6. **Conformidad de entrega**: `fechaConformidadEntrega` se sella sola al pasar a `ENTREGADO` (§4.5).
7. **Garantía** (§4.5): `garantiaDias/Inicio/Fin/Condiciones`, `garantiaVigente` derivado, y
   **reclamo en garantía** `POST /api/reparaciones/{id}/garantia` (crea reparación vinculada,
   no consume cupo FREE). En la ficha de una reparación entregada, si `garantiaVigente`,
   ofrecé el botón "Reclamo en garantía".
8. **Seguridad**: un usuario desactivado pierde acceso **al instante** (su token viejo deja de
   servir → `403`); manejalo igual que un 401 (logout).
9. **Exportar datos**: `GET /api/export/excel` (solo ADMIN, todos los planes) descarga un `.xlsx`
   con clientes, órdenes, cobros y presupuestos del taller (§4.14).
10. **Cuentas por email** (§4.1): login/register ahora devuelven **`emailVerificado`** (mostrar
    banner "Confirmá tu email" si es `false` — puede operar igual). Nuevas pantallas:
    **olvidé mi contraseña** (`/password/olvide` + `/password/reset`) y **verificación de email**
    (`/verificar-email` + `/verificar-email/reenviar`). El front necesita las rutas
    `/reset-password?token=...` y `/verificar-email?token=...` (ahí llegan los links del email).
11. **Credenciales del dispositivo protegidas** (§4.5): PIN/patrón se aceptan en altas y ediciones,
    pero el backend solo los devuelve en el **detalle autenticado**. Nunca aparecen en altas, PUT,
    PATCH, listados, dashboard, ingreso rápido ni seguimiento público. Se borran al entregar.
12. **TRIAL con experiencia PRO** (§4.2 y §6): mientras `estado: "TRIAL"`, el taller tiene
    reparaciones ilimitadas y todas las capacidades habilitadas aunque `plan` todavía sea `FREE`.
13. **Checkout MP endurecido** (§4.7): abono mensual de **ARS 24.900**, respuesta validada contra
    `collector_id`/`application_id`, kill switch para nuevos checkouts y reintentos idempotentes.
14. **Identidad autenticada**: `GET /api/perfil` devuelve por separado el usuario actual y el taller
    al que pertenece. Usalo para mostrar nombre, rol y nombre comercial sin depender del JWT (§4.1.bis).
15. **Errores de dominio estables**: `ApiError` puede sumar `code` y `details`; el front decide el
    tratamiento por `code` y usa `message` únicamente como texto visible (§5).
16. **Cobros manuales auditables**: cada movimiento acepta `referencia`; la anulación principal es
    `POST .../anulacion` con motivo y conserva el movimiento en el historial (§4.13).
17. **Datos de cobro del taller**: alias/titular/entidad y QR PNG/JPEG configurables por ADMIN; USER
    puede consultarlos. OrdenFix no procesa ni verifica transferencias (§4.13).
18. **Cobros por período**: `/api/caja` conserva su ruta técnica, pero representa únicamente cobros
    manuales activos registrados en un rango. No es un balance ni el saldo de una cuenta (§4.13).
19. **Resumen digital de la orden**: el endpoint canónico es `GET .../resumen-digital`;
    `GET .../recibo` queda como alias deprecado. Es informativo y expresamente no fiscal (§4.13).

Los tipos TS de §7 ya reflejan todo esto.

---

## 1. Qué es OrdenFix

SaaS para **talleres de reparación de tecnología** (celulares y dispositivos). Multi-empresa
(cada taller ve solo sus datos) y por **suscripción freemium** (plan FREE con límites + plan PRO).

Flujo del dominio:

```
Taller (cuenta/tenant)
  └── Usuarios (login por email)
  └── Clientes
        └── Equipos (celular/dispositivo del cliente)
              └── Reparaciones (orden de trabajo, con estado)
                    └── Repuestos (partes usadas)
```

El **multi-tenant es transparente para el frontend**: nunca se envía un `tallerId`.
El backend deduce el taller desde el token y filtra todo automáticamente.

---

## 2. Entorno / Base URL

- Local: `http://localhost:8080`
- Configurable por variable de entorno: `VITE_API_URL` (o equivalente).
- Todas las rutas cuelgan de `/api`.

CORS habilitado para:
- `http://localhost:5173` (Vite dev)
- `https://mvgr-reparaciones-frontend.vercel.app`

> Si el frontend se despliega en otro dominio, hay que agregarlo en el backend (`CorsConfig`).

---

## 3. Autenticación (JWT)

- Endpoints públicos: `/api/auth/**`, `/api/seguimiento/**`, `/api/pagos/webhook` y
  `/actuator/health`. **El resto requiere token.** El webhook es exclusivo de Mercado Pago;
  el frontend nunca debe invocarlo.
- Header en cada request autenticada:
  `Authorization: Bearer <token>`
- El token es un JWT que contiene `sub` (email), `role`, `tallerId` y `exp`.
  El claim `role` llega con formato Spring Security: `ROLE_ADMIN` o `ROLE_USER`. Si el front usa
  `ADMIN`/`USER` en sus guards, debe normalizar el prefijo de forma explícita.
  Se puede decodificar en el front para mostrar email/rol, **pero la seguridad la
  valida siempre el backend** (no confíes en el token para habilitar acciones críticas).
- Duración del token: la define cada entorno mediante `JWT_EXPIRATION`. El front debe guiarse por
  el claim `exp`, no asumir una duración fija. Un token ausente, inválido, revocado o perteneciente
  a un usuario desactivado puede terminar en `403`; ver el manejo de sesión debajo.
- **Roles**: `ADMIN` (dueño) y `USER` (empleado). Hoy el registro crea siempre ADMIN y luego ese
  ADMIN puede crear empleados. Ambos roles pertenecen al mismo tenant: USER puede operar el CRUD
  cotidiano, registrar/consultar cobros, ver Cobros por período, el resumen digital y los datos de
  cobro. Son **solo ADMIN** (USER recibe `403`): gestión de usuarios, iniciar/cancelar la suscripción,
  exportación, bajas físicas del CRUD, anulación de cobros y escritura/borrado de los datos de cobro
  o su QR. El backend sigue siendo la autoridad; ocultar un botón en el front no reemplaza el permiso.

### Flujo
1. **Registro** (`POST /api/auth/register`) o **Login** (`POST /api/auth/login`) → devuelven
   `{ token, type, email, emailVerificado }`.
2. Guardar el token (localStorage) y mandarlo en el header en todas las llamadas.
3. Ante un **401**, borrar el token y redirigir a `/login`.
4. Un **403** puede significar tanto sesión inválida/revocada como falta de rol. No lo conviertas
   ciegamente en logout ni en "sin permisos": al iniciar la app validá la sesión con
   `GET /api/suscripcion`; un `403` en esa ruta base implica logout. En una acción conocida como
   solo-ADMIN, mostrale "sin permisos" al USER. Si aparece un `403` inesperado durante la sesión,
   repetí esa validación base antes de decidir.

---

## 4. Endpoints

### 4.1 Auth — PÚBLICO

#### `POST /api/auth/register` — alta de taller (onboarding)
Crea el taller + usuario admin + suscripción FREE en TRIAL (14 días) y deja al usuario logueado.

Request:
```json
{
  "nombreTaller": "CelExpress",        // obligatorio, máx 120
  "telefonoTaller": "1133334444",      // opcional, máx 20
  "nombreAdmin": "Juan",               // obligatorio, máx 50 (nombre visible)
  "email": "juan@celexpress.com",      // obligatorio, formato email, único global
  "password": "juan123"                // obligatorio, 6 a 100 chars
}
```
Respuesta `201`:
```json
{ "token": "eyJ...", "type": "Bearer", "email": "juan@celexpress.com", "emailVerificado": false }
```
Errores: `400` (email ya registrado o validación).
> Además manda el email de bienvenida con el link de verificación (ver más abajo).

#### `POST /api/auth/login`
Request:
```json
{ "email": "juan@celexpress.com", "password": "juan123" }
```
Respuesta `200`:
```json
{ "token": "eyJ...", "type": "Bearer", "email": "juan@celexpress.com", "emailVerificado": true }
```
Errores: `401` (email o contraseña incorrectos).

> **`emailVerificado`** también viene en el register (siempre `false` ahí). Si es `false`,
> mostrá un banner "Confirmá tu email (revisá tu casilla)" con botón de reenviar — el usuario
> **puede operar igual** (verificación suave).

#### Olvidé mi contraseña — `POST /api/auth/password/olvide` / `POST /api/auth/password/reset`

1. `POST /api/auth/password/olvide` con `{ "email": "..." }` → **siempre `200`** (no revela si
   el email existe). Si existe, le llega un email con un link a `{front}/reset-password?token=...`
   (el token vence en **1 hora**).
2. En esa pantalla del front, pedís la contraseña nueva y mandás
   `POST /api/auth/password/reset` con `{ "token": "...", "nuevaPassword": "..." }` → `200`.
   El token es de **un solo uso**; inválido/vencido/usado → `400` ("El link no es válido o ya venció").
3. Pedir un link nuevo invalida el anterior.

#### Verificación de email — `POST /api/auth/verificar-email` (+ `/reenviar`)

- Al registrarse, llega un email de bienvenida con link a `{front}/verificar-email?token=...` (vence en 48 h).
- En esa pantalla el front manda `POST /api/auth/verificar-email` con `{ "token": "..." }` → `200`
  (inválido/vencido → `400`).
- `POST /api/auth/verificar-email/reenviar` con `{ "email": "..." }` → siempre `200` (reenvía solo
  si la cuenta existe y no está verificada).

> **Rutas nuevas que el front debe tener**: `/reset-password` y `/verificar-email` (leen `?token=`
> de la URL). El link "¿Olvidaste tu contraseña?" va en la pantalla de login.

---

### 4.1.bis Perfil autenticado — requiere token

#### `GET /api/perfil`

Devuelve la identidad visible del principal actual y del taller deducido desde la sesión. Está
disponible para `ADMIN` y `USER`; no se envía `tallerId` como parámetro.

```json
{
  "usuario": {
    "id": 7,
    "username": "Juan Pérez",
    "email": "juan@celexpress.com",
    "role": "ADMIN"
  },
  "taller": {
    "id": 3,
    "nombre": "CelExpress",
    "telefono": "1133334444"
  }
}
```

- La propiedad `usuario.role` llega normalizada como `ADMIN | USER`; no tiene el prefijo `ROLE_`
  que puede aparecer dentro del JWT.
- Usá `usuario.username` para identificar a la persona y `taller.nombre` como nombre comercial. Son
  conceptos distintos aunque al crear la cuenta hayan partido del mismo formulario.
- El perfil no incluye contraseña, PIN/patrón, datos de suscripción ni secretos. Para entitlements
  se sigue consultando `GET /api/suscripcion`.
- Puede usarse junto con `/api/suscripcion` como consulta base de sesión. Un `403` directo en esas
  consultas significa que la sesión ya no es operable y debe limpiarse.

---

### 4.2 Suscripción / Plan — requiere token

#### `GET /api/suscripcion`
Plan y consumo del taller actual. Úsalo para la pantalla de Planes y el banner de "límite alcanzado".
```json
{
  "plan": "FREE",                  // FREE | PRO
  "estado": "TRIAL",               // TRIAL | ACTIVA | VENCIDA | CANCELADA
  "fechaInicio": "2026-06-16",
  "fechaFinTrial": "2026-06-30",   // null si no aplica
  "proximoCobro": null,            // fecha del próximo cobro PRO (la setea el webhook de MercadoPago)
  "reparacionesEsteMes": 12,
  "limiteReparacionesMes": null,   // null = ilimitado (TRIAL o PRO/ACTIVA)
  "funciones": {                   // capacidades del plan: el front habilita/oculta según esto
    "inventario": true,
    "cobros": true,                // cobros + vista por período + datos de cobro + resumen digital
    "empleadosMultiples": true     // agregar más de 1 usuario
  }
}
```

**Entitlements:** durante `estado: "TRIAL"`, el taller recibe la experiencia PRO completa aunque el campo
`plan` sea `"FREE"`: funciones habilitadas y reparaciones ilimitadas. En `estado: "ACTIVA"`, las funciones
`inventario`, `cobros` (cobros, vista por período, datos de cobro y resumen digital) y
`empleadosMultiples` quedan habilitadas solo para `plan: "PRO"`.
El front debe usar siempre `funciones` y `limiteReparacionesMes` como fuente de verdad, **no inferir permisos
solo desde `plan`**. Debe deshabilitar/ocultar las secciones cuyo flag esté en `false`. Si igual se llama a un
endpoint sin entitlement, el backend responde **`402`** con un `message` accionable (modal "Pasá a PRO").
El plan `FREE/ACTIVA` mantiene clientes, equipos, reparaciones (con tope mensual), repuestos,
presupuestos, **dashboard** y seguimiento público.

---

### 4.2.bis Paginación y búsqueda (todos los listados principales)

Los `GET` de listado (`/api/clientes`, `/api/equipos`, `/api/reparaciones`, `/api/repuestos`)
**devuelven una página**, no un array. Aceptan query params:

- `page` (0-based, default 0), `size` (default 20), `sort` (ej: `sort=nombre,asc`).
- `q` = búsqueda por texto (clientes: nombre/apellido/teléfono; equipos: marca/modelo/IMEI **+ cliente nombre/apellido**;
  reparaciones: descripción **+ cliente nombre/apellido/teléfono + equipo marca/modelo**; repuestos: nombre).
- Reparaciones además: `estado=EN_PROCESO` (filtro por estado). Se combinan `estado` + `q` + `page/size/sort`.
- `sort` ordena por **columnas de la entidad** (no por los campos denormalizados). Campos y defaults:
  - reparaciones → `id`,`estado`,`fechaIngreso`,`fechaEstimadaEntrega`,`fechaEntrega`,`precioFinal`,`createdAt` · default `id,desc`
  - clientes → `nombre`,`apellido`,`telefono`,`id` · default `nombre,asc`
  - equipos → `id`,`marca`,`modelo` · default `id,desc`

Forma de la respuesta (estable):
```json
{
  "content": [ /* ...los items... */ ],
  "page": { "size": 20, "number": 0, "totalElements": 42, "totalPages": 3 }
}
```
> En el front, leé `data.content` para los items y `data.page` para la paginación.
> Los endpoints `/cliente/{id}`, `/equipo/{id}`, `/reparacion/{id}` (sub-listados) siguen devolviendo array simple.

---

### 4.3 Clientes — requiere token  (`/api/clientes`)

| Método | Ruta | Body | Resp |
|--------|------|------|------|
| POST   | `/api/clientes` | ClienteRequest | `200` ClienteResponse |
| PUT    | `/api/clientes/{id}` | ClienteRequest | `200` ClienteResponse |
| GET    | `/api/clientes/{id}` | — | `200` ClienteResponse |
| GET    | `/api/clientes?q=&page=&size=&sort=` | — | `200` Page de ClienteResponse |
| DELETE | `/api/clientes/{id}` | — | `204` |

ClienteRequest:
```json
{
  "nombre": "Pedro",       // obligatorio, máx 60
  "apellido": "Gomez",     // obligatorio, máx 60
  "telefono": "1155556666",// obligatorio, máx 20, único POR TALLER
  "email": "pedro@mail.com",// opcional, formato email, máx 120, único por taller
  "direccion": "Calle 123" // opcional, máx 255
}
```
ClienteResponse: `{ id, nombre, apellido, telefono, email, direccion, equiposCount, reparacionesCount, ultimaVisita }`
- `equiposCount` / `reparacionesCount`: agregados del cliente. `ultimaVisita`: fecha-hora de su última reparación (`null` si no tiene).

Errores: `400` si el teléfono ya existe en el taller (al crear); `409` si choca la unicidad al actualizar
o si se intenta borrar un cliente que todavía tiene equipos. Ante el `409`, conservá la fila y mostrale
al usuario el `message` del backend.

---

### 4.4 Equipos — requiere token  (`/api/equipos`)

| Método | Ruta | Body | Resp |
|--------|------|------|------|
| POST   | `/api/equipos` | EquipoRequest | `201` EquipoResponse |
| PUT    | `/api/equipos/{id}` | EquipoRequest | `200` EquipoResponse |
| GET    | `/api/equipos/{id}` | — | `200` EquipoResponse |
| GET    | `/api/equipos?q=&page=&size=` | — | `200` Page de EquipoResponse |
| GET    | `/api/equipos/cliente/{clienteId}` | — | `200` EquipoResponse[] |
| DELETE | `/api/equipos/{id}` | — | `204` |

EquipoRequest:
```json
{
  "marca": "Samsung",      // obligatorio, máx 60
  "modelo": "A52",         // obligatorio, máx 60
  "imei": "35...",         // opcional, máx 30
  "color": "Negro",        // opcional, máx 40
  "descripcion": "...",    // opcional, máx 255
  "clienteId": 1           // obligatorio
}
```
EquipoResponse: `{ id, marca, modelo, imei, color, descripcion, clienteId, clienteNombre, clienteApellido, clienteTelefono, reparacionesCount }`

Errores: `404` si el `clienteId` no pertenece a tu taller; `409` si se intenta borrar un equipo que
todavía tiene reparaciones. No elimines optimistamente la fila antes de recibir el `204`.

---

### 4.5 Reparaciones — requiere token  (`/api/reparaciones`)

| Método | Ruta | Body | Resp |
|--------|------|------|------|
| POST   | `/api/reparaciones` | ReparacionRequest | `201` ReparacionResponse |
| POST   | `/api/reparaciones/{id}/garantia` | `{ "descripcionProblema": "..." }` | `201` ReparacionResponse (reclamo en garantía) |
| PUT    | `/api/reparaciones/{id}` | ReparacionRequest | `200` ReparacionResponse |
| PATCH  | `/api/reparaciones/{id}/estado` | `{ "estado": "EN_PROCESO" }` | `200` ReparacionResponse · `409` si la transición no es legal |
| GET    | `/api/reparaciones/{id}` | — | `200` ReparacionDetalleResponse |
| GET    | `/api/reparaciones?q=&estado=&page=&size=` | — | `200` Page de ReparacionResponse |
| GET    | `/api/reparaciones/equipo/{equipoId}` | — | `200` ReparacionResponse[] |
| GET    | `/api/reparaciones/estado?estado=EN_PROCESO` | — | `200` ReparacionResponse[] |
| DELETE | `/api/reparaciones/{id}` | — | `204` |

ReparacionRequest:
```json
{
  "equipoId": 1,                       // obligatorio
  "descripcionProblema": "No carga",   // obligatorio
  "estado": "INGRESADO",               // opcional (default INGRESADO al crear)
  "precioEstimado": 15000.00,          // opcional, decimal
  "precioFinal": null,                 // opcional, decimal
  "fechaIngreso": "2026-06-16",        // opcional, YYYY-MM-DD
  "fechaEstimadaEntrega": "2026-06-20",// opcional
  "fechaEntrega": null,                // opcional
  // ----- Orden de trabajo ampliada (todo opcional) -----
  "patronDesbloqueo": "L invertida",   // máx 60
  "pinDesbloqueo": "1234",             // máx 20
  "accesorios": "cargador, funda, SIM",// máx 255
  "condicionesIngreso": "rayada",      // máx 500
  "observaciones": "interno, no público", // máx 1000
  // ----- Flags de riesgo del ingreso (todo opcional; default false / NINGUNA) -----
  "mojado": false,                     // cayó al agua: garantía limitada
  "trabajoEnPlaca": false,             // reparación a nivel placa
  "noTesteableAlIngreso": false,       // no enciende / sin carga → diagnóstico provisorio
  "tieneBloqueoPantalla": false,       // tiene PIN/patrón (se guarda en pin/patronDesbloqueo)
  "tieneCuentaVinculada": "NINGUNA",   // NINGUNA | ICLOUD | GOOGLE | OTRA
  "clienteConoceCredenciales": false,  // ¿puede quitar la cuenta?
  "tecnicoId": 1,                      // id de un usuario del taller (404 si no existe)
  "fotos": [                           // la subida del archivo la hace el front a su storage
    { "url": "https://cdn/ingreso1.jpg", "momento": "INGRESO" },
    { "url": "https://cdn/post1.jpg",    "momento": "POST_REPARACION" }
  ],
  "fechaConformidadEntrega": null,     // opcional; si no, se sella solo al pasar a ENTREGADO
  "garantiaDias": 90,                  // opcional; si no, el default del backend al entregar
  "garantiaCondiciones": "Cubre solo el repuesto cambiado" // opcional
}
```
> **Fotos**: cada una lleva `momento` (`INGRESO` | `POST_REPARACION`; si se omite, `INGRESO`).
> Las de ingreso prueban la condición de entrada; las post, el trabajo (QA). **Cambió el formato:**
> antes era `string[]`, ahora es `{ url, momento }[]`.
> El **`numeroOrden`** NO se envía: lo genera el backend al crear (correlativo por taller con
> reinicio anual, ej. `ORD-2026-0042`) y es inmutable. El ingreso rápido también lo asigna; los
> flags de riesgo se pueden completar después editando la reparación.

> **PIN/patrón al escribir:** el alta acepta ambos campos pero su `201` no los devuelve. En un `PUT`,
> omitir el campo conserva el valor ya guardado; enviar string vacío (`""`, también si contiene solo
> espacios) lo borra. Nunca uses la respuesta de un alta/PUT/PATCH para reemplazar en el formulario el
> secreto que el usuario acaba de escribir. Al pasar a `ENTREGADO`, el backend borra ambos valores.

ReparacionResponse: `{ ...campos no sensibles de ReparacionRequest, numeroOrden, equipoMarca, equipoModelo, clienteId, clienteNombre, clienteApellido, clienteTelefono, codigoSeguimiento, tecnicoId, tecnicoNombre, fotos (FotoDTO[]), fechaConformidadEntrega, totalRepuestos, total, cobrado, saldo, excedente, requiereRevision, estadoPago, mojado, trabajoEnPlaca, noTesteableAlIngreso, tieneBloqueoPantalla, tieneCuentaVinculada, clienteConoceCredenciales, riesgoCuentaSinCredenciales, garantiaDias, garantiaInicio, garantiaFin, garantiaCondiciones, garantiaVigente, esGarantia, reparacionOrigenId }`. Los campos sensibles excluidos son `patronDesbloqueo` y `pinDesbloqueo`.
- **Denormalizado**: cada reparación trae el `equipoMarca/Modelo` y los datos del cliente, así el listado/tablero es autocontenido (no hace falta cruzar con otros endpoints).
> **Contrato de credenciales:** `ReparacionResponse` **no contiene** `patronDesbloqueo` ni
> `pinDesbloqueo`. Es la respuesta segura usada por POST, PUT, PATCH, reclamos en garantía, listados,
> dashboard e ingreso rápido. Solo `GET /api/reparaciones/{id}` autenticado devuelve
> `ReparacionDetalleResponse`, que agrega esos dos campos (pueden ser `null`) y respeta el tenant.
> El seguimiento público nunca los expone. Después de `ENTREGADO`, el detalle devuelve ambos en `null`.
- `codigoSeguimiento`: código público para compartir con el cliente (ver §4.9).
- `totalRepuestos`: suma de los repuestos. `total`: mano de obra (`precioFinal ?? precioEstimado ?? 0`) + repuestos.
- **Estado de pago** (dimensión independiente del estado de reparación): `cobrado` es la suma de
  movimientos activos; `saldo = max(0, total - cobrado)` y `excedente = max(0, cobrado - total)`.
  `requiereRevision` es `true` cuando hay excedente. `estadoPago` sigue derivado como
  `SIN_COBRAR | PARCIAL | PAGADO` por compatibilidad.
  - En el tablero mostrá **las dos dimensiones**: ej. chip de estado ("Listo") + chip de pago
    ("Falta cobrar $X" si `saldo > 0`). Si `requiereRevision` o `excedente > 0`, priorizá
    "Excedente a revisar" aunque `estadoPago` sea `PAGADO`; nunca muestres un saldo negativo.
  - Los endpoints rechazan un nuevo cobro mayor al pendiente (`COBRO_SUPERA_SALDO`) y una edición
    que reduzca el total por debajo de lo ya cobrado (`TOTAL_MENOR_QUE_COBRADO`). El excedente sólo
    puede sobrevivir como dato histórico y requiere corrección/anulación manual.
  - **No bloquea la entrega**: se puede pasar a `ENTREGADO` con saldo pendiente (pago al retirar). El front decide si avisa.
- **`numeroOrden`**: correlativo por taller con reinicio anual (`ORD-2026-0042`). Útil para etiquetar/buscar el equipo en el estante. Inmutable.
- **Flags de riesgo del ingreso**: `mojado`, `trabajoEnPlaca`, `noTesteableAlIngreso`, `tieneBloqueoPantalla`, `tieneCuentaVinculada` (`NINGUNA|ICLOUD|GOOGLE|OTRA`), `clienteConoceCredenciales`.
  - **`riesgoCuentaSinCredenciales`** (derivado, solo lectura): `true` cuando `tieneCuentaVinculada != NINGUNA` y `!clienteConoceCredenciales`. Mostrá una **bandera roja**: *"Riesgo: equipo con cuenta activa sin credenciales. Puede no poder entregarse activado."*
- **`fechaConformidadEntrega`**: cuándo el cliente retiró conforme (anti-disputa). Se **sella automáticamente** al pasar la reparación a `ENTREGADO` (si no se mandó antes); también se puede setear a mano en el PUT.
- **Garantía**: al pasar a `ENTREGADO`, el backend fija `garantiaInicio` (hoy), `garantiaFin` (= inicio + `garantiaDias`, default **90**) y deja `garantiaCondiciones`. `garantiaVigente` (derivado) indica si todavía no venció. `esGarantia`/`reparacionOrigenId` marcan los retrabajos en garantía.
  - **Reclamo en garantía**: `POST /api/reparaciones/{id}/garantia` con `{ descripcionProblema }` crea una **reparación nueva** vinculada al original (mismo equipo, `esGarantia: true`, `reparacionOrigenId`). **No consume cupo** del plan FREE y **arranca sin precio** (`total: 0`); el taller cobra solo si el diagnóstico revela falla ajena (golpe/mojado nuevo).

**Avisar al cliente por WhatsApp:** `GET /api/reparaciones/{id}/whatsapp` → `{ url, telefono, mensaje, linkSeguimiento }`.
El front abre `url` (wa.me con mensaje prearmado que incluye el link de seguimiento). Útil al pasar a COMPLETADO.

**Cambiar estado** (`PATCH .../estado`): body JSON con el campo `estado`:
```json
{ "estado": "EN_PROCESO" }
```
(Header `Content-Type: application/json`.)
- Estado inexistente (no está en el enum) → `400`.
- **Transición no permitida** (el salto desde el estado actual no es legal) → **`409`**. Repetir el estado actual (X → X) es un no-op válido (`200`).

Errores: `404` si el equipo/reparación no es de tu taller; **`402` si alcanzaste el límite del plan**
(ver §6); `400` si se intenta borrar una reparación con cobros registrados. En ese caso el historial
de caja se preserva y el front debe mostrar el `message` sin quitar la reparación de la vista.

Estados posibles (enum `EstadoReparacion`):
`INGRESADO`, `EN_DIAGNOSTICO`, `PRESUPUESTADO`, `EN_PROCESO`, `ESPERANDO_REPUESTO`,
`ESPERANDO_ADICIONAL`, `NO_REPARABLE`, `COMPLETADO`, `LISTO_SIN_REPARAR`, `ENTREGADO`,
`ABANDONADO`, `CANCELADO`

**Máquina de estados (transiciones permitidas).** El backend valida el salto; el front
debería ofrecer solo las opciones legales según el estado actual:

| Desde | Hacia (permitidos) |
|-------|--------------------|
| `INGRESADO` | `EN_DIAGNOSTICO`, `PRESUPUESTADO` (presupuesto directo), `EN_PROCESO` (arreglo simple), `CANCELADO` |
| `EN_DIAGNOSTICO` | `PRESUPUESTADO`, `NO_REPARABLE`, `CANCELADO` |
| `PRESUPUESTADO` | `EN_PROCESO` (cliente aprueba), `LISTO_SIN_REPARAR` (rechaza), `CANCELADO` |
| `EN_PROCESO` | `ESPERANDO_REPUESTO`, `ESPERANDO_ADICIONAL`, `COMPLETADO`, `NO_REPARABLE` |
| `ESPERANDO_REPUESTO` | `EN_PROCESO`, `NO_REPARABLE`, `CANCELADO` |
| `ESPERANDO_ADICIONAL` | `EN_PROCESO` (aprueba), `COMPLETADO` (solo lo aprobado), `LISTO_SIN_REPARAR` (rechaza) |
| `NO_REPARABLE` | `LISTO_SIN_REPARAR` |
| `COMPLETADO` | `ENTREGADO`, `ABANDONADO` |
| `LISTO_SIN_REPARAR` | `ENTREGADO`, `ABANDONADO` |
| `ENTREGADO` / `ABANDONADO` / `CANCELADO` | *(terminales: sin salida)* |

---

#### `POST /api/reparaciones/ingreso-rapido` — carga rápida (1 paso)
Crea **cliente + equipo + reparación de una sola vez** con lo mínimo. Ideal para el mostrador:
después se completan los datos faltantes desde las pantallas de Cliente/Equipo/Reparación.

Request (solo lo imprescindible; `clienteApellido` y `precioEstimado` son opcionales):
```json
{
  "clienteNombre": "Marcos",
  "clienteApellido": "Pérez",       // opcional
  "clienteTelefono": "1144556677",
  "equipoMarca": "Apple",
  "equipoModelo": "iPhone 12",
  "descripcionProblema": "Pantalla rota",
  "precioEstimado": 80000            // opcional
}
```
Respuesta `201`:
```json
{
  "clienteId": 1,
  "equipoId": 1,
  "clienteNuevo": true,             // false = se reutilizó un cliente existente
  "reparacion": { "id": 1, "equipoId": 1, "descripcionProblema": "Pantalla rota", "estado": "INGRESADO", "precioEstimado": 80000, "precioFinal": null, "fechaIngreso": null, "fechaEstimadaEntrega": null, "fechaEntrega": null }
}
```
Comportamiento:
- Si ya existe un cliente con ese **teléfono** en el taller, **lo reutiliza** (`clienteNuevo:false`) en vez de duplicarlo; crea siempre un equipo nuevo.
- Devuelve `clienteId` y `equipoId` para que el front pueda enlazar a "completar datos" del cliente/equipo.
- Aplica el límite del plan igual que el alta normal → puede dar **`402`**.

---

### 4.6 Repuestos — requiere token  (`/api/repuestos`)

| Método | Ruta | Body | Resp |
|--------|------|------|------|
| POST   | `/api/repuestos` | RepuestoRequest | `201` RepuestoResponse |
| PUT    | `/api/repuestos/{id}` | RepuestoRequest | `200` RepuestoResponse |
| GET    | `/api/repuestos/{id}` | — | `200` RepuestoResponse |
| GET    | `/api/repuestos?q=&page=&size=` | — | `200` Page de RepuestoResponse |
| GET    | `/api/repuestos/reparacion/{reparacionId}` | — | `200` RepuestoResponse[] |
| DELETE | `/api/repuestos/{id}` | — | `204` |

RepuestoRequest:
```json
{
  "nombre": "Pantalla",    // obligatorio
  "descripcion": "OLED",   // opcional
  "precio": 8000.00,       // obligatorio, decimal
  "reparacionId": 1,       // opcional (puede cargarse sin asignar)
  "articuloId": 5,         // opcional: enlaza al inventario y DESCUENTA stock
  "cantidad": 2            // opcional, default 1 (cuánto descontar del stock)
}
```
RepuestoResponse: `{ id, nombre, descripcion, precio, reparacionId, reparacionEquipo, articuloId, cantidad }`
- `reparacionEquipo`: label "Marca Modelo" de la reparación asociada (`null` si no tiene reparación).
> Si mandás `articuloId`, el backend **descuenta `cantidad` del stock** (400 si no alcanza) y lo **repone** si borrás el repuesto. Ver inventario en §4.12.

---

### 4.7 Pagos / Upgrade a PRO — requiere token  (`/api/pagos`)

Suscripción PRO con **cobro mensual recurrente** vía MercadoPago (preapproval).

El precio contractual es **ARS 24.900 por mes** (`24900.00`). El monto y la moneda los fija el backend:
el frontend no los envía ni debe calcularlos.

#### `POST /api/pagos/suscripcion`
Inicia el checkout. No lleva body (el taller sale del token). Devuelve la URL de MercadoPago.
```json
{
  "preapprovalId": "2c938084abc...",
  "initPoint": "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=..."
}
```
El front **redirige** al usuario a `initPoint` (`window.location.href = data.initPoint`).
Al terminar, MercadoPago lo devuelve a `MP_BACK_URL` (por defecto `/suscripcion/resultado` del front).
Cuando MP está habilitado, esa URL debe ser **HTTPS**. Para probar el retorno desde un frontend local
se necesita una URL HTTPS pública/túnel; `http://localhost:5173/...` sirve únicamente con MP apagado.

- El backend valida la preferencia recibida contra su monto/moneda, `external_reference`,
  `collector_id: MP_COLLECTOR_ID` y `application_id: MP_APPLICATION_ID`, además de exigir un
  `initPoint` HTTPS de MercadoPago. Si algo no coincide, no entrega el checkout al front.
- `MP_CHECKOUT_ENABLED=false` es un **kill switch solo para crear nuevos checkouts**: el POST devuelve
  `502` ("Los nuevos checkouts están temporalmente deshabilitados"), pero siguen funcionando webhooks,
  cancelación y reconciliación. `MP_ENABLED=false` desactiva las llamadas de la integración completa.
- El POST es **idempotente del lado backend**: persiste una `external_reference` y una
  `X-Idempotency-Key` estables antes de llamar a MP. Ante timeout/`502`, el front puede reintentar el
  mismo POST; no debe generar ni mandar una clave propia. El backend reutiliza el intento recuperable
  y, si ya existe un checkout pendiente con URL, devuelve el mismo `preapprovalId`/`initPoint`.
- Si otro request ya lo está creando o ya existe una suscripción activa/pausada, devuelve `409`; mostrá
  el `message` y re-consultá la suscripción en vez de abrir dos checkouts.
- Tras el pago, el plan **no cambia al instante**: se confirma por webhook (server-to-server). El front debe **re-consultar `GET /api/suscripcion`** al volver (y/o reintentar unos segundos) para ver `plan: "PRO"` / `estado: "ACTIVA"`.

#### `POST /api/pagos/suscripcion/cancelar` — solo ADMIN
Cancela la suscripción PRO (cancela el preapproval en MercadoPago si existe) y **baja a plan FREE**
(el taller sigue operando con el tope gratuito). Devuelve la suscripción actualizada (`200`).

#### `POST /api/pagos/webhook` — PÚBLICO (uso interno de MercadoPago)
Lo llama MercadoPago, **no el frontend**. Los eventos se guardan y procesan de forma durable e idempotente;
los reintentos y la reconciliación no duplican efectos, y un evento histórico fuera de orden no puede
revertir un estado de pago más nuevo. El frontend solo consulta `GET /api/suscripcion`.

Estados relevantes del preapproval:

- `pending`: no activa PRO por sí solo. Si ese vínculo ya había concedido PRO, pasa a
  `PRO/VENCIDA` hasta recibir una confirmación autorizada; un TRIAL/FREE no se convierte en PRO.
- `authorized`: `PRO/ACTIVA`, salvo que el pago autorizado más reciente esté en un estado bloqueante.
- `paused`: conserva `plan: "PRO"`, pasa a `estado: "VENCIDA"` y pierde los entitlements.
- `canceled`/`cancelled`: vuelve a `FREE/ACTIVA`.
- Desconocido: nunca concede acceso por defecto y cierra un entitlement PRO previamente concedido
  dejándolo en `PRO/VENCIDA`.

Estados relevantes de cada cobro autorizado:

- `approved`: activa `PRO/ACTIVA` únicamente si el preapproval vigente está `authorized`; con
  `pending`, `paused`, cancelado o desconocido se audita sin abrir acceso.
- `rejected`, `cancelled`/`canceled`, `refunded` o `charged_back`: deja `PRO/VENCIDA` y cierra
  los entitlements; un `approved` posterior para la misma factura puede reactivar la suscripción.

---

### 4.8 Dashboard — requiere token  (`/api/dashboard`)

#### `GET /api/dashboard`
Métricas del taller para la pantalla de inicio.
```json
{
  // un contador por CADA estado del enum (12 claves: INGRESADO, EN_DIAGNOSTICO, PRESUPUESTADO,
  // EN_PROCESO, ESPERANDO_REPUESTO, ESPERANDO_ADICIONAL, NO_REPARABLE, COMPLETADO,
  // LISTO_SIN_REPARAR, ENTREGADO, ABANDONADO, CANCELADO)
  "reparacionesPorEstado": { "INGRESADO": 3, "EN_PROCESO": 1, "COMPLETADO": 0, "ENTREGADO": 0, "...": 0 },
  "totalReparaciones": 4,
  "reparacionesEsteMes": 4,
  "equiposListos": 0,
  "articulosStockBajo": 1,
  "plan": "PRO",
  "estadoSuscripcion": "ACTIVA",
  "limiteReparacionesMes": null,
  "ultimasReparaciones": [ /* últimas 5 ReparacionResponse (con equipo+cliente y estado de pago) */ ]
}
```

---

### 4.9 Seguimiento público — SIN token  (`/api/seguimiento`)

#### `GET /api/seguimiento/{codigo}`
Consulta pública (sin login) del estado de una reparación por su `codigoSeguimiento`.
Pensado para que el cliente del taller siga su equipo. Datos mínimos, sin info sensible.
```json
{
  "codigo": "W45TME2L",
  "estado": "INGRESADO",
  "marca": "Apple",
  "modelo": "iPhone 13",
  "taller": "MVGR Reparaciones",
  "fechaIngreso": null,
  "fechaEstimadaEntrega": null
}
```
`404` si el código no existe. La URL pública que se comparte es `{APP_PUBLIC_URL}/seguimiento/{codigo}`
(la arma el backend en el link de WhatsApp). La respuesta incluye `presupuesto` (el último, o `null`).

**Aprobación del presupuesto por el cliente (público, sin token):**
- `POST /api/seguimiento/{codigo}/presupuesto/aprobar` → marca APROBADO el presupuesto pendiente.
- `POST /api/seguimiento/{codigo}/presupuesto/rechazar` → marca RECHAZADO.
- `400` si no hay un presupuesto PENDIENTE para responder.

---

### 4.10 Usuarios / Empleados — solo ADMIN  (`/api/usuarios`)

Gestión de los empleados del taller. **Todo el grupo requiere rol ADMIN** (un USER recibe `403`).

| Método | Ruta | Body | Resp |
|--------|------|------|------|
| POST   | `/api/usuarios` | CrearUsuario | `201` UsuarioResponse |
| GET    | `/api/usuarios` | — | `200` UsuarioResponse[] |
| GET    | `/api/usuarios/{id}` | — | `200` UsuarioResponse |
| PATCH  | `/api/usuarios/{id}` | `{ "role"?, "active"? }` | `200` UsuarioResponse |

CrearUsuario: `{ "username", "email", "password", "role"? }` (sin `role` → se crea `USER`).
> **PRO**: el plan FREE permite **1 usuario** (el dueño). Agregar empleados requiere PRO → si no, `402`. Ver `funciones.empleadosMultiples` en §4.2.
UsuarioResponse: `{ id, username, email, role, active }`.

- Un usuario **desactivado** (`active:false`) no puede loguear (`401`) y sus tokens ya emitidos
  **dejan de funcionar al instante** (las requests pasan a dar `403`).
- Guardas: un ADMIN **no puede desactivarse ni quitarse el rol a sí mismo** (`400`).
- `400` si el email ya está en uso.

---

### 4.11 Presupuestos  (`/api/reparaciones/{reparacionId}/presupuestos`) — requiere token

Presupuesto de una reparación, con ítems discriminados, validez y aprobación del cliente.

| Método | Ruta | Body | Resp |
|--------|------|------|------|
| POST   | `/api/reparaciones/{id}/presupuestos` | PresupuestoRequest | `201` PresupuestoResponse |
| GET    | `/api/reparaciones/{id}/presupuestos` | — | `200` PresupuestoResponse[] (más nuevo primero) |
| POST   | `/api/reparaciones/{id}/presupuestos/{presupuestoId}/aprobar` | — | `200` PresupuestoResponse |
| POST   | `/api/reparaciones/{id}/presupuestos/{presupuestoId}/rechazar` | — | `200` PresupuestoResponse |
| POST   | `/api/reparaciones/{id}/presupuestos/{presupuestoId}/represupuestar` | PresupuestoRequest (opcional) | `201` PresupuestoResponse |

PresupuestoRequest:
```json
{
  "items": [
    { "descripcion": "Mano de obra", "cantidad": 1, "precioUnitario": 12000, "tipoItem": "MANO_DE_OBRA" },
    { "descripcion": "Pantalla", "cantidad": 1, "precioUnitario": 30000, "tipoItem": "REPUESTO", "calidad": "ALTERNATIVO" }
  ],
  "observaciones": "Demora 48hs",  // opcional
  "tipo": "ORIGINAL",              // opcional: ORIGINAL (default) | ADICIONAL
  "validezDias": 7                 // opcional: default 7
}
```
- `tipoItem`: `MANO_DE_OBRA` (default si se omite) | `REPUESTO`. `calidad` (solo repuestos, opcional): `ORIGINAL | ALTERNATIVO | USADO_REACONDICIONADO`.

PresupuestoResponse: `{ id, reparacionId, estado, tipo, items[], total, manoDeObraTotal, repuestosTotal, validezDias, validoHasta, vencido, observaciones, fechaRespuesta, createdAt }`
- `estado`: `PENDIENTE | APROBADO | RECHAZADO | VENCIDO`. **VENCIDO es derivado** (un PENDIENTE cuyo `validoHasta` ya pasó); `vencido: true` lo marca también como bool. `total` = Σ cantidad×precioUnitario; `manoDeObraTotal`/`repuestosTotal` lo discriminan.
- **Aprobar/rechazar**: lo puede hacer el **taller** (endpoints de arriba) o el **cliente** desde el link público (§4.9). Un presupuesto **vencido o ya respondido** → `400`.
- **Re-presupuestar**: clona el presupuesto (mismos ítems) en uno nuevo PENDIENTE con validez fresca; si mandás `items` en el body, usa esos (precios nuevos). Útil cuando venció.
- **Auto-estado de la reparación** (best-effort, respeta la máquina de estados): crear ORIGINAL → `PRESUPUESTADO`; crear ADICIONAL → `ESPERANDO_ADICIONAL`; aprobar → `EN_PROCESO`; rechazar original → `LISTO_SIN_REPARAR`. Si el salto no es legal desde el estado actual, no se fuerza (no rompe).

---

### 4.12 Inventario — requiere token · **PRO**  (`/api/inventario`)
> Función PRO: con plan FREE todos estos endpoints devuelven `402`. Ver `funciones.inventario` en §4.2.

Catálogo de artículos con stock.

| Método | Ruta | Body | Resp |
|--------|------|------|------|
| POST   | `/api/inventario` | ArticuloRequest | `201` ArticuloResponse |
| PUT    | `/api/inventario/{id}` | ArticuloRequest | `200` ArticuloResponse |
| GET    | `/api/inventario/{id}` | — | `200` ArticuloResponse |
| GET    | `/api/inventario?q=&page=&size=` | — | `200` Page de ArticuloResponse |
| GET    | `/api/inventario/stock-bajo` | — | `200` ArticuloResponse[] (stock ≤ mínimo) |
| POST   | `/api/inventario/{id}/ajuste` | `{ "delta": 10, "motivo": "compra" }` | `200` ArticuloResponse |
| DELETE | `/api/inventario/{id}` | — | `204` (solo ADMIN) |

ArticuloRequest: `{ nombre, descripcion?, sku?, precio, costo?, stock?, stockMinimo? }`
ArticuloResponse: `{ id, nombre, descripcion, sku, precio, costo, stock, stockMinimo, activo, stockBajo }`
- El **stock no se cambia con PUT**: se mueve con `/ajuste` (delta + entrada / − salida; 400 si queda negativo).
- El stock también **baja automáticamente** al usar el artículo como repuesto en una reparación (§4.6) y se **repone** al borrar ese repuesto.
- `stockBajo:true` cuando `stock ≤ stockMinimo`; el dashboard trae el contador `articulosStockBajo`.

---

### 4.13 Cobros manuales / período / resumen digital — requiere token · **PRO**

OrdenFix registra movimientos informados manualmente por el taller. No se conecta con la cuenta
bancaria o billetera del comercio, no crea transferencias y no confirma acreditaciones. Alias y QR
son instrucciones que el taller decide mostrar; nunca convierten a OrdenFix en procesador de pagos.

> Función PRO: todos los endpoints de esta sección requieren `funciones.cobros`; sin entitlement
> devuelven `402`. ADMIN y USER pueden consultar y registrar. Las anulaciones y la configuración del
> taller son solo ADMIN según la matriz de cada subsección.

#### Estado de cuenta de una orden

El backend calcula siempre los importes con movimientos **activos**:

- `total`: mano de obra (`precioFinal ?? precioEstimado ?? 0`) + repuestos.
- `cobrado`: suma de cobros no anulados.
- `saldo = max(0, total - cobrado)`; nunca representa un número negativo.
- `excedente = max(0, cobrado - total)`; sólo puede aparecer por datos históricos.
- `requiereRevision = excedente > 0`; la UI debe priorizar este estado sobre `pagado`/`PAGADO`.
- `pagado = total > 0 && cobrado >= total` en las respuestas de cobros y resumen.

Registrar un importe mayor al pendiente devuelve `409` con `code: "COBRO_SUPERA_SALDO"` y
`details.pendiente`. Reducir el total de la orden de forma que aumente un excedente devuelve `409`
con `code: "TOTAL_MENOR_QUE_COBRADO"`. En ambos casos se conserva el estado anterior.

#### Movimientos de una reparación

| Método | Ruta | Rol | Body | Resp |
|--------|------|-----|------|------|
| POST | `/api/reparaciones/{reparacionId}/cobros` | ADMIN/USER | CobroRequest | `201` CobroResponse |
| GET | `/api/reparaciones/{reparacionId}/cobros` | ADMIN/USER | — | `200` CobrosReparacion |
| POST | `/api/reparaciones/{reparacionId}/cobros/{cobroId}/anulacion` | ADMIN | `{ "motivo": "..." }` | `200` CobroResponse |
| DELETE | `/api/reparaciones/{reparacionId}/cobros/{cobroId}` | ADMIN | — | `204` alias legado de anulación |

CobroRequest:

```json
{
  "monto": 20000,
  "metodo": "TRANSFERENCIA",
  "referencia": "OP-984331",
  "observaciones": "Informado por el cliente"
}
```

- `monto`: obligatorio, positivo, hasta 8 enteros y 2 decimales.
- `metodo`: `EFECTIVO | TRANSFERENCIA | TARJETA | MERCADOPAGO | OTRO`.
- `referencia`: opcional, máximo 120 caracteres. Se recorta; vacío queda `null`. Es el número de
  operación o identificación que el operador transcribe y **no prueba una acreditación**.
- `observaciones`: opcional, máximo 255; es interna y no aparece en el resumen digital.

Respuesta de `GET .../cobros` (ejemplo abreviado):

```json
{
  "total": 50000,
  "cobrado": 20000,
  "saldo": 30000,
  "excedente": 0,
  "requiereRevision": false,
  "pagado": false,
  "cobros": [
    {
      "id": 91,
      "reparacionId": 42,
      "monto": 20000,
      "metodo": "TRANSFERENCIA",
      "referencia": "OP-984331",
      "observaciones": "Informado por el cliente",
      "fecha": "2026-08-23T12:30:00",
      "estado": "ACTIVO",
      "anuladoAt": null,
      "anuladoPorNombre": null,
      "motivoAnulacion": null
    }
  ]
}
```

`GET .../cobros` conserva tanto `ACTIVO` como `ANULADO` para auditoría, ordenados del más reciente
al más antiguo. Los anulados llevan `anuladoAt`, `anuladoPorNombre` y `motivoAnulacion`, pero ya no
participan de `cobrado`, `saldo`, el período ni el resumen digital.

La anulación canónica requiere `motivo` no vacío (máximo 255). Repetirla devuelve `409` con
`code: "COBRO_YA_ANULADO"` y `details: { reparacionId, cobroId }`. El `DELETE` existe sólo para
compatibilidad, usa un motivo técnico fijo y es idempotente; una integración nueva debe usar el
`POST .../anulacion` y refrescar cobros, reparación, dashboard y período al completarse.

#### Datos de cobro y QR del taller

| Método | Ruta | Rol | Body / respuesta |
|--------|------|-----|------------------|
| GET | `/api/taller/datos-cobro` | ADMIN/USER | `200` DatosCobro |
| PUT | `/api/taller/datos-cobro` | ADMIN | DatosCobroRequest → `200` DatosCobro |
| GET | `/api/taller/datos-cobro/qr` | ADMIN/USER | `200 image/png` |
| PUT | `/api/taller/datos-cobro/qr` | ADMIN | `multipart/form-data`, parte `file` → `200` DatosCobro |
| DELETE | `/api/taller/datos-cobro/qr` | ADMIN | `200` DatosCobro actualizado |

DatosCobro:

```json
{
  "alias": "celexpress.mp",
  "titular": "Juan Pérez",
  "entidad": "Mercado Pago",
  "mostrarEnResumen": true,
  "qrDisponible": true,
  "qrVersion": "f9b95d...sha256..."
}
```

- El `PUT` textual **reemplaza el recurso completo**: `alias` (máx. 120), `titular` (máx. 160) y
  `entidad` (máx. 120) aceptan `null`; blanco se normaliza a `null`. `mostrarEnResumen` es obligatorio.
- El QR se administra por separado y no debe enviarse dentro del JSON. El upload acepta bytes PNG o
  JPEG reales, máximo 1 MiB, 1024×1024 y 1 megapíxel; el backend lo re-codifica y sirve como PNG.
  Usá `FormData` con la parte `file` y dejá que el cliente HTTP agregue el boundary.
- `qrVersion` es el SHA-256 del PNG normalizado. Usalo como parte de la clave de caché; si es `null`,
  no solicites el blob. `GET .../qr` responde `ETag`, `Cache-Control: private, no-store` y `404`
  `QR_COBRO_NO_CONFIGURADO` cuando no existe.
- Imagen inválida → `400 QR_COBRO_INVALIDO`; archivo demasiado grande → `413`
  `ARCHIVO_DEMASIADO_GRAN`. Una carga inválida no reemplaza el QR vigente.
- `mostrarEnResumen` sólo controla si estos datos pueden aparecer en el resumen de una orden con
  saldo pendiente. No confirma que el alias/QR exista externamente ni que un pago haya llegado.

#### Cobros por período (ruta técnica `/api/caja`)

| Método | Ruta | Rol | Resp |
|--------|------|-----|------|
| GET | `/api/caja?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | ADMIN/USER | `200` CajaResumen |

Sin parámetros, ambos extremos son **hoy**. El rango es inclusivo y la respuesta tiene
`{ desde, hasta, totalCobrado, cantidad, porMetodo, cobros }`. Sólo incluye movimientos activos del
taller registrados en ese período; `porMetodo` contiene una entrada para cada `MetodoPago`.

En la UI llamá a esta superficie **Cobros** y a la métrica **Cobrado en el período**. Es un registro
operativo: no es un balance contable, no representa el saldo de una cuenta bancaria/billetera, no
confirma acreditaciones y no contempla egresos, gastos ni comisiones. El efectivo también depende
de que el taller cargue cada movimiento manualmente.

#### Resumen digital de la orden

| Método | Ruta | Rol | Estado |
|--------|------|-----|--------|
| GET | `/api/reparaciones/{reparacionId}/resumen-digital` | ADMIN/USER | Canónico |
| GET | `/api/reparaciones/{reparacionId}/recibo` | ADMIN/USER | Alias deprecado; misma respuesta exacta |

Parte canónica de ResumenDigitalOrden (se omiten aquí los campos planos de compatibilidad):

```json
{
  "numeroOrden": "ORD-2026-0042",
  "codigoSeguimiento": "ABC123",
  "fecha": "2026-08-20T10:15:00",
  "estado": "COMPLETADO",
  "taller": { "nombre": "CelExpress", "telefono": "1133334444" },
  "cliente": { "nombre": "Pedro", "apellido": "Gómez", "telefono": "1155556666" },
  "equipo": {
    "marca": "Samsung",
    "modelo": "A54",
    "descripcionProblema": "No enciende"
  },
  "detalle": {
    "repuestos": [
      { "nombre": "Módulo", "cantidad": 1, "precioUnitario": 30000, "subtotal": 30000 }
    ],
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
  "pagos": [
    {
      "fecha": "2026-08-23T12:30:00",
      "monto": 20000,
      "metodo": "TRANSFERENCIA",
      "referencia": "OP-984331"
    }
  ],
  "datosCobro": {
    "alias": "celexpress.mp",
    "titular": "Juan Pérez",
    "entidad": "Mercado Pago",
    "qrDisponible": true,
    "qrVersion": "f9b95d...sha256..."
  },
  "documentoFiscal": false,
  "leyenda": "Documento informativo. No es factura ni comprobante fiscal y no reemplaza los emitidos por ARCA.",
  "reparacionId": 42
}
```

- El contrato nuevo es la estructura anidada. Durante la migración, la misma respuesta también
  incluye los campos planos históricos (`tallerNombre`, `clienteNombre`, `repuestos`, `total`, etc.);
  no construyas código nuevo sobre ellos.
- `pagos` contiene sólo movimientos activos, en orden cronológico, y deliberadamente no expone IDs,
  observaciones internas ni datos de anulación.
- `datosCobro` sólo aparece cuando hay `saldo > 0`, `mostrarEnResumen` está activo y existe al menos
  un dato textual o QR; en cualquier otro caso es `null`. Si `qrDisponible`, el blob se obtiene de
  `/api/taller/datos-cobro/qr` con Bearer y su caché se liga a `qrVersion`.
- El taller es el emisor visible y OrdenFix puede figurar como marca secundaria. La vista no necesita
  impresión: `documentoFiscal` es siempre `false` y la `leyenda` debe mostrarse completa. No la llames
  factura, comprobante fiscal ni confirmación de pago.
- `/recibo` invoca el mismo servicio y devuelve el mismo JSON, pero está deprecado. El frontend nuevo
  debe consultar `/resumen-digital` y puede conservar una redirección visual desde su ruta histórica.

---

### 4.14 Exportar datos — solo ADMIN  (`/api/export`)

El dueño del taller se descarga **todos sus datos** en un Excel (disponible en todos los planes).

| Método | Ruta | Resp |
|--------|------|------|
| GET | `/api/export/excel` | `200` archivo `.xlsx` (binario) |

- Devuelve un `.xlsx` con 4 hojas: **Clientes**, **Órdenes** (estado, técnico, total/cobrado/saldo, estado de pago, garantía), **Cobros** y **Presupuestos**.
- Responde con `Content-Disposition: attachment; filename="ordenfix-export-YYYY-MM-DD.xlsx"`.
- En el front: pedirlo con `responseType: 'blob'` (Axios) y disparar la descarga:

```ts
const { data } = await api.get('/api/export/excel', { responseType: 'blob' });
const url = URL.createObjectURL(data);
const a = document.createElement('a');
a.href = url;
a.download = `ordenfix-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
a.click();
URL.revokeObjectURL(url);
```

- Empleado con rol USER → `403`. Botón sugerido: "Exportar mis datos" en Configuración.

---

## 5. Formato de error controlado

```json
{
  "timestamp": "2026-08-23T12:31:10.43",
  "status": 409,
  "error": "Conflicto de estado",
  "message": "El monto supera el pendiente de cobro.",
  "path": "/api/reparaciones/42/cobros",
  "code": "COBRO_SUPERA_SALDO",
  "details": {
    "reparacionId": 42,
    "total": 50000,
    "cobrado": 20000,
    "monto": 40000,
    "pendiente": 30000
  }
}
```

Los campos base son `timestamp`, `status`, `error`, `message` y `path`. `code` y `details` son
opcionales: aparecen en conflictos de dominio donde el frontend puede tomar una decisión estable.

- Ramificá la UI por `status` + `code`; nunca compares el texto de `message`, porque puede mejorar
  sin romper el contrato.
- `message` es el texto humano que puede mostrarse. `details` es contexto tipado para completar la
  interfaz (por ejemplo, el pendiente vigente); no lo serialices crudo en un toast.
- Un error genérico o de validación puede no traer `code/details`. Aplicá siempre un fallback por
  status y, si tampoco hay body JSON (por ejemplo ante ciertos rechazos del filtro de seguridad),
  usá un mensaje local seguro.

| Código | Significado | Qué hace el front |
|--------|-------------|-------------------|
| 400 | Validación / dato inválido (incl. teléfono duplicado al crear cliente) | Mostrar `message` en el form/toast |
| 401 | Login rechazado o respuesta explícita de no autenticado | Logout + redirigir a `/login` |
| 402 | **Límite del plan / suscripción no vigente** | Modal "Pasá a PRO" con el `message` |
| 403 | Token ausente/inválido/revocado, usuario desactivado o rol insuficiente | Validar sesión base; logout si falla, o "sin permisos" si la sesión sigue válida |
| 404 | No encontrado (o recurso de otro taller) | "No existe" |
| 409 | Conflicto: unicidad, **transición de estado ilegal** (§4.5) o checkout MP ya activo/en creación | Mostrar `message`; para MP, re-consultar suscripción |
| 413 | Archivo por encima del límite permitido | Mantener el QR anterior y pedir una imagen de hasta 1 MiB |
| 415 | Tipo de contenido no soportado | Revisar JSON/multipart; no reintentar automáticamente |
| 429 | Demasiadas solicitudes en login, registro, recuperación o seguimiento público | Mostrar espera, respetar `Retry-After` y no reintentar en loop |
| 500 | Error interno (mensaje genérico) | Toast genérico "Intentá más tarde" |
| 502 | Falló MP o están pausados los nuevos checkouts | Toast con `message`; el POST de checkout se puede reintentar |

Códigos estables relevantes para la integración actual:

| `code` | HTTP | `details` útil | Tratamiento |
|--------|------|----------------|-------------|
| `COBRO_SUPERA_SALDO` | 409 | `reparacionId`, `total`, `cobrado`, `monto`, `pendiente` | Actualizar el máximo cobrable y mantener abierto el formulario |
| `TOTAL_MENOR_QUE_COBRADO` | 409 | `reparacionId`, `totalActual`, `totalPropuesto`, `cobrado`, `excedenteActual`, `excedentePropuesto` | No guardar el total; pedir corregir/anular cobros primero |
| `COBRO_YA_ANULADO` | 409 | `reparacionId`, `cobroId` | Refrescar historial y mostrar que la anulación ya existe |
| `QR_COBRO_INVALIDO` | 400 | Varía: `formatosPermitidos`; dimensiones; o `parteRequerida` | Conservar archivo/configuración anterior y corregir selección |
| `ARCHIVO_DEMASIADO_GRAN` | 413 | — | Pedir un archivo de hasta 1 MiB |
| `QR_COBRO_NO_CONFIGURADO` | 404 | — | Quitar la vista previa y refrescar DatosCobro |

Para `QR_COBRO_INVALIDO`, `details` depende de la causa: puede ser
`{ formatosPermitidos: "PNG,JPEG" }`, `{ ancho, alto, maximoPorEje, maximoPixeles }` o
`{ parteRequerida: "file" }`. Tratá estas claves como opcionales entre sí.

---

## 6. Freemium / límites de plan

- `estado: "TRIAL"` (aunque `plan: "FREE"`): reparaciones **ilimitadas** + funciones PRO completas.
- `plan: "FREE"` + `estado: "ACTIVA"`: tope de **25 reparaciones por mes** (configurable por env
  `FREE_MAX_REPARACIONES`) y sin inventario, cobros manuales/período/resumen ni multi-empleado.
- `plan: "PRO"` + `estado: "ACTIVA"`: reparaciones **ilimitadas** + funciones PRO.
- **Cómo cuenta:** suma 1 por cada reparación **creada** (`POST /api/reparaciones` o `/ingreso-rapido`).
  - **Borrar una reparación NO baja el contador** (no se puede esquivar el límite).
  - El contador **se reinicia el día 1 de cada mes** (mes calendario).
- Suscripción `VENCIDA`/`CANCELADA`: bloquea la creación de reparaciones y no concede funciones PRO.
- Al superar el tope, crear una reparación devuelve **`402`** con un `message` accionable.
- El front lee `GET /api/suscripcion` → `reparacionesEsteMes` / `limiteReparacionesMes` (null = ilimitado)
  y `funciones` como fuente de verdad para mostrar consumo/permisos y el modal de upgrade ante un 402.
  No deduzcas los entitlements solo desde `plan`, porque durante TRIAL el plan puede ser FREE.
- Al vencer el TRIAL, el backend pasa la suscripción a `FREE/ACTIVA`; recién entonces aplica el límite
  mensual y se cierran las funciones PRO.

**Flujo de upgrade a PRO:**
1. Ante el 402 (o desde la pantalla de Plan), el usuario toca "Pasar a PRO".
2. `POST /api/pagos/suscripcion` → tomás `initPoint` y hacés `window.location.href = initPoint`.
3. El usuario paga en MercadoPago y vuelve a `MP_BACK_URL` (`/suscripcion/resultado`).
4. En esa página, re-consultás `GET /api/suscripcion` con reintentos acotados hasta ver
   `plan: "PRO"` + `estado: "ACTIVA"`. Si todavía no se confirmó, mostrás "Pago pendiente" y
   permitís volver a consultar; `plan: "FREE"` durante TRIAL no significa que el pago haya fallado.

---

## 7. Setup recomendado (React + Vite + TS + Axios)

`src/api/client.ts`:
```ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    // Un 403 requiere contexto: puede ser rol insuficiente o sesión revocada.
    // Validá la sesión con GET /api/suscripcion antes de desloguear globalmente.
    // Para 429, respetá Number(err.response.headers["retry-after"]).
    // err.response.data puede ser ApiErrorBody: ramificá por code y mostrale message al usuario.
    return Promise.reject(err);
  }
);
```

`src/api/types.ts`:
```ts
export type Plan = "FREE" | "PRO";
export type EstadoSuscripcion = "TRIAL" | "ACTIVA" | "VENCIDA" | "CANCELADA";
export type EstadoReparacion =
  | "INGRESADO" | "EN_DIAGNOSTICO" | "PRESUPUESTADO" | "EN_PROCESO"
  | "ESPERANDO_REPUESTO" | "ESPERANDO_ADICIONAL" | "NO_REPARABLE"
  | "COMPLETADO" | "LISTO_SIN_REPARAR" | "ENTREGADO" | "ABANDONADO" | "CANCELADO";
export type EstadoPago = "SIN_COBRAR" | "PARCIAL" | "PAGADO";
export type CuentaVinculada = "NINGUNA" | "ICLOUD" | "GOOGLE" | "OTRA";
export type MomentoFoto = "INGRESO" | "POST_REPARACION";
export interface Foto { url: string; momento: MomentoFoto; }

export interface AuthResponse { token: string; type: string; email: string; emailVerificado: boolean; }
export type Rol = "ADMIN" | "USER";
export interface Perfil {
  usuario: { id: number; username: string; email: string; role: Rol };
  taller: { id: number; nombre: string; telefono: string | null };
}
export interface ApiErrorBody {
  timestamp?: string; status?: number; error?: string; message?: string; path?: string;
  code?: string; details?: Record<string, unknown>;
}
export interface Suscripcion {
  plan: Plan; estado: EstadoSuscripcion;
  fechaInicio: string | null; fechaFinTrial: string | null; proximoCobro: string | null;
  reparacionesEsteMes: number; limiteReparacionesMes: number | null;
  funciones: { inventario: boolean; cobros: boolean; empleadosMultiples: boolean };
}
export interface Cliente {
  id: number; nombre: string; apellido: string; telefono: string; email: string | null; direccion: string | null;
  equiposCount: number; reparacionesCount: number; ultimaVisita: string | null;
}
export interface Equipo {
  id: number; marca: string; modelo: string; imei: string | null; color: string | null; descripcion: string | null;
  clienteId: number; clienteNombre: string; clienteApellido: string; clienteTelefono: string; reparacionesCount: number;
}
export interface Reparacion {
  id: number; equipoId: number; equipoMarca: string; equipoModelo: string;
  clienteId: number; clienteNombre: string; clienteApellido: string; clienteTelefono: string;
  descripcionProblema: string; estado: EstadoReparacion;
  precioEstimado: number | null; precioFinal: number | null;
  fechaIngreso: string | null; fechaEstimadaEntrega: string | null; fechaEntrega: string | null;
  codigoSeguimiento: string | null; numeroOrden: string | null;
  totalRepuestos: number; total: number;
  cobrado: number; saldo: number; excedente: number; requiereRevision: boolean;
  estadoPago: EstadoPago;
  mojado: boolean; trabajoEnPlaca: boolean; noTesteableAlIngreso: boolean;
  tieneBloqueoPantalla: boolean; tieneCuentaVinculada: CuentaVinculada;
  clienteConoceCredenciales: boolean; riesgoCuentaSinCredenciales: boolean;
  accesorios: string | null; condicionesIngreso: string | null; observaciones: string | null;
  tecnicoId: number | null; tecnicoNombre: string | null;
  fotos: Foto[]; fechaConformidadEntrega: string | null;
  garantiaDias: number | null; garantiaInicio: string | null; garantiaFin: string | null;
  garantiaCondiciones: string | null; garantiaVigente: boolean;
  esGarantia: boolean; reparacionOrigenId: number | null;
}
// Solo GET /api/reparaciones/{id}; nunca usar este tipo para listados, altas, PUT o PATCH.
export interface ReparacionDetalle extends Reparacion {
  patronDesbloqueo: string | null;
  pinDesbloqueo: string | null;
}
export interface Repuesto { id: number; nombre: string; descripcion: string | null; precio: number; reparacionId: number | null; reparacionEquipo: string | null; articuloId: number | null; cantidad: number; }
export type EstadoPresupuesto = "PENDIENTE" | "APROBADO" | "RECHAZADO" | "VENCIDO";
export type TipoPresupuesto = "ORIGINAL" | "ADICIONAL";
export type TipoItemPresupuesto = "MANO_DE_OBRA" | "REPUESTO";
export type CalidadRepuesto = "ORIGINAL" | "ALTERNATIVO" | "USADO_REACONDICIONADO";
export interface ItemPresupuesto {
  descripcion: string; cantidad: number; precioUnitario: number;
  tipoItem: TipoItemPresupuesto; calidad: CalidadRepuesto | null;
}
export interface Presupuesto {
  id: number; reparacionId: number; estado: EstadoPresupuesto; tipo: TipoPresupuesto;
  items: ItemPresupuesto[]; total: number; manoDeObraTotal: number; repuestosTotal: number;
  validezDias: number; validoHasta: string | null; vencido: boolean;
  observaciones: string | null; fechaRespuesta: string | null; createdAt: string;
}
export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "MERCADOPAGO" | "OTRO";
export type EstadoCobro = "ACTIVO" | "ANULADO";
export interface Cobro {
  id: number; reparacionId: number; monto: number; metodo: MetodoPago;
  referencia: string | null; observaciones: string | null; fecha: string; estado: EstadoCobro;
  anuladoAt: string | null; anuladoPorNombre: string | null; motivoAnulacion: string | null;
}
export interface CobrosReparacion {
  total: number; cobrado: number; saldo: number; excedente: number;
  requiereRevision: boolean; pagado: boolean; cobros: Cobro[];
}
export interface DatosCobro {
  alias: string | null; titular: string | null; entidad: string | null;
  mostrarEnResumen: boolean; qrDisponible: boolean; qrVersion: string | null;
}
export interface CajaResumen {
  desde: string; hasta: string; totalCobrado: number; cantidad: number;
  porMetodo: Record<MetodoPago, number>; cobros: Cobro[];
}
export interface ResumenDigitalItem {
  nombre: string; cantidad: number; precioUnitario: number; subtotal: number;
}
export interface ResumenDigital {
  numeroOrden: string | null; codigoSeguimiento: string | null;
  fecha: string; estado: EstadoReparacion; reparacionId: number;
  taller: { nombre: string; telefono: string | null };
  cliente: { nombre: string; apellido: string; telefono: string | null };
  equipo: { marca: string; modelo: string; descripcionProblema: string };
  detalle: { repuestos: ResumenDigitalItem[]; manoDeObra: number; totalRepuestos: number };
  importes: {
    total: number; cobrado: number; saldo: number; excedente: number;
    requiereRevision: boolean; pagado: boolean;
  };
  pagos: Array<{ fecha: string; monto: number; metodo: MetodoPago; referencia: string | null }>;
  datosCobro: null | {
    alias: string | null; titular: string | null; entidad: string | null;
    qrDisponible: boolean; qrVersion: string | null;
  };
  documentoFiscal: false; leyenda: string;
}
export interface CheckoutResponse { preapprovalId: string; initPoint: string; }
// Respuesta paginada genérica
export interface Page<T> { content: T[]; page: { size: number; number: number; totalElements: number; totalPages: number }; }
```

Ejemplos:
```ts
// login
const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
localStorage.setItem("token", data.token);

// identidad visible: usuario y taller son entidades distintas
const { data: perfil } = await api.get<Perfil>("/api/perfil");

// cambiar estado de una reparación
await api.patch(`/api/reparaciones/${id}/estado`, { estado: "EN_PROCESO" });

// detalle autenticado: único response que puede incluir PIN/patrón
const { data: detalle } = await api.get<ReparacionDetalle>(`/api/reparaciones/${id}`);

// listar por estado
const { data } = await api.get<Reparacion[]>("/api/reparaciones/estado", { params: { estado: "EN_PROCESO" } });

// resumen digital canónico (no fiscal)
const { data: resumen } = await api.get<ResumenDigital>(
  `/api/reparaciones/${id}/resumen-digital`,
);

// iniciar upgrade a PRO (redirige a MercadoPago)
const { data } = await api.post<CheckoutResponse>("/api/pagos/suscripcion");
window.location.href = data.initPoint;
```

---

## 8. Pantallas mínimas del frontend

1. **Login** y **Registro** (onboarding del taller).
2. **Layout protegido** (sidebar: Dashboard, Clientes, Equipos, Reparaciones, Repuestos, Cobros,
   Inventario y Plan según entitlements) con identidad de usuario/taller y logout.
3. **Clientes**: tabla + búsqueda + ABM; ficha con sus equipos.
4. **Equipos**: tabla + ABM (selector de cliente); ver reparaciones del equipo.
5. **Reparaciones** (pantalla estrella): tablero/lista por estado, ABM, cambio rápido de estado,
   detalle con repuestos y total (suma de precios). PIN/patrón se muestran únicamente en esta ficha
   autenticada; no los copies al estado de tablas, tarjetas ni búsquedas.
   - **Carga rápida** (`POST /api/reparaciones/ingreso-rapido`): un formulario corto (nombre + teléfono
     del cliente, marca + modelo del equipo, problema) que crea todo de una. Con el `clienteId`/`equipoId`
     que devuelve, ofrecé "completar datos" para ir a las pantallas de Cliente/Equipo.
6. **Repuestos**: ABM, asociación a reparación.
7. **Plan**: muestra `GET /api/suscripcion` (consumo + estado), comparativa FREE/PRO, botón
   "Pasar a PRO" (`POST /api/pagos/suscripcion` → redirige a MercadoPago), y maneja el 402. Durante
   TRIAL presenta las capacidades PRO activas aunque el campo `plan` sea FREE.
8. **Resultado de pago** (`/suscripcion/resultado`): página de retorno de MercadoPago que
   re-consulta `GET /api/suscripcion` hasta confirmar el plan PRO; un checkout `pending` no equivale
   a pago aprobado.
9. **Cobros**: rango de fechas, total del período, desglose por método y movimientos manuales. Debe
   conservar visible la aclaración de que no es un balance ni confirma acreditaciones.
10. **Datos de cobro**: lectura para ADMIN/USER; edición de alias/titular/entidad, visibilidad y QR
    sólo para ADMIN. Una falla parcial no debe borrar la parte que sí se guardó.
11. **Resumen digital** (`/reparaciones/{id}/resumen`): taller como emisor, detalle de la orden,
    importes, pagos activos, datos de cobro sólo si corresponden y leyenda no fiscal. La ruta visual
    histórica `/reparaciones/{id}/recibo` puede redirigir, pero el fetch usa `/resumen-digital`.

---

## 9. Estado actual del backend y roadmap

**Listo y funcionando:**
- Auth (registro + login por email), JWT con tenant y `GET /api/perfil` para identidad usuario/taller.
- **Recuperación de contraseña** por email y **verificación de email** suave (§4.1) — emails vía Resend.
- Multi-tenancy con aislamiento total por taller.
- CRUD de Clientes, Equipos, Reparaciones, Repuestos.
- Suscripciones freemium (FREE/PRO) con límite mensual y gating 402.
- **MercadoPago**: checkout de suscripción PRO (`POST /api/pagos/suscripcion`) + **cancelación**
  (`/cancelar`) + webhook con **firma validada**, inbox idempotente, reconciliación y validación de
  collector/aplicación/monto. *(Requiere la configuración de §10.)*
- **Carga rápida** de reparación (§4.5), **total** de reparación (mano de obra + repuestos).
- **Máquina de estados** (12 estados, transición ilegal → 409) y **estado de pago** derivado
  (`cobrado/saldo/excedente/requiereRevision/estadoPago`).
- **Orden de trabajo ampliada**: checklist de ingreso (patrón/PIN cifrados y visibles solo en detalle
  autenticado, accesorios, condiciones), técnico asignado, observaciones internas y **fotos con momento**
  (INGRESO/POST_REPARACION).
- **Ingreso enriquecido**: flags de riesgo, bloqueo de cuenta (iCloud/FRP) con bandera roja, y `numeroOrden` correlativo por taller.
- **Conformidad de entrega** (sellada al ENTREGADO) y **garantía** (default 90 días) con **reclamo en garantía** que no consume cupo.
- **Paginación + búsqueda** en todos los listados (§4.2.bis).
- **Roles ADMIN/USER** con gestión de empleados y mutaciones administrativas protegidas: bajas,
  suscripción/exportación, anulaciones y configuración de datos de cobro/QR (§3, §4.10 y §4.13).
- **Dashboard** (§4.8), **seguimiento público** + **link de WhatsApp** (§4.9).
- **Presupuestos** con aprobación del cliente desde el link público (§4.11).
- **Inventario** con stock, ajustes, descuento automático y aviso de stock bajo (§4.12).
- **Cobros manuales / período / resumen digital** (§4.13): referencia, historial de anulaciones,
  estado sin saldos negativos, datos de cobro/QR y documento informativo no fiscal.
- **Errores de dominio** con `code/details` opcionales para resolver conflictos sin comparar mensajes (§5).
- **Exportación a Excel** (§4.14): el ADMIN descarga todos los datos del taller en un `.xlsx`.
- **Gating por plan**: inventario, cobros/período/resumen y multi-empleado son PRO (402 + mapa
  `funciones` en §4.2). Dashboard es FREE.
- **Salud** (`/actuator/health`) y **tests** (aislamiento de tenant, 402, firma de webhook).
- Spring Boot 4 / Java 21, migraciones con Flyway.

**Próximo (ideas a futuro):**
- **WhatsApp Business API** (envío automático real; hoy es link wa.me manual).
- Cargo por diagnóstico y seña/anticipo; recordatorio de retiro + ABANDONADO automático.
- Inventario fino (catálogo por modelo/SKU, orden a proveedor con ETA) y **reportes** (tiempo de ciclo, margen).
- Login con Google; auditoría de eventos.

---

## 10. Configuración del backend para MercadoPago (no es del front)

La integración viene **desactivada por defecto** (`mercadopago.enabled=false`): el backend arranca igual
sin tocar nada. Para operar pagos en vivo, definí estas variables **solo en el entorno/secret manager**
(nunca en el frontend ni versionadas):

| Variable | Default | Descripción |
|----------|---------|-------------|
| `MP_ENABLED` | `false` | `true` para activar las llamadas a MercadoPago |
| `MP_CHECKOUT_ENABLED` | `true` | Kill switch operativo: en `false` frena nuevos checkouts sin apagar webhooks, cancelación ni reconciliación |
| `MP_ACCESS_TOKEN` | *(vacío)* | Access Token de MercadoPago (las de prueba también empiezan con `APP_USR-`) |
| `MP_WEBHOOK_SECRET` | *(vacío)* | Clave secreta del webhook (panel MP → Webhooks). **Obligatoria si `MP_ENABLED=true`**: con MP activo y sin secreto, el webhook rechaza todo (fail-closed). |
| `MP_COLLECTOR_ID` | *(vacío)* | ID esperado de la cuenta cobradora; obligatorio con `MP_ENABLED=true` y validado en cada checkout |
| `MP_APPLICATION_ID` | *(vacío)* | ID esperado de la aplicación MP; obligatorio con `MP_ENABLED=true` y validado en cada checkout |
| `MP_AMOUNT` | `24900` | Monto mensual de la suscripción PRO (ARS 24.900) |
| `MP_CURRENCY` | `ARS` | Moneda |
| `MP_REASON` | `OrdenFix PRO - Suscripción mensual` | Texto que ve el usuario en el checkout |
| `MP_BACK_URL` | `http://localhost:5173/suscripcion/resultado` con MP apagado | URL del front a la que vuelve el usuario; debe ser HTTPS cuando `MP_ENABLED=true` |

Con `MP_ENABLED=true`, el backend valida al arrancar que Access Token, webhook secret,
`MP_COLLECTOR_ID` y `MP_APPLICATION_ID` estén presentes y que el monto sea positivo. Collector y
application ID son datos de confianza del backend: el frontend no debe recibirlos ni enviarlos.
También exige una `MP_BACK_URL` HTTPS y la API oficial `https://api.mercadopago.com`.

Además, en el panel de MercadoPago hay que configurar la **URL de notificaciones (webhook)** apuntando a
`https://<tu-backend>/api/pagos/webhook` (en local se usa un túnel tipo ngrok). El endpoint `/api/pagos/webhook`
es público pero **valida la firma `x-signature`** con `MP_WEBHOOK_SECRET`; el resto de `/api/pagos/**` exige token.

**Health check (para el deploy):** `GET /actuator/health` es público y devuelve `{"status":"UP"}`. Útil para
configurar los probes de readiness/liveness en Render/Railway. No expone otros endpoints de Actuator.

> Dashboard, Cobros e Inventario ya forman parte de la navegación protegida. Conservá margen para
> Reportes futuros sin volver a usar "Caja" como sinónimo de balance.

---

## 11. Checklist de integración y validación del frontend

Usá esta lista para marcar qué está integrado en el repo del frontend.

### Entorno y sesión

- [ ] `VITE_API_URL=http://localhost:8080` en desarrollo y URL HTTPS correcta en producción.
- [ ] Limpiar cualquier token de producción guardado antes de probar contra localhost.
- [ ] Login/registro guardan `token`, `email` y `emailVerificado`; todas las rutas privadas envían Bearer.
- [ ] Los guards entienden `ROLE_ADMIN` / `ROLE_USER` o normalizan el prefijo de manera consistente.
- [ ] `GET /api/perfil` alimenta por separado la identidad de usuario y nombre/teléfono del taller.
- [ ] La carga inicial valida sesión con `GET /api/perfil` y/o `/api/suscripcion`, y distingue sesión
  inválida de falta de rol.
- [ ] `401`, `403`, `402`, `409`, `413`, `429` y `502` tienen tratamiento explícito; `429` respeta
  `Retry-After`.
- [ ] Los conflictos conocidos se resuelven por `ApiError.code`; `message` sólo se usa como copy y
  `details` nunca se muestra serializado en bruto.
- [ ] Existen `/reset-password?token=...` y `/verificar-email?token=...`.

### Datos y navegación

- [ ] Listados consumen `data.content` + `data.page`; no esperan un array directo.
- [ ] Búsqueda, filtros, orden y paginación conservan el estado en la URL o store de la pantalla.
- [ ] Las bajas esperan el `204`; ante `409`/`400` mantienen la fila y muestran `message`.
- [ ] El dashboard muestra por separado estado de reparación y estado de pago; excedente/revisión
  tiene prioridad sobre `PAGADO` y jamás se representa como saldo negativo.
- [ ] Descarga Excel usa respuesta `blob` y respeta el nombre del archivo.

### PIN, patrón y reparación

- [ ] Listados, tarjetas, dashboard y tracking usan `Reparacion`, nunca `ReparacionDetalle`.
- [ ] Solo la ficha autenticada llama `GET /api/reparaciones/{id}` y puede mostrar PIN/patrón.
- [ ] PIN/patrón no se guardan en localStorage, analytics, logs, caché global ni mensajes de error.
- [ ] En PUT, campo omitido conserva; `""` borra; después de POST/PUT/PATCH se refresca el detalle.
- [ ] Al pasar a `ENTREGADO`, la UI elimina inmediatamente cualquier copia en memoria de esos valores.
- [ ] La UI ofrece únicamente las transiciones legales y maneja igualmente un `409` del backend.

### Cobros y resumen digital

- [ ] ADMIN y USER pueden registrar/consultar cobros; sólo ADMIN ve anulación y edición de datos/QR.
- [ ] El alta limita el monto al saldo conocido y, aun así, maneja `COBRO_SUPERA_SALDO` actualizando
  `details.pendiente` por carreras o datos desactualizados.
- [ ] `referencia` se muestra separada de observaciones; el historial conserva `ACTIVO` y `ANULADO`
  con motivo/autor/fecha, mientras totales y período suman sólo activos.
- [ ] Cobros por período conserva visible que es un registro manual, no balance, saldo bancario ni
  confirmación de acreditaciones.
- [ ] DatosCobro se consulta para ambos roles; `PUT` textual reemplaza todos sus campos y el QR usa
  multipart separado. La caché del blob depende de `qrVersion` y se elimina cuando cambia/desaparece.
- [ ] Errores `QR_COBRO_INVALIDO`, `ARCHIVO_DEMASIADO_GRAN` y `QR_COBRO_NO_CONFIGURADO` conservan la
  configuración válida previa y producen feedback inline.
- [ ] El fetch canónico usa `/resumen-digital`; la ruta visual `/recibo` sólo redirige por compatibilidad.
- [ ] El resumen muestra taller emisor, pagos activos/referencias, saldo/excedente, datos de cobro sólo
  cuando llegan y la leyenda no fiscal completa; no expone observaciones ni presenta una impresión fiscal.

### Plan y Mercado Pago

- [ ] Capacidades se toman de `funciones` y `limiteReparacionesMes`, no solo de `plan`.
- [ ] TRIAL se muestra como experiencia PRO ilimitada aunque `plan` sea `FREE`.
- [ ] Solo ADMIN ve iniciar/cancelar suscripción; el front nunca envía monto, moneda ni IDs de MP.
- [ ] Checkout redirige exclusivamente al `initPoint` recibido y maneja `409`/`502` sin duplicarlo.
- [ ] `/suscripcion/resultado` reconsulta el plan con reintentos acotados y contempla estado pendiente.
- [ ] Sandbox valida approved, rejected, paused, canceled, refunded, charged_back y eventos duplicados.
- [ ] Retorno y webhook usan URLs HTTPS públicas; secretos de MP nunca existen en variables `VITE_*`.

### Aceptación mínima

- [ ] Registro, login, logout, expiración/revocación y usuario desactivado.
- [ ] CRUD y búsquedas de clientes, equipos, reparaciones y repuestos con aislamiento por taller.
- [ ] Ingreso rápido, máquina de estados, presupuestos públicos, garantía y conformidad de entrega.
- [ ] FREE/ACTIVA, TRIAL, PRO/ACTIVA y PRO/VENCIDA con sus capacidades correctas.
- [ ] Matriz ADMIN/USER probada: lectura operativa para empleado y mutaciones administrativas bloqueadas.
- [ ] Cobro parcial/total, conflicto concurrente, anulación auditada, excedente histórico, QR y resumen
  digital probados en 320 px, 390 px y orientación horizontal sin desbordes.
- [ ] Tracking público no expone observaciones internas, PIN, patrón ni datos de otro cliente.
- [ ] Flujo MP completo probado en sandbox antes de habilitar `MP_CHECKOUT_ENABLED` en producción.
