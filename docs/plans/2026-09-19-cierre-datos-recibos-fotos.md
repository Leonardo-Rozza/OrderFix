# Cierre y datos — constancias de eliminación de fotos

Fecha: 2026-09-19. Base frontend `53d653a`, backend `70181fa`.
Orden solicitado: continuar cierres/datos y después adaptar otros tipos de equipos.

El cierre reversible, la descarga previa y la restauración ya tienen evidencia
local reciente, posterior a las mejoras de UI y email. No se rehace esa pantalla.
El siguiente faltante concreto de D es conservar evidencia de las eliminaciones de
fotos: actualmente se vacía su identificador al terminar y sólo queda el estado local.

El backend agrega objetivos y resultados durables para DELETE y limpieza programada.
Una identidad eliminada con confirmación se distingue de una clave que simplemente
no se encontró sin identidad conocida. Las fotos históricas no reciben comprobantes
retrospectivos. El inventario de cierre mantiene visibles los casos no acreditados.

No cambia el contrato HTTP ni la UI; tampoco se publica un estado de taller eliminado.
La supresión definitiva de negocio/identidad, política real por categoría, efectos
inciertos y recuperación del despliegue conservan sus pendientes. El diseño técnico
detallado está en `docs/plans/2026-09-19-cierre-recibos-fotos-design.md` del backend.

## Validación

Implementación backend en `826ea28` (`feat(fotos): conserva constancias de eliminacion
privada`). V35 conserva objetivos/resultados durables; no cambia el contrato HTTP.

- 120 casos focales únicos de PostgreSQL 16 aprobados.
- Cuatro recorridos de navegador (desktop/móvil, alta rápida/equipo existente) y una
  validación JUnit aprobados, con cuatro recibos exactos. Almacenamiento sintético.
- La primera integral aprobó 7.991 unitarias; se detuvo después de 83 clases IT al
  detectar 18 aserciones desactualizadas en tres suites. No se acredita como aprobada.
- Se corrigieron fixtures de email verificado/routing y expectativa de historia
  Flyway, sin cambiar autenticación. Repetición focal: 104 casos aprobados.
- La integral completa se concentra en el gate final de equipos, que incluye V35.
  No hubo llamadas reales a proveedores, eliminación de cuentas ni push.

Migraciones V27–V34 y archivos ajenos preservados; V35 queda congelada.

## Equipos después de este frente

Se conserva el [alcance acordado para otros equipos](2026-09-19-equipos-multidispositivo-pendiente.md):
clasificación, serie/IMEI, campos de acceso opcionales y el mismo circuito de reparación.
La revisión identificó ambas altas (Equipo e ingreso rápido) y las dos exportaciones
(Excel y ZIP); deberán conservar los datos actuales y no inferir categorías históricas
por marca o IMEI. Su implementación tendrá su propio corte y commit.
