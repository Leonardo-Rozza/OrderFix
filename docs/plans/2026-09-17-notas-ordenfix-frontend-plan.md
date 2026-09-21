# Notas OrdenFix — plan gradual de ajustes

Fecha: 2026-09-17.
Estado: etapas 0–5 cerradas localmente. Vista por etapas elegida por el usuario e implementada.
Base revisada: frontend `18906e9`, código local y las ocho capturas recibidas.

Este documento organiza los nueve puntos del pedido. La revisión inicial fue
estática. Tras la autorización del usuario se ejecutó la etapa 0 y se corrigió un
desborde del nombre del taller; la evidencia se registra en el
[acta de cierre](2026-09-17-etapa0-identidad-cobros-cierre.md). El usuario confirmó
que las capturas correspondían a la app local. No se inspeccionó ni publicó un
despliegue remoto. Los planes anteriores aportan contexto, sin sustituir el pedido
actual ni acreditar por sí solos un despliegue.

El 2026-09-18 se completó la etapa 1: verificación de email requerida en frontend
y backend, vista previa y confirmación de propietarios/empleados. Ver
[cierre y pruebas de etapa 1](2026-09-18-etapa1-verificacion-email-cierre.md).

También se completó la etapa 2: contraseña, selects compartidos y código de
seguimiento. Ver [cierre y capturas de etapa 2](2026-09-18-etapa2-controles-seguimiento-cierre.md).

La etapa 3 dejó el dashboard compacto, con seis etapas y desglose desplegable de
doce estados. Ver [cierre y capturas de etapa 3](2026-09-18-etapa3-dashboard-compacto-cierre.md).

El 2026-09-19 se completó la etapa 4: calendario compartido, escritura local y
validación de fechas. Ver [cierre y capturas de etapa 4](2026-09-19-etapa4-calendario-cierre.md).

También se completó la etapa 5: Reparaciones por etapas, contadores del servidor,
acciones de estado accesibles y Lista inicial en móvil. Ver
[cierre y capturas de etapa 5](2026-09-19-etapa5-reparaciones-por-etapas-cierre.md).

## Respuestas y estado de cada punto

| Punto | Qué hay hoy en el código | Trabajo necesario |
| --- | --- | --- |
| 1. Taller en presupuesto | Registro exige nombre del taller separado del nombre del administrador. Seguimiento/presupuesto muestra `data.taller`; no se encontró «MVGR» fijo en `src`. | Comprobar nombre devuelto por la API y versión del entorno de la captura. El taller debe identificar la cabecera pública. |
| 2. Identidad, saldo y recibo | Sidebar/navbar ya separan taller y usuario. Cobros es un registro manual opcional. Existe configuración de alias/QR y un resumen digital con taller principal y marca OrdenFix secundaria. | Verificar integración y datos históricos en el entorno objetivo; conservar esta dirección de producto. |
| 3. Contraseña | Login sin candado ni espacio extra; ojo y autocompletado conservados. | Etapa 2 cerrada, revisada en desktop/móvil. |
| 4. Calendario | Los cuatro campos de Cobros y Reparación usan calendario compartido, fecha visible dd/mm/aaaa y validación estricta. | Etapa 4 cerrada, revisada en Chromium/WebKit, escritorio/móvil y ambos temas. |
| 5. Reparaciones | Seis etapas con contadores, estados de la etapa seleccionada en columnas adaptables y ancho amplio específico. Lista inicial y filtro compacto en móvil. | Etapa 5 cerrada; búsqueda, URL, paginación, transiciones y ausencia de desbordes validadas. |
| 6. Dashboard | Seis contadores por etapa, total y desglose opcional de los doce estados con enlaces al filtro exacto. | Etapa 3 cerrada; vacío compacto y navegación por teclado validados. |
| 7. Selects | Los nueve usos nativos comparten flecha centrada y reserva derecha uniforme. | Etapa 2 cerrada; menú y teclado nativos conservados. |
| 8. Código | «Código de seguimiento» aparece como dato secundario junto a las fechas. | Etapa 2 cerrada; identificador y enlaces conservados. |
| 9. Email | Etapa 1 implementada: perfil autoritativo, bloqueo de operaciones en API y vista previa sin registros. | Validado localmente; publicar ambos componentes coordinados con correo configurado. |

