# Etapa 0 — identidad del taller, cobros y resumen digital

Fecha: 2026-09-17. Estado: cerrada localmente.

Base: frontend `18906e9`, backend `2d73e39`, más los cambios de esta etapa
detallados abajo. Se ejecutó la etapa 0 del
[plan de notas OrdenFix](2026-09-17-notas-ordenfix-frontend-plan.md).
El usuario confirmó que las capturas eran locales y autorizó iniciar el backend
e ingresar con su cuenta de desarrollo. Email permanece fuera de este corte.

## Resultado sobre la cuenta local

- Login real correcto; `/perfil` devuelve taller «MVGR Reparaciones» y usuario
  «Admin Local». El nombre de la captura corresponde al dato guardado de este
  taller de prueba; no es un literal impuesto por el frontend.
- Seguimiento público y resumen digital devuelven ese mismo nombre. El backend
  del seguimiento toma el taller de la reparación identificada por el enlace.
- Sidebar, navbar móvil y saludo separan identidad del taller y del usuario.
- La cuenta contiene una reparación: total 0, cobrado 0, pendiente 0, excedente 0,
  sin revisión y `pagado=false`. No contiene el movimiento de 88.323 de la captura,
  por lo que no se afirma haber corregido ni auditado ese registro histórico.
- Resumen real HTTP 200: taller emisor, marca secundaria OrdenFix,
  `documentoFiscal=false`, leyenda informativa y sin botón Imprimir.
- La inspección de negocio fue de lectura. El navegador sólo emitió el POST de
  login; no se modificaron nombres, reparaciones, cobros ni datos históricos.

Se inició el backend con `scripts/run-local.sh application-local.properties`,
PostgreSQL local en loopback 54329 y API 8080. La configuración local mantiene
correo y Mercado Pago apagados. El frontend quedó disponible en
`http://127.0.0.1:5173`. No se guardaron credenciales ni tokens en este documento.

## Observación de producto para evaluar

La orden local tiene un presupuesto aprobado de 63.000 en el seguimiento público,
pero un total de orden de 0 en el resumen. Son valores separados en el modelo
actual: `PresupuestoService.responderInterno` registra la respuesta y cambia el
estado, sin copiar importes a la reparación. El total de orden usa
`precioFinal ?? precioEstimado ?? 0`, más repuestos efectivamente cargados
(`docs/FRONTEND_INTEGRATION.md:424`).

Esto concuerda con el contrato actual, pero puede confundir a quien espera cobrar
el presupuesto aprobado. Se registra para definir si debe existir transferencia
explícita o automática de importes, contemplando repuestos, adicionales y precios
ya cargados. No se implementó una suma automática ni se alteraron datos. El cierre
de la verificación local no resuelve esa decisión de producto.

## Corrección realizada

Se reprodujo un desborde en el encabezado público con un nombre de taller largo
sin espacios. A 320 y 390 px, el documento alcanzaba 798 px de ancho. Se añadió
`overflow-wrap:anywhere` únicamente al nombre del taller en
`src/pages/SeguimientoPage.tsx`.

La repetición visual en claro/oscuro confirmó anchos de documento 320, 390 y
1440 px iguales al viewport, conservando el nombre completo. La prueba móvil
adicional verifica el caso de 120 caracteres, las cajas de texto y la ausencia
de desborde en Chromium 320/390, horizontal y WebKit.

Capturas con datos sintéticos:

- [Antes](../evidence/2026-09-17-stage0/seguimiento-nombre-largo-antes.png):
  reproducción de la presentación anterior retirando sólo la nueva regla de
  ajuste en el navegador; el desborde ya se había medido antes de editar código.
- [Después](../evidence/2026-09-17-stage0/seguimiento-nombre-largo-despues.png):
  render de la corrección a 320 px, tema oscuro.

No se cambiaron el código de seguimiento, el calendario, selects, tablero,
dashboard ni la política de email, que pertenecen a etapas posteriores.

## Cobertura incorporada y mantenimiento de pruebas

- `src/pages/SeguimientoPage.test.tsx`: dos casos con nombres de taller distintos
  y una sesión/perfil cacheado de otro taller. Comprueban que el presupuesto usa
  la identidad del enlace y que la consulta pública no lleva Authorization.
- `e2e/seguimiento.mobile.spec.ts`: geometría real del nombre sin espacios,
  conservación del texto completo y acceso al presupuesto.
