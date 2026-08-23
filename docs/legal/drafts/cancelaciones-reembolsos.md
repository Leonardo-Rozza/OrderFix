# Política de Cancelaciones, Arrepentimiento y Reembolsos de OrdenFix

> **BORRADOR — NO PUBLICAR, NO COBRAR Y NO PRESENTAR COMO POLÍTICA VIGENTE**
>
> La aplicación de normas de consumo al modelo y a cada Taller debe ser validada por asesoría jurídica. Los circuitos de pago, plazos y constancias también requieren revisión contable y técnica. Este texto no constituye asesoramiento jurídico.

- **Versión contractual:** no asignada
- **Vigencia:** no definida
- **Prestador:** [RAZÓN SOCIAL]
- **CUIT:** [CUIT]
- **Domicilio:** [DOMICILIO]
- **Contacto legal:** [EMAIL LEGAL]
- **Atención:** [HORARIO DE ATENCIÓN]

## 1. Cuatro acciones distintas

OrdenFix distingue:

1. **Cancelar renovación:** detiene cobros futuros de PRO cuando alcanza `PROGRAMADA` y mantiene el acceso hasta el fin del período ya pagado.
2. **Solicitar arrepentimiento:** pide revocar una contratación cuando corresponda según la normativa o la política contractual aplicable.
3. **Solicitar revisión de un cobro:** informa un cobro duplicado, erróneo, no reconocido u otro problema y pide que se evalúe.
4. **Cerrar el Taller:** restringe toda la cuenta, empleados y datos, con una ventana de recuperación y posterior eliminación o anonimización.

Una acción no ejecuta automáticamente las otras.

## 2. Cancelar renovación de PRO

Sólo el Administrador puede cancelar la renovación desde la cuenta del Taller.

Antes de confirmar, OrdenFix muestra:

- plan actual;
- estado de renovación;
- fecha hasta la que continúa PRO;
- efecto de pasar a FREE;
- estado esperado de la solicitud;
- aclaración sobre pagos anteriores.

Cuando la cancelación alcanza el estado `PROGRAMADA`:

- no se programan nuevos cobros posteriores al período informado;
- el Taller conserva PRO hasta la fecha indicada;
- después pasa a FREE;
- no se eliminan automáticamente los datos del Taller.

En `SOLICITADA` o `PENDIENTE_PROVEEDOR`, OrdenFix debe decir que sigue en proceso y no asegurar todavía que no habrá nuevos cobros. `EJECUTADA` identifica que llegó la fecha efectiva; `FALLIDA` requiere soporte o reintento y `REVOCADA` conserva la renovación.

## 3. Sin devolución proporcional automática

Cancelar la renovación no genera una devolución proporcional automática por el tiempo restante.

El Taller conserva PRO hasta finalizar el período ya pagado. Puede corresponder una devolución por:

- cobro erróneo;
- cobro duplicado;
- arrepentimiento aplicable;
- otra exigencia legal;
- decisión favorable luego de revisar un caso concreto.

Este criterio no limita derechos que no puedan excluirse.

## 4. Arrepentimiento

OrdenFix ofrecerá accesos públicos diferenciados para arrepentimiento, baja del servicio y revisión de un cobro. El flujo aplicable no debe exigir que la persona ya tenga una sesión iniciada.

La procedencia del arrepentimiento depende de la relación concreta, de si el servicio se adquiere como destinatario final o se integra a reventa, producción o prestación a terceros, del uso realizado, del momento de la solicitud y de la normativa aplicable. La revisión jurídica debe determinar cada supuesto sin asumir que toda persona jurídica queda incluida o excluida. La versión final debe definir si OrdenFix además concede un derecho contractual uniforme más amplio.

La solicitud puede requerir pasos razonables y habituales para verificar identidad y proteger la cuenta. Esa verificación debe tener como única finalidad corroborar los datos y evitar fraude; no puede convertirse en una barrera innecesaria.

Si el régimen de consumo resulta aplicable, la versión final debe usar las denominaciones, ubicación y constancia exigidas por la normativa vigente. Al 2026-08-23, la Disposición 954/2025 prevé links destacados denominados **BOTÓN DE ARREPENTIMIENTO** y **BOTÓN DE BAJA DE SERVICIO**, y la entrega del código de identificación dentro de las 24 horas por el mismo medio. La revisión jurídica debe confirmar cómo se aplica esa regla al modelo B2B de OrdenFix antes de publicar.

## 5. Revisión de un cobro

El Administrador puede solicitar revisión cuando considere que existe:

- un cobro duplicado;
- un importe distinto del confirmado;
- un cobro no reconocido;
- un pago aprobado pero PRO no habilitado;
- una baja confirmada seguida de un nuevo cobro incompatible;
- una falla relevante del servicio;
- otro motivo que pueda describir.

OrdenFix puede pedir información razonable sobre el pago sin solicitar contraseñas, códigos de seguridad ni datos completos de tarjeta.

## 6. Cómo iniciar una solicitud

### 6.1. Desde una cuenta

El Administrador puede:

1. abrir Cuenta;
2. ingresar a Gestiones de cobro;
3. seleccionar el pago interno disponible;
4. elegir el motivo;
5. confirmar un email;
6. enviar la solicitud.

La interfaz no muestra identificadores privados de la plataforma de pagos.

### 6.2. Desde el acceso público

La persona proporciona únicamente los datos mínimos para localizar y verificar la contratación.

El primer envío registra una gestión `PENDIENTE_VERIFICACION` con fecha del servidor y una referencia opaca que no revela si una cuenta existe. La respuesta inicial es genérica y, si corresponde, se envía un enlace de un solo uso al email relacionado con la cuenta.

