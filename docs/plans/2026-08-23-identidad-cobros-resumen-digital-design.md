# Diseño — Identidad del taller, control de cobros y resumen digital

Fecha: 2026-08-23

## Contexto

OrdenFix ya pide `nombreTaller`, `telefonoTaller` y `nombreAdmin` durante el registro, pero la sesión autenticada sólo conserva token, email y verificación. El JWT expone `sub`, `role`, `tallerId` y `exp`; no existe un endpoint que devuelva el usuario actual junto con su taller. Como consecuencia:

- el sidebar repite “OrdenFix” en el bloque de cuenta y muestra el email;
- el navbar vuelve a mostrar el email y lo oculta en los teléfonos más angostos;
- el dashboard deriva “Juan” del prefijo de `juan@...` en vez de usar el nombre real;
- el nombre del taller sólo reaparece en superficies puntuales como Seguimiento y Recibo.

Cobros presenta otra inconsistencia. El contrato define:

```text
total = mano de obra + repuestos
saldo pendiente = max(0, total - cobrado)
```

Sin embargo, `POST /cobros` acepta cualquier monto positivo. `GET /cobros` y `GET /recibo` restan sin limitar a cero, mientras Reparaciones, Dashboard y Exportación sí lo limitan. Un cobro superior al pendiente —o una reducción posterior del total— puede hacer que una orden muestre `$0` en un listado y `-$88.323` en su detalle o recibo.

La pantalla Caja tampoco representa un balance financiero. Sólo suma cobros registrados en un rango y los agrupa por método. No conoce saldo inicial, egresos, gastos, acreditaciones reales, comisiones, retenciones, devoluciones ni saldos bancarios o de billeteras.

Por último, la vista llamada Recibo es un HTML autenticado y orientado a `window.print()`. Resume la orden completa, pero no individualiza un pago, método, referencia ni número de operación. Puede mostrarse incluso con saldo pendiente, por lo que “Recibo” no describe correctamente el documento.

## Decisión aprobada

OrdenFix seguirá siendo un **control manual de cobros**. No procesará fondos, no conciliará automáticamente con Mercado Pago y no intentará convertirse en un sistema contable.

El alcance aprobado incluye:

1. Mantener OrdenFix como marca del producto y mostrar el taller como contexto persistente.
2. Mostrar por separado taller, usuario y rol en desktop y móvil.
3. Reemplazar la semántica visual “Caja” por **Cobros**, conservando `/caja` para no romper rutas.
4. Hacer cumplir en backend la invariancia de que un cobro no puede superar el pendiente.
5. Impedir que una modificación de la orden reduzca el total por debajo de lo cobrado.
6. Detectar y hacer visible cualquier excedente histórico sin representarlo como deuda negativa.
7. Permitir guardar datos públicos de cobro del taller y una referencia manual por movimiento.
8. Renombrar Recibo a **Resumen digital de la orden**, con el taller como emisor y OrdenFix como marca secundaria.
9. Eliminar el flujo dedicado a impresión y aclarar que el resumen no reemplaza un comprobante fiscal.

Se descartaron:

1. **Corrección sólo visual:** limitar el saldo a cero en React ocultaría datos inválidos y permitiría que otros clientes de la API siguieran creando sobrepagos.
2. **Eliminar el documento:** reduciría el riesgo de confusión, pero también quitaría una superficie útil para revisar y comunicar el trabajo realizado.
3. **Procesar pagos reales:** QR dinámico, OAuth, credenciales por taller, webhooks, devoluciones y conciliación forman un producto financiero distinto y quedan fuera de esta etapa.

## Modelo conceptual

Las tres capas deben mantenerse separadas:

```text
OrdenFix          producto SaaS
  └─ Taller       tenant y emisor del servicio
      ├─ Usuario  persona que opera la cuenta
      ├─ Datos de cobro
      └─ Cobros registrados manualmente
```

Un dato de cobro indica **dónde puede pagar el cliente**. Un cobro registrado indica **qué declaró haber recibido el taller**. Ninguno confirma por sí mismo que una entidad financiera acreditó dinero.

## Identidad de producto, taller y usuario

### Jerarquía visual