El negativo de la captura corresponde a `$0 de total − $88.323 registrados como
cobrados`. No es un saldo de banco, Mercado Pago o caja del negocio. El contrato
actual distingue pendiente `max(total − cobrado, 0)` y excedente
`max(cobrado − total, 0)`. Un excedente exige revisión de los registros: no debe
ocultarse ni presentarse automáticamente como una acreditación o devolución real.

OrdenFix conserva el alcance de control interno: el taller recibe dinero por sus
medios y decide si lo registra. Guardar alias/QR no confirma pagos. El resumen
digital es informativo, con el taller como emisor y OrdenFix en segundo plano;
no se presenta como factura ni comprobante fiscal. Actualmente es una pantalla
autenticada, distinta del seguimiento público del cliente.

## Dirección de interfaz

La persona que recibe o repara equipos necesita localizar una orden, reconocer su
etapa y resolver su siguiente acción. El diseño debe permitir esa lectura rápida
sin grandes zonas vacías ni columnas cortadas.

El vocabulario que organiza la propuesta es el del taller: ingreso, diagnóstico,
presupuesto, trabajo, espera de repuesto, retiro y entrega. Se conservan los tokens
actuales: grafito de las superficies, turquesa de acción, azul de ingreso, ámbar de
trabajo, violeta de espera y verde de finalización; los temas claro y oscuro siguen
usando la misma jerarquía. No se cambia tipografía ni identidad de marca.

El elemento que guía la pantalla es el recorrido de la orden por seis etapas. Sus
contadores, estados internos, tarjetas, acciones y enlaces desde Inicio comparten
esa organización. Se reemplazan las columnas horizontales permanentes por una
etapa enfocada; las barras vacías por contadores compactos; y los controles con
espaciado desigual por componentes compartidos.

Se compararon tres opciones para Reparaciones:

| Opción | Ventaja | Costo |
| --- | --- | --- |
| Etapas y contenido seleccionado — elegida | Conserva el panorama de cantidades y deja ancho para trabajar con las órdenes. | Para comparar tarjetas de distintas etapas hay que alternarlas o usar Lista. |
| Lista por defecto y tablero opcional | Cambio menor y búsqueda directa. | El flujo por etapas queda en segundo plano. |
| Todas las etapas en varias filas | Todas las etapas están disponibles sin scroll horizontal. | Las etapas extensas empujan las siguientes y dificultan seguir el recorrido. |

## Corte 0 — Confirmar lo existente: puntos 1 y 2

**Cerrado en local el 2026-09-17.** Perfil, seguimiento y resumen de la cuenta
indicada devuelven el mismo taller: «MVGR Reparaciones», nombre guardado en esa
cuenta de prueba. Se corrigió el desborde de nombres sin espacios en el enlace
público. Pruebas focalizadas, navegador y laboratorio PostgreSQL aprobados; ver
el acta enlazada arriba. No se alteraron movimientos ni identidad de la cuenta.

**Observación para evaluar:** la cuenta local tiene un presupuesto aprobado de
63.000 y total de orden 0. El contrato actual no copia importes al aprobar un
presupuesto. El acta registra esta separación y la decisión pendiente sobre cómo
trasladar los importes; no se implementó un cambio automático de precios.

Antes de reconstruir estas funciones, contrastar frontend/API del entorno objetivo
con la versión local. Usar dos talleres de prueba para comprobar identidad, perfil
y encabezado público, incluyendo nombres largos y móvil.

Comprobar total, cobrado, pendiente y excedente con casos sintéticos de orden sin
precio, cobro parcial, cobro completo y sobrecobro histórico. Verificar rechazo de
nuevos cobros superiores al pendiente y de reducciones de total incompatibles.
Revisar que una reparación pueda completarse sin usar el módulo de Cobros.

