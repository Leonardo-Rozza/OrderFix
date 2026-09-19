# Email — entrega y recorridos reales desde local

Fecha: 2026-09-19. Baselines: frontend `fc8ba0e`, backend `d67bcc8`.
Estado: **dos recorridos locales con entrega real aprobados**. Email C desplegado pendiente.

Se conectaron los recorridos existentes de registro/verificación y recuperación con
dos emails reales a la casilla propia del titular. La cuenta y PostgreSQL fueron
descartables; frontend y API usaron loopback. Los asuntos, HTML y texto fueron los
productivos, con enlaces al laboratorio local. No se modificó la UI.

La preparación no envió mensajes. El titular autorizó los dos correos concretos
con «Si, dale»; no se reutilizó la autorización anterior de un único mensaje.
El transporte limitó destinatario, asuntos e intentos, sin reintentos automáticos.

La aceptación SMTP, recepción en Gmail, aspecto del mensaje y consumo del enlace
se comprobaron por separado. Tokens, credenciales sintéticas y capturas privadas
permanecen fuera de Git.

El diseño y resultados del backend están en
`docs/plans/2026-09-19-email-entrega-recorridos-local-design.md`.
Email C desplegado sigue pendiente por HTTPS, configuración del entorno y prueba
desde otro dispositivo. No se hace push ni se modifican datos o archivos ajenos.

## Resultado observado

El 2026-09-19 se enviaron **exactamente dos correos**, confirmación y recuperación,
desde OrdenFix <notificaciones@cuenta.orden-fix.com.ar> a la casilla propia autorizada.
Ambos llegaron a **Recibidos**, con SPF y DKIM del dominio aprobados y alternativas
HTML/texto. No hubo reintentos ni fallos inciertos.

Las cuatro etapas aprobaron mediante UI, HTTP y PostgreSQL reales:

1. Alta 201 y perfil con email pendiente, 15:41:15 -03.
2. Enlace del correo recibido, verificación 200 y acceso al inicio, 15:42:32 -03.
3. Solicitud de recuperación 200 y respuesta genérica, 15:43:21 -03.
4. Enlace del segundo mensaje, reset 200, login 200 y perfil verificado, 15:44:31 -03.

Se usaron los enlaces del contenido recibido en Gmail, sin recurrir al buzón local
de respaldo. Las cuatro etapas tienen capturas de app en 1280/320 px sin desbordamiento.
La revisión de las dos plantillas se hizo en **Gmail web en Chrome**: tarjeta, marca,
botones y contenido legibles; la recuperación se revisó hasta el pie. Gmail mostró
una sugerencia automática de traducción pese al texto en español, sin activar esa
traducción. No se acredita Gmail móvil, Outlook, modos oscuros ni resultado DMARC.

El laboratorio quedó detenido y la base descartable eliminada. Los enlaces están
consumidos y no ofrecen acceso permanente. SMTP_ATTEMPTS=2, SMTP_ACCEPTED=2,
SMTP_UNCERTAIN=0. Configuración real, V27–V34 y los 179 archivos ajenos no versionados
se preservan. No cambió código de la app, no se repitió el gate integral y no hubo push.

Artefactos privados: `/private/tmp/ordenfix-email-live-20260919`, con resultados de
etapas, recibos y capturas fuera de Git. Acta backend con IDs de recepción y límites.
