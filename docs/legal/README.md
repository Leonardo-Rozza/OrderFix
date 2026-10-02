# OrdenFix — documentos legales de lanzamiento

**Plan vigente:** [salida conjunta a producción](../../odd/tasks/production-release.md).
Las secciones fechadas conservan evidencia de cada fase, no describen todos los pendientes
actuales. Las lecturas públicas y el registro atómico con consentimiento ya están implementados;
siguen pendientes la publicación definitiva, el rollout coordinado y su acreditación en staging.

Estado editorial al 2026-08-31: **borradores editables; no aprobados para publicación ni cobro
público**. El contrato técnico v1, la validación estática, el dry-run PostgreSQL, la
importación/sello y la promoción, reemplazo, retiro y readiness editoriales ya están acreditados
como operaciones internas del backend. Esa capacidad no publicó estos textos, no creó un catálogo
HTTP, no desplegó contenido ni convierte los borradores en documentos aprobados.

Este directorio separa deliberadamente el material de trabajo de una publicación contractual.
Los textos ayudan a cerrar decisiones de producto y preparar el handoff, pero no sustituyen la
revisión de un abogado ni la validación contable/fiscal aplicable a la identidad definitiva del
prestador.

## Estructura

```text
docs/legal/
├── drafts/                         # trabajo editorial; nunca es fallback en la app
├── examples/                       # ejemplo deliberadamente no publicable
├── publications/<publicationId>/  # releases revisados e inmutables
└── publication-manifest.schema.json
```

Los siete borradores iniciales son:

1. `terminos.md`;
2. `privacidad.md`;
3. `tratamiento-datos.md`;
4. `condiciones-pro.md`;
5. `cancelaciones-reembolsos.md`;
6. `cierre-cuenta.md`;
7. `aviso-clientes-taller.md`.

La publicación contractual completa también debe materializar los cuatro artefactos contextuales
exigidos por el esquema (`TERMINOS_USUARIO`, `AVISO_PRIVACIDAD_USUARIO`,
`COMPROMISO_CONFIDENCIALIDAD` y `ATESTACION_DATOS_CLIENTE`). No son páginas públicas adicionales de
esta primera tanda: se congelan desde el contenido profesionalmente aprobado cuando se cierre el
contrato remoto de empleados y atestaciones. El guard no permite omitirlos ni reemplazarlos por una
aceptación genérica.

El manifiesto de `examples/` está abreviado y usa revisiones/digests ficticios: sirve para entender
el formato, no para copiarlo como una publicación completa.

El aviso para clientes del taller es sólo un modelo editable. El cliente que lleva un equipo al
taller no crea una cuenta OrdenFix ni acepta los términos comerciales de OrdenFix. El taller decide
qué datos incorpora para prestar la reparación; la hipótesis operativa es que OrdenFix los procesa
como plataforma técnica bajo instrucciones del taller. Esa calificación debe confirmarse antes de
publicar.

## Placeholders permitidos en borradores

La lista es cerrada y está replicada en `src/config/legalContact.ts`:

- `[RAZÓN SOCIAL]`
- `[CUIT]`
- `[DOMICILIO]`
- `[EMAIL LEGAL]`
- `[EMAIL PRIVACIDAD]`
- `[JURISDICCIÓN]`
- `[HORARIO DE ATENCIÓN]`

No se deben esconder pendientes con variantes, comentarios o marcadores nuevos. Los borradores pueden
conservar esta lista; una publicación seleccionada por el build público no puede conservar ninguno.

## Flujo de revisión y publicación

1. **Editar los borradores.** Confirmar identidad, canales, proveedores, transferencias, retenciones,
   impuestos, facturación y políticas operativas reales.
2. **Revisión jurídica.** Registrar una referencia y fecha de aprobación; validar especialmente la
   relación B2B/consumo, privacidad, tratamiento por cuenta del taller, baja y arrepentimiento.
3. **Revisión contable.** Confirmar precio/impuestos, emisor del comprobante fiscal y tratamiento de
   cancelaciones y devoluciones.
4. **Congelar un release.** Copiar únicamente los textos aprobados a
   `docs/legal/publications/<publicationId>/`, en UTF-8, NFC y saltos LF.
5. **Calcular digests.** Completar el SHA-256 de cada archivo y de cada afirmación exacta. El manifiesto
   debe cumplir `publication-manifest.schema.json`; no se modifica después de ser importado.
6. **Validar y simular sin escritura.** Ejecutar `validate` offline y `dry-run` rollback-only contra
   el release congelado. Ambos deben usar el mismo manifiesto; conservar su `publicationId` y
   SHA-256 exactos para `import` y las etapas siguientes.
