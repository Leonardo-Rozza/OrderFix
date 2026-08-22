# Plan de implementación — Selectores asincrónicos y paginados

**Diseño aprobado:** `docs/plans/2026-08-22-async-form-selectors-design.md`  
**Fecha:** 2026-08-22

## Principios de ejecución

- Preservar los cambios y archivos ajenos que ya existen en el worktree.
- Mantener el `Combobox` local compatible con todos sus consumidores actuales.
- Escribir pruebas focales junto con cada cambio; no dejar toda la cobertura para el final.
- No almacenar `ReparacionDetalle`, PIN ni patrón en fuentes de opciones.
- Consultar sólo cuando el modal y el selector correspondiente están activos.
- Mantener las nuevas keys debajo de los prefijos históricos para heredar invalidaciones.
- Separar CI, interceptor, infraestructura, queries y migraciones en commits atómicos.
- No hacer push.

## Tarea 1 — Corregir la instalación de navegadores en CI

Archivos:

- Modificar `.github/workflows/ci.yml`.

Pasos:

1. Cambiar la instalación Playwright de `chromium` a `chromium webkit`.
2. No instalar Firefox porque no existe un proyecto que lo ejecute.
3. No modificar la matriz ya declarada en `playwright.config.ts`.

Verificación focal:

```bash
npm run test:e2e -- --project=mobile-webkit
```

Commit:

```text
ci(e2e): instala WebKit para la matriz móvil
```

## Tarea 2 — Soportar cancelación y errores inline en Axios

Archivos:

- Modificar `src/api/axios.ts`.
- Modificar `src/api/axios.test.ts`.
- Crear una declaración de tipos acotada si Axios requiere ampliar `AxiosRequestConfig`.

Pasos:

1. Agregar a la configuración de request una marca tipada, por ejemplo `errorMode: 'inline'`.
2. Detectar `axios.isCancel(error)` o `error.code === 'ERR_CANCELED'` antes de cualquier manejo global.
3. Rechazar la cancelación para que React Query resuelva su concurrencia, pero no mostrar toast ni capturarla en Sentry.
4. Mantener intacto el manejo global de `401`, `402` y `403` incluso en requests inline.
5. En otros errores GET con `errorMode: 'inline'`, omitir solamente el toast genérico.
6. Conservar la telemetría de red/5xx para fallos reales.
7. Probar GET global, GET inline, cancelación y estados de sesión/plan.

Verificación focal:

```bash
npm test -- src/api/axios.test.ts
```

Commit:

```text
fix(api): evita errores duplicados en consultas inline
```

## Tarea 3 — Extraer la base compartida del Combobox

Archivos:

- Crear `src/components/ComboboxBase.tsx`.
- Modificar `src/components/Combobox.tsx`.
- Modificar `src/components/Combobox.test.tsx`.

Pasos:

1. Escribir pruebas de regresión para API actual, búsqueda local, teclado, Escape, Tab, portal y apertura hacia arriba.
2. Extraer a `ComboboxBase` el trigger, popover, `visualViewport`, listbox, opción activa, foco y selección.
3. Identificar opciones por `value` estable en lugar del índice para soportar páginas agregadas.
4. Mantener `Combobox` como wrapper local con la misma API pública.
5. Agregar slots/props controladas para:
   - query y cambio de query;
   - loading y `aria-busy`;
   - vacío y error;
   - footer con cargar/reintentar;
   - total remoto y mensaje vivo.
6. Conservar los estilos, tokens, elevación y tamaños existentes.
7. En móvil, mantener 16 px en el input, filas de 44 px, ancho según `visualViewport` y safe area.
8. Verificar que ninguna pantalla existente cambie de comportamiento.

Verificación focal:

```bash
npm test -- src/components/Combobox.test.tsx
npm run typecheck
```

Commit:

```text
refactor(combobox): comparte presentación y navegación
```

## Tarea 4 — Crear AsyncCombobox y su ciclo remoto

Archivos:

- Crear `src/components/AsyncCombobox.tsx`.
- Crear `src/components/AsyncCombobox.test.tsx`.
- Crear o reutilizar un hook de debounce acotado.

