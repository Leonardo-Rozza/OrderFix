# OrdenFix — Checklist de deploy (backend + frontend + legales + Sentry + Mercado Pago)

El [plan único de salida](odd/tasks/production-release.md) es el backlog vigente de
ambos repositorios. Esta guía reúne la configuración y los checks de despliegue;
no reemplaza sus gates ni autoriza acceder a proveedores, bases o producción.
Primero se acredita el candidato local, luego staging, recuperación y publicación;
recién después se decide la apertura conjunta. Mercado Pago permanece pausado.

> Estado documental al 2026-10-02: el build local saltea el guard de publicación;
> CI y los previews validan como mínimo que la API de runtime sea una URL HTTPS pública y
> explícita; producción ejecuta el release guard completo. El lanzamiento público sigue
> bloqueado hasta cerrar publicación legal definitiva, configuración coordinada, staging
> y operación. El precio PRO remoto y las fotos privadas vía backend ya están implementados:
> no son funcionalidades por rehacer. Fuera de desarrollo no existe un fallback silencioso a
> localhost: una configuración incompleta detiene el build y, como segunda barrera, el
> cliente HTTP falla antes de crear una conexión insegura.

Los pasos y comandos de esta guía son **ejecución futura**, no realizadas en este cierre
documental. Las referencias a paneles, dominios y proveedores de septiembre son actas
históricas; requieren revalidación autorizada y no acreditan su estado actual. No imprimir
secretos, reutilizar sesiones ambientales ni promover `main` para probar una configuración.

---

## 1. Backend nuevo en Render (o Railway)

1. **Base de datos**: creá una PostgreSQL (Render PostgreSQL, Neon o Railway). Guardá la
   connection string. Flyway corre las migraciones solo al arrancar la app — no hay que
   hacer nada a mano.
2. **Web Service** apuntando al repo del backend (Spring Boot 4 / Java 21). Variables de
   entorno mínimas:

   | Variable | Valor / notas |
   |---|---|
   | `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | URL JDBC y credenciales del datasource principal; son los nombres usados por `application.properties` |
   | `JWT_SECRET` | secreto HS256 de al menos 32 bytes, distinto al de desarrollo |
   | `JWT_ISSUER` / `JWT_EXPIRATION` | obligatorios; emisor esperado y duración del access token en milisegundos |
   | `DEVICE_CREDENTIALS_ENCRYPTION_KEY` | Base64 de exactamente 32 bytes; conservar estable y respaldada fuera de Git |
   | `ADMIN_USER` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` | configuración privada del administrador inicial; no cuentas/contraseñas versionadas |
   | `FREE_MAX_REPARACIONES` | opcional, default 25 |
   | `APP_PUBLIC_URL` | **URL del frontend en producción** (ej: `https://mvgr-reparaciones-frontend.vercel.app`) — se usa para armar el link de seguimiento en el mensaje de WhatsApp |
   | `MP_ENABLED` / `MP_CHECKOUT_ENABLED` | `false` / `false`; pausa vigente, sección 4 sólo para un ensayo futuro autorizado |

   La tabla no cubre los roles aislados ni keyrings de capacidades opt-in. El detalle de
   base, cifrado, empaquetado y proxy está en [Deploy backend](../mvrg-backend/DEPLOY.md);
   las migraciones actuales llegan a V40, sin editar ni reejecutar manualmente el historial.

3. **Health check**: configurá el probe de Render a `GET /actuator/health` (público,
   devuelve `{"status":"UP"}`). Con esto Render sabe cuándo la app está viva.
4. **CORS**: configurá `CORS_ORIGINS` en el servicio backend con los orígenes exactos
   del frontend que realmente se usan. El dominio propio también debe coincidir con
   `APP_PUBLIC_URL`, que forma los enlaces de cuenta. No hace falta editar `CorsConfig`.
   El panel Vercel muestra `orden-fix.com.ar` y `www.orden-fix.com.ar` vinculados al
   proyecto `order-fix`, con redirección a `www` y certificados automáticos (2026-09-12).
   Git conectado: `Leonardo-Rozza/OrderFix`, con Production siguiendo `main` y
   asignación automática de dominios en esa acta. Falta revalidar esa configuración y
   acreditar la versión desplegada con backend. No hacer push ni merge a `main` para
   ensayar: la integración histórica puede promover automáticamente a producción.