7. **Importar y sellar.** Con autorización operativa, usar exclusivamente el launcher acreditado.
   La importación crea o reconcilia el grafo y su sello técnico en una sola transacción, pero conserva
   las versiones nuevas en `BORRADOR`. Una corrección crea otro `publicationId`; nunca sobrescribe
   evidencia importada.
8. **Planificar, aplicar y verificar editorialmente.** Generar el plan canónico y continuar sólo si
   devuelve `APPLICABLE`; ejecutar el `apply-*` correspondiente con las confirmaciones exactas y
   consultar nuevamente `readiness`. Promoción/reemplazo deben terminar `READY`; un retiro exitoso
   termina deliberadamente `APPLIED + NOT_READY`.
9. **Publicación pública — pendiente.** Con contenido definitivo autorizado y capacidades
   implementadas acreditadas en el entorno real, verificar roles/preflights, catálogo/documentos/
   requisitos HTTP, registro atómico, seguridad/CORS, `409`, `428` y rollout coordinado.
   Configurar el manifiesto/contactos, ejecutar
   `npm run check:public-release` y `npm run build:public`, desplegar en staging y acreditar ETag y
   smokes públicos.

No hace falta una pantalla administrativa para este flujo interno. El bundle revisado, los
launchers de importación y edición, los planes canónicos y sus receipts forman el control técnico.
El readiness público de staging es una puerta posterior y no se sustituye por el readiness
editorial de la CLI.

## Guard de lanzamiento público

El comando protegido valida, sin imprimir valores de configuración:

- URL de API HTTPS, pública y explícita;
- coincidencia entre `VITE_API_BASE_URL` y el alias legado si ambos existen;
- emails legal, privacidad y soporte válidos y coincidentes con el manifiesto;
- aprobación jurídica y contable;
- rutas confinadas, texto canónico y SHA-256 de documentos/afirmaciones;
- ausencia de placeholders en el release seleccionado;
- ausencia de precio PRO fijo en código productivo;
- ausencia de upload Cloudinary unsigned/directo.

`npm run build` ejecuta el nivel completo cuando `VERCEL_ENV=production` o
`ORDENFIX_PUBLIC_RELEASE=true`. En CI y preview ejecuta al menos el nivel runtime, que exige una API
HTTPS pública; desarrollo local puede avanzar con borradores. Ninguno de esos dos niveles reducidos
acredita que la app esté lista para abrir al público.

## Paridad técnica y cierre de la Fase 2.3A

La paridad estática del Corte 4 y el validador/dry-run de los Cortes 5 a 7 quedaron coordinados entre
este repositorio y el backend local `mvrg-backend`:

- schema compartido byte a byte: **10.547 bytes**, SHA-256
  `f7a4ee17f53f5ed3f2613d894fa3a4f46896dfaaec0c80dab055e4320f036f8b`;
- límites compartidos: hasta 128 documentos, 256 requisitos y 16 documentos por requisito, con el
  mismo patrón reforzado de email público;
- matriz mínima: 11 tipos documentales, 6 filas de requisitos obligatorios y 8 scopes
  `contexto:rol`;
- la cobertura suma sólo requisitos con `required=true`; todo requisito válido, incluso opcional,
  vincula sus documentos y evita falsos huérfanos;
- varias entradas del mismo tipo documental son válidas cuando key, versión y fuente no colisionan;
  `MANIFEST_DUPLICATE_DOCUMENT_TYPE` queda reservado en el inventario histórico de 35 códigos, pero
  ya no se emite;
- los documentos exigen el primer H1 ATX visible, de texto plano y hasta 300 code points; HTML real,
  autolinks angle no permitidos y destinos `javascript:`, `vbscript:` o `data:` bloquean el release;
- publisher, afirmaciones y títulos rechazan contenido sólo de espacios, `FORMAT` o `MARK`, además
  de controles; Markdown y afirmaciones conservan UTF-8/NFC/LF, digest exacto y demás reglas de
  texto canónico compartidas;
- el guard usa un AST CommonMark con posiciones para distinguir código inerte, links reales,
  referencias y definiciones no usadas, y congela sus vectores adversariales en tests herméticos.

La referencia estática backend parte de `1f26ca7 feat(legal): valida contrato y cobertura del
release`; el espejo frontend es `d38e276 fix(legal): alinea guard con contrato backend v1` y el
handshake actualizado quedó en `a6cb9fd test(legal): actualiza handshake con mirror frontend`.
El cierre JDBC/CLI está en los commits backend `64ee07a`, `8b386db`, `614d3b8`, `5b97e63`,
`334ba7b`, `143beae` y `8769a6c`. El registro documental del mirror previo está en `b6d93ea`. No se
hizo push.

