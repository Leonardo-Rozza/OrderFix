# Mercado Pago — confirmación del retorno

Fecha: 2026-09-12. Base frontend: `8547f3a`.
Alcance: corrección local dentro de MP-B; ciclo con proveedor todavía pendiente.

## Problema reproducido

En una prueba con respuestas HTTP simuladas, un GET confirma PRO/ACTIVA; el usuario
va al inicio, se simula una baja remota PRO → FREE y vuelve por el historial del
navegador a `/suscripcion/resultado`.
La caché global sigue fresca durante cinco minutos. El retorno mostraba «Ya sos PRO»
con esa respuesta anterior y detenía el polling sin consultar nuevamente.

La reproducción previa conservó un solo GET después de volver y esperar 4,5 segundos.
Una carga nueva del retorno, con caché vacía, sí consultó y confirmó correctamente al
pasar el servidor de FREE a PRO. El fallo es de confirmación visible; el backend
conserva la autoridad sobre acceso y cobros.

## Corrección acotada

El retorno solicita una respuesta nueva al montarse y sólo presenta confirmación
cuando obtiene una lectura exitosa en ese montaje. Una respuesta PRO de la caché no
alcanza mientras espera o falla la consulta. Se conservan la clave compartida de
suscripción, los guards y la política global de caché.

Los textos hablan de confirmar la suscripción: una autorización de preapproval no
acredita por sí sola el cobro de una cuota. Se conserva el éxito basado en el estado
PRO/ACTIVA informado por el servidor. DEPLOY también refleja la disponibilidad del
checkout informada por el backend y el requisito de un mismo origen HTTPS al volver.

## Verificación

Pasaron **3 pruebas Vitest** con los guards y la caché de la app: volver por historial
con PRO anterior y una respuesta nueva retenida; retorno nuevo FREE → PRO; error de
consulta, sesión conservada y recuperación al reintentar.

Pasó **1 E2E Chromium** del checkout existente extendido: una sola contratación,
retorno FREE sin confirmación, timeout de 60 segundos con reloj virtual y reintento
que confirma únicamente al recibir PRO en un GET posterior.

ESLint focalizado en los tres archivos de código/pruebas, typecheck y
`git diff --check` aprobados. No se ejecutó una nueva suite integral.

Comandos de validación desde frontend:

```bash
VITE_API_BASE_URL=http://localhost:8080 VITE_API_URL=http://localhost:8080 npx vitest run src/pages/SuscripcionResultadoPage.test.tsx
npx eslint src/pages/SuscripcionResultadoPage.tsx src/pages/SuscripcionResultadoPage.test.tsx e2e/planes.spec.ts
npm run typecheck
VITE_API_BASE_URL=http://localhost:8080 VITE_API_URL=http://localhost:8080 npx playwright test e2e/planes.spec.ts --project=chromium -g 'ADMIN contrata una vez'
git diff --check
```

La regresión de historial también se ejecutó antes de la corrección, filtrando Vitest
por `-t 'al regresar por historial'`, y falló con el comportamiento anterior.

El error del GET compartido sigue siendo capturado por SessionGate, que ofrece
reintentar conservando la sesión. No se cambia aquí la política compartida de avisos
de error. Las pruebas locales usan respuestas simuladas y no acreditan Mercado Pago.

## Estado del proveedor

El titular confirmó que el token guardado era de prueba. GET `/users/me` respondió
HTTP 200, `site_id=MLA` y tag `test_user`; se verificó una cuenta de prueba argentina.
El panel disponible requiere iniciar sesión. Faltan `MP_APPLICATION_ID` y
`MP_WEBHOOK_SECRET`, comprador identificado, HTTPS e instancia/base aisladas para el ciclo
real de prueba. No se habilitó MP ni se crearon cargos o suscripciones remotas.

Plan canónico en backend:
`docs/plans/2026-09-12-mercadopago-pruebas-y-cortes.md` (MP-B en curso, MP-C pendiente).
Esta corrección no agrega otro frente al plan de lanzamiento. Sin push ni merge.
