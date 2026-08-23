# Condiciones del plan PRO de OrdenFix

> **BORRADOR — NO PUBLICAR, NO COBRAR Y NO INICIAR PROCESOS DE CONTRATACIÓN O PAGO CON ESTE TEXTO**
>
> El precio, la moneda, la frecuencia, los impuestos y la facturación deben provenir de la oferta contractual real y ser revisados por asesoría jurídica y contable. Este documento no constituye asesoramiento ni una oferta vigente.

- **Versión contractual:** no asignada
- **Vigencia:** no definida
- **Prestador:** [RAZÓN SOCIAL]
- **CUIT:** [CUIT]
- **Domicilio:** [DOMICILIO]
- **Contacto legal:** [EMAIL LEGAL]

## 1. Qué es PRO

PRO es una modalidad paga de OrdenFix que puede ampliar límites y habilitar funciones para el Taller.

Las prestaciones exactas se muestran en la oferta vigente antes de contratar. Pueden incluir, según la configuración disponible:

- reparaciones sin el límite mensual de FREE;
- inventario y control de stock;
- cobros registrados manualmente y datos para cobrar;
- resúmenes digitales;
- varios Empleados;
- otras capacidades expresamente informadas.

OrdenFix no debe prometer una función que no aparezca habilitada en la oferta y en el estado de suscripción informado por el servidor.

## 2. Quién puede contratar

Sólo el Administrador del Taller puede contratar PRO, aceptar sus condiciones, cancelar la renovación o iniciar arrepentimientos, revisiones y reembolsos administrativos sobre la suscripción. Esta reserva no impide que un Empleado registre dentro de una reparación un cobro operativo realizado por el Taller.

Los Empleados pueden ver el estado del plan cuando sea necesario para operar, pero no pueden asumir una obligación de pago ni modificarla.

El Administrador debe tener el email verificado antes de iniciar el proceso de contratación y pago.

## 3. La oferta contractual

Antes de redirigir a una plataforma de pagos, OrdenFix mostrará una oferta que debe incluir:

- identidad del Taller;
- nombre del plan;
- prestaciones;
- importe;
- moneda;
- frecuencia de cobro;
- fecha o condición de inicio;
- prueba o bonificación, si existiera;
- renovación automática;
- fecha estimada del próximo cobro;
- vigencia de la oferta;
- efecto de cancelar;
- documentos aplicables.

El importe no se decide en el navegador ni se toma de una captura, comentario o texto histórico. La oferta válida es la informada por el servidor y confirmada antes del proceso de contratación y pago.

Si falta el importe, la moneda, la frecuencia o una condición obligatoria, OrdenFix no debe permitir la contratación.

## 4. Precio, impuestos y facturación

Este borrador no fija un precio. El precio y la moneda aparecen en la oferta vigente.

La versión final debe indicar:

- si el importe incluye los impuestos aplicables;
- cómo se comunica cualquier cargo adicional;
- quién emite el comprobante fiscal por PRO;
- qué datos fiscales debe proporcionar el Taller;
- qué ocurre ante cambios en la condición fiscal.

La plataforma de pagos procesa el medio de pago. [RAZÓN SOCIAL] presta OrdenFix y debe cumplir sus propias obligaciones de facturación.

## 5. Renovación automática

Salvo que la oferta indique expresamente otra modalidad, PRO se renueva con la frecuencia informada hasta que el Administrador cancele la renovación o la suscripción termine por otra causa válida.

Antes de contratar, OrdenFix debe mostrar de forma destacada:

- que existe renovación automática;
- cuánto se cobrará y en qué moneda;
- con qué frecuencia;
- cuándo se espera el próximo cobro;
- cómo cancelar la renovación.

La renovación no puede ocultarse en un enlace secundario ni aparecer preaceptada.

## 6. Prueba o período promocional

OrdenFix puede ofrecer una prueba o promoción. Su duración, alcance, precio posterior y necesidad de medio de pago deben aparecer en la oferta.

Este borrador no fija una duración. Una comunicación histórica sobre una prueba no modifica la oferta vigente.

Si durante la prueba se habilitan funciones de PRO, la interfaz debe distinguir entre las capacidades temporales y el plan nominal de la cuenta.

## 7. Inicio y confirmación del pago

El proceso de contratación y pago se inicia sólo después de que el Administrador confirma la oferta y las condiciones aplicables.

La redirección o la URL de regreso no prueban que el pago fue aprobado. OrdenFix espera la confirmación del servidor y de la plataforma de pagos.

La interfaz puede mostrar estos estados:

- proceso de contratación y pago listo;
- redirigiendo;
- pendiente de confirmación;
- aprobado;
- cancelado por el usuario;
- rechazado;
- expirado;
- no confirmado por una falla.

PRO se habilita únicamente cuando el estado interno confirmado lo permite.

## 8. Acceso y período actual

Cuando PRO está activo, el Taller conserva las funciones contratadas hasta la fecha de acceso informada, salvo una restricción válida por seguridad, fraude, incumplimiento grave o una orden aplicable.

La fecha del período actual y la próxima renovación deben provenir del servidor. OrdenFix no debe calcularlas únicamente en el navegador.

## 9. Cancelar renovación

La acción correcta es **Cancelar renovación**. No debe presentarse como “Cancelar PRO” si el Taller conserva las funciones hasta terminar el período ya pagado.

Antes de confirmar, OrdenFix debe informar una fecha concreta y explicar:

