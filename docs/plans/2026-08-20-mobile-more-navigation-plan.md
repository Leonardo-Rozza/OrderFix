# Plan de implementación — navegación móvil con menú “Más”

Fecha: 2026-08-20  
Diseño aprobado: `docs/plans/2026-08-20-mobile-more-navigation-design.md`

## Objetivo

Mantener cinco destinos legibles en la barra móvil y habilitar el acceso a todas las secciones permitidas mediante una bandeja accesible, sin modificar permisos ni la navegación de escritorio.

## Reglas de ejecución

- Preservar los cambios existentes del worktree, especialmente `BottomNav`, `DashboardLayout`, `Modal` y la suite móvil.
- Reutilizar `navItems`, `useAuth`, `useFunciones` y `Modal`; no crear una segunda matriz de permisos.
- Mantener funciones cerradas mientras la suscripción está indeterminada.
- Escribir primero las pruebas focales y comprobar que fallan por el comportamiento ausente.
- No ampliar el alcance a títulos por ruta, contraste ni rediseño del sidebar.

## Tarea 1 — Separar destinos primarios y secundarios

Archivos:

- Modificar `src/config/nav.tsx`.
- Crear `src/config/nav.test.tsx` solo si la derivación requiere lógica independiente.

Pasos:

1. Quitar Plan del conjunto primario móvil sin quitarlo de `navItems`.
2. Mantener cuatro destinos primarios.
3. Exportar los destinos secundarios reales como elementos no primarios y no futuros.
4. Verificar que Reportes no ingrese en la bandeja.

## Tarea 2 — Crear la bandeja accesible

Checkpoint:

- Intento: técnico o encargado navegando con una mano.
- Paleta: tokens existentes; teal solo para el destino activo.
- Profundidad: `Modal` y sombra compartida.
- Superficies: grilla de herramientas sobre la superficie elevada.
- Tipografía: Manrope actual.
- Espaciado: base 4 px; targets de 44 px.

Archivos:

- Crear `src/components/MobileMoreMenu.tsx`.
- Crear `src/components/BottomNav.test.tsx`.

Pasos:

1. Recibir `isOpen`, `onClose` y destinos ya filtrados.
2. Renderizar `Modal` con título “Más herramientas”.
3. Mostrar una grilla de `NavLink` con icono y etiqueta.
4. Cerrar al seleccionar una ruta.
5. Exponer `aria-current` en el destino activo.
6. Conservar foco, Escape, scroll lock y safe area mediante `Modal`.

## Tarea 3 — Integrar “Más” en BottomNav

Archivos:

- Modificar `src/components/BottomNav.tsx`.
- Ampliar `src/components/BottomNav.test.tsx`.

Pasos:

1. Mantener los cuatro `NavLink` primarios.
2. Agregar un botón con icono de bandeja/cuadrícula y etiqueta “Más”.
3. Filtrar secundarios con las mismas reglas de `Sidebar`.
4. Derivar el estado activo desde `location.pathname`, no con un efecto.
5. Exponer `aria-haspopup`, `aria-expanded` y `aria-current`.
6. Abrir/cerrar la bandeja con estado local funcional.
7. Cerrar la bandeja automáticamente ante una selección.

Pruebas focales:

- Cinco destinos totales en la barra.
- Plan ausente de la barra y presente en la bandeja.
- Filtrado USER/ADMIN y funciones FREE/PRO.
- Estado activo de “Más”.
- Escape y restauración de foco.
- Navegación y cierre al elegir una herramienta.

## Tarea 4 — Cobertura E2E móvil

Archivos:

- Modificar `e2e/mobile.spec.ts` o crear `e2e/mobile-navigation.spec.ts` si mejora el aislamiento.

Pasos:

1. Abrir la app en el viewport móvil más estrecho configurado.
2. Confirmar cinco destinos visibles sin overflow horizontal.
3. Abrir “Más” y comprobar semántica de diálogo.
4. Medir targets visibles en la bandeja.
5. Navegar a Inventario o Repuestos y confirmar URL/página.
6. Confirmar que “Más” queda activo en la ruta secundaria.
7. Cubrir Escape y retorno del foco.

## Tarea 5 — Cierre

Comandos:

```bash
git diff --check
npm run typecheck
npm run lint
npm test -- src/components/BottomNav.test.tsx
npm run test:e2e -- e2e/mobile.spec.ts
npm run build
```

Después de los focales, ejecutar la suite unitaria completa y la matriz E2E completa si el tiempo de cierre lo permite.

## Criterios de aceptación

- Todas las rutas existentes y autorizadas son alcanzables desde móvil.
- La barra inferior contiene exactamente cinco destinos utilizables a 320 px.
- Plan vive dentro de “Más” y el sidebar de escritorio no cambia.
- Las secciones administrativas y PRO respetan rol y `funciones`.
- La bandeja tiene diálogo nombrado, foco contenido, Escape y restauración de foco.
- No hay overflow horizontal ni targets menores de 44 px en móvil.
- Typecheck, lint, build, unitarios y E2E quedan verdes.
