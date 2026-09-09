# Fotos privadas — recorrido operativo de la salida inicial

Fecha: 2026-09-09. Baselines: frontend `f29b9ba`, backend `e10070b`.
Continúa el criterio Evidencia y documentos y concreta BACKEND-HANDOFF 4/Tarea 9. No publica ni
contacta imágenes existentes. V27/V28/V29 no se editan; cualquier evolución usa migración nueva.

## Decisiones y límites

Se conserva Cloudinary. La primera versión transporta los bytes por el backend para validar el
archivo antes de subirlo y evitar entregar una autorización del proveedor reutilizable al navegador.
Se mantiene intención → carga privada → finalización. La autorización operativa vence en el backend;
no se confunde con la ventana de una firma del proveedor. Las imágenes se crean con delivery type
`authenticated`, identidad aleatoria sin datos personales y sin transformación de entrada. La lectura
se hace por GET autenticado del backend, con respuesta no-store; no se devuelve una URL CDN permanente.

La alternativa de upload directo firmado exige además manejar su ventana real de una hora, preset
firmado de límites y reconciliación posterior a esa ventana; se difiere esa optimización. No se añade
otro proveedor o almacenamiento productivo. Sin configuración válida, la carga privada falla cerrada.
La configuración de un entorno real de pruebas aún no está disponible; las pruebas locales no se
presentarán como una acreditación de la cuenta Cloudinary ni reemplazarán el gate de staging.

Se reutiliza la evidencia legal canónica. Cada intención conserva el vínculo operativo de confirmación
con reparación, taller, actor, alcance FOTOS, versión y fecha; una aceptación canónica previa no confirma
otra reparación. No se reutiliza REGISTRO como consentimiento fotográfico ni se crea otro ledger legal.
La operación y su fingerprint incluyen reparación y manifiesto del archivo. La política general de
aceptaciones no adquiere obligaciones fotográficas por defecto.

## Contrato de la primera versión

- `GET /api/reparaciones/{id}/requisitos-fotos`: requisitos actuales de esa reparación y límites,
  sin enviar nombre o contenido del archivo. No usa un selector arbitrario en el GET legal general.
- `POST /api/reparaciones/{id}/cargas-foto`: Idempotency-Key UUID; nombre, mimeType, bytes, sha256,
  momento, requiredSetRevision, aceptacionesLegales y atestacion contextual confirmada. El servidor
  determina actor/taller. Crea o reutiliza la misma intención; misma clave con otro manifiesto falla.
- `GET /api/reparaciones/{id}/cargas-foto/{intencionId}`: consulta de estado, sin URL del proveedor.
- `PUT /api/reparaciones/{id}/cargas-foto/{intencionId}/contenido`: bytes de imagen y sesión JWT;
  máximo 8.000.000 bytes, JPEG/PNG; manifiesto y contenido deben coincidir. Sólo el actor de la
  intención puede cargar/finalizar. El archivo permanece privado y no asociado hasta finalizar.
- `POST /api/reparaciones/{id}/cargas-foto/{intencionId}/finalizaciones`: cuerpo vacío; verifica el
  objeto privado desde servidor y asocia una sola foto. Repetir no duplica la asociación.
- `GET /api/reparaciones/{id}/fotos`: metadata de fotos gestionadas, con identidad opaca.
- `GET /api/reparaciones/{id}/fotos/{fotoId}/contenido`: bytes únicamente para sesión válida del taller.
- `DELETE /api/reparaciones/{id}/fotos/{fotoId}`: borrado del objeto exacto, reintentable; un error del
  proveedor no se presenta como borrado completo. La UI retira la foto tras confirmación.

El DTO de intención conserva id, estado, expiresAt y upload con method PUT y URL relativa del backend.
El DTO de foto conserva id, momento, mimeType, bytes, sha256 y createdAt; no expone ID/URL del proveedor.
Los estados terminales no autorizan nuevas cargas. Se preservan los identificadores necesarios para
limpiar objetos de intentos vencidos o fallidos y reintentar eliminaciones pendientes.

Cada reparación admite hasta 100 fotos/intenciones aún no eliminadas; el servidor controla el cupo
bajo bloqueo de la reparación. La galería obtiene primero metadata y descarga sólo la foto abierta;
cambiar o cerrar la imagen libera el Blob. La retención se configura por separado y no se hereda del
borrado de PIN/patrón al entregar el equipo.

JPEG y PNG se decodifican en el servidor para comprobar su integridad: máximo 25 millones de píxeles
y 12.000 por lado; se verifican también el contenedor completo y los CRC de PNG. Se rechaza PNG
animado. WebP queda fuera de esta primera versión: el JDK no incluye un decodificador y comprobar
sólo su cabecera no acredita una imagen válida. La UI y el contrato publican los mismos formatos.

