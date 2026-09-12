# Corte C — Inicio y Clientes legibles en móvil

Fecha: 2026-09-12. Estado: cerrado localmente.
Baseline frontend `179ef71`, rama `codex/frontend-refactor-checkpoint`.
Backend permanece en `39a0890`, sin cambios de este corte.

## Evidencia previa y decisiones

Se inspeccionaron ambas pantallas con datos sintéticos a 320/390 px y 1280 px,
en claro y oscuro. A 320 px, Clientes mostraba «A…» para Alex Gómez y «M…» para
María de los Ángeles Fernández de la Fuente; las columnas de equipos/última visita
ocupaban el espacio de identificación y el contacto estaba oculto. Inicio ocultaba
ambos estados y el importe competía con el equipo/cliente en una sola línea.
No se observó desbordamiento de página como causa: el problema era información
oculta o excesivamente truncada. Escritorio conserva la distribución existente.

La persona del taller necesita reconocer un cliente/equipo y su estado mientras
atiende. Se reutilizan las fichas, bordes/sombra suave, tipografía, espaciado y
tokens existentes: verde para acciones, tinta para identificación, gris para
metadatos y colores semánticos para estados. No se redefine marca ni navegación.

- Inicio usa una fila móvil con equipo y cliente en líneas propias, descripción
  secundaria truncada, una única pareja EstadoBadge/PagoChip y el importe debajo.
  Los chips mantienen la semántica de cobros declarados, incluido excedente, y se
  leen también en FREE/USER. No se habilita registrar/anular ni validar pagos.
- Clientes dedica el ancho móvil al nombre/teléfono, deja el email secundario y
  reubica cantidades/última visita con etiquetas. Conserva búsqueda, orden, página,
  fila accesible y acciones de ficha. La carga inicial tiene estado accesible y
  `aria-busy`; no se confunde una respuesta pendiente con una lista vacía.
- La ficha recibe la referencia explícita de su fila mediante el mecanismo ya
  existente del Modal, para devolverle el foco al cerrar. No se modifica Modal.
- Las lecturas de estas pantallas utilizan el modo de error inline existente:
  el ErrorState conserva el reintento sin avisos flotantes por cada retry automático.
  Dashboard permite elegir este modo; Reparaciones mantiene su valor por defecto.
  Las únicas consumidoras del listado de clientes son Inicio y Clientes. No se
  alteran claves de caché, parámetros, endpoints, retries ni controles de sesión.

## Correcciones surgidas de la comprobación

La primera validación de teclado detectó pérdida de foco tras Escape en las cuatro
variantes. En el montaje condicional de la ficha bajo StrictMode, la captura
implícita del modal puede tomar un control del diálogo. El invocador explícito
resuelve ese recorrido; el modal sigue dando prioridad a otra capa al editar/agregar.
La primera captura posterior también mostró el último dígito de un importe partido
en escritorio: se corrigió ancho mínimo y salto de línea antes de aprobarlo.

Las capturas de error mostraron tres toasts 500 durante los retries además del error
en página. Se acotó el modo inline a las consultas descritas; la revalidación comprueba
que no aparece el mensaje flotante y que error → reintento → vacío sigue funcionando.
No se ocultó el fallo ni se lo transformó en datos exitosos.

## Validación y límites

**41 Vitest distintos aprobados**: Dashboard 10, Clientes 6, ficha 4, interceptor 21.
**6 recorridos Chromium aprobados**: cuatro variantes de datos largos/roles/temas
y dos de carga/error/vacío. Los dos de error se repitieron después del ajuste inline.
Pasaron typecheck, ESLint focalizado y revisión del diff. Se revisaron capturas
antes/después y finales; móvil no desborda, nombres/chips son visibles y el importe
desktop queda en una línea. Los E2E verifican apertura por teclado, foco de retorno,
acciones de alta visibles y gestión de ficha/exportación acorde a ADMIN/USER.

```sh
npx vitest run src/pages/DashboardPage.test.tsx
npx vitest run src/pages/ClientesPage.test.tsx src/components/ClienteFichaModal.test.tsx
npx vitest run src/pages/ClientesPage.test.tsx src/api/axios.test.ts
npm run typecheck
npx eslint src/pages/DashboardPage.tsx src/pages/DashboardPage.test.tsx src/pages/ClientesPage.tsx src/components/ClienteFichaModal.tsx src/api/queries/dashboard.queries.ts src/api/queries/clientes.queries.ts e2e/pulido-inicio-clientes.spec.ts
npx playwright test e2e/pulido-inicio-clientes.spec.ts --project=chromium --workers=1
```

Datos y API simulados; no acredita PostgreSQL, proveedores, Safari ni staging.
No se enviaron mensajes, activaron servicios o borraron datos. El backend y sus
migraciones no cambian. Build/comprobación conjunta se reservan para D; no se ejecutó
el integral. Se preservan los 77 archivos ajenos no versionados. Commit atómico
`fix(ui): mejora lectura movil de inicio y clientes`, sin push ni merge.

El próximo y último corte de este pulido local es **D — comprobación y cierre**.
MP, fotos reales, Email C, solicitudes/cierre, identidad y despliegue mantienen los
pendientes y el orden del plan de salida; no se consideran resueltos por este corte.