Pasos:

1. Definir una fuente tipada con factory de query key y `loadPage({ query, page, size, signal })`.
2. Usar `useInfiniteQuery` con página inicial cero y metadata del backend.
3. Asentar búsqueda tras 350 ms y normalizar sólo espacios/`trim`.
4. No usar datos placeholder de un término anterior.
5. Aplanar y deduplicar opciones con `Map`.
6. Mantener `selectedOption` fuera de las páginas para estabilizar el trigger.
7. Diferenciar error inicial de error de página siguiente y conservar resultados válidos.
8. Hacer que `Cargar más` pida exactamente una página.
9. Permitir que Tab llegue al footer cuando exista; desde allí Tab continúa el diálogo y Shift+Tab vuelve al buscador.
10. Hacer que Flecha abajo desde el último resultado cargue otra página y active la primera opción nueva.
11. Limitar la carga automática de páginas vacías filtradas a una sola página por búsqueda inicial.
12. Probar debounce, cancelación/race, página siguiente, dedupe, selección persistente, errores, retry, foco y anuncios.

Verificación focal:

```bash
npm test -- src/components/Combobox.test.tsx src/components/AsyncCombobox.test.tsx
```

Commit:

```text
feat(combobox): agrega búsqueda remota paginada
```

## Tarea 5 — Agregar fuentes remotas y query keys de opciones

Archivos:

- Modificar `src/api/pagination.ts` si hace falta un helper de página siguiente.
- Modificar `src/api/queryKeys.ts`.
- Modificar `src/api/queries/clientes.queries.ts`.
- Modificar `src/api/queries/equipos.queries.ts`.
- Modificar `src/api/queries/inventario.queries.ts`.
- Crear `src/api/queries/reparacion-options.queries.ts` para aislar opciones del detalle sensible.
- Crear pruebas focales de fuentes/queries.
- Ampliar `src/api/cacheConsistency.test.ts`.

Pasos:

1. Conservar `queryKeys.<dominio>.options` como root constante.
2. Agregar `optionSearch(params)` bajo cada root con `q`, `size` y filtros/sort reales.
3. No incluir `page` en la key: vive en `pageParam`.
4. Implementar requests contractuales:
   - clientes: `sort=nombre,asc`;
   - equipos: `sort=id,desc`;
   - inventario: sin sort inventado;
   - reparaciones: `sort=id,desc`.
5. Pasar `signal` y `errorMode: 'inline'` a Axios.
6. Mapear únicamente datos necesarios a opciones:
   - cliente + teléfono;
   - equipo + cliente/IMEI;
   - artículo + SKU/stock/precio y metadata mínima para autocompletar;
   - orden + equipo/cliente/estado, siempre desde `Page<Reparacion>` segura.
7. Excluir cerradas de nuevas opciones y conservar la metadata cruda para `hasNextPage`.
8. Eliminar los hooks con límites fijos cuando ya no tengan consumidores.
9. Probar parámetros, abort signal, key por término, página dos y alcance de invalidaciones root.

Verificación focal:

```bash
npm test -- src/api/cacheConsistency.test.ts src/api/queries
```

Commit:

```text
feat(api): pagina opciones remotas de formularios
```

## Tarea 6 — Migrar el selector de clientes en EquipoFormModal

Archivos:

- Modificar `src/components/EquipoFormModal.tsx`.
- Modificar `src/components/EquipoFormModal.test.tsx`.
- Modificar `src/pages/ClientesPage.tsx`.
- Modificar `src/pages/EquiposPage.tsx`.
- Ajustar pruebas de ambas páginas.

Pasos:

1. Reemplazar props de arreglo/loading/error/retry por la fuente remota.
2. Cambiar `defaultClienteId` por el cliente conocido o agregar una opción inicial segura equivalente.
3. Construir fallback denormalizado al editar un equipo.
4. Permitir buscar otro cliente si la relación sigue siendo editable.
5. Habilitar la query sólo con el modal abierto.
6. Bloquear submit únicamente cuando el selector obligatorio no tiene una selección válida, no durante un refetch con selección.
7. Quitar los fetches eager de `ClientesPage` y `EquiposPage`.
8. Probar selección después de página uno, default conocido, edición y error/retry inline.