**Cierre:** taller correcto, usuario separado, importes coherentes, excedentes
visibles, resumen digital sin el antiguo botón Imprimir y copy informativo. Si
falla sólo el despliegue, registrar esa diferencia antes de proponer cambios de
código. No modificar movimientos históricos para hacerlos coincidir con la UI.

## Corte 1 — Email como requisito de operación: punto 9

**Cerrado en local el 2026-09-18.** Implementado y validado con navegador, API y
PostgreSQL. El alcance quedó dividido en tres partes coordinadas:

1. **Contrato y servidor.** Exponer el estado autoritativo de verificación en el
   perfil y aplicar una política central de acceso. No basar el permiso en el
   valor persistido del navegador ni limitar el control a métodos de escritura:
   consultas, descargas y generación de enlaces también requieren evaluación.
2. **Vista previa.** Permitir recorrer las secciones y ver su estructura, con
   aviso persistente y acciones explicadas como bloqueadas. No montar consultas
   de registros operativos ni formularios activos hasta resolver la verificación.
   Bloquear altas, ediciones, bajas, cambios de estado, inventario, cobros,
   empleados, exportaciones y contratación. Cuenta también debe mostrar cómo
   resolver la verificación.
3. **Confirmación y cuentas.** Tras verificar, volver a consultar el perfil de la
   sesión actual; agregar «Ya lo confirmé» y actualizar al volver de otra pestaña.
   El éxito de un enlace de otra cuenta no debe verificar la sesión abierta.
   Revisar el alta de empleados: actualmente el servidor los marca verificados
   por haber sido creados por ADMIN. Los nuevos accesos deben acreditar su email;
   definir el tratamiento de cuentas anteriores antes de activar la restricción,
   sin invalidarlas masivamente de forma automática.

Permitir identidad mínima, verificación, reenvío, inicio/cierre de sesión,
recuperación, ayuda y gestión indispensable de la propia cuenta. Definir por ruta y
método las excepciones de documentos y salidas personales existentes. La revisión
de permisos conserva los controles propios de cada una de esas acciones.

Representar email pendiente como estado propio: el estado `RESTRICTED` existente
corresponde al cierre del taller. Un error `EMAIL_NO_VERIFICADO` debe mantener la
sesión y explicar la solución, sin confundirse con sesión revocada o permisos de
plan. Estado de verificación desconocido: consultar al servidor antes de habilitar
operación; si falla, mostrar reintento.

**Cierre:** cuenta nueva, sesión antigua, acceso por URL directa y llamada directa
a API no operan sin verificación. Reenvío, token vencido/usado, otra pestaña, enlace
de otra cuenta y cambio de usuario funcionan sin desbloqueos incorrectos. Una
cuenta verificada conserva sus permisos normales. El despliegue debe coordinar
contrato, frontend y activación backend para evitar loops o cierres de sesión.

## Corte 2 — Ajustes compartidos: puntos 3, 7 y 8

**Cerrado en local el 2026-09-18.** Controles revisados en claro/oscuro, desktop,
Chromium móvil y WebKit. Los patrones compartidos y la evidencia se registran en
el acta de etapa 2 enlazada arriba.

- Contraseña: quitar candado y espacio izquierdo extra del login; conservar el ojo
  y su espacio derecho. Revisar los demás formularios que usan PasswordInput.
- Selects: unificar la presentación cerrada, con flecha propia centrada, margen
  derecho y espacio suficiente para el texto. Mantener semántica y menú nativos;
  esta corrección no requiere reconstruir el comportamiento de todos los menús.
  Incluir selects de ordenamiento y diferenciar los combobox ya existentes.
- Seguimiento: «Código de seguimiento» como metadato secundario. Mantener el
  identificador y los enlaces existentes; no confundirlo con número de orden ni
  prometer una búsqueda manual que la interfaz no ofrezca.

