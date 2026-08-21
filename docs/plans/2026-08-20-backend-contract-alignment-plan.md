# Plan de implementación — alineación crítica con el backend

Fecha: 2026-08-20  
Diseño aprobado: `docs/plans/2026-08-20-backend-contract-alignment-design.md`

## Objetivo

Alinear la frontera frontend/backend que afecta sesión, tenant, roles, suscripción y credenciales sensibles; retirar Excel de Plan; agregar visibilidad accesible a las contraseñas de cuenta; y mantener la suite actual sin regresiones.

## Reglas de ejecución

- Preservar todos los cambios no relacionados del worktree.
- Escribir primero la prueba focal de cada comportamiento y comprobar que falla por la razón esperada.
- Mantener `apiClient` como frontera autenticada y `publicClient` para auth/tracking público.
- No ampliar el alcance a paginación >100, opciones >200 ni persistencia de filtros.
- No modificar la autorización del backend ni agregar ojo al PIN/patrón del dispositivo.

## Tarea 1 — Unificar QueryClient y purgar datos tenant-scoped

Archivos:

- Crear `src/api/queryClient.ts`.
- Modificar `src/main.tsx`.
- Modificar `src/store/auth.store.ts`.
- Ampliar `src/store/auth.store.test.tsx`.

Pasos:

1. Extraer la instancia y opciones actuales de React Query desde `main.tsx` a `queryClient.ts`.
2. Escribir una prueba que precargue una query tenant-scoped, ejecute `logout()` y espere una caché vacía.
3. Escribir una prueba que inicie sesión con una identidad diferente y espere que se purgue la caché anterior.
4. Hacer que `login` limpie la caché antes de reemplazar una identidad distinta y que `logout` la limpie siempre.
5. Mantener la comprobación local de `exp` durante rehidratación.

Verificación focal:

```bash
npm test -- src/store/auth.store.test.tsx
```

## Tarea 2 — Crear el límite inicial de sesión

Archivos:

- Modificar `src/router/guards.tsx`.
- Ampliar `src/router/guards.test.tsx`.
- Reutilizar `src/api/queries/suscripcion.queries.ts`.
- Reutilizar `src/components/Loader.tsx` y `src/components/ErrorState.tsx`.

Pasos:

1. Extraer un `SessionGate` interno a las rutas protegidas.
2. Con token local vigente, consultar `GET /suscripcion` antes de renderizar los hijos.
3. Mostrar un loader mientras se valida.
4. Si la respuesta base indica sesión inválida, redirigir a login.
5. Si la validación falla por red/5xx, conservar la sesión y mostrar un estado recuperable con botón de reintento.
6. Cubrir: token ausente/vencido, validación pendiente, éxito, 403 y 500 con reintento.

Verificación focal:

```bash
npm test -- src/router/guards.test.tsx
```

## Tarea 3 — Corregir la semántica 401/403 y auth público

Archivos:

- Modificar `src/api/axios.ts`.
- Modificar `src/api/mutations/auth.mutations.ts`.
- Ampliar `src/api/axios.test.ts`.

Pasos:

1. Cambiar login y registro a `publicClient` para no enviar un Bearer viejo.
2. Mantener `401` como logout inmediato.
3. Tratar un `403` de `/suscripcion` como sesión inválida.
4. Para otro `403`, ejecutar una validación base mediante un cliente sin el interceptor de respuesta.
5. Deduplicar validaciones simultáneas con una única promesa compartida.
6. Distinguir tres resultados: válida (falta de permiso), inválida (logout) e indeterminada por red/5xx (conservar sesión y mostrar error recuperable).
7. Cubrir un POST de usuario desactivado, un DELETE sin rol y dos 403 concurrentes.

Verificación focal:

```bash
npm test -- src/api/axios.test.ts src/api/mutations/auth.mutations.test.tsx
```

## Tarea 4 — Hacer que los entitlements fallen cerrados

Archivos:

- Modificar `src/types/index.ts`.
- Modificar `src/api/queries/suscripcion.queries.ts`.
- Crear o ampliar pruebas de suscripción y gating.
- Ajustar fixtures en `e2e/helpers.ts` y pruebas de gating.

Pasos:

1. Hacer obligatoria `Suscripcion.funciones`.
2. Cambiar `useFunciones` para devolver `false` hasta tener una respuesta exitosa.
3. Exponer junto a los flags `isLoading`, `isError` y `refetch` para pantallas que necesiten un estado explícito.
4. Garantizar que inventario, caja y empleados no consulten endpoints PRO antes de resolver `/suscripcion`.
5. Corregir fixtures que modelan `TRIAL` con flags falsos o límite finito.
6. Cubrir FREE/ACTIVA, FREE/TRIAL, PRO/ACTIVA y PRO/VENCIDA.

Verificación focal:

