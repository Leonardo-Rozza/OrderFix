# Plan de implementación — Consistencia operativa de datos

**Diseño aprobado:** `docs/plans/2026-08-20-data-consistency-design.md`  
**Fecha:** 2026-08-20

## Principios de ejecución

- Preservar los cambios preexistentes del worktree.
- Escribir primero pruebas que reproduzcan la contradicción observada.
- Preferir respuestas del servidor y reconciliación explícita sobre optimismo parcial.
- Mantener cada helper de consistencia acotado a un evento de dominio.
- No incorporar los pendientes de escalabilidad o hardening contractual excluidos del diseño.

## Tarea 1 — Centralizar query keys y operaciones de caché

Archivos:

- Crear `src/api/queryKeys.ts`.
- Crear `src/api/cacheConsistency.ts`.
- Crear `src/api/cacheConsistency.test.ts`.
- Modificar únicamente las queries/mutaciones alcanzadas para consumir las factories.

Pasos:

1. Definir factories estables para suscripción, dashboard, clientes, equipos, reparaciones, repuestos, presupuestos, cobros, caja, recibos, seguimiento e inventario.
2. Conservar la forma actual de las keys para no perder caches ni romper pruebas existentes.
3. Crear helpers por evento: cliente cambiado, equipo cambiado, reparación cambiada/eliminada, presupuesto cambiado, cobro cambiado y suscripción degradada.
4. Usar prefijos para copias denormalizadas e IDs exactos para detalle/hijos.
5. En bajas exitosas, remover queries exactas sólo después de la respuesta del backend.
6. Probar la matriz sobre un `QueryClient` sembrado, verificando stale/remove y preservación de dominios no relacionados.

Verificación focal:

```bash
npm test -- src/api/cacheConsistency.test.ts
```

## Tarea 2 — Reconciliar clientes y equipos

Archivos:

- Modificar `src/api/mutations/clientes.mutations.ts`.
- Modificar `src/api/mutations/equipos.mutations.ts`.
- Crear o ampliar pruebas de ambas mutaciones.

Pasos:

1. Escribir pruebas que siembren listas de clientes, equipos, reparaciones y dashboard.
2. Hacer que un cliente actualizado reemplace su detalle y marque stale todas las copias denormalizadas.
3. Hacer que crear, actualizar o eliminar un equipo refresque clientes y `equiposCount` además de equipos.
4. En actualización de equipo, refrescar reparaciones, repuestos, dashboard, recibos y seguimiento.
5. Mantener intacta la caché ante 400/409/500.
6. Retornar/esperar la reconciliación relevante para que el estado pending no termine antes que las vistas activas dependientes.

Verificación focal:

```bash
npm test -- src/api/mutations/clientes.mutations.test.tsx src/api/mutations/equipos.mutations.test.tsx
```

## Tarea 3 — Corregir transiciones y bajas de reparación

Archivos:

- Modificar `src/api/mutations/reparaciones.mutations.ts`.
- Ampliar `src/api/mutations/cambiarEstado.test.tsx`.
- Ampliar `src/api/mutations/reparaciones.invalidations.test.tsx`.
- Modificar consumidores sólo si necesitan el resultado confirmado.

Pasos:

1. Crear pruebas con páginas filtradas por estado y detalle sembrado.
2. Eliminar el updater optimista que sólo cambia `estado` dentro de la misma página filtrada.
3. Durante PATCH mantener la caché confirmada anterior y bloquear acciones concurrentes desde la UI.
4. En éxito, escribir la respuesta segura en el detalle e invalidar/esperar listas, tablero y derivados.
5. En error, comprobar que lista y detalle conservan exactamente el estado previo.
6. En update, refrescar repuestos si cambia el equipo de la reparación.
7. En delete exitoso, purgar detalle, repuestos, presupuestos, cobros y recibo del ID; después refrescar padres y agregados.
8. En delete fallido, no remover ninguna query.

Verificación focal:

```bash
npm test -- src/api/mutations/cambiarEstado.test.tsx src/api/mutations/reparaciones.invalidations.test.tsx
```

## Tarea 4 — Completar dependencias de presupuestos, cobros y plan

Archivos:

- Modificar `src/api/mutations/presupuestos.mutations.ts`.
- Modificar `src/api/mutations/cobros.mutations.ts`.
- Modificar `src/api/mutations/pagos.mutations.ts`.
- Ampliar sus pruebas focales.

Pasos:

1. Hacer que presupuestos refresquen recibo y seguimiento además de reparación/listas/dashboard.
2. Eliminar la doble fuente de `reparacionId`: request e invalidación deben usar el mismo ID.
3. Mantener en cobros la matriz cobros/caja/recibo/reparación/listas/dashboard.
4. Al cancelar PRO, reemplazar suscripción y remover o invalidar caches restringidas que ya no deben reaparecer fresh.
5. Probar que errores conservan caches y que sólo un éxito dispara la reconciliación.

Verificación focal:

```bash
npm test -- src/api/mutations/presupuestos.mutations.test.tsx src/api/mutations/cobros.mutations.test.tsx src/api/mutations/pagos.mutations.test.tsx
```

## Tarea 5 — Hacer honestas las secciones del detalle y las fichas

Archivos:

- Modificar `src/pages/ReparacionDetallePage.tsx`.
- Modificar `src/components/ClienteFichaModal.tsx`.
- Modificar `src/components/EquipoReparacionesModal.tsx`.
- Agregar pruebas focales de carga/error/vacío.

Pasos:

1. Consumir `isPending/isError/isSuccess/refetch` de repuestos, presupuestos y cobros.
2. Renderizar loader local mientras la sección es desconocida.
3. Renderizar error y reintento local ante fallo.
4. Mostrar “sin …” únicamente cuando la query terminó con éxito y el arreglo está vacío.
5. Deshabilitar crear, cobrar o anular cuando la decisión depende de una consulta desconocida/fallida.
6. En la ficha de cliente y reparaciones del equipo, evitar que un fallo se anuncie como ausencia real.
7. Mantener accesibilidad de botones, regiones vivas y foco del modal.

Verificación focal:

```bash
npm test -- src/pages/ReparacionDetallePage.test.tsx src/components/ClienteFichaModal.test.tsx src/components/EquipoReparacionesModal.test.tsx
```

## Tarea 6 — Corregir KPIs, Caja y columnas del tablero

Archivos:

- Modificar `src/pages/DashboardPage.tsx`.
- Modificar `src/pages/CajaPage.tsx`.
- Modificar `src/pages/ReparacionesPage.tsx`.
- Ampliar `DashboardPage.test.tsx`, `CajaPage.test.tsx` y `ReparacionesPage.test.tsx`.

Pasos:

1. No calcular KPIs con `?? 0` antes de confirmar éxito.
2. Mostrar skeleton/estado desconocido para el bloque completo durante carga.
3. En error, reemplazar métricas desconocidas por `—` o un ErrorState; no por cero.
4. Aplicar lo mismo al resumen de Caja y sus totales por método.
5. Consumir error y retry por columna en el tablero; una query fallida no debe mostrar “Sin reparaciones”.
6. Deshabilitar selector y accesos de cambio de estado mientras la mutación está pendiente.
7. Mantener fuera de alcance la carga de más de 100 elementos, pero no ocultar errores ni afirmar que el resultado es completo si el total excede lo cargado.

Verificación focal:

```bash
npm test -- src/pages/DashboardPage.test.tsx src/pages/CajaPage.test.tsx src/pages/ReparacionesPage.test.tsx
```

## Tarea 7 — Señalar datos placeholder y corregir páginas huérfanas

Archivos:

- Modificar `src/hooks/useListParams.ts` o crear un helper acotado de paginación.
- Modificar las páginas de Clientes, Equipos, Reparaciones, Repuestos e Inventario.
- Ampliar pruebas de listados/paginación.

Pasos:

1. Consumir `isFetching` e `isPlaceholderData` de las queries con `keepPreviousData`.
2. Marcar el contenedor `aria-busy` y mostrar “Actualizando…” sin desmontar toda la lista.
3. Deshabilitar acciones destructivas y cambio de página mientras las filas pertenecen al criterio anterior.
4. Al recibir metadata nueva, ajustar una página fuera de rango a `max(totalPages - 1, 0)`.
5. Probar búsqueda/paginación rápida y baja del último elemento de la última página.

Verificación focal:

```bash
npm test -- src/hooks/useListParams.test.ts src/components/Pagination.test.tsx
```

## Tarea 8 — Regresión completa

Pasos:

1. Ejecutar todas las pruebas unitarias.
2. Ejecutar TypeScript y ESLint.
3. Ejecutar build de producción.
4. Ejecutar los E2E existentes, con atención a reparación, cobros, presupuesto, móvil y navegación.
5. Ejecutar `git diff --check`.
6. Revisar el diff final para no incluir archivos ajenos al alcance.

Comandos:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
git diff --check
```

## Criterio de cierre

La etapa queda completa cuando todas las mutaciones alcanzadas tienen una política de caché comprobada, ninguna superficie corregida confunde desconocido con vacío/cero y la suite completa permanece verde.
