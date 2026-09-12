# Corte D — comprobación y cierre del pulido local

Fecha: 2026-09-12. Estado: cerrado localmente; A–D completos.

## Versiones revisadas

| Repositorio | Rama | HEAD funcional |
| --- | --- | --- |
| Frontend | `codex/frontend-refactor-checkpoint` | `affaffa` |
| Backend | `codex/lanzamiento-publico-backend` | `39a0890` |

Se revisaron conjuntamente los cortes A–C del
[plan de pulido](2026-09-12-pulido-local-y-pendientes.md). A mejoró el Excel y su
descarga (`2cbffd1` backend, `41b0f64` frontend); B conectó la oferta de Planes
(`39a0890`, `179ef71`); C mejoró Inicio/Clientes y sus errores/foco (`affaffa`).
El corte D no agrega funcionalidad ni cambia contratos, migraciones o proveedores.

## Comprobación conjunta

- Typecheck, lint completo y build local: aprobados con Node 24.14.0/npm 11.9.0.
  Vite conserva un aviso de chunk principal mayor de 500 kB (561,83 kB; gzip
  157,06 kB). No impide compilar y no se abre un refactor de bundles en este cierre.
- 16 recorridos Chromium con API simulada aprobados: Excel 3, Planes 4,
  Inicio/Clientes 6 y accesibilidad 3. Verifican descarga/nombre/error único,
  acciones por rol, contratación apagada/cancelación, retorno sin conceder PRO,
  lectura móvil, teclado/foco y carga/error/reintento/vacío.
- Laboratorio navegador → HTTP → PostgreSQL 16: aprobado. Un test orquestador
  Maven valida 14 recorridos Chromium (siete en escritorio y siete a 320 px):
  registro normal/replay/bloqueo de condiciones, titular/empleados, presupuesto
  aprobado/rechazado y entrega sin cobros, y registro/anulación/corrección de cobros
  externos. Incluye aislamiento entre talleres y comprobaciones SQL posteriores.
  Failsafe terminó con cero fallos/errores/omitidos el 2026-09-12 a las 13:25 -03.

Comandos ejecutados desde frontend:

```sh
npm run typecheck
npm run lint
npm run build
npm run check:public-release
npx playwright test e2e/export.spec.ts e2e/planes.spec.ts e2e/pulido-inicio-clientes.spec.ts e2e/a11y.spec.ts --project=chromium --workers=1
JAVA_HOME=/Users/leonardorozza/Library/Java/JavaVirtualMachines/corretto-21.0.10/Contents/Home npm run test:e2e:registration-real
```

El runner real compila con Java 21 y ejecuta sólo `LegalRegistrationBrowserE2E`,
serialmente. Crea PostgreSQL 16 efímero, usa Tomcat loopback con puerto aleatorio y
Vite 5175 exclusivo. Anula importaciones de configuración privada; email queda en
memoria con `RecordingEmailSender`, y MP/checkout están apagados. La variable de
activación de fotos no estaba presente; este laboratorio no habilita ese servicio.
El harness limpia únicamente su contenedor, procesos y directorios propios.

## Alcance de la evidencia

El laboratorio conserva deliberadamente su fixture V29; no acredita el conjunto V30
ni el recorrido de fotos privadas. La descarga/estética de Excel y la matriz nueva
de Planes se verifican por sus pruebas de contrato y los E2E simulados: no se afirma
que el laboratorio anterior pruebe esos dos cambios de extremo a extremo.

Se reutilizan las pruebas focalizadas aprobadas en A–C; no se repiten suites sin
cambios o inquietudes nuevas. No se ejecutó `clean verify`. La revisión estática
cruzada no encontró regresiones nuevas; sólo se actualizó la descripción que aún
presentaba como pendientes los cambios backend ya completados.

La revisión XLSX de A conserva su límite: el render de cuatro hojas omite algunas
características e interpreta mal ciertos identificadores de texto. POI/OOXML
acreditan los valores; no se acredita apertura interactiva en Numbers. El cierre D
no convierte ese visor en prueba de interacción con filtros o comentarios.

## Publicación e integraciones

El build local utiliza el comportamiento `--if-deploy` previsto y no acredita
publicación. El guard forzado sigue bloqueado por API HTTPS, contactos
legal/privacidad/soporte y manifiesto de publicación no configurados. El literal
de precio PRO ya no aparece. No se modificó ni eludió el guard, y este resultado
local no inspecciona la configuración privada de Vercel.

Los cinco frentes externos continúan abiertos: MP contra proveedor, fotos reales,
Email C desplegado, solicitudes/cierre e identidad legal, y despliegue/recuperación.
La identidad/contactos definitivos conservan la etapa final acordada después de
MP y Email. El siguiente bloque es MP en entorno de pruebas; no procesa cobros
entre taller y cliente. No se activó MP, enviaron correos, publicaron cambios ni
borraron cuentas de prueba durante este corte.

El cierre se guarda en un commit documental frontend, sin push ni merge. Backend
permanece sin cambios y se preservan los 77 archivos ajenos no versionados.