**Cierre:** revisión visual en claro/oscuro y desktop/móvil, escritura y
autocompletado correctos, foco visible, navegación por teclado, textos largos y
estados deshabilitado/error. El ojo no pisa la contraseña; las flechas no pisan
las opciones seleccionadas.

## Corte 3 — Dashboard compacto: punto 6

**Cerrado en local el 2026-09-18.** Validado con datos vacíos, pocos y muchos,
temas claro/oscuro y anchos 320/390/1280/1440 px. El vacío contraído no genera
scroll vertical en 1280×800 ni 1440×900. Ver el acta de etapa 3 enlazada arriba.

Mostrar inicialmente una síntesis de las seis etapas con cantidades; permitir
expandir el desglose completo de los doce estados mediante una fila «Ver todos
los estados». Contraído, conservar el panorama del flujo y todos los conteos
agregados. Expandido, ofrecer «Ver menos».

Con cero reparaciones, usar contadores compactos y un solo vacío claro en Ingresos
recientes, sin doce barras vacías ni alturas mínimas destinadas a contenido que no
existe. Con datos, los accesos a estados deben llevar a Reparaciones con el filtro
correspondiente. No representar carga o error como si fueran valores cero.

**Cierre:** vacío compacto, expansión accesible con `aria-expanded`, casos con
pocos/muchos datos y errores diferenciados. Eliminar la altura artificial; no
ocultar el overflow global ni prometer ausencia de scroll en pantallas bajas o
con zoom elevado.

## Corte 4 — Calendario compartido: punto 4

**Cerrado en local el 2026-09-19.** DayPicker y Floating UI integrados en los cuatro
campos inventariados. Se comprobaron escritura, fechas bisiestas, límites,
historial, teclado, foco y calendario dentro del modal. El acta enlazada arriba
registra las dependencias, pruebas y capturas finales.

Elegir durante este corte una base accesible mantenida, revisando su documentación
vigente antes de incorporar una dependencia. Crear un control compartido con:

- fecha visible y escritura manual en `dd/mm/aaaa`;
- calendario con tokens del tema, selección clara y navegación de mes/año;
- foco al abrir/cerrar, teclado y controles táctiles utilizables;
- limpiar fecha y restricciones mínimas/máximas según cada campo;
- validación de días reales y rango Desde/Hasta;
- valor de API/URL conservado como fecha local `YYYY-MM-DD`, sin desplazamientos
  por conversión a UTC.

Aplicarlo a Cobros y a los campos de fecha de reparación, después de inventariar
todos los usos. Conservar filtros, historial del navegador y estados de formulario.

**Cierre:** selección y escritura, fechas inválidas/bisiestas, límites de rango,
claro/oscuro, popover sin recortes en modal y a 320/390 px, y retorno de foco correcto.

## Corte 5 — Reparaciones por etapas: punto 5

**Cerrado en local el 2026-09-19.** Vista por etapas implementada con contadores
remotos, carga incremental conservada y acciones sin dependencia de arrastre.
Se verificaron escritorio, móvil, ambos temas y reflow. El acta enlazada arriba
registra las pruebas, capturas y límites.

Diseño elegido para desktop:

1. Cabecera de búsqueda, selector Etapas/Lista y Nueva reparación.
2. Seis controles con nombre y cantidad: Ingreso, Diagnóstico, Aprobación,
   En trabajo, Listo y Cerradas. Adaptar filas al ancho; no cortar etiquetas ni
   depender de desplazamiento horizontal para encontrar una etapa.
3. Debajo, órdenes de la etapa elegida, agrupadas por sus estados internos.
   Usar una, dos o tres columnas según el ancho disponible, sin anchura fija que
   fuerce scroll. Los estados vacíos son compactos.
4. Ancho amplio específico para Reparaciones. Evitar cambiar el ancho global de
   Cuenta, formularios y otras pantallas que necesitan líneas de lectura acotadas.

