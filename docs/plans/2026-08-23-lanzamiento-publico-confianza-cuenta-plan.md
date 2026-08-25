# Plan de implementación — Lanzamiento público, Centro de Confianza y ciclo de vida de la cuenta

Fecha: 2026-08-23

Diseño aprobado: `docs/plans/2026-08-23-lanzamiento-publico-confianza-cuenta-design.md`

## Objetivo

Preparar OrdenFix para un lanzamiento público pago con:

- documentos legales públicos, legibles, editables y versionados;
- aceptación auditable al registrar administrador y en el primer acceso de empleados;
- consentimiento contextual para fotos, PIN y patrón;
- precio y condiciones PRO provenientes del backend;
- checkout, retorno y cancelación al final del período correctamente modelados;
- arrepentimiento, revisión de cobro y referencias de gestión;
- exportación integral, cierre con siete días de recuperación y posterior eliminación/anonimización;
- controles estáticos y remotos que impidan publicar una configuración incompleta;
- experiencia accesible y estable desde 320 px.

## Límites de repositorio

Este plan se ejecuta en:

```text
/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend
```

El backend Java vive en:

```text
/Volumes/DiscoExtern/Desktop/mvrg-backend
```

Alcance actualizado el 2026-08-23: el usuario autorizó modificar también el backend cuando sea un
prerrequisito del lanzamiento. Cada cambio Java se realiza en su propio repositorio, rama, documento
de fase y commit atómico. Los `BACKEND-HANDOFF` se conservan como fronteras contractuales, pero ahora
pueden resolverse desde este trabajo antes de conectar el frontend.

No se hará push. Cada unidad se guardará en un commit atómico. No se tocarán los directorios del usuario `.agents/` ni `public/OrdenFix project naming/`.

## Decisiones de implementación

### Fuente contractual

- Backend es la fuente de verdad de documentos publicados, requisitos, versiones, digests, oferta PRO y estados de gestiones.
- Frontend conserva borradores editables bajo `docs/legal/drafts/` para revisión y handoff, pero nunca los usa como fallback silencioso durante una aceptación.
- Si el endpoint contractual falla, la lectura muestra error/reintento y cualquier aceptación o checkout queda bloqueado.

### Despliegue coordinado

Los cambios incompatibles se publican en este orden:

1. Backend agrega recursos nuevos y alias compatibles sin retirar los anteriores.
2. Staging valida contrato y migraciones.
3. Frontend empieza a usar el contrato nuevo.
4. Telemetría demuestra que no quedan clientes usando alias.
5. Backend retira contratos legacy en una versión posterior.

El registro con aceptaciones no se despliega antes de que backend las persista atómicamente. El nuevo botón de cancelación no se habilita antes de que backend conserve PRO hasta fin de período.

### Idempotencia en frontend

- Cada operación crea una clave UUID una sola vez por intento lógico.
- Un re-render o reintento de red conserva la misma clave.
- Una modificación del formulario después de una respuesta definitiva crea una clave nueva.
- En invitaciones, verificaciones y reautenticación, backend busca primero el replay por clave/fingerprint y luego valida el token de un solo uso; así una respuesta perdida puede repetirse sin ejecutar dos veces.
- Una intención de foto utilizable conserva clave; una intención `EXPIRADA` o `FALLIDA` inicia otro intento lógico con clave nueva.
- La clave se envía en `Idempotency-Key` y nunca se usa como identificación visible de la gestión.
- No se persiste globalmente entre cuentas; se descarta en logout o cambio de tenant.

### Contenido Markdown

Los documentos publicados llegan como Markdown sin HTML arbitrario. Se renderizan con `react-markdown`, sin habilitar `rehypeRaw`, y con componentes propios para enlaces y headings. Las rutas legales se cargan de forma lazy para no incorporar el renderer al bundle privado inicial.

## Dependencias entre carriles

```text
Documentos y release guard (frontend puro)
  ├─ Centro Legal público
  └─ links y aviso en seguimiento

Contrato legal backend
  ├─ registro auditable
  ├─ gate de empleados
  └─ reaceptación

Estado de cuenta backend
  └─ AccountLifecycleGate
       ├─ exportación
       └─ cierre/restauración

Oferta y suscripción backend
  ├─ ficha PRO
  ├─ checkout
  ├─ resultado
  └─ cancelación al final del período

Upload privado backend
  └─ atestación + fotos/credenciales
```

## Tarea 0 — Checkpoint y baseline

### Acciones

1. Confirmar rama `codex/frontend-refactor-checkpoint`.
2. Confirmar que sólo estén sin rastrear los directorios del usuario ya conocidos.
3. Ejecutar la suite actual antes de cambiar comportamiento.
4. Guardar conteos de pruebas y tamaño de bundles para comparar al final.

### Verificación