- que se solicitará detener cobros futuros;
- que PRO continuará hasta la fecha indicada;
- que después el Taller pasará a FREE;
- que cancelar no solicita por sí mismo la devolución de un pago anterior;
- que no existe devolución proporcional automática, salvo error, arrepentimiento aplicable o exigencia legal.

La interfaz sólo puede afirmar que no habrá nuevos cobros cuando la cancelación figure como `PROGRAMADA`, después de una confirmación durable del proveedor. `SOLICITADA` y `PENDIENTE_PROVEEDOR` siguen en proceso; `EJECUTADA` indica que llegó la fecha efectiva; `FALLIDA` y `REVOCADA` no permiten esa promesa.

Si la solicitud todavía está pendiente, debe mostrar ese estado sin prometer el resultado final.

## 10. Revocar una cancelación

OrdenFix puede ofrecer “Mantener PRO” cuando el servidor confirme que la renovación puede reanudarse sin una contratación nueva.

Si la plataforma de pagos exige un nuevo proceso de contratación y pago, OrdenFix debe explicarlo y pedir una nueva confirmación. Restaurar una cuenta cerrada no reactiva automáticamente la renovación.

## 11. Paso a FREE

Cuando termina el acceso PRO, el Taller pasa a las condiciones FREE vigentes.

La interfaz debe informar:

- límites aplicables;
- funciones que dejarán de estar disponibles;
- tratamiento de datos creados durante PRO;
- forma de volver a contratar.

El paso a FREE no significa eliminación inmediata de clientes, equipos o reparaciones. Cualquier retención, acceso restringido o eliminación debe seguir los Términos, la Política de Privacidad y la Política de Cierre de Cuenta.

## 12. Cobro rechazado, pendiente o vencido

Si un cobro queda pendiente o es rechazado, OrdenFix puede mantener el plan anterior, restringir temporalmente nuevas funciones o marcar PRO como vencido, según el estado confirmado.

La interfaz debe indicar qué ocurrió, qué funciones siguen disponibles y qué acción puede realizar el Administrador.

OrdenFix no debe realizar reintentos ocultos que contradigan la oferta. La política final de reintentos de cobro debe describirse antes de publicar.

## 13. Cambios de precio o condiciones

Un cambio de precio, moneda, frecuencia o prestación se comunica antes de aplicarse a una renovación futura, con la anticipación y el mecanismo que correspondan.

La comunicación debe explicar:

- condición anterior;
- condición nueva;
- fecha prevista;
- opciones del Taller;
- forma de cancelar la renovación.

La versión final debe definir cuándo el cambio requiere una nueva aceptación.

## 14. Arrepentimiento, revisión y reembolso

Cancelar renovación evita cobros futuros cuando alcanza `PROGRAMADA`. No equivale a ejercer arrepentimiento ni a pedir revisión de un cobro ya realizado.

El Administrador puede iniciar una revisión de cobro desde su cuenta. Cuando el régimen aplicable lo exija, OrdenFix también debe mantener accesos públicos separados para **BOTÓN DE ARREPENTIMIENTO** y **BOTÓN DE BAJA DE SERVICIO**, además del canal de revisión. Cada solicitud genera una gestión desde el primer envío y puede requerir una verificación de identidad razonable.

La procedencia del arrepentimiento y de un reembolso depende del caso, del uso realizado, de la relación contractual y de la normativa aplicable. OrdenFix no debe prometer aprobación automática.

Los detalles se encuentran en la Política de Cancelaciones y Reembolsos.

## 15. Cierre del Taller

Cerrar el Taller y eliminar su cuenta OrdenFix es un flujo distinto. El cierre debe impedir nuevos cobros, restringir accesos y seguir la ventana de recuperación y eliminación informada.

Cancelar renovación no cierra el Taller. Cerrar el Taller no debe reactivar ni renovar PRO al restaurar el acceso.

## 16. Plataforma de pagos

La versión publicada debe identificar la plataforma de pagos real y enlazar su información aplicable.

El diseño previsto evita almacenar datos completos de tarjeta y credenciales privadas del proveedor. Esa afirmación sólo puede pasar a la versión publicada después de auditar checkout, backend, logs, telemetría y soporte. OrdenFix sí puede conservar identificadores internos, estados y evidencia necesaria para soporte, conciliación, seguridad y reclamos, con retención documentada.

Una indisponibilidad del proveedor puede demorar la contratación, la confirmación, la cancelación o el reembolso. OrdenFix debe mostrar el estado real y mantener una vía de soporte.

## 17. Contacto

- Prestador: [RAZÓN SOCIAL]
- CUIT: [CUIT]
- Domicilio: [DOMICILIO]
- Legal: [EMAIL LEGAL]
- Privacidad: [EMAIL PRIVACIDAD]
- Atención: [HORARIO DE ATENCIÓN]

## Revisión profesional obligatoria

**Este borrador no puede publicarse ni utilizarse para cobrar hasta definir la identidad fiscal, incorporar la plataforma de pagos real, validar precio, impuestos, facturación, renovación, arrepentimiento y obtener aprobación jurídica y contable.**

## Fuentes oficiales para la revisión

La aplicabilidad al modelo concreto debe ser confirmada profesionalmente:

- [Ley 24.240 de Defensa del Consumidor](https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion)
- [Código Civil y Comercial de la Nación](https://www.argentina.gob.ar/normativa/nacional/ley-26994-235975/actualizacion)
- [Disposición 954/2025 — arrepentimiento y baja](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-954-2025-417152/texto)
- [Disposición 3/2026 — verificación razonable de identidad](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-3-2026-423007/texto)