La verificación no reinicia el reloj de la solicitud. Después de verificar, la gestión avanza sin crear otra referencia. Si resulta aplicable la Disposición 954/2025, la implementación y el texto final deben entregar el código de identificación por el mismo medio dentro de las 24 horas desde el primer envío, sin habilitar enumeración de cuentas.

## 7. Número de gestión

Cada solicitud efectivamente registrada recibe un número de gestión persistente.

La constancia debe incluir:

- número;
- tipo de solicitud;
- fecha del servidor;
- estado inicial;
- canal de seguimiento;
- email de contacto.

El número de gestión no debe incluir datos personales, IDs privados del proveedor ni información que permita acceder a otra cuenta.

Si el envío del email falla, la gestión no desaparece. La referencia visible en la cuenta o en el flujo verificado sigue siendo la fuente principal.

## 8. Estados posibles

Una gestión puede mostrarse como:

- pendiente de verificación;
- recibida;
- en revisión;
- aprobada;
- rechazada;
- reembolso en proceso;
- reembolsada;
- cerrada.

Una gestión rechazada no avanza a reembolso. Sólo una aprobada puede pasar a reembolso en proceso.

Cada cambio debe conservar fecha y explicación suficiente. La información interna de prevención de fraude puede mantenerse reservada cuando divulgarla genere un riesgo.

## 9. Evaluación

OrdenFix revisará:

- oferta y versión aceptadas;
- estado confirmado por el servidor;
- historial del pago y de la renovación;
- uso del servicio cuando resulte relevante;
- solicitudes anteriores;
- información aportada;
- obligaciones aplicables.

La interfaz no decide automáticamente la elegibilidad ni promete aprobación.

El Taller puede aportar información adicional mediante el canal indicado, sin enviar secretos o datos completos del medio de pago.

## 10. Resultado y reembolso

Si la solicitud se aprueba, OrdenFix informa:

- importe aprobado;
- moneda;
- medio por el que se gestionará la devolución;
- estado;
- referencia;
- plazo estimado que el proveedor pueda confirmar.

Los tiempos de acreditación pueden depender de la plataforma de pagos y de la entidad del medio utilizado. Este borrador no fija un plazo que todavía no fue validado.

Si la solicitud se rechaza, OrdenFix comunica el motivo de forma comprensible y el canal disponible para revisar o reclamar la decisión.

## 11. Cobro no reconocido y seguridad

Ante un cobro no reconocido, OrdenFix puede:

- restringir temporalmente acciones de pago;
- revocar sesiones sospechosas;
- pedir una nueva autenticación;
- revisar accesos y eventos;
- coordinar con la plataforma de pagos.

La persona también puede comunicarse con la entidad de su medio de pago. Iniciar una revisión en OrdenFix no limita derechos que pueda ejercer por otros canales.

## 12. Cancelación pendiente o fallida

Una solicitud para cancelar la renovación puede pasar por estados intermedios mientras se coordina con la plataforma de pagos.

Sólo `PROGRAMADA` permite afirmar que no habrá nuevos cobros posteriores al período indicado. `EJECUTADA` se utiliza al llegar la fecha efectiva y pasar a la condición comercial correspondiente.

Si la coordinación falla, OrdenFix debe:

- mantener visible el estado real;
- evitar mostrar una confirmación falsa;
- permitir reintento seguro;
- conservar una referencia;
- ofrecer soporte.

## 13. Revocar una cancelación

El Administrador puede mantener PRO si la interfaz ofrece esa opción y el servidor confirma que la renovación todavía puede reanudarse.

Si hace falta una contratación nueva, OrdenFix debe presentar una nueva oferta y obtener una nueva confirmación. No puede reactivar cobros de forma silenciosa.

## 14. Relación con el cierre del Taller

Cancelar renovación no cierra el Taller.

Cerrar el Taller debe impedir nuevos cobros, revocar accesos y seguir la Política de Cierre de Cuenta. Restaurar el Taller no reactiva automáticamente la renovación.

Una gestión de reembolso puede continuar aunque el Taller esté en cierre. La persona debe conservar su número y canal de contacto.

## 15. Accesibilidad del trámite

Las acciones públicas y autenticadas deben:

- tener nombres claros y visibles;
- funcionar desde un teléfono;
- no exigir descargar un archivo para comprenderlas;
- permitir guardar una constancia;
- informar errores y reintentos;
- no depender únicamente del color;
- ofrecer una alternativa de contacto.

La ubicación y denominación exactas de los botones públicos deben validarse antes del lanzamiento.

## 16. Atención

- Prestador: [RAZÓN SOCIAL]
- CUIT: [CUIT]
- Domicilio: [DOMICILIO]
- Contacto legal: [EMAIL LEGAL]
- Privacidad: [EMAIL PRIVACIDAD]
- Horario: [HORARIO DE ATENCIÓN]

La versión publicada debe identificar el área responsable y los canales efectivos de consultas y reclamos.

## Revisión profesional obligatoria

**Este borrador no puede publicarse ni utilizarse para cobrar hasta validar la aplicabilidad del régimen de consumo, la ubicación y el texto de los botones, los plazos de constancia, la política de servicio utilizado, el circuito contable y la integración real de pagos con asesoría jurídica y contable.**

## Fuentes oficiales para la revisión

- [Ley 24.240 de Defensa del Consumidor](https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion)
- [Código Civil y Comercial de la Nación](https://www.argentina.gob.ar/normativa/nacional/ley-26994-235975/actualizacion)
- [Disposición 954/2025 — botón de arrepentimiento y baja](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-954-2025-417152/texto)
- [Disposición 3/2026 — verificación razonable de identidad](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-3-2026-423007/texto)
