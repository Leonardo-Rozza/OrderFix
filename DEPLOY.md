# OrdenFix — Checklist de deploy (backend + frontend + Sentry + MercadoPago)

Guía paso a paso para salir a producción. Ordenada: primero el backend, después el
frontend, después los opcionales (Sentry, MercadoPago). Al final, el smoke test.

> Estado al escribir esto (2026-07-05): el frontend ya absorbió el contrato v2 completo
> (12 estados, pago, presupuestos pro, riesgos, fotos con momento, garantía). El backend
> nuevo todavía NO está desplegado. El `.env` ya **no** está versionado en git, así que
> **sin la variable en Vercel el frontend de producción apunta a localhost** ⚠️.

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
4. **CORS**: el backend ya permite `http://localhost:5173` y
   `https://mvgr-reparaciones-frontend.vercel.app`. Si el front va a otro dominio
   (dominio propio, otro proyecto de Vercel), hay que agregarlo en `CorsConfig` del
   backend **antes** de usarlo.
5. Verificá que responde: `curl https://TU-BACKEND.onrender.com/actuator/health`.

> Ojo con el plan free de Render: el servicio "duerme" tras ~15 min sin tráfico y la
> primera request tarda ~30-60s. Para la beta está bien; para distribución conviene el
> plan pago o un ping periódico.

---

## 2. Frontend en Vercel

El repo ya tiene `vercel.json`. Lo único que falta son las **variables de entorno**
(críticas porque el `.env` ya no está en git):

1. Vercel → tu proyecto → **Settings → Environment Variables** → agregá para
   *Production* (y *Preview* si querés):

   | Variable | Valor |
   |---|---|
   | `VITE_API_BASE_URL` | `https://TU-BACKEND.onrender.com` (con o sin `/api`, el front lo normaliza solo) |
   | `VITE_SENTRY_DSN` | el DSN de Sentry (opcional — ver sección 3; si no está, Sentry queda apagado sin romper nada) |
   | `VITE_CLOUDINARY_CLOUD_NAME` | opcional: `dnd9rnidg` ya es el default en el código |
   | `VITE_CLOUDINARY_UPLOAD_PRESET` | opcional: `ordenfix_unsigned` ya es el default en el código |

2. **Redeploy** (Deployments → ⋯ → Redeploy) para que tome las variables. Las env de
   Vite se inyectan **en build**, no en runtime: cambiar la variable sin redeploy no hace nada.
3. Verificá en el navegador: abrí la app → DevTools → Network → las llamadas deben ir a
   `TU-BACKEND.onrender.com/api/...` y no a `localhost`.

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

4. Prueba end-to-end en sandbox con el comprador de test:
   `test_user_7460087649239330478@testuser.com` / `i8AGgyMs78` — pagás, MercadoPago te
   devuelve a `/suscripcion/resultado`, y en unos segundos el webhook confirma y la app
   muestra "¡Ya sos PRO!".

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

## 6. Pendientes conocidos para DESPUÉS del deploy (no bloquean la beta cerrada)

1. ~~Subida real de fotos~~ ✅ HECHO: las fotos se suben a Cloudinary (unsigned, cloud
   `dnd9rnidg`, preset `ordenfix_unsigned`) directo desde el form, con miniaturas y quitar.
   El plan free de Cloudinary da 25 GB; monitorear el uso cuando haya talleres reales.
2. **Dominio propio** (ej. `app.ordenfix.com`): agregarlo en Vercel **y** en el CORS del
   backend, y actualizar `APP_PUBLIC_URL` y `MP_BACK_URL`.
3. **Legal**: términos y condiciones + política de privacidad antes de cobrar a
   desconocidos.
4. **Beta cerrada**: 1-2 talleres reales usándolo un par de semanas antes de abrir.

---

## Credenciales de referencia (solo dev/test)

- Admin de prueba (backend local con datos viejos): `admin@mvgr.com` / `admin1234`.
- Comprador sandbox MercadoPago: `test_user_7460087649239330478@testuser.com` / `i8AGgyMs78`.
- Si el backend nuevo arranca con base vacía: registrá un taller desde `/register` y listo.
