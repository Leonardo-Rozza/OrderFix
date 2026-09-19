# Fotos privadas — recorrido local con Cloudinary

Fecha: 2026-09-19. Bases: frontend `b6fdc2b`, backend `dedf759`.
El titular pidió avanzar con fotos antes de Mercado Pago.

## Diseño del corte

Unir el laboratorio de navegador existente con el adaptador productivo de Cloudinary.
La prueba anterior del navegador usaba almacenamiento local; la comprobación real
del 12 de septiembre probaba sólo el adaptador. Ninguna acreditaba este recorrido
completo. Se conserva la misma pantalla y el contrato actual.

El comando habitual continúa usando almacenamiento local. Una opción explícita
selecciona Cloudinary real para cuatro imágenes sintéticas: escritorio y móvil de
320 px, alta con cliente/equipo nuevos y con equipo existente. PostgreSQL 16 y sus
usuarios son descartables. Email, MP, exportaciones y mantenimiento legal permanecen
deshabilitados. La limpieza programada de fotos sólo accede a esta base temporal.
El backend normal y su base habitual no participan.

Cada caso selecciona localmente, confirma el uso de las fotos y crea una intención.
El laboratorio pierde deliberadamente la respuesta de la primera carga, después
de que el proveedor guardó la imagen; el reintento debe recuperar el mismo objeto.
Se comprueban bytes/SHA, lectura por titular y empleado, rechazo de otro taller y
anónimo, visualización mediante Blob y eliminación confirmada.

En el modo real se exige además denegación anónima del original y de un intento
de transformación en Cloudinary, con el objeto presente. Sólo se admiten claves
de fotos pertenecientes a esta base y corrida, hasta cuatro. La limpieza usa la
identidad exacta del objeto creado; una respuesta incierta conserva su diagnóstico.
No se borran históricos ni objetos por prefijo.

Reutilizar el laboratorio evita duplicar los cuatro casos. Mantener ambas pruebas
separadas dejaría sin verificar la integración; probar en una base compartida
mezclaría el ensayo con datos/configuración existentes.

## Ejecución

Desde frontend, con Java 21, Node 24 y Docker activos:

```sh
npm run test:e2e:photos-real
ORDENFIX_PHOTOS_BROWSER_CLOUDINARY=synthetic-only \
ORDENFIX_CLOUDINARY_CREDENTIALS_FILE=<ruta-privada-absoluta> \
npm run test:e2e:photos-real
```

El archivo sólo aporta las tres credenciales de almacenamiento al contexto aislado
del adaptador. No se importa su configuración completa. El modo real consume
llamadas del proveedor; sigue excluido de las suites predeterminadas.

## Resultado

**Aprobado el 2026-09-19 a las 16:09:19 -03.** El modo real completó los cuatro
casos, con un harness JUnit sin fallos, errores ni omisiones (99,18 s de suite).
El modo local predeterminado también aprobó sus cuatro casos a las 16:07:00 -03
(54,678 s). Ambos conservan cero reintentos automáticos de Playwright.

| Comprobación del recorrido real | Resultado en los cuatro casos |
| --- | --- |
| Selección local, consentimiento e intención por reparación | Aprobado; ninguna carga al seleccionar |
| Primer upload y pérdida inducida de respuesta | Un upload real por imagen; HTTP 503 simulado después de guardar |
| Reintento y finalización | Misma intención/objeto; sin duplicar orden, intención ni upload; HTTP 201 |
| Lectura desde la app | Titular y empleado 200; bytes/SHA originales; imagen decodificada y URL Blob |
| Aislamiento HTTP | Otro taller 404; anónimo 403 |
| Acceso directo anónimo en Cloudinary | Original 401 e intento de transformación 401, con asset presente |
| Eliminación | HTTP 204, lectura posterior 404; ausencia remota y limpieza final confirmadas |

Las cuatro imágenes quedaron eliminadas. El journal registra cuatro cargas,
cuatro ACK perdidos deliberadamente, cuatro denegaciones y cuatro borrados,
seguido de `browser-four-assets-passed-and-deleted` y `cleanup-complete`, sin
pendientes. Se ensaya una respuesta perdida inducida, no una caída real del proveedor.

Se reforzó el ensayo para exigir decodificación de imágenes y guardar tres capturas
por caso, usando un gradiente sintético de 64×48. La revisión visual de selección,
confirmación y galería en 320 px no encontró desbordes de fotos ni controles
superpuestos. El toast de éxito cubre transitoriamente parte del título del modal;
no tapa autorizaciones. Las barras fijas intercaladas en capturas de página completa
son un artefacto de capturar después del desplazamiento, no evidencia de un fallo de fotos.

Validación adicional: **17 pruebas unitarias backend**, TypeScript y lint focales
aprobados. El runner rechaza un opt-in incorrecto o sin archivo antes de Maven.
La revisión corrigió dos nombres de configuración del laboratorio y excluyó el proxy
ambiental de los probes anónimos. No hubo fallos en las corridas finales focales.
No cambió código de producción y no se ejecutó otro `clean verify`.

Evidencia local: `/private/tmp/ordenfix-photos-browser-live-20260919/`, con logs,
reportes XML, `summary.json`, journal y doce capturas por modo. La correlación real
es `e855b5bf-a250-4ce2-8088-370ce248058e`. El acta backend
`docs/plans/2026-09-19-fotos-cloudinary-browser-design.md` detalla controles y hashes.
Se preservaron los 179 archivos ajenos no versionados y las migraciones V27–V34.
Los procesos del laboratorio terminaron; los servidores habituales siguen apagados.
Un commit por repositorio, sin push ni merge.
Backend: `70181fa` — `test(fotos): acredita recorrido completo con Cloudinary`.

Quedan fuera de este corte el despliegue HTTPS, el rol/configuración de staging,
la retención de futuros clientes, backups/CDN y la limpieza identificada de datos
históricos. Tampoco se habilita MP ni se envían correos.
