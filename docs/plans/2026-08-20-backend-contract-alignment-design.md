# Alineación crítica con el contrato actualizado del backend

Fecha: 2026-08-20

## Contexto

La guía de integración actualizada de OrdenFix se cruzó contra el frontend completo. La mayor parte del dominio ya está integrada: autenticación por email, paginación, doce estados de reparación, fotos por momento, ingreso rápido, garantías, presupuestos, inventario, cobros, tracking y exportación.

La auditoría sí detectó desajustes críticos en los límites de sesión y tenant, la interpretación de `403`, los permisos derivados de la suscripción y el tratamiento de PIN/patrón. También se solicitaron dos cambios concretos de interfaz: retirar Excel de la pestaña Plan y permitir visualizar las contraseñas de las cuentas mediante un control de ojo.

El modelo de permisos confirmado es:

- El registro inicial crea al dueño con rol `ADMIN`.
- El `ADMIN` puede crear empleados con rol `USER`.
- Los datos operativos pertenecen al taller, no a su creador: un `USER` puede ver, crear y editar clientes, equipos, reparaciones, repuestos, presupuestos y cobros habilitados por el plan.
- Solo el `ADMIN` gestiona empleados y suscripción, exporta datos y ejecuta eliminaciones o anulaciones administrativas.

## Alcance elegido

Se implementará una alineación crítica, intermedia entre un parche visual y un refactor exhaustivo. Incluye los pedidos visibles y todos los desajustes que comprometen seguridad, sesión, permisos o fidelidad del contrato.

Quedan fuera de esta etapa:

- Carga incremental del tablero cuando una columna supera 100 órdenes.
- Selectores server-side para talleres con más de 200 artículos.
- Persistencia en URL de todos los filtros de listados.
- Endurecimiento exhaustivo de cada propiedad opcional de todos los DTO históricos.
- Un control de ojo para PIN/patrón del dispositivo.
- Cambios de autorización en el backend.

## Dirección de interfaz

### Dominio

- Orden de trabajo compartida.
- Mesa de diagnóstico.
- Credencial resguardada.
- Llave del taller y permisos del encargado.
- Etiqueta de estado del plan.
- Caja, recibo y trazabilidad.

### Mundo de color

- Grafito de herramientas para texto y estructura.
- Acero de banco de trabajo para bordes.
- Papel marfil de orden impresa para superficies.
- Verde teal de alfombra antiestática para acciones.
- Ámbar de etiqueta preventiva para advertencias.
- Rojo de riesgo para errores y acciones destructivas.
- Verde de control aprobado para éxito.

No se agregará una paleta nueva: estos conceptos ya están representados por los tokens actuales de OrdenFix.

### Firma

La firma de esta mejora será la “inspección segura”: un ojo compacto dentro del campo permite comprobar una contraseña sin transformar el formulario en una pantalla distinta. El mismo principio se aplica al resto del trabajo: la app verifica sesión, plan y permisos antes de exponer acciones o datos.

### Defaults reemplazados

- Ojos implementados por separado en cada pantalla → un único `PasswordInput` accesible y reutilizable.
- Permisos PRO habilitados por ausencia de datos → estado indeterminado/bloqueado hasta validar `/suscripcion`.
- `403` interpretado por método HTTP → validación contextual de sesión y rol.
- Datos tenant conservados tras logout → purga explícita de caché al cambiar sesión.
- PIN/patrón mezclados con el DTO de listados → contrato tipado separado para el detalle autenticado.

### Checkpoint de componentes

- **Intent:** un técnico o encargado necesita operar rápido sin confundir permisos ni exponer credenciales; debe sentirse preciso, confiable y familiar.
- **Palette:** se reutilizan `primary`, `warning`, `danger`, `success`, superficies y jerarquías de texto existentes porque ya codifican acción, riesgo y estado del taller.
- **Depth:** bordes discretos y sombras suaves ya presentes; no se mezclará otra estrategia de elevación.
- **Surfaces:** los inputs permanecen visualmente insertos en sus tarjetas y el botón de ojo comparte el mismo plano del control.
- **Typography:** se conserva Manrope y la jerarquía actual; el cambio no introduce una voz visual nueva.
- **Spacing:** base de 4 px y área táctil mínima de 44 px para el toggle.

## Arquitectura

### 1. Límite de sesión y tenant

Las rutas privadas se envolverán en un `SessionGate`. Con un token local vigente, el gate consultará `GET /api/suscripcion` antes de renderizar contenido privado. Durante la validación mostrará un estado de carga neutral; ante un error recuperable ofrecerá reintento; ante `401` o un `403` de la validación base cerrará la sesión.

El manejo de `403` dejará de inferir permisos por el método HTTP:

- Un `403` en la validación base implica sesión inválida o revocada y provoca logout.
- Una acción conocida como administrativa conserva la sesión y muestra “sin permisos”.
- Ante un `403` inesperado se hará una única validación deduplicada de `/suscripcion`; si la sesión sigue viva se mostrará falta de permisos, y si falla se cerrará la sesión.

El cierre de sesión y el cambio de identidad purgarán la caché tenant-scoped de React Query antes de que otra cuenta pueda reutilizarla. La autenticación pública usará el cliente HTTP público para no adjuntar un token anterior a login o registro.

### 2. Suscripción y capacidades

`Suscripcion.funciones` será obligatoria en el DTO contractual. La UI no inferirá acceso por `plan` ni habilitará funciones mientras la consulta está pendiente o falló.

La pantalla Plan derivará su presentación de `estado`, `funciones` y `limiteReparacionesMes`:

- `FREE/TRIAL`: “Prueba PRO”, funciones activas e ilimitado.
- `FREE/ACTIVA`: funciones según flags y límite real informado por backend.
- `PRO/ACTIVA`: PRO activo e ilimitado.
- `PRO/VENCIDA`: plan vencido, sin presentar prestaciones como activas.

Los valores configurables no se hardcodearán. Un `409` al iniciar checkout mostrará el mensaje y refrescará la suscripción; un `502` seguirá siendo reintentable manualmente.

### 3. Roles y acciones

El frontend reflejará el modelo confirmado:

- `USER`: operación compartida y edición de datos del taller.
- `ADMIN`: todo lo anterior más empleados, suscripción, exportación, eliminaciones y anulaciones.

Las restricciones visuales son orientación de UX; el backend continúa siendo la autoridad. Un rechazo remoto conserva los datos y muestra el `message` contractual.

### 4. Credenciales de reparación

Se separarán los contratos:

- `Reparacion`: respuesta segura para listados, dashboard, altas, PUT y PATCH; nunca declara PIN/patrón.
- `ReparacionDetalle`: único tipo que agrega `pinDesbloqueo` y `patronDesbloqueo` para el GET autenticado de detalle.

La información sensible no quedará en una caché compartida entre pantallas o sesiones. Al marcar `ENTREGADO` se borrará inmediatamente su copia local. En edición, omitir conserva el secreto y enviar `""` lo borra, tal como define el backend.

La telemetría sanitizará `Authorization`, cuerpos de requests y campos sensibles antes de reportar un error. Nunca se enviará el `AxiosError` crudo con credenciales a Sentry.

### 5. Cambios visibles solicitados

Se eliminarán el import y la tarjeta `ExportExcelButton` de `PlanesPage`. La exportación seguirá disponible para `ADMIN` desde Dashboard y conservará el endpoint, blob y nombre de archivo actuales.

Se creará un `PasswordInput` con `forwardRef` y atributos nativos. El botón:

- Alternará `password`/`text` sin cambiar el valor ni `autocomplete`.
- Tendrá etiquetas “Mostrar contraseña” y “Ocultar contraseña”.
- Expondrá `aria-pressed`, foco visible y un target mínimo de 44 px.
- Se usará en login, registro, ambos campos del reset y alta de empleados.

PIN/patrón del dispositivo no se modifica visualmente en esta etapa.

### 6. Correcciones contractuales relacionadas

- Los PUT de cliente, equipo y repuesto quitarán `id` del body y lo usarán solo en la URL.
- Estado y saldo de pago se mostrarán aunque el taller sea FREE; la capacidad `cobros` controla registrar cobros, no ver el estado derivado.
- Dashboard usará `total` del backend como importe principal.
- Las mutaciones de reparación y presupuesto invalidarán dashboard, suscripción y agregados afectados.
- `429` leerá `Retry-After`, comunicará la espera y bloqueará reenvíos durante ese período en auth y tracking.
- Tracking distinguirá `404`, `429` y fallas temporales en lugar de convertir todo en “código no encontrado”.
- La guía adjunta reemplazará la documentación de integración local y se actualizarán los datos de MercadoPago desactualizados en deploy.

## Flujo de errores

- `400`: conservar formulario y mostrar el mensaje del backend.
- `401`: limpiar credenciales, caché y redirigir a login.
- `402`: mostrar el upgrade sin habilitar la función restringida.
- `403`: validar sesión base y distinguir revocación de falta de rol.
- `404`: estado de recurso inexistente, específico de la pantalla.
- `409`: conservar estado local; en checkout además refrescar suscripción.
- `429`: respetar `Retry-After`, mostrar cuenta regresiva y no reintentar automáticamente.
- `500`: mensaje genérico y telemetría sanitizada.
- `502`: mensaje contractual y reintento manual del checkout.

## Verificación

### Unitarios e integración

- `SessionGate` valida antes de renderizar y maneja reintento/logout.
- Los `403` inesperados deduplican la validación base.
- Logout y cambio de sesión purgan caché tenant-scoped.
- Capacidades fallan cerradas durante loading/error.
- TRIAL y PRO/VENCIDA se representan correctamente.
- `PasswordInput` alterna visibilidad, conserva atributos y tiene nombre accesible.
- Excel permanece en Dashboard y desaparece de Plan.
- PIN/patrón no existen en `Reparacion` y se limpian al entregar.
- PUT no envía `id`; PIN/patrón vacío sí se envía para borrado.
- Sentry recibe únicamente datos sanitizados.
- `409`, `429` y tracking conservan el comportamiento contractual.

### Regresión

- Typecheck, ESLint y build.
- Suite unitaria completa, actualmente en 107/107.
- E2E de autenticación, roles, gating, exportación y móvil.
- Prueba de dos sesiones consecutivas que garantice que la segunda no ve caché de la primera.

## Criterios de aceptación

- Ninguna ruta privada renderiza datos tenant-scoped antes de validar la sesión base.
- Una sesión revocada sale de la app y una falta de rol no desloguea al usuario válido.
- Cambiar de cuenta nunca reutiliza datos del taller anterior.
- TRIAL y las funciones PRO dependen de `funciones`, no solo de `plan`.
- `USER` puede editar operación compartida, pero no ve ni ejecuta acciones administrativas.
- El Excel no aparece en Plan y continúa funcionando en Dashboard para `ADMIN`.
- Todos los campos de contraseña de cuenta permiten mostrar/ocultar de forma accesible.
- PIN/patrón no aparecen en contratos seguros ni en telemetría y se limpian al entregar.
- Los códigos `401`, `402`, `403`, `409`, `429` y `502` tienen comportamiento explícito.
- Typecheck, lint, build, unitarios y E2E quedan en verde.
