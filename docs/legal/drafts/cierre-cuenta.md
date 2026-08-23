# Política de Cierre del Taller y Eliminación de su Cuenta OrdenFix

> **BORRADOR — NO PUBLICAR Y NO HABILITAR EL CIERRE PRODUCTIVO CON ESTE TEXTO**
>
> Los plazos de conservación, las obligaciones fiscales, la eliminación de proveedores y el procedimiento de recuperación deben ser confirmados por asesoría jurídica, contable y técnica. Este documento no constituye asesoramiento jurídico.

- **Versión contractual:** no asignada
- **Vigencia:** no definida
- **Prestador:** [RAZÓN SOCIAL]
- **CUIT:** [CUIT]
- **Domicilio:** [DOMICILIO]
- **Contacto legal:** [EMAIL LEGAL]
- **Contacto de privacidad:** [EMAIL PRIVACIDAD]

## 1. Qué significa cerrar el Taller

Cerrar el Taller y eliminar su cuenta OrdenFix afecta a toda la organización creada en la Plataforma. No es únicamente cerrar la sesión del Administrador.

El cierre comprende:

- cuenta del Taller;
- acceso del Administrador;
- accesos y sesiones de Empleados;
- datos operativos;
- enlaces públicos de seguimiento y resumen;
- renovación de PRO;
- bloqueo de nuevas exportaciones, sin impedir una descarga ya generada y todavía autorizada;
- continuidad de reclamos, arrepentimientos o reembolsos ya iniciados mediante su referencia;
- eliminación o anonimización posterior.

No debe confundirse con cancelar la renovación de PRO ni con desactivar a un Empleado.

## 2. Quién puede solicitarlo

Sólo el Administrador puede pedir el cierre completo del Taller.

Antes de aceptar la solicitud, OrdenFix debe:

- comprobar que el email del Administrador está verificado;
- pedir una nueva autenticación con finalidad de cierre;
- mostrar el nombre del Taller afectado;
- pedir una frase o confirmación escrita;
- explicar consecuencias y fechas;
- evitar dobles solicitudes mediante idempotencia.

Si una Persona Usuaria no puede completar la verificación, debe existir un canal de soporte razonable que no convierta el cierre en un trámite imposible.

## 3. Baja individual de un Empleado

Un Empleado que desea dejar de usar OrdenFix no debe cerrar todo el Taller.

Puede pedir al Administrador que desactive su acceso o escribir a [EMAIL PRIVACIDAD] si necesita ejercer un derecho sobre sus propios datos de cuenta.

La versión final debe explicar qué datos personales del Empleado se eliminan, cuáles quedan asociados a acciones históricas del Taller y durante cuánto tiempo.

## 4. Antes de cerrar: exportación

OrdenFix ofrece al Administrador la posibilidad de solicitar una exportación antes del cierre. Exportar es recomendable, pero no obligatorio.

La versión publicada y la interfaz deben describir exactamente formatos, categorías, fotos incluidas o excluidas y vencimiento. Este borrador propone como alcance a confirmar:

- clientes;
- equipos;
- reparaciones;
- repuestos e inventario;
- presupuestos;
- cobros registrados manualmente;
- empleados y estados;
- otra información operativa documentada.

La exportación excluye:

- contraseñas y hashes;
- tokens y sesiones;
- PIN y patrón;
- secretos de proveedores;
- información interna de seguridad cuya entrega genere riesgo.

Las fotos pueden requerir un mecanismo separado. Este alcance no puede publicarse mientras siga indeterminado: debe explicar si están incluidas, cómo se entregan y durante cuánto tiempo queda disponible la descarga.

Un error de exportación no inicia automáticamente el cierre. El Administrador decide si reintenta o continúa sin descargarla.

## 5. Confirmación

Antes de enviar la solicitud, OrdenFix debe mostrar de forma clara:

- nombre del Taller;
- cantidad o resumen de datos afectados cuando esté disponible;
- Empleados que perderán acceso;
- estado de PRO y renovación;
- fecha hasta la que se puede restaurar;
- fecha prevista máxima de eliminación o anonimización;
- información que podría conservarse y por qué;
- canal de ayuda.