```bash
npm test -- src/api/queries/suscripcion.queries.test.tsx src/pages/CajaPage.test.tsx src/pages/RepuestosPage.test.tsx
```

## Tarea 5 — Representar correctamente Plan y checkout

Archivos:

- Modificar `src/pages/PlanesPage.tsx`.
- Modificar `src/api/mutations/pagos.mutations.ts`.
- Crear `src/pages/PlanesPage.test.tsx`.
- Crear o ampliar la prueba focal de pagos.

Pasos:

1. Añadir estados explícitos de carga y error a Plan.
2. Derivar el estado visible de `plan`, `estado`, `funciones` y `limiteReparacionesMes`.
3. Presentar TRIAL como prueba con experiencia PRO e ilimitada.
4. No presentar PRO/VENCIDA como una suscripción activa.
5. Reemplazar “Hasta 25” por una descripción dependiente del límite contractual disponible.
6. Mantener inicio/cancelación de suscripción solo para ADMIN.
7. Ante `409` de checkout, invalidar/refrescar `SUSCRIPCION_KEY` además de mostrar el mensaje.
8. Mantener `502` como error reintentable manualmente.

Verificación focal:

```bash
npm test -- src/pages/PlanesPage.test.tsx src/api/mutations/pagos.mutations.test.tsx
```

## Tarea 6 — Agregar PasswordInput y retirar Excel de Plan

Checkpoint visual obligatorio:

- Intent: escritura rápida y comprobable para dueño o empleado, sin perder el enmascarado por defecto.
- Palette: tokens actuales de texto, borde, superficie y `primary`.
- Depth: input inserto con borde discreto; sin sombra nueva.
- Surfaces: botón de ojo dentro del mismo plano del control.
- Typography: Manrope actual.
- Spacing: base 4 px; target de 44 px.

Archivos:

- Crear `src/components/PasswordInput.tsx`.
- Crear `src/components/PasswordInput.test.tsx`.
- Modificar `src/pages/LoginPage.tsx`.
- Modificar `src/pages/RegisterPage.tsx`.
- Modificar `src/pages/ResetPasswordPage.tsx`.
- Modificar `src/components/UsuarioFormModal.tsx` y su prueba.
- Modificar `src/pages/PlanesPage.tsx`.
- Modificar `src/components/ExportExcelButton.tsx` si la variante `card` queda sin uso.
- Modificar `e2e/export.spec.ts`.

Pasos:

1. Implementar `PasswordInput` con `forwardRef` y el contrato de un input nativo salvo `type`.
2. Conservar `name`, `onBlur`, `onChange`, `autocomplete`, ARIA y refs de React Hook Form.
3. Alternar el tipo sin modificar valor ni selección.
4. Añadir botón con `aria-label`, `aria-pressed`, foco visible y target 44 × 44.
5. Reemplazar los cinco campos de contraseña de cuenta.
6. Quitar el import y bloque de exportación de Plan.
7. Conservar y probar la descarga desde Dashboard; afirmar que no existe en Plan.

Verificación focal:

```bash
npm test -- src/components/PasswordInput.test.tsx src/components/UsuarioFormModal.test.tsx
npm run test:e2e -- e2e/export.spec.ts
```

## Tarea 7 — Separar y contener PIN/patrón

Archivos:

- Modificar `src/types/index.ts`.
- Modificar `src/api/queries/reparaciones.queries.ts`.
- Crear `src/hooks/useCredencialesReparacion.ts` y su prueba.
- Modificar `src/pages/ReparacionDetallePage.tsx`.
- Modificar `src/components/ReparacionFormModal.tsx` y su prueba.
- Modificar `src/api/mutations/reparaciones.mutations.ts` y su prueba.

Pasos:

1. Quitar PIN/patrón de `Reparacion` y crear `ReparacionDetalle`.
2. Sanitizar la respuesta del GET detalle antes de introducir la parte no sensible en React Query.
3. Cargar los dos secretos en estado local efímero, fuera de QueryClient, y limpiarlos al desmontar.
4. Combinarlos solo para el formulario de edición abierto desde el detalle.
5. Al iniciar una transición a `ENTREGADO`, vaciar inmediatamente el estado local; si la mutación falla, recargar el detalle.
6. Diferenciar en el payload: valor omitido conserva, texto vacío borra y texto no vacío actualiza.
7. Cubrir listados sin secretos, limpieza inmediata y borrado explícito mediante `""`.

Verificación focal:

```bash
npm test -- src/hooks/useCredencialesReparacion.test.tsx src/components/ReparacionFormModal.test.tsx src/api/mutations/cambiarEstado.test.tsx
```

## Tarea 8 — Sanitizar telemetría

Archivos:

- Modificar `src/lib/sentry.ts`.
- Crear `src/lib/sentry.test.ts`.
- Mantener `src/api/axios.ts` sin reportar 4xx esperados.