- `e2e-registration-real/empleados.spec.ts`: expectativa de descarga anónima
  actualizada de 403 a 401. El contrato actual distingue sesión ausente (401),
  empleado sin permiso (403) y GET legacy del titular (410). Evidencia:
  `ExportHttpGuardFilter.java:41`, `ExportHttpException.java:17` y
  `ExportHttpGuardFilterTest.java:25` en el backend. No se modificaron permisos
  ni se relajaron las demás expectativas.

## Validación ejecutada

| Capa | Resultado | Alcance |
| --- | --- | --- |
| Vitest de identidad | 37 aprobadas, 5 archivos | Registro, perfil, sidebar/navbar y seguimiento público. |
| Vitest de cobros/resumen | 42 aprobadas, 6 archivos | Resumen, excedentes, formulario de cobro, datos/QR, detalle y Caja. |
| Backend focalizado | 27 aprobadas, 5 clases | Perfil por taller, total cero, cobros parciales/completos, excedentes históricos, rechazo de sobrecobro y reducción incompatible de total. H2 y pruebas de dominio. |
| Playwright desktop con API simulada | 6 aprobadas | Login, seguimiento y contrato/presentación del resumen. |
| Playwright móvil con API simulada | 15 aprobadas | Identidad, excedente, datos de cobro y resumen; 320/390 px y WebKit. |
| Regresión visual nueva | 4 aprobadas | Nombre público de 120 caracteres; 320/390 px, horizontal y WebKit. |
| Laboratorio real | 14 recorridos aprobados + comprobación SQL | Navegador → HTTP/Tomcat → PostgreSQL 16 efímero; desktop y 320 px. |
| Comprobaciones de código | Aprobadas | Typecheck, ESLint completo, build local y diff sin errores de whitespace. |

El laboratorio real verifica registro, identidad de dos talleres, aislamiento,
presupuestos aprobados/rechazados y entrega sin usar Cobros, cobro completo,
anulación, corrección parcial y resumen privado para titular/empleado. Las cuentas,
movimientos y base de ese laboratorio son sintéticos y separados del PostgreSQL
local del usuario. El servidor de email es de prueba y MP está apagado.

La primera corrida tuvo 12/14 recorridos aprobados y dos fallos por la expectativa
antigua 403 de exportación anónima. Tras contrastarla con el contrato y corregirla,
la segunda corrida terminó con `BUILD SUCCESS`, cero fallos y validación SQL
posterior. El backend no tuvo cambios de código.

Comandos principales:

```sh
npx vitest run src/pages/RegisterPage.test.tsx src/hooks/useSessionIdentity.test.tsx src/components/Sidebar.test.tsx src/components/Navbar.test.tsx src/pages/SeguimientoPage.test.tsx
npx vitest run src/pages/ResumenDigitalPage.test.tsx src/components/CobroFormModal.test.tsx src/components/DatosCobroFormModal.test.tsx src/pages/CajaPage.test.tsx src/pages/ReparacionDetallePage.test.tsx src/components/PagoChip.test.tsx
# En backend, con Java 21:
./mvnw -o -B -Dtest=CobroInvariantPolicyTests,CobroTotalInvariantTests,EstadoPagoTests,CobroCajaReciboTests,PerfilTests test
# En frontend:
npx playwright test e2e/resumen-digital.spec.ts e2e/seguimiento.spec.ts e2e/auth.spec.ts --project=chromium --workers=1
npx playwright test e2e/mobile.spec.ts --grep 'identidad móvil|detalle con excedente|datos para cobrar|resumen digital' --project=mobile-320 --project=mobile-390 --project=mobile-webkit --workers=1
npx playwright test e2e/seguimiento.mobile.spec.ts --project=mobile-320 --project=mobile-390 --project=mobile-landscape --project=mobile-webkit --workers=1
npm run test:e2e:registration-real
npm run typecheck
npm run lint
npm run build
git diff --check
```

## Límites de la evidencia

- Se validó local; no se inspeccionó ni publicó staging/producción.
- Total cero y excedente se verificaron por los casos existentes y la cuenta
  local; no se recreó exactamente el movimiento histórico de 88.323 en la base
  del usuario. El cálculo contractual separa pendiente y excedente.
- El laboratorio real conserva su fixture de esquema y no acredita proveedores,
  envío de emails reales, pagos bancarios ni el bloqueo de email de la etapa 1.
- El build conserva el aviso de chunk principal superior a 500 kB (583,24 kB).
  No impide compilar. Los controles de publicación no se ejecutaron en modo
  forzado y este build no acredita un despliegue público.
- Los servicios locales se dejaron iniciados para revisión. Las pruebas no
  iniciaron cobros externos ni modificaron la cuenta de desarrollo inspeccionada.
