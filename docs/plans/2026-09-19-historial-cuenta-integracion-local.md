# Cuenta — historial legal con sesión y PostgreSQL reales

Fecha: 2026-09-19. Baselines: frontend `e751588`, backend `83cfcfb`.
Estado: cerrado localmente, con validación focal aprobada.

## Corte acotado

La integración anterior de UI y email dejaba apagado el lector privado de historial
en el laboratorio real de registro. Cuenta tenía pruebas de navegador con API
interceptada y el backend tenía pruebas HTTP con PostgreSQL y autenticación
simulada. Este corte conecta el recorrido existente completo.

Se conservan los catorce casos y las cuentas del laboratorio. La cuenta creada
consulta sus aceptaciones desde Cuenta antes y después de confirmar el email,
abre las versiones exactas de los documentos y conserva su sesión. Leer el
historial con email pendiente no habilita operaciones del taller. El empleado
debe ver su historial propio vacío aunque antes haya ingresado el titular en ese
navegador. Los IDs observados se contrastan con PostgreSQL por usuario y taller.

El backend habilita el lector sólo en el harness, con un quinto rol físico separado
y los verificadores existentes de esquema y privilegios. El rol comparte la
capacidad de materializar requisitos; no es un rol SQL puramente de lectura. No
puede insertar aceptaciones y la API de escritura de aceptaciones sigue apagada.

No cambia UI, código productivo, configuración real ni migraciones. Se mantienen
los correos sintéticos y los proveedores apagados. La publicación definitiva,
staging, MP, retención y supresión integral conservan sus pendientes. La adaptación
a otros equipos sigue guardada para el momento acordado.

Diseño backend: `docs/plans/2026-09-19-historial-cuenta-integracion-local-design.md`.

## Validación

| Comprobación | Resultado final |
| --- | --- |
| Navegador → HTTP → PostgreSQL 16 | 14/14 recorridos, escritorio y móvil de 320 px. |
| Persistencia y pertenencia | 1/1 JUnit: IDs propios, empleado sin actos, conteos y aislamiento del recorrido completo. |
| Typecheck de app y TypeScript estricto de los tres E2E | Aprobados. |
| ESLint focal y revisión de diff | Aprobados. |

El harness completo terminó con `BUILD SUCCESS` en 1:52 min, a las 10:44:35 -03,
con Java 21 y Node 24.14.0. El backend usa el esquema actual V34, cinco roles
físicos independientes y el código productivo existente. No cambió ninguna
migración. Los 179 archivos frontend no versionados conservan sus bytes originales.

La primera ejecución tomó Node 20 del entorno elevado. La pasada posterior con
Node 24 y el cambio de identidad sin recargar la SPA detectó dos casos fallidos
por un selector ambiguo: el `status` de baja coincidía también con un aviso de login. Se precisó
el selector por su texto, conservando la comprobación del mensaje completo; el
harness final repitió los catorce casos y la verificación SQL. No se suman las
repeticiones ni se omiten los fallos previos. No cambió comportamiento productivo.

Comprobaciones frontend reproducibles:

```sh
npm run typecheck
npx eslint e2e-registration-real/helpers.ts e2e-registration-real/registro.spec.ts e2e-registration-real/empleados.spec.ts
npx tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler --jsx react-jsx --lib ES2022,DOM,DOM.Iterable --types node,vite/client e2e-registration-real/helpers.ts e2e-registration-real/registro.spec.ts e2e-registration-real/empleados.spec.ts
```

El comando Maven y su preparación están en el diseño backend. Log final:
`/private/tmp/ordenfix-cuenta-history-browser-approved-20260919.log`.
No se repitieron Vitest, build ni clean verify porque sólo cambian pruebas y
documentación; la incidencia era el selector del test. Los servidores efímeros
se cierran al terminar. Un commit atómico por repositorio, sin push.
