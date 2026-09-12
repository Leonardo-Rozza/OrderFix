# OrdenFix — Checklist de deploy (backend + frontend + legales + Sentry + Mercado Pago)

Guía paso a paso para salir a producción. Ordenada: primero el backend, después el
frontend, después los opcionales (Sentry, MercadoPago). Al final, el smoke test.

> Estado al actualizar esto (2026-08-23): el build local saltea el guard de publicación;
> CI y los previews validan como mínimo que la API de runtime sea una URL HTTPS pública y
> explícita; producción ejecuta el release guard completo. El lanzamiento público sigue
> bloqueado de forma intencional hasta cerrar identidad legal, revisión profesional, precio
> remoto y upload privado. Fuera de desarrollo ya no existe un fallback silencioso a
> localhost: una configuración incompleta detiene el build y, como segunda barrera, el
> cliente HTTP falla antes de crear una conexión insegura.

---

## 1. Backend nuevo en Render (o Railway)

1. **Base de datos**: creá una PostgreSQL (Render PostgreSQL, Neon o Railway). Guardá la
   connection string. Flyway corre las migraciones solo al arrancar la app — no hay que
   hacer nada a mano.
2. **Web Service** apuntando al repo del backend (Spring Boot 4 / Java 21). Variables de
   entorno mínimas:

   | Variable | Valor / notas |
   |---|---|
   | `SPRING_DATASOURCE_URL` / `USERNAME` / `PASSWORD` | los de tu PostgreSQL (o `DATABASE_URL` según cómo lo tengas configurado) |
   | `JWT_SECRET` (o como se llame en tu config) | un secreto largo y aleatorio, distinto al de dev |
   | `FREE_MAX_REPARACIONES` | opcional, default 25 |
   | `APP_PUBLIC_URL` | **URL del frontend en producción** (ej: `https://mvgr-reparaciones-frontend.vercel.app`) — se usa para armar el link de seguimiento en el mensaje de WhatsApp |
   | `MP_ENABLED` | `false` por ahora (ver sección 4 para activarlo) |

3. **Health check**: configurá el probe de Render a `GET /actuator/health` (público,
   devuelve `{"status":"UP"}`). Con esto Render sabe cuándo la app está viva.
4. **CORS**: configurá `CORS_ORIGINS` en el servicio backend con los orígenes exactos
   del frontend que realmente se usan. El dominio propio también debe coincidir con
   `APP_PUBLIC_URL`, que forma los enlaces de cuenta. No hace falta editar `CorsConfig`.
   El panel Vercel muestra `orden-fix.com.ar` y `www.orden-fix.com.ar` vinculados al
   proyecto `order-fix`, con redirección a `www` y certificados automáticos (2026-09-12).
   Git conectado: `Leonardo-Rozza/OrderFix`, con Production siguiendo `main` y
   asignación automática de dominios. Falta acreditar la nueva versión desplegada
   y el recorrido con backend; un push a main crea un despliegue de producción.
5. Verificá que responde: `curl https://TU-BACKEND.onrender.com/actuator/health`.

> Ojo con el plan free de Render: el servicio "duerme" tras ~15 min sin tráfico y la
> primera request tarda ~30-60s. Para la beta está bien; para distribución conviene el
> plan pago o un ping periódico.

---

## 2. Frontend en Vercel

El dominio confirmado por el usuario es `orden-fix.com.ar` y ya está conectado al
proyecto `order-fix`: no duplicar esa configuración. Está conectado a
`Leonardo-Rozza/OrderFix` (el antiguo nombre `mvgr-reparaciones-frontend` redirige allí),
con rama productiva `main`. Revisar preview y gates antes de fusionar a esa rama.
`cuenta.orden-fix.com.ar` ya está Verified en Resend; DKIM y SPF/Return-Path se
publicaron en Vercel. El remitente local es `notificaciones@cuenta.orden-fix.com.ar`
y una prueba autorizada figura Delivered, con recepción confirmada por el titular. Falta configurar el backend del entorno
y probar los enlaces reales; la API key nunca va en el frontend ni en `VITE_*`.
La guía y los cortes Email A–C están en
[Email transaccional del backend](../mvrg-backend/docs/operations/email.md).

El repo ya tiene `vercel.json`. Lo único que falta son las **variables de entorno**
(críticas porque el `.env` ya no está en git):

1. Vercel → tu proyecto → **Settings → Environment Variables** → agregá para
   *Production*. Las variables `VITE_*` quedan visibles en el JavaScript del navegador:
   nunca deben contener secretos.

   | Variable | Valor |
   |---|---|
   | `VITE_API_BASE_URL` | `https://TU-BACKEND.onrender.com` (con o sin `/api`, el front lo normaliza solo; debe ser HTTPS público) |
   | `VITE_LEGAL_EMAIL` | contacto legal público que coincide con la publicación aprobada |
   | `VITE_PRIVACY_EMAIL` | canal público para ejercer derechos sobre datos personales |
   | `VITE_SUPPORT_EMAIL` | canal público de soporte y gestiones |
   | `ORDENFIX_LEGAL_PUBLICATION_MANIFEST` | `docs/legal/publications/<publicationId>/publication-manifest.json` |
   | `VITE_SENTRY_DSN` | el DSN de Sentry (opcional — ver sección 3; si no está, Sentry queda apagado sin romper nada) |

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
   variables. Hoy debe fallar por diseño hasta completar identidad/contactos y la publicación
   legal real, retirar el precio fijo del frontend y reemplazar la subida unsigned por el
   flujo firmado/privado.
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