El botón final debe nombrar la acción completa, por ejemplo **Solicitar cierre del Taller**, y utilizar un estilo destructivo sólo en el último paso.

## 6. Número de gestión

Una solicitud registrada recibe un número de gestión persistente.

La constancia incluye:

- número;
- Taller;
- fecha de solicitud;
- estado;
- fecha límite de recuperación;
- fecha prevista máxima del proceso;
- canal de contacto.

El número debe quedar visible después de recargar y enviarse al email verificado. Si el email falla, la referencia visible sigue siendo válida.

## 7. Efectos inmediatos

Cuando se registra el cierre:

- se bloquean inmediatamente nuevos checkouts iniciados desde OrdenFix;
- se persiste la solicitud de detener la renovación y se coordina con la plataforma de pagos;
- se revocan las sesiones de Empleados;
- el Taller queda restringido;
- se invalidan seguimientos, resúmenes y otras URLs públicas;
- se purgan de la interfaz las copias en memoria de datos privados;
- comienza la ventana de recuperación.

Si existe un proceso de contratación o cobro en curso, el servidor debe impedir que una confirmación tardía reactive PRO o genere una renovación incompatible con el cierre. La interfaz muestra el estado real y ofrece soporte.

Mientras la cancelación esté `SOLICITADA` o `PENDIENTE_PROVEEDOR`, OrdenFix no asegura que el proveedor haya detenido cobros. Sólo `PROGRAMADA` permite esa promesa; `FALLIDA` mantiene la cuenta restringida, la referencia visible y un camino de soporte o reintento.

## 8. Ventana de recuperación de 7 días

Durante los 7 días posteriores al momento informado por el servidor, el Administrador puede restaurar el Taller.

La cuenta restringida sólo debe permitir:

- consultar estado, fechas y número de gestión;
- descargar una exportación ya disponible con la autorización correspondiente;
- restaurar el Taller;
- leer documentos legales;
- contactar soporte;
- cerrar sesión.

No debe permitir crear ni editar datos operativos mientras el cierre esté programado. La única exposición permitida es la descarga reautenticada de una exportación ya lista y todavía vigente.

Los siete días son un compromiso operativo propuesto por OrdenFix, no un plazo legal universal. La versión final debe definir si se computan como corridos o hábiles y el instante exacto de inicio; no puede publicarse hasta que backend y jobs lo apliquen de forma consistente.

## 9. Restaurar el Taller

Para restaurar, el Administrador debe volver a autenticarse con la finalidad específica de restauración.

Si la restauración se confirma dentro de la ventana:

- se recupera el acceso operativo;
- se registra la revocación de la solicitud;
- se conservan el número y la constancia histórica;
- los Empleados pueden requerir nuevas sesiones;
- los enlaces públicos sólo vuelven a estar disponibles cuando el servidor lo determine de forma segura.

Restaurar el Taller **no reactiva automáticamente PRO ni su renovación**. Si la suscripción fue cancelada, volver a contratar requiere una nueva oferta y confirmación.

## 10. Después de la ventana de recuperación

Una vez vencidos los 7 días:

- ya no se ofrece restauración desde la interfaz;
- comienza la eliminación o anonimización;
- el proceso debe completarse dentro de 30 días desde el fin de la ventana de recuperación;
- la cuenta permanece inaccesible;
- las superficies públicas continúan invalidadas.

El plazo de hasta treinta días es otro compromiso operativo propuesto, contado desde el fin de la gracia según el diseño. Su cómputo exacto, los jobs, proveedores, backups y excepciones justificadas deben confirmarse profesional y técnicamente antes de publicar.

OrdenFix no debe prometer que cada copia desaparece de forma instantánea. Debe explicar el tratamiento del sistema activo, los archivos, los proveedores y las copias de seguridad.

## 11. Qué se elimina o anonimiza

Según el alcance técnico y las retenciones aplicables, el proceso comprende:

- perfiles y accesos;
- clientes y contactos;
- equipos y reparaciones;
- fotos y archivos;
- presupuestos, repuestos e inventario;
- cobros operativos del Taller;
- enlaces y códigos públicos;
- configuraciones;
- contenido de soporte que ya no tenga finalidad.