- OrdenFix conserva el wordmark en la cabecera del sidebar y el isotipo en móvil.
- Debajo de la marca se muestra el nombre del taller como contexto activo.
- El bloque de cuenta muestra el nombre real del usuario como dato principal.
- La segunda línea combina rol y email cuando haya espacio; el email completo queda disponible mediante `title` o menú.
- El dashboard usa `Hola, {usuario}` y `Hoy en {taller}`.
- En documentos dirigidos al cliente, el taller pasa a ser el emisor principal y “Generado con OrdenFix” queda en el pie.

### Desktop

El encabezado del sidebar tendrá dos niveles:

```text
[logo] OrdenFix
       CelExpress
```

El bloque de cuenta inferior será:

```text
JP  Juan Pérez
    Administrador · juan@celexpress.com
```

No se repetirá “OrdenFix” en ese bloque.

### Móvil

La barra superior mostrará isotipo, marca y taller en dos líneas compactas. El nombre del taller usará elipsis, pero conservará el valor completo en su nombre accesible. La identidad no dependerá del chip de email, que hoy desaparece en viewports angostos.

### Estado de carga y error

El contexto de sesión no bloqueará toda la aplicación:

- mientras carga, se reserva el espacio con un skeleton corto;
- si falla por un error recuperable, se usa el email como fallback y se ofrece reintento en la superficie de cuenta;
- un `401` o un `403` que invalide la sesión conserva el manejo global actual;
- cambiar de tenant, rol o email limpia la caché como ya hace el store de auth.

No se persistirán nombres duplicados en Zustand. React Query será la fuente remota y el store seguirá conservando sólo los datos mínimos de autenticación.

## Contrato de perfil

Se agregará un recurso autenticado:

```http
GET /api/perfil
Authorization: Bearer <token>
```

Respuesta `200`:

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

El endpoint debe funcionar para `ADMIN` y `USER`, siempre limitado al principal autenticado y a su tenant. No se ubicará bajo `/api/auth/**`: la configuración actual declara público ese patrón completo.

Una edición futura del taller podrá usar `PATCH /api/taller`, sólo `ADMIN`, pero modificar nombre y teléfono no es requisito para mostrar correctamente los datos ya capturados.

## Cobros y significado de los importes

### Lenguaje de interfaz

- Navegación: **Cobros**.
- Título: **Cobros**.
- KPI principal: **Cobrado en el período**.
- Lista: **Cobros registrados**.
- Ayuda persistente: “Incluye sólo cobros registrados manualmente en OrdenFix. No representa el saldo de una cuenta bancaria o billetera.”
- En cada orden: **Pendiente de cobro**, no “Saldo” aislado.

La URL `/caja` y la query key `caja` se conservan por compatibilidad interna. El cambio es semántico y visual, no una migración de rutas.

### Invariantes de dominio

Al registrar un cobro, el backend calculará dentro de la misma transacción:

```text
pendiente = max(0, total actual - cobrado vigente)
```

Si `monto > pendiente`, responderá `409 Conflict`:

```json
{
  "status": 409,
  "code": "COBRO_SUPERA_SALDO",
  "message": "El monto supera el pendiente de cobro.",
  "details": {
    "reparacionId": 10,
    "total": 151677,
    "cobrado": 0,
    "monto": 120000,
    "pendiente": 31677
  }
}
```

La validación debe ser transaccional y serializar cobros concurrentes sobre la misma reparación. El máximo del formulario es una ayuda de UX; nunca reemplaza la autoridad del backend.

Toda mutación que pueda reducir el total —precio estimado/final, repuestos, cantidades o eliminación— debe impedir que el nuevo total quede por debajo de lo ya cobrado. Usará `409 Conflict`, código `TOTAL_MENOR_QUE_COBRADO` y un mensaje que indique anular o corregir primero los cobros correspondientes.

### Datos históricos inconsistentes

No se ocultarán excedentes existentes. Las respuestas de cobros y resumen digital expondrán:

```text
pendiente = max(0, total - cobrado)
excedente = max(0, cobrado - total)
requiereRevision = excedente > 0
```

Durante la transición, `saldo` conservará el significado contractual de pendiente no negativo. `excedente` será aditivo y opcional para no romper clientes anteriores.

La UI mostrará:

```text
Pendiente de cobro  $0
Excedente a revisar $88.323
```

No se llamará “crédito a favor” hasta existir un modelo de cuenta corriente, devolución o imputación a otra orden.

Antes del cierre se ejecutará una auditoría read-only de las órdenes afectadas. Cualquier corrección de datos productivos requerirá una decisión y autorización separadas.

### Anulación

El borrado físico actual es insuficiente para un control confiable. El diseño objetivo conserva el movimiento con estado `ANULADO`, fecha, usuario y motivo. Sólo un `ADMIN` puede anular.

La implementación podrá introducir esta auditoría en un commit separado porque requiere migración. Hasta completarla, ningún texto prometerá contabilidad ni trazabilidad fiscal.

## Datos para cobrar

El taller podrá configurar opcionalmente:

- alias;
- titular;
- entidad o billetera;
- imagen QR;
- visibilidad dentro del resumen digital.

Estos campos contienen instrucciones públicas de pago. Nunca se pedirán ni almacenarán Access Tokens, contraseñas, secretos OAuth o credenciales bancarias.

La configuración será un recurso del tenant, legible por usuarios autenticados y editable sólo por `ADMIN`. La primera superficie de edición estará dentro de Cobros para evitar crear una sección Configuración incompleta.

El QR será una imagen raster provista por el taller. No se intentará construir un QR bancario o de Mercado Pago a partir del alias. SVG queda excluido por seguridad. La implementación reutilizará el flujo de imágenes sólo si puede limitar MIME, tamaño, preview y errores de subida de forma explícita.

Cada cobro podrá guardar además una `referencia` opcional —número de operación o identificación manual— separada de `observaciones`.

No habrá en esta etapa:

- verificación automática de acreditación;
- consulta de saldo de banco o billetera;
- QR dinámico por reparación;
- conciliación con reportes de Mercado Pago;
- comisiones, retenciones o monto neto;
- devoluciones automáticas.

## Resumen digital de la orden

### Propósito

La ruta autenticada existente seguirá mostrando el detalle de la orden, pero dejará de presentarse como recibo. Su propósito será revisar o comunicar información operativa, no acreditar fiscalmente una venta.

### Contenido

- nombre y teléfono del taller como encabezado principal;
- orden, fecha, cliente y equipo;
- descripción del trabajo;
- repuestos y mano de obra;
- total, cobrado y pendiente;
- excedente a revisar, sólo si existe;
- datos públicos para cobrar cuando haya pendiente y el administrador haya habilitado su visibilidad;
- estado “Pagado” o “Pendiente de cobro”;
- pie “Generado con OrdenFix”;
- leyenda: “Documento informativo. No es factura ni comprobante fiscal y no reemplaza los emitidos por ARCA.”

La redacción final de la leyenda deberá validarse con asesoría contable. No se usará “sin valor legal”, porque OrdenFix sólo puede delimitar su propósito fiscal, no determinar todo posible valor probatorio de un documento.

### Interacción

- El CTA “Recibo” cambia a “Resumen digital”.
- Se elimina el botón dedicado “Imprimir”.
- No se agregará todavía un enlace público: la ruta requiere sesión y no debe compartirse como si fuera accesible al cliente.
- PDF, archivo descargable o enlace público expirable necesitarán una decisión separada sobre formato y seguridad.

### Responsive

- En 320 px, encabezado, cliente y equipo pasan a una sola columna.
- Padding móvil de 16–20 px; el padding amplio queda para `sm`.
- Importes mantienen alineación y permiten quiebre de etiquetas sin overflow.
- Nombres, equipos y descripciones largas no fuerzan el ancho del documento.
- El QR, si existe, tendrá tamaño máximo y texto alternativo contextual.

## Seguridad y permisos

- `GET /api/perfil` requiere sesión y sólo devuelve el usuario actual y su taller.
- La edición de datos del taller y de cobro es sólo `ADMIN`.
- `USER` puede consultar los datos necesarios para operar y generar el resumen.
- Los IDs del tenant provienen del principal autenticado; nunca del body o query string.
- Las reglas de sobrepago se validan en backend bajo transacción.
- No se confía en claims decodificados para autorizar acciones críticas.
- Una imagen QR acepta únicamente formatos raster permitidos; el frontend la consume como blob autenticado y crea un object URL efímero, nunca una URL externa persistida.
- Errores de negocio esperados usan código y mensaje accionable; no generan reintentos automáticos ni toasts duplicados.

