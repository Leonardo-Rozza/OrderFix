# Navegación móvil completa con bandeja “Más”

Fecha: 2026-08-20

## Contexto

En viewports menores a `lg`, OrdenFix oculta el sidebar y usa una barra inferior. Esa barra muestra Dashboard, Reparaciones, Clientes, Equipos y Plan, pero deja sin acceso directo a Repuestos, Inventario, Caja y Empleados. Las rutas existen y sus permisos ya se derivan del rol y de `Suscripcion.funciones`; el problema es exclusivamente de navegación.

## Decisión aprobada

La barra inferior conservará cinco destinos para mantener etiquetas legibles y targets cómodos:

1. Inicio.
2. Reparaciones.
3. Clientes.
4. Equipos.
5. Más.

“Más” reemplaza a Plan como destino directo. Al activarlo abre una bandeja con las herramientas secundarias disponibles. Se descartaron:

- Seis botones en la barra, porque comprimen iconos y etiquetas.
- Scroll horizontal, porque oculta destinos y hace inestable la ubicación.
- Un menú hamburguesa en el encabezado, porque queda fuera de la zona natural del pulgar.

## Dirección de interfaz

### Dominio

- Orden de trabajo.
- Banco de herramientas.
- Bandeja de repuestos.
- Caja del taller.
- Credencial del encargado.
- Etiqueta de plan.

### Mundo de color

- Grafito de herramientas para texto.
- Acero del banco para bordes.
- Papel marfil de la orden para superficies.
- Teal de alfombra antiestática para ubicación activa.
- Ámbar de etiqueta preventiva para estados de atención.
- Rojo de riesgo solo para acciones destructivas.

### Firma

La bandeja “Más herramientas” se comporta como el cajón secundario del banco de trabajo: las cuatro tareas más frecuentes permanecen siempre a mano y las herramientas contextuales aparecen agrupadas sin perder su icono ni su nombre.

### Checkpoint visual

- **Intento:** un técnico o encargado debe llegar con una mano a cualquier sección permitida, sin recordar rutas ni interpretar iconos aislados.
- **Paleta:** se reutilizan los tokens actuales; `primary` indica ubicación o selección, no decoración.
- **Profundidad:** la barra queda en la superficie base y la bandeja usa el nivel y la sombra del `Modal` existente.
- **Superficies:** tarjetas discretas dentro de la bandeja; el destino activo usa `primary-soft`.
- **Tipografía:** Manrope y jerarquías actuales.
- **Espaciado:** base de 4 px y área táctil mínima de 44 × 44 px.

## Arquitectura

### Configuración de destinos

`nav.tsx` seguirá siendo la fuente única de navegación. Plan dejará de pertenecer a los destinos primarios móviles. Se exportarán dos conjuntos:

- `mobileNavItems`: los cuatro destinos primarios.
- `mobileMoreItems`: destinos reales que no pertenecen a la barra y no están marcados como futuros.

El sidebar de escritorio continuará usando `navItems` completo sin cambios visuales.

### Barra inferior

`BottomNav` mantendrá los cuatro `NavLink` primarios y agregará un botón “Más”. El botón:

- Tendrá `aria-haspopup="dialog"` y `aria-expanded`.
- Se marcará activo cuando la ruta actual pertenezca a una herramienta de la bandeja.
- Abrirá y cerrará el panel sin introducir estado global.
- Conservará el mismo target, tipografía y tratamiento de foco de los demás destinos.

### Bandeja de herramientas

Un componente `MobileMoreMenu` recibirá apertura, cierre y los destinos visibles. Reutilizará `Modal` para obtener:

- Nombre y semántica de diálogo.
- Cierre con Escape y backdrop.
- Foco inicial, trap y restauración al botón “Más”.
- Bloqueo de scroll.
- Altura dinámica y safe area.

Los destinos se presentarán como una grilla de tarjetas con icono y etiqueta. Al elegir uno, primero se cerrará la bandeja y luego React Router realizará la navegación.

## Permisos y datos

La bandeja reutilizará exactamente las reglas del sidebar:

- `adminOnly` requiere `isAdmin`.
- `feature="inventario"` requiere `funciones.inventario`.
- `feature="cobros"` requiere `funciones.cobros`.
- Los destinos `soon` no se mostrarán.

No se duplicarán flags ni se inferirán capacidades desde el nombre del plan. Durante un estado indeterminado, `useFunciones` ya falla cerrado, por lo que las secciones PRO no aparecerán hasta resolver la suscripción.

## Comportamiento por perfil

- `USER` FREE: Repuestos y Plan.
- `ADMIN` FREE: Repuestos, Plan y Empleados; la pantalla conserva su aviso PRO para crear usuarios adicionales.
- Taller con inventario/cobros: agrega Inventario y Caja.

Las reglas efectivas serán las declaradas en `navItems`; esta lista describe el resultado esperado, no crea una segunda fuente de permisos.

## Accesibilidad y estados

- El botón “Más” anunciará apertura y estado expandido.
- La ruta secundaria activa se distinguirá visualmente y mediante `aria-current="page"`.
- Los iconos serán decorativos cuando la etiqueta ya da el nombre.
- Escape cerrará solo la bandeja.
- Al cerrar, el foco volverá al botón que la abrió.
- La bandeja respetará modo oscuro, reduced motion y safe area existentes.

## Verificación

### Unitarios

- La barra conserva exactamente cinco destinos.
- Plan ya no aparece directamente en la barra.
- `USER` no ve destinos administrativos ni funciones deshabilitadas.
- `ADMIN` con todas las funciones ve Repuestos, Plan, Empleados, Caja e Inventario.
- “Más” queda activo en una ruta secundaria.
- Abrir, Escape, seleccionar y restaurar foco funcionan.

### E2E móvil

- A 320 px no hay overflow ni etiquetas truncadas de forma inutilizable.
- La bandeja queda dentro del viewport y sus targets miden al menos 44 px.
- Desde “Más” se puede navegar a una sección secundaria.
- La navegación primaria y el sidebar de escritorio no sufren regresiones.

## Fuera de alcance

- Rediseñar el sidebar de escritorio.
- Agregar rutas o funciones nuevas.
- Mostrar secciones no autorizadas como bloqueadas.
- Convertir la navegación en estado global.
- Modificar permisos del backend.