Un preview verde sólo acredita configuración de runtime; no acredita readiness público.
El job de build público completo se habilitará como obligatorio cuando exista el primer
manifiesto real aprobado y se hayan retirado los bloqueos enumerados en la sección 6.

Para desarrollo local nada cambia: `.env.local` (gitignoreado) con
`VITE_API_BASE_URL=http://localhost:8080` sigue funcionando igual.

---

## 3. Sentry (monitoreo de errores) — 10 minutos

El código ya está integrado (`src/lib/sentry.ts`): captura crashes de React, errores de
red 5xx y errores de rutas, filtra los 4xx esperables, y asocia el email del usuario
logueado. **Sin DSN es un no-op total**, así que activarlo es solo conseguir el DSN:

1. Creá cuenta en [sentry.io](https://sentry.io) (plan free alcanza de sobra: 5k
   errores/mes).
2. **Create Project** → plataforma **React** → nombre `ordenfix-frontend`.
3. Copiá el **DSN** que te muestra (formato `https://xxxx@yyy.ingest.sentry.io/zzz`).
   Si no lo ves: Settings → Projects → ordenfix-frontend → Client Keys (DSN).
4. Pegalo en Vercel como `VITE_SENTRY_DSN` y redeployá.
5. Configurá la alerta: Alerts → el proyecto ya crea una regla default que te manda
   email en cada error nuevo. Con eso alcanza para empezar.
6. Probalo: entrá a la app en producción, forzá un error (por ejemplo, apagá el backend
   y navegá) y fijate que aparezca el evento en Sentry en ~1 minuto.

Notas:
- En dev no molesta: sin `VITE_SENTRY_DSN` en `.env.local`, no se inicializa.
- `tracesSampleRate` ya está en 0.1 en producción (10% de las navegaciones) para no
  quemar la cuota del plan free.

---

## 4. MercadoPago (cobrar el plan PRO) — cuando quieras activar pagos reales

Hoy está `MP_ENABLED=false`: el botón "Pasar a PRO" devuelve 502 con mensaje claro.
Para activarlo (config del **backend**, contrato §10):

1. En el [panel de desarrolladores de MercadoPago](https://www.mercadopago.com.ar/developers):
   creá una aplicación → obtené el **Access Token** (para probar: credenciales de test,
   también empiezan con `APP_USR-`).
2. Configurá el **webhook**: panel MP → Webhooks → URL
   `https://TU-BACKEND.onrender.com/api/pagos/webhook` → copiá la **clave secreta**.
3. Variables en el backend (Render):

   | Variable | Valor |
   |---|---|
   | `MP_ENABLED` | `true` |
   | `MP_CHECKOUT_ENABLED` | `true` para habilitar nuevos checkouts; `false` funciona como kill switch sin apagar webhooks ni cancelaciones |
   | `MP_ACCESS_TOKEN` | el access token |
   | `MP_WEBHOOK_SECRET` | la clave del webhook (**obligatoria** con MP activo: sin ella el webhook rechaza todo) |
   | `MP_COLLECTOR_ID` | ID de la cuenta cobradora esperada (**obligatorio** con MP activo) |
   | `MP_APPLICATION_ID` | ID de la aplicación esperada (**obligatorio** con MP activo) |
   | `MP_BACK_URL` | `https://TU-FRONTEND.vercel.app/suscripcion/resultado` (debe ser HTTPS con MP activo) |
   | `MP_AMOUNT` / `MP_CURRENCY` / `MP_REASON` | opcional (default 24900 ARS "OrdenFix PRO - Suscripción mensual") |

4. Prueba end-to-end en sandbox con un comprador de test generado desde el panel de Mercado Pago.
   No documentes ni commitees sus credenciales. Al pagar, Mercado Pago devuelve a
   `/suscripcion/resultado`; el webhook debe confirmar y la app mostrar "¡Ya sos PRO!".

---

## 5. Smoke test post-deploy (15 minutos, en orden)

Con backend y frontend arriba, probá el camino crítico completo en producción:

- [ ] **Registro**: crear un taller nuevo (queda en TRIAL 14 días) → entra al dashboard.
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
- [ ] **Sentry**: forzar un error y verlo llegar.
- [ ] **PRO** (si MP activo): upgrade sandbox completo (sección 4.4).

---

## 6. Pendientes que bloquean el lanzamiento público

1. **Publicación legal real**: completar identidad/contactos, revisar los textos con abogado
   y contador, registrar sus referencias, completar la cobertura contractual exigida por el
   esquema y generar los SHA-256 del contenido definitivo en una publicación inmutable.
2. **Oferta PRO remota**: retirar cualquier importe fijo del frontend. Precio, moneda,
   período e impuestos deben venir del backend.
3. **Upload privado**: reemplazar el preset Cloudinary unsigned y la subida directa desde el
   navegador por una intención/autorización efímera emitida por backend, con borrado remoto.
4. **Dominio propio** (ej. `app.ordenfix.com`): agregarlo en Vercel **y** en el CORS del
   backend, y actualizar `APP_PUBLIC_URL` y `MP_BACK_URL`.
5. **Contrato backend**: aceptación versionada, oferta/cancelación, exportación y cierre se
   coordinan con el repositorio Java según el plan de lanzamiento.

---

## Cuentas de prueba

No documentes contraseñas en el repositorio. Creá las cuentas locales desde `/register` y
obtené usuarios de prueba de Mercado Pago desde su panel oficial; rotalos o descartalos al
terminar cada validación.