Verificación focal:

```bash
npm test -- src/components/EquipoFormModal.test.tsx src/pages/ClientesPage.test.tsx src/pages/EquiposPage.test.tsx
```

Commit:

```text
refactor(equipos): busca clientes bajo demanda
```

## Tarea 7 — Migrar el selector de equipos en ReparacionFormModal

Archivos:

- Modificar `src/components/ReparacionFormModal.tsx`.
- Modificar `src/components/ReparacionFormModal.test.tsx`.
- Modificar `src/pages/ReparacionesPage.tsx`.
- Modificar `src/pages/ReparacionDetallePage.tsx`.
- Ajustar sus pruebas.

Pasos:

1. Eliminar las props y consultas eager de equipos.
2. Activar la fuente sólo en alta, modal abierto y modo `existente`.
3. Mantener modo rápido sin iniciar requests innecesarios.
4. En edición, conservar equipo denormalizado y selector bloqueado sin consultar.
5. Mantener validación requerida y mensajes inline.
6. Probar que cambiar a modo existente consulta, encuentra página dos y envía `equipoId`.
7. Probar que alta rápida y edición no consultan opciones.

Verificación focal:

```bash
npm test -- src/components/ReparacionFormModal.test.tsx src/pages/ReparacionesPage.test.tsx src/pages/ReparacionDetallePage.test.tsx
```

Commit:

```text
refactor(reparaciones): busca equipos bajo demanda
```

## Tarea 8 — Migrar reparaciones e inventario en RepuestoFormModal

Archivos:

- Modificar `src/components/RepuestoFormModal.tsx`.
- Modificar `src/components/RepuestoFormModal.test.tsx`.
- Modificar `src/pages/RepuestosPage.tsx`.
- Modificar `src/pages/ReparacionDetallePage.tsx` si aún pasa opciones.
- Ajustar sus pruebas.

Pasos:

1. Reemplazar el `<select>` global de reparación por `AsyncCombobox` con opción “Sin asociar”.
2. Activar la consulta sólo si la reparación no viene fijada.
3. Construir la selección editada con `reparacionId` y `reparacionEquipo`; no consultar detalle sensible.
4. Excluir cerradas nuevas, conservar la cerrada ya asociada y aplicar el salto automático acotado.
5. Mantener un estado parcial honesto cuando las páginas cargadas no contienen órdenes abiertas.
6. Reemplazar inventario fijo por fuente remota en altas PRO.
7. Al elegir artículo, completar nombre, precio y cantidad desde metadata mínima de la opción.
8. Permitir carga manual si inventario falla o no tiene coincidencias.
9. No bloquear un repuesto sin asociación por un error del selector opcional.
10. Quitar `useReparacionesOptions` de `RepuestosPage`.
11. Probar reparación en página posterior, cerradas, selección histórica, artículo y degradación manual.

Verificación focal:

```bash
npm test -- src/components/RepuestoFormModal.test.tsx src/pages/RepuestosPage.test.tsx src/pages/ReparacionDetallePage.test.tsx
```

Commit:

```text
refactor(repuestos): pagina reparaciones e inventario
```

## Tarea 9 — Cobertura E2E contractual y móvil

Archivos:

- Modificar mocks/helpers bajo `e2e/` para respetar `q`, `page`, `size` y `sort`.
- Ampliar el spec contractual/formularios correspondiente.
- Ampliar `e2e/mobile.spec.ts` sólo para la regresión móvil necesaria.

Pasos:

1. Crear fixtures con una opción válida fuera de la primera página.
2. Probar búsqueda, `Cargar más` y selección en un modal real.
3. Probar que respuestas lentas de una búsqueda anterior no reemplazan la actual.
4. Probar selector a 320 y 390 px y en `mobile-webkit`.
5. Verificar scroll, Escape, foco restaurado y footer accesible.
6. Confirmar que no se solicita el detalle sensible de reparación.