Los límites defensivos de lectura/parsing del backend —por ejemplo manifiesto de 1 MiB, profundidad
32, 100.000 tokens, strings de 1 MiB, Markdown de 1 MiB por archivo/16 MiB total y tope de 200
issues— siguen siendo responsabilidad de ese importador, además del guard frontend. La paridad
estática no reemplaza esa frontera autoritativa.

El cierre cross-repo del 2026-08-25 acreditó 42/42 tests dirigidos del guard frontend, build local,
64/64 pruebas backend enfocadas de schema/paridad/golden/RFC 8785/reporte y la misma fixture golden
aceptada por ambos validadores con 11 documentos, 6 requisitos y 8 scopes. La puerta backend completa
ejecutó 562 unitarias y 56 IT. El build local sin flags de deploy saltea deliberadamente el guard
público completo, por lo que esta evidencia técnica no declara lista una publicación real.

La Fase 2.3A sí ejecuta JDBC provisional mediante una CLI interna y demuestra rollback sin filas
residuales; no importa, sella, promueve ni expone APIs legales. La importación y el sello internos se
completaron después en 2.3B; la promoción/reemplazo/retiro y el readiness editoriales se acreditaron
en 2.3C. Las APIs y el resto del rollout continúan pendientes.

## Cierre técnico de la Fase 2.3B

La Fase 2.3B quedó cerrada y verificada el 2026-08-27 en la rama backend local
`codex/lanzamiento-publico-backend`. Sus seis cortes funcionales están registrados en `22e464b`,
`6da82cf`, `dff55c6`, `d317a69`, `e4f8944` y `79f18ee`; el diseño, plan y precisión contractual
previos están en `a8cc352`, `76dc24c` y `cf2aaaf`. No se hizo push.

El backend puede importar de forma interna un release previamente validado, persistir el grafo V27
completo y dejar la publicación técnicamente `SELLADO` en una sola transacción. El replay exacto no
escribe ni avanza secuencias, y una credencial PostgreSQL restringida carece de capacidad de
promoción. La suite final acreditó 729 pruebas unitarias y 113 de integración, incluida concurrencia
sobre PostgreSQL 16.14, deadlocks, timeouts, reconciliación `UNKNOWN`, procesos reales, aislamiento
de configuración y las cardinalidades máximas —128 documentos, 256 requisitos, 16 documentos por
requisito y 16 scopes— dentro del presupuesto de Markdown. La fixture máxima no simuló un payload
total de 16 MiB.

La regresión frontend del cierre aprobó 42/42 pruebas dirigidas del guard, 82 archivos con 498
pruebas Vitest y el build local. Ese build omitió deliberadamente los controles de release y
artefactos públicos porque no se proporcionó un manifiesto profesional ni variables de deploy; no
acredita readiness público. Los archivos no versionados `.agents/` y
`public/OrdenFix project naming/` se preservaron y no forman parte del commit.

El sello es únicamente una garantía técnica de integridad e inmutabilidad. La Fase 2.3B no ejecutó
una importación operativa de contenido legal real ni promovió versiones. Esa capacidad editorial
se implementó después en 2.3C sobre fixtures y bases descartables; tampoco publicó estos borradores
ni agregó catálogo remoto, endpoints HTTP, aceptaciones, enforcement o integración frontend.

## Cierre técnico de la Fase 2.3C

La implementación editorial interna quedó acreditada el 2026-08-31 en la rama backend local
`codex/lanzamiento-publico-backend`. Los Cortes 1 a 10 culminan en
`ccfe894 docs(legal): cierra corte de procesos reales`; el diseño y el plan del cierre cross-repo
están en `6852c64` y `1c74652`. El runbook operativo y la closure definitiva se congelan en:

- `docs/runbooks/legal-manifest-editorial-postgresql.md` del backend;
- `docs/plans/2026-08-27-legal-manifest-promotion-closure.md` del backend.

La CLI interna expone exactamente siete comandos: `readiness`, `plan-promote`, `apply-promote`,
`plan-replace`, `apply-replace`, `plan-retire` y `apply-retire`. Trabajan sobre PostgreSQL 16, V27 y
el schema fijo `public`, con un rol editorial temporal distinto del importador. Los planes,
confirmaciones y reportes v3 permiten distinguir `READY/NOT_READY`, `APPLICABLE/BLOCKED` y
`APPLIED/ALREADY_APPLIED/BLOCKED/ERROR/UNKNOWN`. Un retiro aplicado puede terminar correctamente
`APPLIED + NOT_READY`: el hueco explícito hace fallar cerrado los sets afectados.