```bash
git status --short --branch
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

No se crea commit para esta tarea.

## Tarea 1 — Crear borradores legales y configuración editable

### Archivos frontend

- Crear `docs/legal/README.md`.
- Crear `docs/legal/drafts/terminos.md`.
- Crear `docs/legal/drafts/privacidad.md`.
- Crear `docs/legal/drafts/tratamiento-datos.md`.
- Crear `docs/legal/drafts/condiciones-pro.md`.
- Crear `docs/legal/drafts/cancelaciones-reembolsos.md`.
- Crear `docs/legal/drafts/cierre-cuenta.md`.
- Crear `docs/legal/drafts/aviso-clientes-taller.md`.
- Crear `docs/legal/publication-manifest.schema.json`.
- Crear `docs/legal/examples/publication-manifest.example.json`.
- Crear `src/config/legalContact.ts`.
- Actualizar `.env.example` o crearla si el repositorio no la posee.

### Implementación

1. Escribir borradores originales en lenguaje claro, sin copiar términos de terceros.
2. Mantener visibles:
   - `[RAZÓN SOCIAL]`;
   - `[CUIT]`;
   - `[DOMICILIO]`;
   - `[EMAIL LEGAL]`;
   - `[EMAIL PRIVACIDAD]`;
   - `[JURISDICCIÓN]`;
   - `[HORARIO DE ATENCIÓN]`.
3. Documentar por archivo propietario, versión, estado de revisión y fecha de vigencia pretendida.
4. Aclarar en todos los borradores que requieren revisión jurídica/contable antes del cobro público.
5. Incluir la política aprobada: cancelar renovación conserva PRO hasta fin de período y no genera prorrateo automático, salvo error, arrepentimiento aplicable o exigencia legal.
6. En el aviso del taller, explicar que el cliente se relaciona con el taller y OrdenFix es la plataforma técnica.
7. Definir un manifiesto de publicación con tipo, locale, contextos, versión, `vigenteDesde`, archivo fuente y digest. El manifiesto real sólo se completa después de la revisión profesional.
8. Validar el manifiesto real contra `publication-manifest.schema.json`, además de los invariantes que JSON Schema no puede resolver: unicidad, referencias, confinamiento de rutas, texto canónico, SHA-256 exacto y correspondencia entre contexto, rol y documentos.
9. Exigir cobertura explícita para registro del `ADMIN_TITULAR`, primer ingreso de `USER`, contratación PRO, atestaciones de fotos/credenciales para ambos roles y cierre por `ADMIN_TITULAR`.
10. Documentar el procedimiento: revisión → digest → dry-run backend → publicación inmutable en staging → readiness → promoción de vigencia. Una corrección crea otro `publicationId`; no se sobrescribe una publicación importada. No se necesita una UI administrativa.

### Pruebas

- Test de configuración que rechace emails o URLs vacíos cuando se fuerza modo público.
- Test que enumere exactamente los placeholders conocidos para que ninguno se esconda mediante una variante tipográfica.

### Verificación

```bash
rg -n '\[(RAZÓN SOCIAL|CUIT|DOMICILIO|EMAIL LEGAL|EMAIL PRIVACIDAD|JURISDICCIÓN|HORARIO DE ATENCIÓN)\]' docs/legal/drafts
npm test -- src/config
```

### Commit frontend

```text
docs(legal): agrega borradores editables de lanzamiento
```

## Tarea 2 — Implementar el guard estático de release público

### Archivos frontend

- Crear `scripts/check-public-release.mjs`.
- Crear `scripts/lib/public-release-validation.mjs`.
- Crear `scripts/check-public-release.test.mjs` y cablearlo con `node --test`, o mover la lógica pura a `src/config/publicRelease.test.ts`; los tests bajo `scripts/` no entran en el include actual de Vitest.
- Crear `src/config/apiBaseUrl.ts` y su prueba unitaria.
- Modificar `package.json`.
- Modificar `.github/workflows/ci.yml`.
- Modificar `vercel.json` para que el build productivo use la ruta protegida.
- Modificar `src/api/axios.ts`.
- Modificar `DEPLOY.md`.

### Implementación

1. Agregar:
   - `check:public-release`;
   - `build:public`;
   - check condicional ejecutado también por el `npm run build` real, con niveles distintos para desarrollo, CI/preview y producción.
2. El check estático valida:
   - ausencia de placeholders en los archivos incluidos;
   - `VITE_API_BASE_URL` o `VITE_API_URL` HTTPS explícita;
   - emails legal, privacidad y soporte;
   - ausencia de localhost en producción;
   - ausencia del precio PRO hardcodeado;
   - ausencia de preset unsigned de Cloudinary al cerrar la migración.
3. En desarrollo se permite el fallback localhost actual.
4. En CI y preview se ejecuta el nivel `runtime`: exige una base de API HTTPS pública y explícita, sin obligar todavía a contar con el manifiesto legal aprobado.
5. En producción o con `ORDENFIX_PUBLIC_RELEASE=true` se ejecuta el nivel `public`: valida runtime, contactos, manifiesto legal, digests/cobertura y bloqueos estáticos.
6. Fuera de desarrollo, `axios.ts` no construye clientes si falta una base explícita válida.
7. Los errores del script nombran exactamente la variable o archivo pendiente y nunca imprimen secretos ni targets controlados sin sanitizar.
8. `vercel.json`/CI no pueden saltear el nivel que les corresponde: la misma ruta de build ejecuta el guard antes de TypeScript/Vite.
9. Un build público que supera el precheck vuelve a escanear el `dist/` generado para cubrir
   archivos copiados desde `public/`, módulos transformados y otras entradas que no estén bajo
   `src/`.

### Pruebas

- Desarrollo permite localhost.
- Producción sin URL falla.
- Producción con HTTP falla.
- CI/preview sin URL falla en el nivel runtime y con una API HTTPS pública puede continuar sin acreditar readiness público.
- Placeholder conocido falla.
- Configuración completa pasa.
- `VERCEL_ENV=production npm run build` ejecuta el guard real y falla con placeholders.
- Un valor sensible no aparece completo en el log de error.

### Verificación

```bash
npm run build
CI=true VITE_API_BASE_URL=https://ci-api.ordenfix.com npm run build
npm run check:public-release
ORDENFIX_PUBLIC_RELEASE=true npm run check:public-release
VERCEL_ENV=production npm run build
npm run typecheck
npm run lint
```

Los tres comandos que fuerzan el nivel público seguirán fallando de forma intencional hasta
completar la identidad legal y retirar los demás bloqueos de lanzamiento. Ese fallo se documenta
como gate, no como regresión del build local ni del nivel runtime de CI/preview.

El build local saltea el guard de publicación. El build de CI/preview sólo prueba runtime. Los
comandos públicos deben permanecer bloqueados mientras existan placeholders/contactos pendientes,
precio PRO fijo o carga Cloudinary unsigned/directa.

### Commit frontend

```text
build(release): bloquea configuraciones públicas incompletas
```

## Registro de ejecución — Fase 1

Este registro separa los resultados comprobados al iniciar de los que deben anotarse al cerrar el
hardening. No autoriza publicación ni reemplaza los smokes remotos de las fases posteriores.

| Corte | Tests | Typecheck / lint / build | E2E | Bundle principal |
|---|---|---|---|---|
| Baseline previo | 80 archivos / 469 tests | verdes | 110/110 | 516,85 kB |
| Post Fase 1 | 82 archivos / 498 Vitest + 28 guard | verdes; local y CI/runtime | 110/110 | 519,43 kB |

- Auditoría de dependencias al cierre: se retiraron todas las alertas altas mediante seis
  actualizaciones compatibles. Queda una alerta baja de `esbuild`, limitada al servidor de
  desarrollo en Windows; resolverla exige evaluar Vite 8 por separado y no afecta el bundle
  publicado ni el despliegue Linux actual.
- El guard y el build forzado de producción fallan como se espera mientras continúan los bloqueos
  explícitos de lanzamiento; la fixture pública completa del validador sí pasa de punta a punta.

- Alcance: sólo `/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend`.
- Backend Java: no fue modificado durante esta primera fase; los cambios contractuales continuaban
  pendientes como `BACKEND-HANDOFF` al momento de cerrar estas validaciones.
- Git remoto: no se hizo push. Los commits atómicos de la fase se crean después del cierre de
  validaciones y permanecen sólo en esta rama local.

## Fase 2.0 — Cerrar el invariante del titular en backend

### Estado

Completada el 2026-08-23 antes de iniciar la integración legal, porque el backend permitía crear o
promover un segundo `ADMIN` aunque el diseño aprobado define un titular único y empleados `USER`.

- Repositorio hermano backend: `mvrg-backend`.
- Rama local: `codex/lanzamiento-publico-backend`.
- Commit local: `c94d334 fix(usuarios): garantiza un titular admin por taller`.
- Documento propietario:
  `docs/plans/2026-08-23-admin-titular-unico-design.md` dentro del backend.
- Migración: `V26__admin_titular_unico.sql`, fail-closed ante usuarios sin tenant, roles desconocidos
  o múltiples administradores históricos; no decide automáticamente quién representa al taller.
- Compatibilidad: el wire conserva `ADMIN`/`USER`; `role: USER` todavía se acepta en el alta mientras
  el frontend deja de enviarlo, pero cualquier promoción/degradación se rechaza.

### Verificación

- `RolTests`: 7/7.
- Compilación de aplicación y tests con Java 21: aprobada.
- La suite rápida ejecutó 185 pruebas: 184 pasaron y una prueba preexistente produjo un falso positivo
  al encontrar el PIN de fixture `7391` dentro de los microsegundos de un timestamp. No se mezcló esa
  corrección con esta fase.
- El bloqueo ambiental de `PostgresMigrationIT` quedó despejado durante la Fase 2.2: sus siete casos
  pasaron sobre PostgreSQL/Testcontainers, incluidos los dos escenarios de V26 y el upgrade
  V26 → V27 con preservación de usuarios y talleres.
- No se hizo push.

## Fase 2.1 — Congelar el contrato legal del backend

### Estado

Completada el 2026-08-23 como fase exclusivamente contractual. No crea tablas, controllers,
allowlists, seeds ni UI y, por lo tanto, los endpoints todavía no están disponibles en runtime.

- Repositorio hermano backend: `mvrg-backend`.
- Rama local: `codex/lanzamiento-publico-backend`.
- Documento de decisiones:
  `docs/plans/2026-08-23-legal-api-contract-v1-design.md` dentro del backend.
- Fuente normativa del wire: sección 4.1.a de `FRONTEND_INTEGRATION.md` dentro del backend.
- Se conserva `ADMIN`/`ROLE_ADMIN` como representación wire del titular único; `ADMIN_TITULAR` es
  audiencia legal interna y no un claim nuevo.
- Se agregó al contrato `GET /api/aceptaciones-legales`, porque la matriz de permisos ya prometía
  consultar evidencia propia pero el handoff original sólo definía el POST.
- El catálogo público descubre versiones vigentes e históricas. Un documento exacto `VIGENTE`
  revalida su estado; el catálogo pagina resúmenes sin Markdown y sólo
  `REEMPLAZADA`/`RETIRADA`, que son terminales, usan caché `immutable`.
- El estado documental es global: versiones vigentes de un tipo+locale no solapan contextos y el
  reemplazo multicontexto debe cubrirlos todos transaccionalmente; un retiro explícito puede dejar
  un hueco y hace fallar cerrado cualquier set afectado.
- `requiresReacceptance` de requisito y documentos se combina con OR sobre todas las versiones
  intermedias de sus keys estables. Un carry-forward editorial sólo satisface el cálculo de
  pendientes: no fabrica una aceptación ni una fecha, y el frontend no intenta inferirlo.
- `requiredSetRevision` y `documentSetRevision` son opacos para el cliente, con formato servidor
  `sha256:<hex>` y ETag correspondiente.
- Registro y aceptación usan el header exacto `Idempotency-Key`; un replay de registro emite un JWT
  nuevo sin persistir contraseña, body o token.
- `409 DOCUMENTOS_LEGALES_DESACTUALIZADOS`, `428 ACEPTACION_LEGAL_REQUERIDA` y los errores de
  validación/fail-closed tienen `details` tipados.
- Una operación legal concurrente espera hasta cinco segundos y luego usa
  `409 IDEMPOTENCY_EN_PROGRESO` + `Retry-After: 1` si todavía no terminó.
- La implementación backend debe exponer por CORS `Retry-After`, `X-RateLimit-Limit` y
  `X-RateLimit-Remaining` además de `Authorization`; hoy `CorsConfig` no permite que Axios los lea.

### Efecto sobre la integración frontend

- Los tipos mínimos siguientes continúan vigentes, pero sus envelopes exactos se toman del contrato
  backend y no de ejemplos abreviados de este plan.
- La lectura de aceptaciones propias forma parte de la integración.
- Requisitos y aceptaciones autenticados no pueden heredar el `staleTime` global: usan
  `staleTime: 0`, recolección inmediata o limpieza explícita y query keys ligadas a sesión.
- `BACKEND-HANDOFF 1` todavía no está disponible en staging. La Fase 2.2 ya dejó implementada la
  persistencia append-only; mini-fases backend posteriores deben importar/promover contenido y
  exponer lectura/escritura con enforcement apagado antes de conectar queries reales.
- No se hizo push.

## Fase 2.2 — Persistencia legal append-only del backend

### Estado

Completada y verificada el 2026-08-23 como base interna de persistencia. No crea todavía una API
consumible por el frontend.

- Repositorio hermano backend: `mvrg-backend`.
- Rama local: `codex/lanzamiento-publico-backend`.
- Commits locales:
  - `8b4b7b1 feat(db): agrega persistencia legal append-only`;
  - `984d108 feat(legal): mapea persistencia relacional`;
  - `cbb5bf1 test(legal): cubre invariantes y concurrencia`;
  - `e3df78a docs(legal): registra cierre fase 2.2`.
- Documentos propietarios backend:
  `docs/plans/2026-08-23-legal-persistence-append-only-design.md` y
  `docs/plans/2026-08-23-legal-persistence-append-only-implementation.md`.
- Flyway V27 agrega 25 tablas legales, 47 funciones `legal_*` y 77 triggers, sin datos semilla.
- JPA agrega 25 entities, 20 repositorios y 7 proyecciones; Hibernate valida el esquema V27.
- PostgreSQL protege el grafo editorial append-only, estados y slots, reemplazos split/merge,
  snapshots, evidencia exacta, metadata cifrada purgable por tombstone e idempotencia.
- Los timestamps críticos son autoritativos del servidor; las funciones fijan su `search_path`; los
  protocolos con lock y relectura fallan cerrado fuera de `READ COMMITTED` y los sellos se
  serializan antes de tomar locks de fila.

### Verificación

- `PostgresMigrationIT`: 7/7, desde cero, upgrade V26 → V27, schema personalizado y datos
  preexistentes preservados.
- `LegalPersistenceIT`: 9/9.
- `LegalConcurrencyIT`: 7/7, incluidas carreras insert-vs-sello, sellos cruzados, orden de linaje y
  reemplazos solapados.
- `./mvnw verify`: 185 pruebas unitarias y 28 pruebas de integración, sin fallos ni errores.
- No se hizo push.

### Alcance siguiente

Esta fase no agrega controllers, endpoints HTTP, allowlists públicas, importador operativo,
contenido/seed legal, enforcement, `428`, cambios de registro/login, seguridad, CORS ni UI.
`BACKEND-HANDOFF 1` sigue sin estar disponible en staging hasta implementar y desplegar las capas de
lectura/escritura del contrato.

La validación estática, lectura confinada y canonicalización RFC 8785 se completaron después en la
Fase 2.3A. El próximo minicorte pendiente es el dry-run JDBC transaccional; sellado/promoción,
readiness, APIs y aceptación atómica continúan en cortes posteriores, todavía con enforcement
apagado.

## Fase 2.3A — Manifiesto legal v1 y paridad estática cross-repo

### Estado

Corte estático completado y verificado el 2026-08-24. Congela el artefacto que podrá consumir el
importador, pero todavía no escribe en PostgreSQL ni habilita `BACKEND-HANDOFF 1`.

- Backend local `mvrg-backend`, rama `codex/lanzamiento-publico-backend`:
  - `b884b15 build(legal): congela schema y dependencias del manifiesto`;
  - `d2a52d9 feat(legal): agrega parser estricto y canonicalizacion RFC 8785`;
  - `dd6dfb5 feat(legal): confina fuentes y valida Markdown legal`;
  - `1f26ca7 feat(legal): valida contrato y cobertura del release`;
  - `a6cb9fd test(legal): actualiza handshake con mirror frontend`.
- Frontend local, rama `codex/frontend-refactor-checkpoint`:
  - `d38e276 fix(legal): alinea guard con contrato backend v1`.
- No se hizo push en ninguno de los dos repositorios.

### Contrato congelado

- `publication-manifest.schema.json` es idéntico byte a byte: 10.547 bytes y SHA-256
  `f7a4ee17f53f5ed3f2613d894fa3a4f46896dfaaec0c80dab055e4320f036f8b`.
- El schema limita 128 documentos, 256 requisitos y 16 documentos por requisito, y comparte la
  política reforzada de email público.
- La fixture golden completa contiene 11 documentos y 6 requisitos obligatorios que cubren 8
  scopes `contexto:rol`.
- La cobertura se agrega entre requisitos `required=true`; los opcionales no acreditan cobertura,
  pero sí vinculan documentos. Los tipos documentales repetidos son válidos si no colisionan key,
  versión ni fuente.
- El inventario hermético conserva 35 códigos frontend, excluye `CONTACT_MISMATCH` por ser sólo de
  deploy y reserva `MANIFEST_DUPLICATE_DOCUMENT_TYPE` por compatibilidad histórica sin emitirlo.
- Publisher, referencias profesionales, afirmaciones y documentos bloquean placeholders o marcas
  editoriales fragmentadas con Markdown/Unicode.
- Los documentos exigen texto canónico y digest exacto, primer H1 ATX visible/plano de hasta 300
  code points, y bloquean HTML semántico, autolinks angle no permitidos y destinos activos incluso
  en definiciones no usadas. Código inline/fenced permanece inerte.
- El frontend usa `mdast-util-from-markdown` sólo en el guard de build; el backend conserva la
  autoridad, su reader confinado, snapshots inmutables, parser estricto y canonicalización JCS.

### Límites y frontera de seguridad

El frontend comparte las reglas publicables y canonicales necesarias para bloquear un build
incorrecto. El backend agrega límites autoritativos de bytes/profundidad/tokens/strings, Markdown
por archivo y total, cantidad de issues, lectura sin symlinks y publicación por snapshot. El
typestate validado evita que el camino normal publique un release no comprobado; no se presenta
como defensa criptográfica frente a reflection ni elimina por sí solo todo TOCTOU del filesystem.
El CUIT v1 valida formato, no checksum ni existencia fiscal.

### Verificación

- Backend: 91 tests enfocados del manifiesto y suite Maven completa de 497 tests, sin fallos,
  errores ni skips.
- Frontend: 82 archivos/498 tests Vitest y 42 tests del guard, todos aprobados.
- Frontend: typecheck, ESLint, build local y `git diff --check`, aprobados.
- Schema: comparación byte a byte, tamaño y hash aprobados.
- Auditoría npm: permanece una alerta baja preexistente de `esbuild`, acotada al servidor de
  desarrollo en Windows; no fue introducida por el parser Markdown ni se mezcló con este corte.

### Alcance siguiente

El Corte 5 debe ejecutar un dry-run JDBC transaccional contra la persistencia V27 y demostrar
rollback sin residuos ante cualquier fallo. Después siguen la CLI/importación-promoción y el cierre
regresivo del plan. Hasta desplegar además los cortes HTTP y de aceptación, la Tarea 3 no debe
conectar queries reales y `BACKEND-HANDOFF 1` permanece no disponible en staging.

## Tarea 3 — Modelar documentos y requisitos legales remotos

### Dependencia

`BACKEND-HANDOFF 1` disponible en staging.

### Archivos frontend

- Crear `src/legal/legal.types.ts`.
- Crear `src/api/queries/legal.queries.ts`.
- Crear `src/api/mutations/legal.mutations.ts`.
- Modificar `src/api/queryKeys.ts`.
- Modificar `src/api/errors.ts` si hace falta un helper de details tipado.
- Integrar `GET /api/aceptaciones-legales` para la evidencia propia.
- Crear pruebas junto a queries y mutations.

### Tipos mínimos

```ts
type LocaleLegal = 'es-AR';
type TipoActoLegal = 'ACEPTACION' | 'LECTURA' | 'DECLARACION';
type EstadoDocumentoLegal = 'VIGENTE' | 'REEMPLAZADA' | 'RETIRADA';
type ContextoLegal =
  | 'REGISTRO'
  | 'PRIMER_INGRESO_EMPLEADO'
  | 'USO_CONTINUADO'
  | 'CONTRATACION_PRO'
  | 'ATESTACION_FOTOS'
  | 'ATESTACION_CREDENCIALES'
  | 'CIERRE_CUENTA'
  | 'ARREPENTIMIENTO';