## Rendimiento y caché

- Perfil y datos de cobro usan queries separadas y deduplicadas.
- El shell inicia el perfil en paralelo con suscripción; no introduce una cascada entre requests independientes.
- El resumen sólo consulta datos de cobro si forman parte de su DTO o si la query puede ejecutarse en paralelo.
- Actualizar configuración invalida únicamente perfil/configuración y resúmenes relacionados.
- Registrar o anular un cobro conserva la matriz existente de invalidaciones para detalle, caja, dashboard y resumen.
- No se incorpora otra copia persistida del perfil en `localStorage`.

## Pruebas

### Backend

- `GET /api/perfil` para ADMIN y USER, aislado por tenant;
- sesión ausente, inválida, revocada o usuario desactivado;
- cobro parcial, exacto y superior al pendiente;
- dos cobros concurrentes no pueden superar el total;
- reducir precio o repuestos por debajo de lo cobrado devuelve conflicto;
- `/cobros`, Reparaciones, Dashboard, Exportación y resumen coinciden en pendiente;
- datos históricos con excedente exponen `saldo=0`, `excedente` y `requiereRevision`;
- sólo ADMIN modifica datos de cobro o anula;
- referencia y configuración permanecen aisladas por taller;
- anulación conserva auditoría y recalcula importes.

### Frontend

- sidebar, navbar y dashboard muestran taller/usuario/rol;
- fallback al email y reintento ante error de perfil;
- identidad visible y truncada correctamente en 320 px;
- navegación y títulos dicen Cobros, pero `/caja` continúa funcionando;
- ayuda diferencia cobros registrados de saldo bancario;
- formulario impide superar el pendiente y traduce `COBRO_SUPERA_SALDO`;
- un refetch que cambia el pendiente no pisa un formulario sucio;
- excedente se muestra como revisión, nunca con signo negativo;
- `USER` consulta pero no edita configuración;
- Resumen digital usa taller como emisor y OrdenFix como marca secundaria;
- leyenda informativa y ausencia del CTA Imprimir;
- layout del resumen en 320 px, 390 px, landscape y desktop;
- TypeScript, ESLint, build, unitarias, integración y E2E quedan verdes.

## Documentación contractual

La guía de integración deberá actualizar:

- contrato de `GET /api/perfil`;
- definición no negativa de `saldo` y nuevo `excedente`;
- errores `COBRO_SUPERA_SALDO` y `TOTAL_MENOR_QUE_COBRADO`;
- configuración pública de datos de cobro;
- `referencia` y anulación auditable;
- denominación “Resumen digital de la orden”;
- alcance explícito de Cobros como registro manual.

## Fuera de alcance

- Procesar pagos de clientes dentro de OrdenFix.
- OAuth o credenciales de Mercado Pago por taller.
- QR dinámico, checkout, webhooks o conciliación automática de ventas.
- Libro contable, saldo inicial, arqueos, cierres, egresos o gastos.
- Facturación electrónica, CAE, punto de venta o integración con ARCA.
- Declaraciones de validez legal o asesoramiento fiscal.
- Corregir automáticamente datos productivos históricos.
- Enlace público permanente al resumen.
- PDF fiscal o numeración fiscal.

## Criterios de aceptación

- OrdenFix, taller y usuario se reconocen como identidades distintas en desktop y móvil.
- El nombre registrado del taller reaparece después de cerrar e iniciar sesión y también para empleados.
- Ninguna API ni pantalla presenta un pendiente negativo.
- Un sobrepago nuevo es rechazado por el backend incluso ante concurrencia.
- Un excedente histórico se hace visible como inconsistencia a revisar.
- Cobros no se confunde con un balance bancario o contable.
- Alias, titular, entidad, QR y referencia se guardan por taller sin procesar fondos.
- El documento se denomina Resumen digital, prioriza la marca del taller y delimita su propósito no fiscal.
- La experiencia permanece usable en 320 px y con teclado/lector de pantalla.
- Los cambios quedan documentados en commits atómicos locales y no se hace push.