Cuando una relación histórica deba conservarse sin identificar a una persona, OrdenFix puede anonimizarla de forma que no resulte razonablemente reversible.

## 12. Información que puede conservarse

OrdenFix puede conservar únicamente información con fundamento y plazo documentados, por ejemplo:

- registros fiscales del cobro de PRO;
- constancias de pagos, devoluciones y contracargos;
- aceptaciones y versiones contractuales;
- evidencia mínima de seguridad y prevención de fraude;
- reclamos, litigios o requerimientos de autoridad;
- constancia del cierre y de su ejecución.

La versión publicada debe definir el plazo de cada categoría. No alcanza con decir “por obligaciones legales” de manera indeterminada.

La información retenida queda bloqueada para usos incompatibles y no puede utilizarse para marketing.

## 13. PIN, patrón y fotos

El PIN y el patrón no deben sobrevivir hasta el cierre si el equipo ya fue entregado; deben eliminarse según la regla operativa de entrega.

Las fotos siguen una política distinta. Al cerrar, OrdenFix debe solicitar su borrado del almacenamiento real y registrar el resultado. Quitar una URL de la interfaz no equivale a borrar el archivo remoto.

Los archivos huérfanos, cargas incompletas y copias temporales deben incluirse en el proceso técnico de eliminación.

## 14. Copias de respaldo

Las copias de seguridad se mantienen para continuidad y recuperación, no para reactivar una cuenta cerrada fuera de plazo.

La versión final debe informar:

- ciclo de rotación;
- acceso restringido;
- momento previsto de desaparición;
- procedimiento para impedir que una restauración técnica vuelva a poner en producción datos eliminados.

Este borrador no fija un plazo para las copias de seguridad porque todavía no fue confirmado.

## 15. Solicitudes, reclamos y reembolsos en curso

Cerrar el Taller no elimina una solicitud de arrepentimiento, revisión o reembolso ya iniciada.

OrdenFix conserva el número de gestión y un canal para continuarla. Sólo mantiene los datos necesarios para resolver y documentar ese caso.

La persona no debe necesitar reactivar la renovación para obtener respuesta.

## 16. Fallas del proceso

Si una tarea de eliminación falla, OrdenFix debe:

- mantener la cuenta restringida;
- evitar exposición pública;
- registrar el fallo;
- reintentar de forma segura;
- alertar a la operación responsable;
- informar una nueva fecha cuando el retraso sea relevante;
- conservar una vía de contacto.

Un estado técnico fallido no debe presentarse como cierre completado.

## 17. Derechos sobre datos personales

El cierre completo no reemplaza los derechos de información, acceso, actualización, rectificación o supresión.

Una Persona Usuaria o un Cliente del Taller puede escribir a [EMAIL PRIVACIDAD]. OrdenFix verificará la identidad de manera razonable y coordinará con el Taller cuando corresponda.

La supresión puede estar limitada respecto de datos con retención válida, pero la respuesta debe explicar el motivo y el plazo.

## 18. Contacto

- Prestador: [RAZÓN SOCIAL]
- CUIT: [CUIT]
- Domicilio: [DOMICILIO]
- Privacidad: [EMAIL PRIVACIDAD]
- Legal: [EMAIL LEGAL]
- Atención: [HORARIO DE ATENCIÓN]

## Revisión profesional obligatoria

**Este borrador no puede publicarse ni usarse en producción hasta validar el cómputo de 7 y 30 días, las retenciones, las copias de seguridad, el tratamiento fiscal, la cancelación de pagos en curso, los derechos de usuarios y clientes, y obtener aprobación jurídica y contable.**

## Fuentes oficiales para la revisión

- [Ley 25.326 de Protección de los Datos Personales — texto actualizado](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion)
- [AAIP — Derechos sobre datos personales](https://www.argentina.gob.ar/aaip/datospersonales/derechos)
- [Resolución AAIP 47/2018 — seguridad y destrucción](https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-47-2018-312662/texto)
- [Disposición 954/2025 — baja de servicios](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-954-2025-417152/texto)
- [Disposición 3/2026 — verificación razonable de identidad](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-3-2026-423007/texto)