Verificación focal:

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=mobile-320
npm run test:e2e -- --project=mobile-webkit
```

Commit:

```text
test(e2e): cubre selectores paginados en móvil
```

## Tarea 10 — Regresión completa y cierre documental

Pasos:

1. Ejecutar unitarias/integración completas.
2. Ejecutar TypeScript, ESLint y build.
3. Ejecutar toda la matriz E2E.
4. Ejecutar `git diff --check`.
5. Revisar que `.agents/` y assets ajenos no entren en commits.
6. Registrar en la entrega commits, pruebas y cualquier deuda backend documentada.

Comandos:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
git diff --check
git status --short
```

## Criterio de cierre

La etapa queda completa cuando los cuatro selectores consultan y paginan el backend bajo demanda, preservan selección y accesibilidad, no duplican errores, no cachean secretos y toda la suite queda verde en Chromium y WebKit móvil.

## Registro de implementación — 2026-08-22

**Estado:** completado y validado localmente. No se hizo push.

### Resultado entregado

- Cliente de un equipo, equipo de una reparación, reparación de un repuesto y artículo de inventario consultan bajo demanda con `q`, `page` y `size=20`.
- Las fuentes respetan el `sort` garantizado por contrato, pasan `AbortSignal` y presentan sus errores dentro del selector sin duplicar toasts.
- Los formularios dejaron de precargar catálogos de 200/1000 elementos.
- La carga rápida y la edición de reparaciones no consultan el catálogo de equipos.
- Inventario y reparación son opcionales en el alta de repuestos; un fallo permite continuar manualmente.
- Las asociaciones históricas cerradas se conservan sin usar `GET /reparaciones/{id}` ni introducir credenciales en la caché de opciones.
- El selector mantiene resultados al fallar una página adicional, explica el error, permite reintentar y no atrapa Tab mientras la red continúa.
- El disparador conserva semántica estable de botón; el buscador abierto es el único nodo con rol `combobox`.

### Decisiones finales y desvíos controlados

- La presentación y navegación compartidas quedaron dentro de `Combobox.tsx` en vez de extraerse a un archivo `ComboboxBase.tsx`. `Combobox` sigue siendo compatible con los consumidores locales y `AsyncCombobox` compone esa misma base pública. Se evitó una extracción mecánica adicional después de comprobar la regresión del componente estable.
- Las opciones, IDs de DOM y `aria-activedescendant` se identifican por `value`; el cursor interno continúa representado por el índice de las páginas ya agregadas, cuyo orden es append-only. Si una fuente futura reordena páginas cargadas en el lugar, conviene migrar también ese cursor interno a `value`.
- Cuando un DTO histórico no trae nombre denormalizado, el control muestra “Selección actual sin datos” en lugar de inventar `Cliente #id` o `Equipo #id`.
- Sigue documentada como mejora de backend aceptar un filtro de reparaciones activas o múltiples estados para evitar recorrer páginas compuestas por órdenes cerradas. El frontend limita el salto automático a una página.

### Commits atómicos

```text
b59b4e6 docs(selectors): diseña búsqueda paginada en formularios
e927475 docs(selectors): planifica implementación paginada
20305cc ci(e2e): instala WebKit para la matriz móvil
8ab54fb fix(api): evita errores duplicados en consultas inline
ac50880 feat(combobox): agrega búsqueda remota paginada
80f9274 feat(api): pagina opciones remotas de formularios
7905ed1 refactor(equipos): busca clientes bajo demanda
d14a1d4 refactor(reparaciones): busca equipos bajo demanda
6ee0f92 refactor(repuestos): pagina reparaciones e inventario
d167dd1 test(e2e): cubre selectores paginados en móvil
7593860 fix(combobox): corrige foco y estados incrementales
```

### Verificación final

```text
npm test          58 archivos / 244 pruebas aprobadas
npm run typecheck aprobado
npm run lint      aprobado
npm run build     aprobado
npm run test:e2e  57 pruebas aprobadas
git diff --check  aprobado
```

La matriz E2E aprobó Chromium de escritorio y los perfiles `mobile-320`, `mobile-390`, `mobile-landscape` y `mobile-webkit`, incluida selección real desde página 2, carrera entre búsquedas, foco, Escape, scroll y ausencia de requests al detalle sensible.