La lectura de referencias legacy se mantiene durante la transición. Las rutas viejas no pueden
asociar URLs nuevas al habilitar fotos privadas. Una migración de archivos legacy requiere acreditar
su identidad en el proveedor; no se elimina ni se privatiza en masa desde este corte.

## Cortes y validación

1. Backend: contrato operativo, almacenamiento privado y atestación contextual en una frontera
   restringida; migración nueva, aislamiento y reintentos con pruebas PostgreSQL y de transporte.
2. Frontend: selección local, confirmación antes de transmitir, retención del ID creado en ambos
   modos de alta, carga/reintento sobre esa orden, lectura autenticada y borrado remoto. Retirar la
   subida unsigned y preservar la orden ante fallo de fotos.
3. Recorrido real local y cierre: permisos ADMIN/USER/ajeno/anónimo, validación binaria, rechazo de
   consentimiento, replay, fallo recuperable y eliminación. Gate integral por el cambio transversal;
   staging y proveedor real se acreditan por separado con configuración de prueba explícita.

Un commit atómico por corte/repositorio, sin push. Las listas nominales de archivos y la evidencia
se documentan antes de sus commits. No se agregan fases editoriales generales, Mercado Pago o email.

## Fuentes del transporte

- [Cloudinary: control de acceso](https://cloudinary.com/documentation/control_access_to_media).
- [Cloudinary: autenticación de la API](https://cloudinary.com/documentation/authentication_signatures).
- [Cloudinary: Upload API](https://cloudinary.com/documentation/image_upload_api_reference).
- [Cloudinary: Admin API](https://cloudinary.com/documentation/admin_api).

## Lista nominal frontend antes de implementación

- Nuevos `src/api/repairPhotos.ts` y su prueba: contrato de requisitos/manifiesto, transporte binario autenticado, replay y errores seguros.
- `src/components/FotoUploader.tsx` y su prueba: selección de File local con previews revocables, JPEG/PNG y límite de bytes; ninguna subida al seleccionar.
- Nuevos `src/components/PhotoUploadPanel.tsx` y su prueba: revisión de documentos, confirmación contextual por reparación y reintento conservando intención/clave.
- Nuevos `src/components/RepairPhotos.tsx` y su prueba: metadata, lectura Blob autenticada y eliminación remota confirmada.
- `src/components/ReparacionFormModal.tsx` y su prueba: creación primero en ambos modos y fase de fotos que conserva el ID confirmado.
- `src/pages/ReparacionDetallePage.tsx` y su prueba: fotos gestionadas privadas separadas de referencias legacy de sólo lectura; mock parcial de permisos conserva el store usado por la galería.
- Eliminar `src/lib/cloudinary.ts` y retirar de `.env.example` la configuración de subida unsigned del navegador.

Los archivos y las claves de intentos permanecen sólo en memoria; los blobs no se guardan en la caché global. No cambia login, seguimiento público ni resumen. El recorrido real y el cierre documental se verifican junto con el backend antes del commit de este corte.

Laboratorio nuevo: `e2e-photos-real/photos.spec.ts`, `playwright.photos-real.config.ts`,
`scripts/run-photos-real.mjs` y un comando en `package.json`. Se ejecuta contra un Tomcat/PostgreSQL
efímero y almacenamiento local de prueba que conserva bytes y simula un ACK incierto. Comprueba
alta nueva/existente, selección local, confirmación, reintento sin duplicar, lectura por roles y borrado
en escritorio y 320 px. Esta sustitución del proveedor se declara expresamente; no acredita su cuenta.

## Cierre local del corte — fotos privadas

Fecha: 2026-09-09. El backend conserva Cloudinary y ahora transporta JPEG/PNG por rutas
propias autenticadas. Crea una intención y su confirmación contextual canónica antes de transmitir
bytes; recupera la misma intención ante un ACK incierto y asocia una sola foto al finalizar. El
frontend conserva la orden y los archivos seleccionados, tanto en alta nueva como con equipo
existente. Se retira la subida unsigned del navegador. La galería descarga sólo la foto abierta
y libera el Blob al cerrar, cambiar de reparación o sesión.

El laboratorio de fotos aprobó el **2026-09-09 a las 12:21:53 -03:00**: un harness JUnit,
**cuatro casos Playwright**, sin reintentos ni omisiones, escritorio y 320 px. PostgreSQL 16.14
acreditó cuatro intenciones/fotos eliminadas y sus vínculos con actor, taller, reparación y
aceptación canónica. La primera carga de cada archivo conservó bytes reales en el almacenamiento
local y respondió 503; el reintento recuperó el objeto sin repetir el alta de orden ni intención.
Titular/empleado obtuvieron 200, otro taller 404, anónimo 403; DELETE confirmó 204 y la lectura
posterior 404. Se verificaron deltas exactos y ausencia de cambios en las tablas de pagos.

Validación complementaria: **566 Vitest + 42 controles de publicación**, typecheck, lint y build.
Las 50 pruebas del adapter/configuración comprueban transporte contra un servidor controlado,
identidad, límites, firmas y errores seguros; no acreditan una cuenta Cloudinary. Los tests de
PostgreSQL cubren rechazo de confirmación/revisión/manifiesto, pertenencia, replay, recuperación y
protección del borrado de reparaciones. La limpieza rota lotes de diez para que los fallos antiguos
no impidan procesar filas posteriores; una prueba conserva once fallos permanentes y acredita
avance y vuelta para reintentar, sin modificar V30.

El `clean verify` completo ejecutó **7.413 unitarias y 1.350 pruebas de integración**. Las unitarias
aprobaron; integración terminó con cuatro fallos y dos errores en cinco suites: tres expectativas
de última versión 29, dos comprobaciones V29 que migraban implícitamente a V30 y un rechazo de
archivo cambiante durante la preparación del laboratorio de capacidad. No se presenta ese comando
como verde. Se corrigieron únicamente las expectativas/fixtures y se añadió una comprobación
independiente de los cinco consumidores previos sobre V30. La revalidación focal de las cinco
suites completas aprobó **85 IT y 6 unitarias** el **2026-09-09 a las 13:02:37 -03:00**, sin fallos,
errores ni omisiones (4:10 min). La suite de capacidad pasó sin cambiar código ni relajar el guard.
La causa exacta de aquel incidente no se acreditó: el lector también compara atributos de los
directorios ancestros, incluido el tmp compartido. Queda registrado como incidente no reproducido.
La evidencia final combina el integral y esa revalidación; no se repitió otro clean verify completo
tras los ajustes exclusivos de pruebas. La prueba nueva eleva el inventario a **1.351 IT**.
Los **14 recorridos anteriores** de registro, empleados, reparación/presupuesto, cobros manuales
y resumen volvieron a aprobar el **2026-09-09 a las 13:04:11 -03:00**: un harness JUnit, cero
fallos/errores/omisiones, 71,58 s de suite. Ese laboratorio conserva deliberadamente su fixture
V29; el laboratorio de fotos y la prueba de compatibilidad usan V30. Son 18 recorridos locales
complementarios, no una acreditación del despliegue ni de la cuenta Cloudinary.

Se corrigieron durante la validación una referencia de compilación al driver de alcance runtime,
una URL de Testcontainers con parámetro ajeno al contrato, el esquema predeterminado de Hibernate
en el laboratorio y el selector de su botón Equipo. La suite frontend necesitó conservar el store
de autenticación en un mock parcial del detalle. Se actualizaron las expectativas del número de
constructores internos y de la última migración; las comprobaciones de inmutabilidad y evidencia
histórica se mantuvieron. Los intentos fallidos no cuentan como aprobados.
V27/V28/V29 conservaron sus hashes; V30 es la única migración nueva. Los 77 archivos no versionados
ajenos se preservaron. Un commit por repositorio integra implementación, pruebas y documentación,
sin push.

**El flujo de fotos queda verificado localmente.** Sigue pendiente configurar la cuenta Cloudinary
de prueba y acreditar acceso anónimo denegado a original/derivados, borrado remoto real y operación
de retención en staging. Las referencias legacy requieren su inventario y tratamiento explícito;
este corte no las privatiza ni elimina del proveedor. También continúan los pendientes de Confianza
y cuenta y Operación real de la lista finita de salida. No se habilita el lanzamiento con esta prueba.

Comandos y evidencia local de esta ejecución:

- `JAVA_HOME=<Java 21> ./mvnw -B clean verify`: `backend-clean-verify-2.log` y `integral-2-summary.json`.
- `JAVA_HOME=<Java 21> ./mvnw -B -Dtest=LegalAcceptanceCommandTest -Dit.test=PostgresMigrationIT,LegalAcceptanceHistoryReaderIT,LegalPrivateRequirementsReadServiceIT,LegalPublicRequirementsHttpCapacityIT,LegalV29AcceptanceSchemaVerifierIT verify`: `backend-final-focused.log`.
- Desde frontend, Node 24.14.0: `npm run test:e2e:photos-real` (`browser-3.log`) y `npm run test:e2e:registration-real` (`registration-regression.log`), con Java 21 y Docker activo.
- Frontend: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` y lint/TypeScript del E2E. El build conserva la advertencia de chunk mayor a 500 kB; no es un build de publicación acreditado.

Logs en `/private/tmp/ordenfix-private-photos/`; la documentación conserva sus resultados aunque
ese directorio temporal deje de existir. Los comandos de laboratorio requieren recursos efímeros;
no contienen credenciales reales ni deben apuntarse a una base compartida.