type TipoDocumentoLegal =
  | 'TERMINOS_SERVICIO'
  | 'POLITICA_PRIVACIDAD'
  | 'ACUERDO_TRATAMIENTO_DATOS'
  | 'CONDICIONES_PRO'
  | 'POLITICA_CANCELACIONES_REEMBOLSOS'
  | 'POLITICA_CIERRE_CUENTA'
  | 'AVISO_CLIENTES_TALLER'
  | 'TERMINOS_USUARIO'
  | 'AVISO_PRIVACIDAD_USUARIO'
  | 'COMPROMISO_CONFIDENCIALIDAD'
  | 'ATESTACION_DATOS_CLIENTE';

interface DocumentoLegalVersion {
  id: string;
  tipo: TipoDocumentoLegal;
  version: string;
  titulo: string;
  contenidoMarkdown: string;
  sha256: string;
  vigenteDesde: string;
  estado: EstadoDocumentoLegal;
  locale: LocaleLegal;
}

interface DocumentoLegalResumen {
  id: string;
  tipo: TipoDocumentoLegal;
  version: string;
  titulo: string;
  sha256: string;
  vigenteDesde: string;
  estado: EstadoDocumentoLegal;
  locale: LocaleLegal;
}

interface PageMeta {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

interface DocumentosLegalesResponse {
  contexto: ContextoLegal | null;
  locale: LocaleLegal;
  documentSetRevision: string;
  documentos: DocumentoLegalResumen[];
  page: PageMeta;
}

interface RequisitoLegalVersion {
  id: string;
  contexto: ContextoLegal;
  tipoActo: TipoActoLegal;
  afirmacion: string;
  afirmacionSha256: string;
  documentos: DocumentoLegalVersion[];
  requerido: boolean;
}

interface RequisitosLegalesPublicosResponse {
  contexto: ContextoLegal;
  locale: LocaleLegal;
  requiredSetRevision: string;
  requisitos: RequisitoLegalVersion[];
}

interface RequisitosLegalesPendientesResponse {
  locale: LocaleLegal;
  requiredSetRevision: string;
  requisitos: RequisitoLegalVersion[];
}

interface AceptacionLegalInput {
  requisitoVersionId: string;
  tipoActo: TipoActoLegal;
  afirmacionSha256: string;
  documentos: Array<{ documentoVersionId: string; sha256: string }>;
  confirmado: true;
}

interface AceptacionesLegalesRequest {
  requiredSetRevision: string;
  aceptacionesLegales: AceptacionLegalInput[];
}

interface AceptacionLegalResponse {
  id: string;
  requisitoVersionId: string;
  contexto: ContextoLegal;
  tipoActo: TipoActoLegal;
  afirmacion: string;
  afirmacionSha256: string;
  documentos: Array<{
    documentoVersionId: string;
    tipo: TipoDocumentoLegal;
    version: string;
    titulo: string;
    sha256: string;
  }>;
  aceptadoEn: string;
}

interface AceptacionesLegalesPage {
  content: AceptacionLegalResponse[];
  page: PageMeta;
}
```

`BORRADOR` y `PUBLICADA` son estados editoriales backend y no se exponen en ninguna API consumidora
v1, ni pública ni autenticada. Nunca pueden presentarse o aceptarse anticipadamente.

### Implementación

1. Separar queries públicas de las autenticadas.
2. Paginar el catálogo de resúmenes; solicitar Markdown únicamente al abrir la versión exacta por
   UUID. El backend no devuelve `href`; la query arma `/public/documentos-legales/{id}` sobre el
   cliente cuya base ya termina en `/api`.
3. Delegar ETag/revalidación al caché HTTP del navegador mediante headers del servidor; no enviar manualmente `If-None-Match`, porque Axios trata un `304` sin body como respuesta no exitosa salvo configuración/caché adicional.
4. No persistir contenido legal en `localStorage`.
5. Conservar versiones históricas únicamente en caché de memoria.
6. Validar forma mínima del contrato antes de habilitar aceptación.
7. Un documento vacío, sin digest o sin versión se trata como contrato incompleto.
8. Catálogo, requisitos públicos y documento exacto `VIGENTE` revalidan con ETag; requisitos
   autenticados y aceptaciones usan `private, no-store`.
9. Un documento exacto todavía `VIGENTE` se revalida porque su estado puede cambiar; sólo los estados
   terminales `REEMPLAZADA` y `RETIRADA` son `immutable`.
10. Las queries autenticadas legales usan `staleTime: 0`, no heredan el default global y se purgan al
   cambiar sesión o tenant.
11. Tratar `GET /api/requisitos-legales` como la decisión autoritativa de pendientes. El frontend no
    recibe `requiresReacceptance` ni intenta heredar aceptaciones comparando versiones o digests.
12. La mutación conserva un objeto de intento inmutable con la misma `Idempotency-Key` y el mismo
    payload. Ante `409 IDEMPOTENCY_EN_PROGRESO`, respeta `Retry-After: 1` y hace reintentos acotados
    con ese intento exacto; nunca rota la clave, reconstruye el body ni lo trata como conflicto
    definitivo. Si agota la espera, muestra estado “procesando” y permite reintentar el mismo intento
    o refetchear, sin habilitar un submit nuevo accidental.
13. Verificar en un smoke CORS real que Axios puede leer `Retry-After` y `X-RateLimit-*`; no intentar
    leer ni gestionar `ETag` desde JavaScript.

### Pruebas

- Conjunto vigente válido.
- Catálogo paginado devuelve resúmenes sin Markdown y la apertura consulta el UUID exacto.
- Documento histórico visible con advertencia.
- Revalidación repetida conserva el contenido; un smoke HTTP del deployment confirma ETag/304 real.
- Documento incompleto bloquea aceptación.
- `409 DOCUMENTOS_LEGALES_DESACTUALIZADOS` expone el nuevo conjunto sin perder el formulario consumidor.
- `409 IDEMPOTENCY_EN_PROGRESO` respeta `Retry-After`, conserva key/payload entre reintentos y un
  replay exitoso no duplica evidencia.
- El smoke cross-origin expone los headers de retry/rate limit y deja la revalidación ETag al
  navegador.

### Commit frontend

```text
feat(legal): integra documentos y requisitos versionados
```

## Tarea 4 — Construir el Centro de Confianza público

### Dependencias

- Tarea 3.
- `BACKEND-HANDOFF 1` disponible en staging.
- Instalar `react-markdown` y actualizar lockfile.

### Archivos frontend

- Crear `src/layouts/LegalLayout.tsx`.
- Crear `src/components/legal/LegalDocument.tsx`.
- Crear `src/components/legal/LegalSummarySheet.tsx`.
- Crear `src/components/legal/LegalTableOfContents.tsx`.
- Crear `src/components/legal/LegalVersionBadge.tsx`.
- Crear `src/components/legal/LegalLinks.tsx`.
- Crear `src/pages/LegalCenterPage.tsx`.
- Crear `src/pages/LegalDocumentPage.tsx`.
- Modificar `src/router/index.tsx`.
- Crear pruebas de componentes y páginas.

### Implementación

1. Agregar rutas lazy públicas:
   - `/legal`;
   - `/terminos`;
   - `/privacidad`;
   - `/tratamiento-datos`;
   - `/condiciones-pro`;
   - `/cancelaciones-reembolsos`;
   - `/cerrar-cuenta`;
   - `/aviso-clientes-taller`;
   - `/legal/documentos/:versionId` para una versión histórica exacta.
2. No envolverlas en `PublicRoute`: deben abrir con o sin sesión.
3. Usar `LegalLayout` con Logo, ThemeToggle, skip link, main/article y footer.
4. Renderizar Markdown sin HTML crudo.
5. Generar IDs estables para headings y un índice accesible.
6. En desktop usar índice sticky; en móvil, `<details>` antes del documento.
7. Mostrar versión, vigencia, estado e historial.
8. Cada versión histórica tiene una URL estable, recargable y compartible; nunca se resuelve sólo desde estado de navegación.
9. Longitud de lectura de 68–72 caracteres y una sola columna desde 320 px.
10. En error, mostrar estado completo y reintento; nunca contenido parcial.

### Pruebas

- Semántica `header/main/article/nav`.
- Headings e índice coinciden.
- Anchor deep link mueve foco al heading.
- Documento histórico se identifica como reemplazado.
- Markdown no ejecuta HTML o scripts.
- Error y reintento.
- Tema oscuro y reduced motion.

### Verificación

```bash
npm test -- src/components/legal src/pages/Legal
npm run typecheck
npm run lint
npm run build
```

### Commit frontend

```text
feat(legal): publica centro de confianza accesible
```

## Tarea 5 — Agregar enlaces legales y aviso de seguimiento

### Archivos frontend

- Modificar `src/pages/LoginPage.tsx`.
- Modificar `src/pages/RegisterPage.tsx` sólo para enlaces, todavía sin submit contractual.
- Modificar `src/pages/SeguimientoPage.tsx`.
- Modificar layouts o shells públicos reutilizados.
- Crear/ampliar pruebas de login, registro y seguimiento.

### Implementación

1. Mostrar Términos, Privacidad y soporte en login/registro.
2. Agregar al seguimiento:

```text
Tus datos fueron cargados por el taller para gestionar esta reparación.
Conocé cómo se utilizan y cómo ejercer tus derechos.
```

3. Mantener al taller como prestador principal y a OrdenFix como plataforma.
4. Enlazar a la explicación efectiva de privacidad, contactos y ejercicio de derechos. La plantilla editable para clientes queda sólo dentro de Cuenta para el administrador y nunca se presenta como aviso ya adoptado por el taller.
5. No agregar checkbox al cliente final.
6. No exponer fotos, credenciales, notas internas o identificadores de otros recursos.

### Pruebas

- Links accesibles sin sesión.
- Seguimiento identifica taller y plataforma.
- No existe un consentimiento del cliente final.
- Responsive 320 px sin overflow.

### Commit frontend

```text
feat(legal): enlaza privacidad en superficies públicas
```

## Tarea 6 — Incorporar estado de cuenta y AccountLifecycleGate

### Dependencia

- Tarea 3.
- `BACKEND-HANDOFF 2` disponible en staging.

Este corte implementa estado, aceptación y logout. Las demás vías de salida se conectan por
capacidad sólo cuando existen sus pares backend/frontend: baja personal (`BACKEND-HANDOFF 3` y
Tareas 8/14), cancelación PRO (`BACKEND-HANDOFF 6` y Tarea 12), baja/revisión
(`BACKEND-HANDOFF 7` y Tarea 13), exportación (`BACKEND-HANDOFF 8` y Tarea 15) y
cierre/supresión (`BACKEND-HANDOFF 9` y Tarea 16). La ausencia de esas dependencias no se disfraza
con botones inertes ni llamadas legacy.

### Archivos frontend

- Ampliar `src/types/index.ts` o crear `src/account/account.types.ts`.
- Crear `src/api/queries/account.queries.ts`.
- Crear `src/components/AccountLifecycleGate.tsx`.
- Crear `src/components/legal/LegalRequirementGate.tsx`.
- Ampliar `src/api/mutations/legal.mutations.ts`.
- Crear `src/pages/RestrictedAccountPage.tsx`.
- Modificar `src/router/guards.tsx`.
- Modificar `src/api/axios.ts`.
- Modificar `src/api/queryKeys.ts`.
- Ampliar tests de guards, interceptor y caché.

### Implementación

1. Consultar `/cuenta/estado` antes de `/suscripcion`.
2. No iniciar `/perfil`, `/suscripcion` ni ninguna query tenant-scoped hasta recibir `ACTIVA`.
3. Estados:
   - `ACTIVA`;
   - `REQUIERE_ACEPTACION`;
   - `CIERRE_PROGRAMADO`;
   - `ELIMINACION_EN_PROCESO`.
4. `ACTIVA` continúa hacia el `SessionGate` actual y recién entonces consulta perfil/suscripción en paralelo.
5. `REQUIERE_ACEPTACION` monta el gate legal con los requisitos aplicables al actor; un empleado nunca acepta el acuerdo comercial del taller.
6. `CIERRE_PROGRAMADO` monta estado, exportación disponible, restauración y logout.
7. `ELIMINACION_EN_PROCESO` muestra referencia, contacto y logout, sin prometer recuperación.
8. Un `423` o `428` no dispara logout, toast global ni error de suscripción.
9. Definir allowlists exactas de método y ruta para `423` y `428`, incluyendo
   `/cuenta/reauthenticaciones`, documentos, requisitos, aceptaciones, estado, archivo permitido,
   revocación y logout según el estado. Bajo `428` también deben quedar disponibles las rutas
   aplicables para cancelar renovación/suscripción, pedir baja personal o del servicio,
   iniciar/consultar/descargar una exportación, cerrar la cuenta y solicitar supresión; la excepción
   no saltea autorización, tenant ni reautenticación y nunca usa wildcards. La UI muestra cada
   salida sólo si su capacidad compatible está disponible para el rol actual.
10. `/cuenta/estado` o `/perfil` expone `emailVerificado` autoritativo; no se toman decisiones sensibles desde el snapshot persistido del login.
11. Cambio de cuenta o logout limpia account/legal/export queries.
12. La aceptación autenticada envía evidencias/idempotencia, refresca `/cuenta/estado` y sólo libera perfil/suscripción al recibir `ACTIVA`.
13. Ante `409`, refrescar requisitos y conservar la sesión restringida; el usuario puede aceptar,
    cerrar sesión o usar una vía de salida/derecho permitida, pero no entrar a la operación del
    taller.
14. Mantener apagado el enforcement `428` de producción hasta que las vías de salida y derechos
    comprometidas para el lanzamiento estén implementadas, allowlisteadas y verificadas por rol. Las
    rutas legacy pueden quedar exceptuadas en backend para no bloquear clientes directos, pero este
    frontend no usa la cancelación inmediata ni el Excel sin reautenticación como sustitutos.

### Pruebas

- Nunca consulta suscripción antes de conocer el ciclo de vida.
- Tampoco consulta perfil ni otra API privada antes de conocer el ciclo de vida.
- Cuenta activa conserva el comportamiento actual.
- Cuenta en cierre puede restaurar y salir.
- Cuenta en eliminación no monta dashboard.
- `423` no crea loop de navegación.
- `428` monta reaceptación sin logout ni loop.
- USER y ADMIN ven requisitos distintos; aceptar continúa a la URL originalmente solicitada.
- `409` no libera el gate y un documento fallido bloquea submit.
- Una capacidad diferida ausente no muestra un CTA roto y el readiness impide activar `428` sin las
  salidas compatibles del lanzamiento.
- Verificar email en otra pestaña y refetch actualiza el permiso sin volver a iniciar sesión.
- Segundo tenant no reutiliza estado restringido del primero.

### Commit frontend

```text
feat(cuenta): protege estados de cierre y recuperación
```

## Tarea 7 — Registrar aceptación del administrador

### Dependencias

- Tareas 3 y 4.
- `BACKEND-HANDOFF 1` desplegado de forma compatible.

### Archivos frontend

- Crear `src/components/legal/LegalConsentField.tsx`.
- Crear `src/components/legal/LegalDocumentDialog.tsx`.
- Modificar `src/pages/RegisterPage.tsx`.
- Modificar `src/types/index.ts`.
- Modificar `src/api/mutations/auth.mutations.ts`.
- Crear `src/hooks/useIdempotencyKey.ts` y pruebas si no existe una abstracción equivalente.
- Crear `src/pages/RegisterPage.test.tsx`.
- Ampliar `src/api/mutations/auth.mutations.test.tsx`.

### Implementación

1. Consultar requisitos públicos de `REGISTRO` antes de habilitar submit.
2. Mostrar dos filas obligatorias sin preselección:
   - términos/lectura de privacidad;
   - representación del taller/tratamiento de datos.
3. Cada fila puede agrupar actos distintos sólo si backend entrega un requisito versionado que conserva la afirmación exacta.
4. Abrir el documento en una capa full-screen reutilizando `Modal`, manteniendo el formulario montado.
5. No persistir la contraseña fuera de React Hook Form y del snapshot transitorio del request activo
   en memoria. Nunca llevarla a localStorage, query cache, logs o telemetría; bloquear edición del
   form mientras ese intento puede reintentarse.
6. Enviar `requiredSetRevision`, requisitos, digests y `Idempotency-Key`.
7. En `409 DOCUMENTOS_LEGALES_DESACTUALIZADOS`:
   - conservar datos personales y contraseña en memoria;
   - refrescar requisitos;
   - desmarcar únicamente requisitos reemplazados;
   - mover foco al aviso.
8. En `409 IDEMPOTENCY_EN_PROGRESO`, respetar `Retry-After: 1` y reintentar de forma acotada con la
   misma key y el mismo snapshot de payload/contraseña en memoria. No generar otra key, no reconstruir
   el request desde campos que pudieron cambiar y no convertirlo en “email ya registrado”; el replay
   exitoso recibe el JWT nuevo del backend.
9. Documento o requisito incompleto bloquea el registro.
10. La cuenta, taller y evidencias deben quedar creados atómicamente por backend.

### Pruebas

- Sin aceptar no envía.
- Checkboxes no vienen marcados.
- Área táctil y asociación de error correctas.
- Abrir/cerrar documento conserva todos los campos.
- Body exacto y sin token antiguo.
- Doble click conserva una sola clave e intento.
- `409` mantiene campos y exige nueva aceptación.
- `409 IDEMPOTENCY_EN_PROGRESO` espera y reintenta la misma key/payload; si el alta original hizo
  commit, el replay termina autenticando sin crear otra cuenta.
- Error de documentos no cae a un texto local.

### Commit frontend

```text
feat(auth): registra aceptación legal versionada
```

## Tarea 8 — Reemplazar contraseña administrativa por invitación de empleados

### Dependencia

`BACKEND-HANDOFF 3` disponible.

### Archivos frontend

- Modificar `src/components/UsuarioFormModal.tsx`.
- Modificar `src/pages/UsuariosPage.tsx`.
- Modificar `src/api/mutations/usuarios.mutations.ts`.
- Modificar `src/api/queries/usuarios.queries.ts`.
- Modificar tipos de usuario.
- Crear `src/pages/AceptarInvitacionPage.tsx`.
- Modificar `src/router/index.tsx`.
- Crear query/mutation de invitación.
- Actualizar tests de usuarios, auth y E2E.

### Implementación

1. El formulario de empleado pide nombre y email; no pide contraseña definitiva ni rol ADMIN.
2. El alta devuelve estado `INVITACION_PENDIENTE` y vencimiento.
3. El email lleva token de un solo uso.
4. `/aceptar-invitacion` permite definir contraseña y verificar email.
5. Después monta la aceptación personal; antes de completarla no accede al taller.
6. El administrador puede reenviar o revocar una invitación, con rate limit visible.
7. La mutación que consume el token usa `publicClient`, sin Bearer de una sesión anterior.
8. Después de leer el token, limpiar la URL mediante navegación replace; nunca dejarlo en logs, Sentry o historial adicional.
9. La lista de empleados muestra pendiente, vencida, aceptada o revocada y las acciones disponibles.

### Pruebas

- Admin no conoce contraseña del empleado.
- No puede crear otro ADMIN.
- Token válido, vencido, usado y revocado.
- Email verificado antes de la aceptación.
- Primer login de `USER` con `428` bloquea la operación, pero permite aceptar, cerrar sesión, pedir
  la baja de su propio acceso y usar el canal de derechos sobre sus datos personales. No muestra ni
  autoriza exportación integral, cancelación PRO o cierre del taller; esos intentos conservan `403`.

### Commit frontend

```text
feat(empleados): incorpora invitaciones de acceso
```

## Tarea 9 — Implementar atestación y upload privado de fotos

### Dependencia

`BACKEND-HANDOFF 4` disponible. No iniciar mientras el backend sólo acepte URLs de Cloudinary públicas.

### Archivos frontend

- Crear `src/legal/attestation.types.ts`.
- Crear `src/api/mutations/photoUploads.mutations.ts`.
- Crear `src/components/legal/SensitiveDataAttestationSheet.tsx`.
- Reescribir `src/components/FotoUploader.tsx`.
- Retirar `src/lib/cloudinary.ts` cuando ningún consumidor lo use.
- Modificar `src/components/ReparacionFormModal.tsx`.
- Modificar `src/pages/ReparacionDetallePage.tsx`.
- Modificar `src/utils/reparacion.ts`.
- Modificar mutaciones/tipos de reparación.
- Modificar `e2e/helpers.ts` y fixtures MSW.
- Ampliar sanitización Sentry.
- Crear/ampliar pruebas unitarias y E2E.

### Implementación

1. Elegir archivos en una orden nueva no crea la orden. Se mantienen únicamente en memoria y se muestran como pendientes.
2. Al enviar, se crea una sola vez el núcleo de la orden sin fotos; con su ID se procesan las selecciones pendientes.
3. Antes de una foto, el usuario confirma el requisito con alcance `FOTOS`.
4. Front solicita intención con nombre, MIME, tamaño, checksum disponible, momento y atestación.
5. Valida límites del backend antes del upload.
6. Sube directamente con URL/campos efímeros y luego finaliza la intención.
7. Sólo la respuesta final asociada se agrega al formulario/detalle.
8. Si una foto falla después de crear la orden, mantener abierto un estado “Orden creada · fotos pendientes”, conservar el `reparacionId` y reintentar sin duplicar la orden.
9. Una intención vigente conserva clave; una vencida o fallida crea una clave e intención nuevas.
10. Quitar una foto llama al delete backend y no se limita a borrar una URL local.
11. URLs firmadas vencidas en detalle se refrescan mediante metadata/endpoint, sin persistir la URL vieja como identidad de la foto.
12. Para PIN/patrón, confirmar alcance `CREDENCIALES` antes del submit que introduce o cambia el secreto.
13. Si se amplía de fotos a credenciales, pedir una nueva confirmación.
14. Mantener compatibilidad de lectura para fotos legacy durante la migración, sin permitir nuevas cargas legacy.
15. Eliminar preset, cloud name y fallback unsigned del bundle.

### Pruebas

- Orden sin datos sensibles no muestra el sheet.
- Rechazar la atestación no abre selector ni cambia el form.
- Atestación ocurre antes de pedir autorización de upload.
- Upload fallido no asocia la foto.
- Reintento no duplica intención/evidencia.
- Intención vencida solicita otra.
- Orden creada + upload fallido no crea una segunda orden al reintentar.
- URL firmada vencida se refresca sin romper el detalle.
- Fotos legacy siguen siendo legibles durante la migración.
- Delete remoto confirmado antes de quitar definitivamente.
- PIN/patrón nunca aparecen en telemetría.
- E2E 320/390, landscape y WebKit.

### Commit frontend

```text
feat(privacidad): protege fotos y credenciales por reparación
```

## Tarea 10 — Consumir la oferta contractual PRO

### Dependencia

`BACKEND-HANDOFF 5` disponible.

### Archivos frontend

- Ampliar `src/types/index.ts` o crear `src/subscription/subscription.types.ts`.
- Crear/ampliar `src/api/queries/suscripcion.queries.ts`.
- Crear `src/components/legal/SubscriptionDisclosureCard.tsx`.
- Modificar `src/pages/PlanesPage.tsx`.
- Agregar `formatCurrency(monto, moneda)` en utilities.
- Ampliar tests de Planes y queries.

### Implementación

1. Consultar oferta con `ofertaId`, importe, moneda, frecuencia, vigencia, prestaciones y requisitos.
2. Eliminar `$24.900` y cualquier comentario que lo vincule manualmente con `MP_AMOUNT`.
3. No usar un precio local de fallback.
4. Si oferta o moneda faltan, mostrar error y bloquear checkout.
5. Mostrar una Ficha de compromiso con:
   - taller;
   - plan;
   - importe/moneda;
   - periodicidad;
   - renovación;
   - efecto de cancelar;
   - vigencia/versiones.
6. `USER` puede leer la oferta pero no contratar.

### Pruebas

- ARS y otra moneda se formatean por contrato.
- Importe cambia cuando cambia fixture backend.
- No existe `$24.900` en el componente.
- Oferta incompleta bloquea CTA.
- Usuario empleado no ve acción contractual.

### Commit frontend

```text
feat(planes): muestra oferta pro desde backend
```

## Tarea 11 — Confirmar condiciones e iniciar checkout idempotente

### Dependencias

- Tarea 10.
- `BACKEND-HANDOFF 5` con alias desplegado.

### Archivos frontend

- Crear `src/components/legal/SubscriptionConsentDialog.tsx`.
- Modificar `src/api/mutations/pagos.mutations.ts`.
- Modificar `src/pages/PlanesPage.tsx`.
- Ampliar tests de pagos y Planes.

### Implementación

1. El CTA abre el diálogo; no redirige inmediatamente.
2. Mostrar oferta exacta y requisitos PRO.
3. La aceptación nunca viene marcada.
4. Enviar `ofertaId`, requisitos/digests e `Idempotency-Key`; nunca monto ni moneda.
5. Usar el endpoint canónico `/suscripcion/checkouts`.
6. Validar que `initPoint` sea HTTPS y corresponda al dominio permitido antes de navegar.
7. `409` refresca oferta/requisitos y mantiene al usuario en OrdenFix.
8. `502` ofrece reintento manual con la misma intención lógica.
9. Email no verificado muestra CTA de verificación, no abre checkout.

### Pruebas

- No hay redirect sin aceptación.
- Body no incluye precio.
- Doble click crea un checkout lógico.
- URL inválida no se abre.
- `409`, `428` y `502` tienen estado específico.
- El alias legacy no se usa desde el frontend nuevo.

### Commit frontend

```text
feat(pagos): confirma condiciones antes del checkout
```

## Tarea 12 — Completar retorno y cancelación al fin del período

### Dependencia

`BACKEND-HANDOFF 5` y `BACKEND-HANDOFF 6` disponibles.

### Archivos frontend

- Modificar tipos de `Suscripcion`.
- Modificar `src/pages/SuscripcionResultadoPage.tsx`.
- Crear `src/api/queries/checkouts.queries.ts` y sus pruebas.
- Modificar `src/api/queryKeys.ts`.
- Modificar `src/api/mutations/pagos.mutations.ts`.
- Modificar `src/pages/PlanesPage.tsx`.
- Crear tests dedicados de resultado y ampliar Planes/pagos.

### Implementación

1. Resultado distingue:
   - confirmado;
   - pendiente;
   - cancelado por usuario;
   - rechazado;
   - expirado;
   - no confirmado/error.
2. Nunca activar PRO por query params del navegador.
3. `POST /suscripcion/checkouts` devuelve `checkoutId` opaco, `initPoint` y `expiresAt`.
4. El retorno toma únicamente `checkoutId` y consulta `GET /suscripcion/checkouts/{checkoutId}`; backend valida tenant y es la única autoridad del estado.
5. El polling consulta el intento backend, se detiene en estados terminales, respeta timeout y permite reintento manual.
6. Reemplazar “Cancelar PRO” por “Cancelar renovación”.
7. Antes del request abrir un diálogo que muestre próximo cobro, acceso PRO hasta fecha concreta, paso posterior a FREE y ausencia de prorrateo automático.
8. Estados de cancelación:
   - `SOLICITADA`;
   - `PENDIENTE_PROVEEDOR`;
   - `PROGRAMADA`;
   - `EJECUTADA`;
   - `FALLIDA`;
   - `REVOCADA`.
9. Sólo `PROGRAMADA` afirma que no habrá nuevos cobros.
10. Mostrar `accesoProHasta` y mantener funciones PRO hasta esa fecha.
11. Ofrecer revocar sólo si backend lo permite.
12. La cancelación no promete devolución proporcional.

### Pruebas

- Todos los estados de retorno.
- URL manipulada no activa PRO.
- Checkout de otro tenant responde como no encontrado.
- Polling se detiene en rechazado, cancelado, expirado o fallido.
- Cancelación pendiente no muestra promesa final.
- Cancelación no se solicita antes de confirmar el diálogo.
- Programada muestra fecha concreta.
- Funciones se mantienen durante el período.
- USER sólo consulta.
- Legacy `/pagos/suscripcion/cancelar` no se llama.

### Commit frontend

```text
feat(suscripcion): programa cancelacion al fin del periodo
```

## Tarea 13 — Crear flujos diferenciados de arrepentimiento, baja y revisión de cobro

### Dependencia

`BACKEND-HANDOFF 7` disponible.

### Archivos frontend

- Crear tipos de gestiones.
- Crear `src/api/mutations/cases.mutations.ts`.
- Crear `src/api/queries/cases.queries.ts`.
- Crear `src/pages/ArrepentimientoPage.tsx`.
- Crear `src/pages/VerificarArrepentimientoPage.tsx`.
- Crear las superficies públicas equivalentes para baja del servicio y revisión de cobro.
- Crear `src/pages/BillingCasesPage.tsx` o integrar en Cuenta.
- Crear `src/components/CaseReferenceCard.tsx`.
- Modificar router y enlaces públicos.
- Crear pruebas unitarias/E2E.

### Implementación

1. El formulario público pide sólo los datos mínimos.
2. Mantener separados, cuando resulten aplicables, `BOTÓN DE ARREPENTIMIENTO`, `BOTÓN DE BAJA DE SERVICIO`, revisión de cobro y la cancelación autenticada de renovación.
3. El primer envío registra la gestión, fecha del servidor, estado pendiente de verificación y referencia opaca sin confirmar la existencia de una cuenta.
4. La verificación no crea otra gestión ni reinicia el reloj; cuando corresponda, el código debe informarse por el mismo medio dentro de las 24 horas desde el primer envío.
5. El link de email consume token opaco de un solo uso.
6. Backend resuelve replay idempotente antes de rechazar un token consumido.
7. Después de verificar muestra el detalle de la misma `numeroGestion` y puede emitir un `consultaToken` separado, de sólo lectura y vencimiento limitado.
8. Guardar `consultaToken` sólo en `sessionStorage`, namespaced por gestión; nunca en URL, localStorage, telemetría o caché compartida. Si vence, el email permite reiniciar/verificar el acceso.
9. La versión autenticada lista pagos con IDs internos opacos.
10. Motivos: arrepentimiento, duplicado, no reconocido, problema con servicio y otro.
11. La UI no decide elegibilidad ni promete aprobación.
12. Mostrar estados y última actualización.
13. Rate limit usa `Retry-After` y no permite enumeración.

### Pruebas

- Respuesta pública igual para cuenta existente/inexistente.
- Primer envío asigna referencia y fecha aun antes de verificar, sin enumeración.
- La verificación conserva referencia/fecha y no reinicia el plazo.
- Token válido, vencido y utilizado.
- Respuesta perdida + misma clave reproduce la verificación; otra clave no reutiliza el token.
- Email no verificado bloquea versión autenticada sensible.
- Nunca se muestra ID Mercado Pago.
- Rama rechazada termina/cierra; sólo aprobada llega a reembolso.
- Referencia y estado persisten al recargar la misma pestaña mediante la credencial de consulta, sin reutilizar el token de verificación.

### Commit frontend

```text
feat(cuenta): agrega gestiones de cobro y arrepentimiento
```

## Tarea 14 — Crear Cuenta y Privacidad como destino único

### Dependencia

- `BACKEND-HANDOFF 3` para baja individual o, hasta disponerlo, un canal de solicitud claramente documentado.

### Archivos frontend

- Crear `src/pages/AccountPage.tsx`.
- Crear componentes de resumen de aceptaciones y enlaces.
- Crear mutation/form de baja de acceso personal cuando el contrato esté disponible.
- Modificar `src/config/nav.tsx`.
- Modificar `src/components/BottomNav.tsx` y tests si cambia el agrupamiento.
- Modificar `src/router/index.tsx`.
- Crear pruebas de página/navegación.

### Implementación

1. Agregar un único destino `Cuenta` dentro de Más y sidebar.
2. Secciones:
   - identidad del usuario/taller;
   - email y estado de verificación;
   - aceptaciones personales;
   - acuerdo del taller para ADMIN;
   - Centro de Confianza;
   - gestiones de cobro cuando Tarea 13 esté disponible;
   - accesos a exportación y cierre que se incorporan en Tareas 15 y 16.
3. No duplicar un destino separado de Centro Legal en el menú móvil.
4. Mostrar “Aceptado el … · versión …” con enlace histórico.
5. Acciones administrativas quedan ausentes para USER.
6. USER puede solicitar la baja de su propio acceso o ver un canal claro para pedirla al administrador/privacidad; la copy distingue esta acción de cerrar todo el taller.
7. En este commit el hub no simula exportación/cierre: sólo muestra destinos realmente implementados o un estado explícito no accionable hasta las tareas posteriores.

### Pruebas

- Cuenta aparece en Más y conserva estado activo en subrutas.
- ADMIN/USER ven secciones correctas.
- Histórico abre la versión exacta.
- USER puede solicitar su baja personal sin ver ni disparar el cierre del taller.
- Layout 320 px sin tarjetas de dos columnas forzadas.

### Commit frontend

```text
feat(cuenta): centraliza privacidad y documentos
```

## Tarea 15 — Implementar reautenticación y exportación integral

### Dependencia

`BACKEND-HANDOFF 8` disponible.

### Archivos frontend

- Crear `src/api/mutations/reauth.mutations.ts`.
- Crear queries/mutations de exportación.
- Crear `src/pages/AccountExportPage.tsx`.
- Crear `src/components/ReauthForm.tsx`.
- Modificar `src/pages/DashboardPage.tsx`.
- Modificar `src/components/ExportExcelButton.tsx` y `src/api/mutations/export.mutations.ts`, o retirarlos si quedan sin consumidores.
- Modificar `e2e/export.spec.ts`.
- Modificar query keys y tipos.
- Crear pruebas unitarias/E2E.

### Implementación

1. Página completa sólo ADMIN.
2. Explicar contenido y exclusiones antes de solicitar.
3. Reautenticar con propósito `EXPORTAR`.
4. Guardar el token opaco únicamente en memoria y consumirlo una vez.
5. Crear exportación asíncrona y consultar:
   - `PENDIENTE`;
   - `GENERANDO`;
   - `LISTA`;
   - `FALLIDA`;
   - `EXPIRADA`.
6. Para cada descarga, obtener obligatoriamente una reautenticación `DESCARGAR_EXPORTACION` nueva, además de la sesión activa.
7. Descargar como blob sin abrir URL pública permanente.
8. Respetar expiración y limpiar object URLs locales.
9. Un fallo no inicia cierre.
10. Retirar la descarga directa del Dashboard. Puede reemplazarse por un enlace a la página segura o mantener una exportación operativa sólo si el endpoint legacy también exige reauth y queda claramente diferenciada.
11. Backend rechaza o depreca `/export/excel` sin reauth antes de considerar cerrada esta tarea.

### Pruebas

- USER no monta ni llama endpoints.
- Token reauth no se persiste ni reutiliza.
- Polling se detiene en estados terminales.
- Blob/object URL se revoca.
- Dashboard no permite descargar Excel saltando reauth.
- Exportación expirada ofrece generar otra.
- Logout limpia estado y descarga.

### Commit frontend

```text
feat(cuenta): agrega exportacion integral segura
```

## Tarea 16 — Implementar cierre y restauración

### Dependencia

`BACKEND-HANDOFF 9` disponible.

### Archivos frontend

- Crear queries/mutations de cierre.
- Crear `src/pages/AccountClosurePage.tsx`.
- Crear `src/components/AccountClosureStatus.tsx`.
- Ampliar `src/pages/RestrictedAccountPage.tsx`.
- Modificar rutas, guards y purga de caché.
- Crear pruebas unitarias/E2E.

### Implementación

1. Página completa sólo ADMIN, titulada “Cerrar el taller y eliminar su cuenta OrdenFix”.
2. Antes de contraseña o frase, mostrar que la acción alcanza empleados, datos del tenant, links públicos y renovación, junto con fechas exactas.
3. Ofrecer exportación sin hacerla obligatoria.
4. Requerir email verificado.
5. Reautenticar con propósito `CERRAR`.
6. Pedir nombre del taller o frase contractual indicada por backend.
7. Enviar con idempotencia y mostrar `numeroGestion`, `reversibleHasta` y `eliminacionPrevistaHasta`.
8. Tras éxito:
   - purgar datos privados de React Query;
   - navegar a cuenta restringida;
   - no volver a consultar dashboard/suscripción normal.
9. Durante siete días permitir restaurar con reauth `RESTAURAR`.
10. Bajo `423`, allowlistear explícitamente `/cuenta/reauthenticaciones` para `RESTAURAR` y `DESCARGAR_EXPORTACION`, además de estado, archivo permitido, revocación y logout.
11. Restaurar acceso no reactiva automáticamente la renovación.
12. Pasada la gracia, ocultar CTA de restauración.
13. Las superficies públicas deben quedar inválidas por backend desde la solicitud.

### Pruebas

- Contraseña/frase incorrecta conserva página.
- Doble click crea una solicitud.
- Reload conserva referencia y fechas.
- Empleados quedan fuera del flujo administrativo.
- Restauración dentro/fuera de plazo.
- Flujo completo restringido puede reautenticar y restaurar sin quedar bloqueado por `423`.
- Restauración no muestra PRO activo si proveedor ya fue cancelado.
- Tracking público responde como invalidado tras cierre en staging.

### Commit frontend

```text
feat(cuenta): implementa cierre recuperable del taller
```

## Tarea 17 — Endurecer despliegue, dependencias y telemetría

### Archivos frontend

- Modificar `vercel.json`.
- Modificar `vite.config.ts`.
- Modificar `src/lib/sentry.ts` y pruebas.
- Actualizar dependencias afectadas y lockfile.
- Modificar `DEPLOY.md`.
- Revisar assets/providers en CSP.
- Configurar `@sentry/vite-plugin` sólo en CI cuando existan credenciales seguras.

### Implementación

1. Agregar cabeceras productivas:
   - `Content-Security-Policy` ajustada a recursos realmente usados;
   - `Referrer-Policy`;
   - `X-Content-Type-Options`;
   - `Permissions-Policy`;
   - protección de framing mediante CSP `frame-ancestors`;
   - HSTS sólo cuando el dominio HTTPS definitivo esté confirmado.
2. No romper redirección a Mercado Pago: el navegador navega; no requiere incluir MP en `connect-src` salvo SDK embebido.
3. Remover Cloudinary unsigned antes de cerrar `img-src/connect-src`.
4. Actualizar React Router/Vite/esbuild/postcss/nanoid según advisories y ejecutar regresión.
5. Revisar si Sentry necesita email crudo. Preferir ID interno pseudónimo; si se conserva email, documentarlo en Privacidad y limitar acceso/retención.
6. Agregar release/environment y source maps únicamente con token de CI seguro.
7. Confirmar políticas diferenciadas: catálogo y documento exacto `VIGENTE` revalidados con ETag;
   documentos terminales `REEMPLAZADA`/`RETIRADA` cacheables como `immutable`; requisitos
   autenticados privados y exportaciones `private, no-store`.

### Pruebas

- App carga bajo CSP.
- Documentos, API, Sentry y fotos usan sólo orígenes permitidos.
- No existe información sensible en eventos simulados.
- `npm audit --omit=dev --audit-level=high` sin high no aceptados.
- Smoke del deployment real confirma cabeceras; Playwright sobre Vite local no se considera prueba de CSP/Vercel.

### Verificación

```bash
npm install
npm audit --omit=dev --audit-level=high
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

### Commits frontend

```text
fix(deps): actualiza dependencias vulnerables
chore(security): endurece despliegue y telemetria
```

## Tarea 18 — Automatizar readiness remoto y matriz de lanzamiento

### Archivos frontend

- Crear `scripts/check-remote-readiness.mjs`.
- Crear fixtures/tests del script.
- Actualizar `DEPLOY.md`.
- Actualizar `docs/FRONTEND_INTEGRATION.md`.
- Actualizar `docs/openapi.json` una vez cerrado el contrato real.
- Crear `docs/runbooks/public-launch.md`.

### Implementación

El script recibe `--frontend-url` y `--api-url` explícitas. En producción sólo valida recursos públicos read-only. Para staging puede recibir credenciales efímeras de cuentas dedicadas por variables secretas o consumir un manifiesto de readiness autenticado; nunca imprime esas credenciales.

1. documentos/requisitos vigentes y sin placeholders;
2. oferta PRO completa y moneda válida;
3. estado/capacidades de cancelación al fin de período;
4. endpoints y allowlists de cuenta restringida;
5. cabeceras HTTP reales;
6. health/readiness público mínimo del backend y, en staging, manifiesto autenticado de capacidades;
7. configuración declarada de upload privado;
8. links legales sin auth y sin loops SPA.

Los smokes mutantes se ejecutan sólo en staging con cuentas dedicadas:

- registro + evidencia;
- invitación de empleado;
- checkout sandbox;
- webhook y retorno;
- cancelación programada;
- solicitud/referencia de arrepentimiento;
- exportación;
- cierre/restauración;
- invalidación de tracking público;
- foto privada + borrado remoto.

Cada smoke tiene cleanup explícito e IDs propios. Backups/restauración, colas y alertas no se infieren desde el navegador: Ops adjunta evidencia fechada a la matriz go/no-go.

### Matriz go/no-go

Cada fila guarda:

- responsable;
- entorno;
- evidencia/link a ejecución;
- fecha;
- resultado;
- excepción aceptada y vencimiento, si existiera.

No se permite `GO` con:

- placeholder legal;
- precio distinto entre OrdenFix y Mercado Pago;
- email/webhook sin verificación real;
- cancelación inmediata a FREE;
- upload público unsigned;
- high vulnerability sin decisión documentada;
- backups/restauración no probados;
- solicitudes legales sin referencia;
- cuenta en cierre sin camino de recuperación.
- enforcement `428` capaz de bloquear una vía aplicable de baja, cancelación, exportación, cierre
  o supresión para el rol actual.

### Verificación

```bash
npm run check:remote-readiness -- --frontend-url=https://staging.example --api-url=https://api-staging.example
npm run build:public
npm run test:e2e
```

### Commit frontend

```text
docs(release): agrega readiness y runbook publico
```

## BACKEND-HANDOFF 1 — Documentos, requisitos y evidencias

El chat Java debe implementar y probar:

- versiones inmutables y ciclo
  `BORRADOR → PUBLICADA → VIGENTE → REEMPLAZADA | RETIRADA`, con estados históricos terminales;
- unicidad vigente por tipo/locale/contexto; `REEMPLAZADA` exige cobertura completa y `RETIRADA`
  permite sólo un hueco explícito/auditado que hace fallar cerrado los sets afectados;
- keys estables y linaje completo de requisitos/documentos; `requiresReacceptance` se evalúa con OR
  sobre todas las versiones intermedias, y el carry-forward editorial no inserta evidencia ficticia;
- `requiredSetRevision` y ETag;
- requisitos versionados con afirmación y `tipoActo`;
- endpoints públicos/autenticados del contrato congelado, incluido historial propio por
  `GET /api/aceptaciones-legales`;
- registro atómico de taller, usuario y evidencias;
- `409 DOCUMENTOS_LEGALES_DESACTUALIZADOS`;
- `409 IDEMPOTENCY_EN_PROGRESO` con `Retry-After` y replay de la misma key/payload;
- CORS expone `Retry-After`, `X-RateLimit-Limit` y `X-RateLimit-Remaining` sin requerir que el
  frontend lea `ETag`;
- `428 ACEPTACION_LEGAL_REQUERIDA`;
- auditoría append-only sin secretos;
- comando/CLI o import de operación para dry-run, publicar, promover y retirar el manifiesto legal aprobado;
- seed inicial de staging y producción con tipo, locale, contexto, versión, `vigenteDesde`, contenido y digest, sin editar versiones existentes.

## BACKEND-HANDOFF 2 — Estado de cuenta y allowlists

- `GET /api/cuenta/estado` antes de suscripción;
- estados y acciones permitidas;
- `emailVerificado` autoritativo y enforcement backend para acciones sensibles;
- sesión restringida bajo `423`/`428`;
- allowlists exactas para documentos, aceptación, cancelación de renovación/suscripción, baja
  personal o del servicio, cierre, exportación, supresión, restauración,
  `/cuenta/reauthenticaciones` con propósitos permitidos y logout; las excepciones al `428`
  conservan autorización y reautenticación propias;
- enforcement `428` apagado hasta que las vías de salida/derechos comprometidas para producción
  existan, estén allowlisteadas por método+ruta y pasen pruebas por rol;
- `/perfil` y `/suscripcion` no son requisitos para recuperar una cuenta y pueden permanecer bloqueados mientras el frontend no los solicite;
- invalidación tenant-safe de sesiones.

## BACKEND-HANDOFF 3 — Invitaciones de empleados

- alta sólo como `USER`;
- token de invitación hasheado, un solo uso y expiración;
- contraseña definida por el empleado;
- verificación de email antes de aceptación;
- reenvío/revocación/rate limit;
- baja del propio acceso para `USER`, con verificación razonable, revocación de sesiones y sin afectar el tenant;
- migración segura de empleados existentes creados con contraseña administrativa.

## BACKEND-HANDOFF 4 — Fotos privadas y atestaciones

- intención de upload y finalización según diseño;
- asset privado/en cuarentena;
- validación MIME/tamaño/checksum;
- asociación sólo tras atestación válida;
- limpieza de huérfanos;
- borrado remoto real;
- PIN/patrón eliminados al entregar;
- fotos con política de retención independiente, borrado remoto manual y cierre de cuenta;
- credenciales cifradas y nunca auditadas en claro.

## BACKEND-HANDOFF 5 — Oferta y checkout

- oferta versionada con monto/moneda/frecuencia;
- checkout recibe `ofertaId` y requisitos, nunca monto del cliente;
- creación devuelve `checkoutId` opaco, `initPoint` y `expiresAt`;
- `GET /api/suscripcion/checkouts/{checkoutId}` valida tenant y devuelve `CREADO/PENDIENTE/APROBADO/RECHAZADO/CANCELADO/EXPIRADO/FALLIDO`;
- el retorno del navegador sólo transporta la referencia; nunca decide el estado;
- idempotencia HTTP separada de idempotencia frente a MP;
- alias compatible de `/api/pagos/suscripcion`;
- webhook firmado, inbox/outbox, reconciliación y no confianza en redirect.

## BACKEND-HANDOFF 6 — Cancelación al final del período

- `cancelacionActual` con todos los estados;
- coordinación durable/outbox con Mercado Pago;
- conservar PRO hasta `accesoProHasta`;
- no prometer cancelación antes de confirmación proveedor;
- revocación sólo cuando sea posible;
- migrar/deprecar `/api/pagos/suscripcion/cancelar` sin baja inmediata.

## BACKEND-HANDOFF 7 — Arrepentimiento y reembolsos

- recursos públicos separados para arrepentimiento, baja del servicio y revisión de cobro;
- inicio anti-enumeración con referencia opaca y timestamp desde el primer envío;
- token de verificación por email;
- verificación sobre la misma referencia, sin reiniciar ningún plazo aplicable;
- replay idempotente antes de validar consumo y `consultaToken` separado, read-only y vencible;
- IDs internos de pago;
- máquinas de estado correctas;
- rate limit, idempotencia, auditoría y constancia por email;
- procedimiento operativo para revisión y derechos del cliente final.

## BACKEND-HANDOFF 8 — Reautenticación y exportación

- `/api/cuenta/reauthenticaciones` autenticado, fuera de `/api/auth/**` público;
- token opaco, purpose-bound, session/tenant-bound, TTL corto y uso único;
- exportación asíncrona tenant-scoped;
- archivo cifrado, privado, vencible y no cacheable;
- nueva autorización al descargar;
- deprecar o proteger `/export/excel` con la misma reautenticación para que no exista bypass desde Dashboard;
- excluir secretos y credenciales;
- auditoría de generación/descarga.

## BACKEND-HANDOFF 9 — Cierre y restauración

- una solicitud activa por taller;
- cancelación coordinada de renovación;
- revocación de empleados;
- invalidación inmediata de tracking/resumen/URLs públicas;
- siete días de gracia;
- restauración sin reactivar cobros automáticamente;
- eliminación/anonimización dentro del plazo comunicado desde fin de gracia;
- retenciones con fundamento/plazo;
- retry, alerta y nueva fecha si un job falla;
- número de gestión persistente.

## BACKEND-HANDOFF 10 — Email y operaciones

- dominio SPF/DKIM/DMARC verificado;
- plantillas escapadas y enlaces HTTPS;
- outbox, retry, delivery, bounce y alertas;
- secrets fuera del repositorio;
- PostgreSQL/Testcontainers y migraciones en CI;
- backups y restauración ensayada;
- observabilidad de webhooks, jobs, cierres y solicitudes.

## Criterios transversales de accesibilidad

Aplican a invitación, reaceptación, atestación, checkout, retorno, cancelación, gestiones, exportación y cierre:

- foco inicial en título o primer error relevante;
- restauración de foco al cerrar una capa;
- resumen de errores y vínculo `aria-describedby` por campo;
- `aria-busy` durante operaciones que bloquean una superficie;
- progreso con nombre accesible;
- anuncios `aria-live` sólo cuando cambia un estado relevante, no en cada tick de polling;
- botones deshabilitados explicados en texto visible;
- navegación completa por teclado sin trampas;
- scroll/focus al requisito reemplazado tras un `409`;
- modal u hoja con footer safe-area, sin ocultar contenido por teclado móvil;
- color nunca como único indicador;
- labels que distinguen baja personal, cancelación PRO y cierre del taller.

Se agrega `@axe-core/playwright` o una herramienta equivalente para checks automatizados y se mantienen recorridos manuales completos por teclado/VoiceOver en staging. Axe no reemplaza la revisión manual de foco, anuncios o copy.

## Suite final obligatoria

### Frontend local

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm audit --omit=dev --audit-level=high
```

### Viewports E2E

- Chromium desktop.
- Chromium 390 px.
- Chromium 320 px.
- Landscape móvil.
- WebKit móvil.

### Staging real

- API real, no MSW.
- PostgreSQL real.
- email de dominio verificado.
- Mercado Pago sandbox y webhook real.
- almacenamiento privado.
- dos tenants para aislamiento.
- cuenta activa, empleado, cuenta restringida y cierre.

## Orden sugerido de commits frontend

1. `docs(legal): agrega borradores editables de lanzamiento`
2. `build(release): bloquea configuraciones públicas incompletas`
3. `feat(legal): integra documentos y requisitos versionados`
4. `feat(legal): publica centro de confianza accesible`
5. `feat(legal): enlaza privacidad en superficies públicas`
6. `feat(cuenta): protege estados de cierre y recuperación`
7. `feat(auth): registra aceptación legal versionada`
8. `feat(empleados): incorpora invitaciones de acceso`
9. `feat(privacidad): protege fotos y credenciales por reparación`
10. `feat(planes): muestra oferta pro desde backend`
11. `feat(pagos): confirma condiciones antes del checkout`
12. `feat(suscripcion): programa cancelacion al fin del periodo`
13. `feat(cuenta): agrega gestiones de cobro y arrepentimiento`
14. `feat(cuenta): centraliza privacidad y documentos`
15. `feat(cuenta): agrega exportacion integral segura`
16. `feat(cuenta): implementa cierre recuperable del taller`
17. `fix(deps): actualiza dependencias vulnerables`
18. `chore(security): endurece despliegue y telemetria`
19. `docs(release): agrega readiness y runbook publico`

## Criterios de cierre del bloque

- Diseño y plan están versionados.
- Handoff backend fue entregado y su contrato final volvió documentado.
- No existe código frontend que simule evidencia que backend no registra.
- Documentos públicos funcionan con o sin sesión.
- Registro e invitación conservan identidad real del aceptante.
- Fotos y credenciales requieren atestación y protocolo privado.
- Precio/moneda/renovación provienen de backend.
- Cancelar conserva PRO hasta fin del período confirmado.
- Gestiones devuelven referencia y son reintentables.
- Exportación y cierre requieren reautenticación real.
- Una cuenta restringida nunca queda atrapada sin salida.
- Tracking público se invalida al cerrar.
- Build público y readiness remoto bloquean configuración incompleta.
- Suite local, E2E móvil y smokes staging quedan en verde.
- No se hizo push.