El Corte 10 cerró tres puertas limpias: `4.283` unitarias + `10` IT de
concurrencia/fallos/capacidad, `4.283` + `22` IT de procesos/aislamiento/JAR y la regresión global
de `4.283` + `250` IT, sin fallos, errores ni omitidas. También acreditó roles restringidos,
capacidad máxima, procesos reales, launcher, pérdida total/parcial de stdout y retry exacto sin
duplicar transiciones. Es evidencia técnica del motor interno, no de una publicación real.

El flujo coordinado queda congelado así:

1. revisión o aprobación editorial responsable del contenido;
2. digest, `validate` y `dry-run`;
3. `import` y sello técnico, conservando nuevas versiones en `BORRADOR`;
4. plan editorial con resultado `APPLICABLE`;
5. `apply` con confirmaciones exactas;
6. `readiness` final con resultado `READY`, salvo el hueco explícito de un retiro.

No se importó ni promovió contenido legal real, no se modificó V27 ni el schema v1 compartido y no
hubo seed, V28, APIs, frontend funcional, staging, deploy o push. Por lo tanto, la Tarea 3 continúa
bloqueada y `BACKEND-HANDOFF 1` permanece no disponible en staging hasta completar y desplegar las
capas públicas restantes.

## Decisiones transversales que no deben contradecirse

- `ADMIN_TITULAR` representa al taller, acepta los acuerdos del taller y administra empleados.
- `USER` acepta sus propias reglas de uso, privacidad y confidencialidad; no puede contratar, cerrar ni
  representar al taller.
- Cancelar la renovación mantiene PRO hasta el final del período confirmado y no genera prorrateo
  automático, salvo error, arrepentimiento aplicable o exigencia legal.
- Cerrar el taller es distinto de desactivar un empleado: ofrece exportación, contempla siete días
  de recuperación y luego inicia el proceso de eliminación/anonimización de hasta treinta días,
  sujeto a retenciones justificadas y a la definición profesional de cómo se computan esos plazos.
- El resumen digital de una reparación es informativo y no se presenta como factura ni comprobante
  fiscal.
- Una reparación normal no exige checkbox extra. Fotos y credenciales opcionales requieren una
  atestación contextual del taller; PIN/patrón se eliminan al entregar y las fotos tienen retención
  separada.
- La Política de Privacidad mantiene el inventario canónico versionado de proveedores, roles,
  transferencias y retenciones. Los demás documentos lo enlazan para evitar listas divergentes.
- Ninguna promesa técnica sobre fotos privadas, cifrado/borrado de credenciales, enlaces, backups o
  cierre puede pasar a una publicación aprobada sin implementación y evidencia end-to-end.

## Fuentes oficiales verificadas

Consultadas el 2026-08-23. Se enlazan para revisión profesional; la lista no constituye dictamen:

- [Ley 25.326 actualizada](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion):
  información previa, seguridad, derechos y reglas del tratamiento de datos personales.
- [Decreto 1558/2001 actualizado](https://www.argentina.gob.ar/normativa/nacional/70368/actualizacion):
  reglamentación aplicable, incluido el tratamiento de datos por cuenta de terceros.
- [AAIP — obligaciones de responsables](https://www.argentina.gob.ar/aaip/datospersonales/responsables/obligaciones):
  finalidad, destinatarios, responsable, carácter de los datos, consecuencias y derechos a informar.
- [AAIP — derechos sobre datos personales](https://www.argentina.gob.ar/aaip/datospersonales/derechos):
  acceso, rectificación, actualización y supresión; la guía vigente informa diez días corridos para
  acceso y cinco días hábiles para rectificación, actualización o supresión.
- [AAIP — transferencias internacionales](https://www.argentina.gob.ar/transferencias-internacionales):
  roles de responsable/encargado y mecanismos para servicios o destinos internacionales.
- [Resolución AAIP 47/2018](https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-47-2018-312662/texto):
  medidas recomendadas de seguridad para datos en medios informatizados.
- [Disposición 954/2025](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-954-2025-417152/texto)
  y [Disposición 3/2026](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-3-2026-423007/texto):
  baja/arrepentimiento, identificación de gestión y verificaciones razonables de identidad cuando el
  régimen de consumo resulte aplicable. La aplicabilidad concreta a OrdenFix debe validarse.

Antes de cada publicación hay que volver a verificar vigencia normativa, proveedores, destinos,
plazos y funcionamiento real de frontend/backend.
