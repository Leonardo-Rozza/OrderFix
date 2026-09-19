# Correos de cuenta — alta, verificación y recuperación

Fecha: 2026-09-19. Baselines: frontend `64e35d5`, backend `8f4c733`.
Estado: cerrado localmente, con pruebas y revisión visual aprobadas.

## Qué existía y qué se completa

Alta de titular y empleado, verificación/reenvío y recuperación de contraseña ya
están implementados. Los correos eran párrafos HTML con un enlace, sin presentación
común. Este corte mejora ese formato, reutilizando los flujos existentes.

El alta envía el correo de confirmación de email: sirve tanto para quien crea un
taller como para el empleado creado por su titular. No se suma otro envío de
bienvenida. El empleado ya tiene una contraseña definida por el titular; su correo
no la incluye ni promete una invitación para crearla.

| Correo | Acción | Vigencia actual |
| --- | --- | --- |
| Alta, verificación y reenvío | Confirmar mi email | 48 horas |
| Recuperación | Crear nueva contraseña | 1 hora |

El backend usa el plazo configurado al emitir el token y mantiene el envío después
del commit. La recuperación conserva la respuesta genérica y los tokens de un solo
uso; no se modifican permisos ni revocación de sesiones.

## Formato implementado

Wordmark OrdenFix, tarjeta blanca, fondo claro, turquesa y tipografía de sistema.
Cada correo tiene saludo, explicación, un botón principal, vencimiento destacado,
aviso ante una solicitud no reconocida y el enlace completo para copiar. No depende
de imágenes o fuentes remotas. El remitente configurado se conserva.

Un mismo mensaje incluye HTML y texto equivalente en UTF-8. Nombre y URL se escapan
para HTML; ningún contenido ni token se agrega a logs. La implementación está en
backend `AccountEmailTemplate`, integrada a los dos emisores existentes y SMTP.

La revisión de las pantallas frontend no confirmó un defecto que requiriera cambios.
Las rutas de recuperación y verificación y la UI actual permanecen como están.

## Validación y límites

- 77 pruebas focales Java aprobadas: plantilla, escape, MIME serializado/releído,
  errores sanitizados, commit/rollback y flujos HTTP de recuperación/verificación.
- Ocho renders del HTML real: dos plantillas, nombres normales/extremos y anchos
  320/640 px. Sin desbordamiento horizontal ni recursos remotos; ambos enlaces de
  cada correo coinciden. Revisión visual aprobada en escritorio y móvil.
- Regresión PostgreSQL de alta y emisión posterior al commit: 31 casos aprobados
  (14 de alta legacy y 17 de verificación en la revalidación final). La evidencia
  desglosada está en backend `docs/plans/2026-09-19-emails-cuenta-formato-design.md`.

La primera tanda focal corrigió una expectativa que buscaba acentos literales
donde HTML usa entidades. La integración también actualiza el saludo anterior y
exige dos enlaces con el mismo token —botón y alternativa— manteniendo los controles
de hash, pertenencia, fila única y commit. No se omiten pruebas.

El navegador no acredita Gmail, Outlook, Apple Mail ni sus modos oscuros. Email C
sigue pendiente: aplicación desplegada, enlaces HTTPS y entrega/lectura en casillas
reales. No se enviaron correos ni cambiaron DNS, secretos o flags reales.

Las vistas previas usan datos y tokens sintéticos sin validez y quedan fuera de Git
en `emails-cuenta-2026-09-19` dentro de los artefactos locales de esta tarea. No se
modificaron los 179 archivos frontend no versionados ni V27–V34. Un commit atómico
por repositorio, sin push; este cambio frontend es documental y no repite suites.