Pasos:

1. Convertir errores Axios 5xx/red en un error seguro con status, método y pathname, sin body ni headers.
2. Redactar defensivamente `Authorization`, cookies y request data en `beforeSend`.
3. Evitar que PIN, patrón, contraseña o Bearer aparezcan en el objeto entregado a Sentry.
4. Mantener descartados los 4xx esperados.

Verificación focal:

```bash
npm test -- src/lib/sentry.test.ts src/api/axios.test.ts
```

## Tarea 9 — Corregir cuerpos PUT, pago visible e invalidaciones

Archivos:

- Modificar `src/api/mutations/clientes.mutations.ts`.
- Modificar `src/api/mutations/equipos.mutations.ts`.
- Modificar `src/api/mutations/repuestos.mutations.ts`.
- Modificar `src/api/mutations/reparaciones.mutations.ts`.
- Modificar `src/api/mutations/presupuestos.mutations.ts`.
- Modificar `src/components/PagoChip.tsx`.
- Modificar `src/pages/DashboardPage.tsx`.
- Modificar `src/pages/ReparacionesPage.tsx`.
- Modificar `src/pages/ReparacionDetallePage.tsx`.

Pasos:

1. Extraer `id` antes de cada PUT de cliente, equipo y repuesto.
2. Agregar pruebas MSW que inspeccionen el body exacto.
3. Mostrar `PagoChip` siempre que el backend entregue `estadoPago`, incluso en FREE.
4. Mantener `funciones.cobros` solo para crear/anular cobros, caja y recibo.
5. Mostrar `Reparacion.total` en Dashboard, con fallback únicamente para datos legados.
6. Centralizar invalidaciones derivadas de reparación: reparaciones, detalle, dashboard, suscripción en altas, clientes/equipos y cobros/recibo cuando corresponda.
7. Hacer que crear/responder/re-presupuestar invalide también dashboard y detalle.

Verificación focal:

```bash
npm test -- src/api/mutations src/pages/ReparacionesPage.test.tsx
```

## Tarea 10 — Respetar Retry-After y distinguir tracking

Archivos:

- Crear `src/utils/retryAfter.ts` y su prueba.
- Crear `src/hooks/useRetryAfter.ts` y su prueba.
- Modificar `src/api/mutations/auth.mutations.ts`.
- Modificar `src/pages/LoginPage.tsx`.
- Modificar `src/pages/RegisterPage.tsx`.
- Modificar `src/pages/OlvidePasswordPage.tsx`.
- Modificar `src/pages/SeguimientoPage.tsx`.
- Ampliar pruebas de auth y tracking.

Pasos:

1. Parsear `Retry-After` como segundos o fecha HTTP y limitar resultados inválidos.
2. Implementar un countdown reutilizable que limpie su timer al desmontar.
3. En login, registro y recuperación, deshabilitar el submit hasta vencer la espera y comunicar segundos restantes.
4. Mantener mutaciones sin retry automático.
5. En tracking, distinguir `404`, `429` y errores temporales; el reintento queda deshabilitado durante el cooldown.
6. Probar con temporizadores falsos y headers en ambos formatos.

Verificación focal:

```bash
npm test -- src/utils/retryAfter.test.ts src/hooks/useRetryAfter.test.tsx src/pages/SeguimientoPage.test.tsx
```

## Tarea 11 — Actualizar documentación contractual

Archivos:

- Reemplazar `docs/FRONTEND_INTEGRATION.md` con la guía aprobada adjunta.
- Modificar `DEPLOY.md` en la sección MercadoPago.

Pasos:

1. Copiar literalmente la nueva fuente de verdad al documento local.
2. Actualizar monto ARS 24.900, kill switch, collector/application IDs y requisitos HTTPS.
3. No versionar secretos ni credenciales de producción.
4. Verificar que el frontend nunca use variables `VITE_*` para secretos MercadoPago.

Verificación focal:

```bash
rg -n '4\.999|MP_CHECKOUT_ENABLED|MP_COLLECTOR_ID|MP_APPLICATION_ID|24900' DEPLOY.md docs/FRONTEND_INTEGRATION.md
```

## Tarea 12 — Cierre integral

Pasos:

1. Ejecutar formato/diff check.
2. Ejecutar typecheck y ESLint.
3. Ejecutar los unitarios completos.
4. Ejecutar build de producción.
5. Ejecutar E2E focales y luego la matriz completa.
6. Revisar manualmente el diff para evitar archivos de usuario o cambios fuera de alcance.

Comandos:

```bash
git diff --check
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

## Criterio de finalización

La tarea termina únicamente cuando los criterios del diseño están implementados, las pruebas nuevas demuestran cada borde contractual, la suite previa permanece verde y el diff final contiene solo cambios propios y preexistentes preservados.