5. Verificá que responde: `curl https://TU-BACKEND.onrender.com/actuator/health`.

La capacidad, arranque en frío, persistencia y backups del hosting se verifican para el
entorno elegido; no asumir límites ni precios actuales a partir de esta guía.

### Registro y consentimiento: rollout conjunto

Configurar las propiedades canónicas del backend, con credenciales restringidas de cada
consumidor y publicación acreditada; no basta con el datasource principal:

| Propiedad | Default | Requisito |
| --- | --- | --- |
| `ordenfix.legal.public-documents.enabled` | `false` | Lectura publicada y `ordenfix.legal.public-document-read.*` acreditados |
| `ordenfix.legal.public-requirements.enabled` | `false` | Conjunto vigente y `ordenfix.legal.public-requirements.*` acreditados |
| `ordenfix.legal.registration-consent.enabled` | `false` | Escritor `ordenfix.legal.registration-consent.*`, keyrings y metadata propios |
| `ordenfix.legal.registration-enforcement.enabled` | `false` | Consentimiento y ambas lecturas públicas habilitados; frontend compatible ya comprobado |

Primero lectores/publicación → consentimiento → frontend con
`VITE_REGISTRATION_CONSENT=true` → prueba del registro y replay → enforcement.
Con enforcement apagado, el request legacy sólo es válido si faltan los tres elementos
legales; con enforcement activo ese request devuelve `428`. Un bloque legal completo
con consentimiento apagado devuelve `503`, sin alta. El [contrato backend](../mvrg-backend/FRONTEND_INTEGRATION.md)
define roles, preflights y keyrings exactos. La [matriz del plan](odd/tasks/production-release.md#matriz-coordinada-de-configuración)
incluye fotos, exportaciones, email, MP, cierre y cuarentena de restore.
El guard público no valida el flag de registro: un build aprobado no demuestra
por sí solo que frontend y enforcement sean compatibles.

---

## 2. Frontend en Vercel

El dominio confirmado por el usuario es `orden-fix.com.ar`; el acta del 2026-09-12
registra su conexión al proyecto `order-fix`: revalidar, no duplicar por defecto. Registra
`Leonardo-Rozza/OrderFix` (el antiguo nombre `mvgr-reparaciones-frontend` redirige allí),
con rama productiva `main`. Revisar preview y gates antes de cualquier promoción autorizada.
El acta de email registra `cuenta.orden-fix.com.ar` Verified en Resend y DKIM/SPF/Return-Path
publicados en Vercel. Registra el remitente local `notificaciones@cuenta.orden-fix.com.ar`
y una prueba autorizada Delivered, con recepción confirmada por el titular. Falta configurar el backend del entorno
y probar los enlaces reales; la API key nunca va en el frontend ni en `VITE_*`.
La guía y los cortes Email A–C están en
[Email transaccional del backend](../mvrg-backend/docs/operations/email.md).

El repo tiene `vercel.json`. La configuración de entorno es necesaria, pero no sustituye
publicación definitiva, prueba en staging y recuperación:

1. Vercel → tu proyecto → **Settings → Environment Variables** → agregá para
   *Production*. Las variables `VITE_*` quedan visibles en el JavaScript del navegador:
   nunca deben contener secretos.

   | Variable | Valor |
   |---|---|
   | `VITE_API_BASE_URL` | `https://TU-BACKEND.onrender.com` (con o sin `/api`, el front lo normaliza solo; debe ser HTTPS público) |
   | `VITE_REGISTRATION_CONSENT` | `true` para el candidato público, coordinado con lectores, consentimiento y enforcement backend según la secuencia anterior |
   | `VITE_LEGAL_EMAIL` | contacto legal público que coincide con la publicación aprobada |
   | `VITE_PRIVACY_EMAIL` | canal público para ejercer derechos sobre datos personales |
   | `VITE_SUPPORT_EMAIL` | canal público de soporte y gestiones |
   | `ORDENFIX_LEGAL_PUBLICATION_MANIFEST` | `docs/legal/publications/<publicationId>/publication-manifest.json` |
   | `VITE_SENTRY_DSN` | el DSN de Sentry (opcional — ver sección 3; si no está, Sentry queda apagado sin romper nada) |
   | `VITE_WORKSHOP_CLOSURE_ENABLED` | mantener ausente/`false`; cierre integral fuera de salida pública |

2. Publicá dentro de `docs/legal/publications/<publicationId>/` únicamente el artefacto
   inmutable que ya pasó revisión jurídica y contable. Los borradores de
   `docs/legal/drafts/` nunca son fallback contractual ni pueden apuntarse desde la variable
   del manifiesto. El guard valida el JSON contra
   `docs/legal/publication-manifest.schema.json`, comprueba los SHA-256 de los archivos y las
   afirmaciones, y exige la cobertura de documentos, contextos y roles necesaria para
   registro, empleados, PRO, atestaciones y cierre. Una corrección crea otro
   `publicationId`; no se sobrescribe una publicación ya importada.
3. Antes de promover, ejecutá explícitamente el gate público y el build protegido:

   ```bash
   npm run check:public-release
   npm run build:public
   ```

   El primer comando enumera códigos y archivos pendientes sin imprimir valores de las
   variables. La configuración local auditada sigue bloqueada por identidad/contactos y
   publicación legal real. Precio remoto y flujo privado ya están implementados; el guard
   conserva el escaneo anti-regresión de importe fijo y carga unsigned/directa.
4. **Redeploy** (Deployments → ⋯ → Redeploy) para que tome las variables. Las env de
   Vite se inyectan **en build**, no en runtime: cambiar la variable sin redeploy no hace nada.
5. Verificá en el navegador: abrí la app → DevTools → Network → las llamadas deben ir a
   `TU-BACKEND.onrender.com/api/...` y no a `localhost`.

`vercel.json` fija `npm run build` como comando. El mismo entrypoint elige el nivel de control
antes de TypeScript/Vite:

- desarrollo local: saltea el release guard y conserva el fallback local;
- CI y `VERCEL_ENV=preview`: validan la configuración de runtime y exigen una API HTTPS
  pública, pero no requieren todavía una publicación legal aprobada;
- `VERCEL_ENV=production` u `ORDENFIX_PUBLIC_RELEASE=true`: ejecutan el release guard
  completo, incluido manifiesto legal, contactos y escaneo de bloqueos productivos; después de
  Vite vuelve a inspeccionar `dist/`, por lo que un archivo estático copiado desde `public/` tampoco
  puede reintroducir un precio PRO fijo o una carga unsigned.
- `ORDENFIX_RELEASE_GUARD=runtime`: override temporal y explícito que baja producción al nivel
  runtime (sólo valida la API) mientras no exista una publicación legal aprobada. Quitarlo de
  Vercel en cuanto se cargue el manifiesto real; `--force` y `build:public` lo ignoran.

Un preview verde sólo acredita configuración de runtime; no acredita readiness público.
El job de build público completo se habilitará como obligatorio cuando exista el primer
manifiesto real aprobado y se hayan retirado los bloqueos enumerados en la sección 6.

Para desarrollo local nada cambia: `.env.local` (gitignoreado) con
`VITE_API_BASE_URL=http://localhost:8080` sigue funcionando igual.

---

## 3. Sentry (monitoreo de errores)

El código ya está integrado (`src/lib/sentry.ts`): captura crashes de React, errores de
red 5xx y errores de rutas, filtra los 4xx esperables, y asocia el email del usuario
logueado. **Sin DSN es un no-op total**, así que activarlo es solo conseguir el DSN:

1. En [Sentry](https://sentry.io), confirmar proyecto, permisos, capacidad y política de datos
   del entorno antes de activarlo; no asumir cuotas vigentes.
2. **Create Project** → plataforma **React** → nombre `ordenfix-frontend`.
3. Copiá el **DSN** que te muestra (formato `https://xxxx@yyy.ingest.sentry.io/zzz`).
   Si no lo ves: Settings → Projects → ordenfix-frontend → Client Keys (DSN).
4. Pegalo en Vercel como `VITE_SENTRY_DSN` y redeployá.
5. Configurar alertas y responsable de atención; verificar recepción y datos sanitizados.
6. Probar un evento sintético controlado en staging bajo autorización. No apagar el
   backend de producción para comprobar observabilidad.

Notas:
- En dev no molesta: sin `VITE_SENTRY_DSN` en `.env.local`, no se inicializa.
- `tracesSampleRate` ya está en 0.1 en producción (10% de las navegaciones) para no
  quemar la cuota del plan free.

---

## 4. Mercado Pago — suscripción del taller a OrdenFix

Planes lee precio y disponibilidad desde `GET /api/suscripcion`. Con MP o checkout
apagados muestra contratación no disponible; sólo el ADMIN puede iniciar el checkout
cuando el backend lo habilita. Los cobros a clientes siguen siendo registros manuales.

Primero completar el ensayo con cuentas de prueba en una instancia y base aisladas.
El backend conserva el procedimiento en
`docs/plans/2026-09-12-mercadopago-pruebas-y-cortes.md` y
`docs/runbooks/mercadopago-release.md`. Activar MP también permite procesar eventos y
conciliaciones previas, aunque checkout esté apagado. Producción conserva su gate de salida.

Configuración del **backend** para ese entorno (contrato §10):

1. En el [panel de desarrolladores de MercadoPago](https://www.mercadopago.com.ar/developers):
   identificá aplicación, vendedor y comprador de prueba. Confirmá la cuenta del
   **Access Token**; su prefijo por sí solo no identifica el entorno.
2. Verificá el mecanismo de **webhook** disponible para Suscripciones en esa aplicación
   y la entrega firmada a `https://TU-BACKEND-PRUEBA/api/pagos/webhook`. La guía actual
   del proveedor tiene una advertencia sobre la configuración de Suscripciones desde
   el panel; el runbook registra la comprobación pendiente. Guardá su secreto sólo
   en configuración privada del backend.
3. Variables del backend; habilitar únicamente después de verificar el entorno de prueba:

   | Variable | Valor |
   |---|---|
   | `MP_ENABLED` | `true` |
   | `MP_CHECKOUT_ENABLED` | `true` para habilitar nuevos checkouts; `false` funciona como kill switch sin apagar webhooks ni cancelaciones |
   | `MP_ACCESS_TOKEN` | el access token |
   | `MP_WEBHOOK_SECRET` | la clave del webhook (**obligatoria**: sin ella el backend no arranca con MP activo) |
   | `MP_COLLECTOR_ID` | ID de la cuenta cobradora esperada (**obligatorio** con MP activo) |
   | `MP_APPLICATION_ID` | ID de la aplicación esperada (**obligatorio** con MP activo) |
   | `MP_BACK_URL` | `https://TU-FRONTEND.vercel.app/suscripcion/resultado` (debe ser HTTPS con MP activo) |
   | `MP_AMOUNT` / `MP_CURRENCY` / `MP_REASON` | opcional (default 24900 ARS "OrdenFix PRO - Suscripción mensual") |

4. Prueba end-to-end en sandbox con un comprador de test generado desde el panel de Mercado Pago.
   No documentes ni commitees sus credenciales. Al autorizar la suscripción, Mercado Pago devuelve a
   `/suscripcion/resultado`; el webhook debe confirmar y la app mostrar "¡Ya sos PRO!".
   Iniciá sesión y checkout desde el mismo origen HTTPS usado en `MP_BACK_URL` para
   conservar la sesión. Verificá CORS, la recarga directa de esa ruta y, si usás un túnel
   hacia Vite, permití sólo su host exacto o configurá el proxy.

---

## 5. Smoke test post-deploy (en orden)

Primero acreditar el camino completo en staging (T4). Tras una promoción autorizada,
repetir el smoke sintético acordado sin afectar datos de usuarios:

- [ ] **Registro**: condiciones publicadas y confirmaciones → TRIAL 14 días → dashboard;
      verificar replay y flags coordinados, no fallback legacy accidental.
- [ ] **Ingreso rápido**: Reparaciones → Nueva → cliente+equipo+problema → se crea con
      `numeroOrden` tipo `ORD-2026-0001`.
- [ ] **Estados**: mover la orden por el tablero (Ingresado → En diagnóstico → …).
      Probar un salto ilegal arrastrando a "Entregado" directo → debe avisar sin romper.
- [ ] **Riesgos**: editar la reparación → marcar cuenta vinculada iCloud sin
      credenciales → debe aparecer la bandera roja en el detalle.
- [ ] **Presupuesto**: crear uno con mano de obra + repuesto → abrir el link de
      seguimiento en ventana de incógnito → aprobar como cliente → la orden pasa a
      "En proceso" sola.
- [ ] **WhatsApp**: botón "Avisar al cliente" → abre wa.me con el mensaje y el link.
- [ ] **Entrega y garantía**: completar → entregar → aparece la garantía (90 días) y
      el botón "Reclamo en garantía" crea una orden vinculada sin consumir cupo.
- [ ] **Límite FREE**: (opcional) verificar que el contador "X/25 este mes" se mueve.
- [ ] **Cuenta/email**: recuperación/verificación con enlaces HTTPS del entorno autorizado.
- [ ] **Fotos** (si se activan): upload por backend, lectura por taller, denegación anónima,
      borrado y reintento; no exponer IDs/URLs del proveedor en seguimiento público.
- [ ] **Exportación**: Excel protegido; ZIP sólo si su gate de activación está aprobado.
- [ ] **Monitoreo**: health, alertas y responsable de rollback acreditados.
- [ ] **MP/cierre**: pausa y cierre público deshabilitado; no abrir checkout para hacer el smoke.

Al terminar el trial, FREE/ACTIVA conserva titular único y 25 reparaciones mensuales;
empleados y Cobros requieren TRIAL/PRO. La política para los primeros talleres sigue
pendiente; MP pausado no equivale a PRO permanente gratuito.

---

## 6. Pendientes vigentes de salida

1. **Publicación legal real**: completar identidad/contactos, revisar los textos con abogado
   y contador, registrar sus referencias, completar la cobertura contractual exigida por el
   esquema y generar los SHA-256 del contenido definitivo en una publicación inmutable.
2. **Candidato y staging**: cerrar el integral backend actual, imagen/arranque V40,
   variables/roles/preflights y registro coordinado; acreditar frontend y backend exactos.
3. **Fotos/email/exportación**: repetir recorridos con configuración del despliegue,
   retenciones, capacidad y recuperación. Fotos ya tiene cuatro casos completos locales
   con Cloudinary real (2026-09-19), no sólo una prueba del adapter; eso no acredita staging.
4. **Operación**: restore aislado con claves, cuarentena, rollback, alertas, responsables y
   solicitudes de datos. La limpieza histórica requiere inventario concreto autorizado.
5. **Oferta y entrega**: decidir acceso después del trial y estrategia de integración de
   ambas ramas. Precio remoto y fotos privadas están implementados; MP y cierre integral
   siguen fuera de activación. No se presupone seguro hacer push a `main`.

El [plan único](odd/tasks/production-release.md) registra dependencias, aceptación y
evidencia por tarea. Los runbooks backend gobiernan cada operación; esta lista no añade
autorización de cambios de producto ni de operaciones externas.

---

## Cuentas de prueba

No documentes contraseñas en el repositorio. Creá las cuentas locales desde `/register` y
obtené usuarios de prueba de Mercado Pago desde su panel oficial; rotalos o descartalos al
terminar cada validación.