Los contadores se basan en totales de servidor, nunca en la cantidad de tarjetas
ya cargadas. Conservar carga incremental de 20, deduplicación, reintento, búsqueda
y reconciliación después de una transición. Un error o una consulta pendiente
no se muestra como cero. No agregar un nuevo endpoint sólo por rediseñar la vista
si las consultas actuales permiten obtener los datos necesarios.

Conservar `vista=list` y la compatibilidad de enlaces `vista=board`, que pasará a
mostrar Etapas. Guardar la etapa seleccionada en la URL con valores validados;
mantener filtros, búsqueda e historial al alternar. Inicio de Etapas en Ingreso,
sin cambios automáticos de etapa por cantidades. Después de mover una orden,
actualizar conteos y ofrecer acceso al destino sin cambiar de pantalla por sorpresa.

Lista será el valor inicial en móvil cuando no haya una vista explícita en la URL;
respetar una elección explícita del usuario. Hoy el código inicia Tablero también
en móvil, por lo que esta adaptación es un cambio real. Mantener acciones de
avance/cambio de estado accesibles sin depender de arrastrar entre etapas.

**Cierre:** revisión a 1280/1440/1920 px y 320/390 px, zoom, seis etapas
descubribles, órdenes sin cortes ni scroll horizontal, nombres largos, cero/pocas/
muchas órdenes, paginación y filtros conservados. Actualizar el test móvil que hoy
exige scroll horizontal interno para comprobar el comportamiento nuevo.

## Forma de avanzar y evidencia

Hacer un corte a la vez. Cada entrega deja un resultado revisable con capturas
antes/después, archivos afectados, pruebas pertinentes y pendientes reales.
El corte de email se coordina con backend; los cortes visuales se pueden preparar
independientemente. Publicación se verifica por separado de la validación local.

Para ajustes de espaciado/copy, priorizar inspección visual y cobertura existente;
no crear tests que sólo repitan clases CSS. Para permisos, calendario, expansión,
URL y paginación, agregar o adaptar pruebas de comportamiento. Ejecutar typecheck,
lint y build tras cada entrega que cambie código. Ampliar regresión cuando el
alcance transversal o un fallo lo justifique.

## Referencias del diagnóstico

- Registro: `src/pages/RegisterPage.tsx:17`, `:90`, `:97`.
- Identidad: `src/hooks/useSessionIdentity.ts:34`,
  `src/components/Sidebar.tsx:35`, `src/components/Navbar.tsx:36`.
- Taller/código públicos: `src/pages/SeguimientoPage.tsx:115`, `:122`.
- Cobros y resumen: `src/pages/CajaPage.tsx:50`,
  `src/pages/ReparacionDetallePage.tsx:630`,
  `src/pages/ResumenDigitalPage.tsx:99`, `:190`, `:300`, `:308`.
- Contraseña: `src/pages/LoginPage.tsx:20`, `:103`,
  `src/components/PasswordInput.tsx:24`.
- Selects: `src/components/ui.ts:3`, `src/components/SortSelect.tsx:14`.
- Fecha: `src/pages/CajaPage.tsx:64`,
  `src/components/ReparacionFormModal.tsx:684`.
- Layout y tablero: `src/layouts/DashboardLayout.tsx:34`,
  `src/pages/ReparacionesPage.tsx:290`, `:336`, `src/config/estados.ts:199`.
- Inicio: `src/pages/DashboardPage.tsx:267`, `:283`.
- Email: `src/components/EmailVerificacionBanner.tsx:5`,
  `src/router/guards.tsx:68`, `src/pages/VerificarEmailPage.tsx:23`,
  `src/store/auth.store.ts:9`.
- Backend hermano `../mvrg-backend/src/main/java/com/leonardorozza/mvgrreparacionesbackend/`:
  `config/filter/JwtFilter.java:73`, `service/dto/perfil/PerfilUsuarioDTO.java:5`,
  `service/impl/UsuarioService.java:50`.

Las referencias reflejan la base auditada y pueden moverse al implementar.
