# OrdenFix — documentos legales de lanzamiento

Estado editorial al 2026-08-24: **borradores editables; no aprobados para publicación ni cobro
público**. El contrato técnico v1 y su validación estática ya están coordinados con el backend, pero
eso no convierte los borradores en documentos aprobados.

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
6. **Ejecutar el guard.** Configurar `ORDENFIX_LEGAL_PUBLICATION_MANIFEST` y los contactos públicos;
   correr `npm run check:public-release` y `npm run build:public`.
7. **Handoff al backend.** Hacer dry-run e importar por `publicationId + digest` de manera idempotente.
   Una corrección crea otro `publicationId`; nunca sobrescribe evidencia aceptada.
8. **Staging y promoción.** Verificar contenido, versión, vigencia, ETag/readiness y aceptaciones antes
   de promover el release. El backend queda como fuente contractual de contenido, digest y vigencia.

No hace falta una pantalla administrativa para este flujo. El artefacto revisado, el comando de
importación del backend y el readiness de staging forman el control de publicación.

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

## Paridad técnica del manifiesto v1

El Corte 4 de la Fase 2.3A quedó coordinado el 2026-08-24 entre este repositorio y el backend local
`mvrg-backend`:

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

La referencia backend del corte es el commit local
`1f26ca7 feat(legal): valida contrato y cobertura del release`; el espejo frontend es
`d38e276 fix(legal): alinea guard con contrato backend v1` y el handshake backend actualizado quedó
en `a6cb9fd test(legal): actualiza handshake con mirror frontend`. No se hizo push.

Los límites defensivos de lectura/parsing del backend —por ejemplo manifiesto de 1 MiB, profundidad
32, 100.000 tokens, strings de 1 MiB, Markdown de 1 MiB por archivo/16 MiB total y tope de 200
issues— siguen siendo responsabilidad de ese importador, además del guard frontend. La paridad
estática no reemplaza esa frontera autoritativa.

Verificación del espejo frontend: 82 archivos/498 tests Vitest, 42 tests del guard, typecheck, lint y
build local, todos aprobados. La auditoría npm conserva una alerta baja preexistente de `esbuild`,
limitada al servidor de desarrollo en Windows y ya registrada en el plan.

Este corte todavía no ejecuta JDBC, no importa ni promueve releases y no expone APIs legales. Siguen
pendientes el dry-run transaccional, la CLI operativa y los cortes HTTP; por eso
`BACKEND-HANDOFF 1` permanece no disponible para integrar la UI real.

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
