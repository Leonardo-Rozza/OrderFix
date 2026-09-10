# Cuenta: identidad, historial y contactos

Estado: implementado y verificado localmente. Baselines frontend `04bd706`, backend `ef8d9f4`.

Este corte desarrolla la parte de consulta de la Tarea 14 del
[plan de Confianza y cuenta](2026-08-23-lanzamiento-publico-confianza-cuenta-plan.md)
y pertenece a la fila 6 del [alcance de salida inicial](2026-09-08-salida-inicial-alcance-y-cierre.md).
No incorpora otra familia de infraestructura ni declara completada esa fila.

## Alcance acordado

- Un destino `/cuenta` para ADMIN y USER en sidebar y Más.
- Identidad del usuario y taller obtenida de `/api/perfil`, validada al entrar.
  No se infiere verificación de email desde el dato persistido del login: el
  contrato del perfil no informa ese estado.
- Historial propio paginado desde `/api/aceptaciones-legales`, sin selectores
  de actor/taller. Aceptación, lectura y declaración conservan sus diferencias.
- Consulta a demanda de la versión exacta desde
  `/api/public/documentos-legales/{id}`; cotejo con la evidencia histórica y
  texto completo escapado, como en el lector existente de registro.
- Contactos configurados y válidos por campo. Abrir correo no equivale a enviar
  una solicitud ni a iniciar una baja. Configuración ausente/inválida no produce
  enlaces de ejemplo ni contactos inventados.
- Solicitudes de datos y baja aún no operativas en la app: estado explícito.
  El empleado distingue su acceso personal de la cuenta completa del taller.

## Decisiones de implementación

Cuenta se autentica mediante un GET nuevo de perfil, separado del guard comercial
de las pantallas operativas. Su layout no inicia consultas de suscripción, no
abre el modal comercial y no muestra el banner de verificación basado en login.
Los permisos de backend no cambian. 401/403 del perfil cierran sesión; errores
recuperables permiten reintentar o cerrar sesión sin exponer contenido privado.
La espera del perfil tiene un límite de 20 s. Si el historial recibe 403, su
comprobación adicional usa `/perfil`, con el mismo límite, en lugar de
`/suscripcion`. Los otros consumidores conservan su comportamiento anterior.
La pantalla de error del guard operativo ofrece acceso a Cuenta y privacidad.

El montaje de sesión tiene una clave efímera sin token; cambiar token remonta
Cuenta, cancela consultas y descarta sus datos. El perfil validado alimenta el
encabezado existente. El historial no se persiste ni conserva páginas anteriores
como sustituto durante una carga. 404/503 o contrato inválido muestran error,
nunca un supuesto historial vacío. El lector no reemplaza un documento histórico
por su versión vigente y no transforma Markdown recibido en HTML activo.

No cambian backend, endpoints de escritura, V27–V30 ni el alcance de cobros. No
se agregan botones de exportación/cierre sin contrato ni un formulario que simule
atención. Identidad real del operador y buzones deben confirmarse para publicación.

## Diseño dentro de la interfaz existente

El titular o técnico llega desde una reparación para identificar su cuenta,
consultar qué confirmó y encontrar a quién dirigirse. La lectura debe sentirse
tranquila y verificable. Dominio: taller, orden, titular, técnico, evidencia,
afirmación y versión. La firma de esta pantalla es la relación visible entre
afirmación, fecha y versión exacta, ligada al usuario del taller.

Se mantienen los tokens del producto: tinta del texto, gris de estructura,
blanco de la superficie, verde azulado de las acciones y rojo reservado al error.
Se evitan estadísticas decorativas, tarjetas de configuración vacías y un segundo
Centro Legal en navegación; los reemplazan identidad legible, historial documental
y contactos con su disponibilidad real. Borde suave, tipografía existente, base
de 4 px y una columna en 320 px. El contenido largo y los emails deben cortar
líneas sin desbordar; controles de lectura/reintento con foco visible.

## Validación y cierre local

Pruebas aprobadas el 2026-09-09:

- **123 pruebas focalizadas**: contrato, aislamiento al cambiar sesión, validación
  remota frente a caché, errores recuperables, paginación, divergencias documentales,
  contactos, navegación ADMIN/USER y regresión de sesión/suscripción.
- **631 Vitest en 92 archivos + 42 controles de publicación**, todos aprobados.
  Se amplió la comprobación frontend por el ajuste acotado del interceptor compartido.
- **5 recorridos Chromium**: ADMIN/USER en 1280 y 320 px, más escape desde error
  comercial. Historial 404/403 se muestra como error, reintento recupera evidencia,
  versión reemplazada se consulta por su ID sin Authorization y se verifica,
  texto parecido a HTML no se ejecuta, no hay consultas de suscripción en Cuenta,
  la navegación conserva destino activo y logout retira el lector. Sin desborde
  horizontal; capturas de pantalla y documento revisadas.
- TypeScript, ESLint, build y `git diff --check` aprobados. El build conserva la
  advertencia de chunk principal >500 kB (552,62 kB); los gates de publicación
  pública se omiten en este build local, como informa el comando.

Los recorridos usan Vite/Chromium reales y **API simulada**. No acreditan staging,
lectores PostgreSQL configurados, buzones atendidos ni datos jurídicos definitivos.
El primer intento de navegador fue bloqueado por el puerto del sandbox; se ejecutó
con autorización local. Luego se corrigieron dos supuestos del test: el patrón de
intercepción incluía módulos `/src/api/`, y StrictMode puede cancelar/repetir un GET.
La corrida final aprobó los cinco casos sin reintentos. En pruebas unitarias se
ajustaron selectores ambiguos y el mock visual de tema; no se relajó el contrato.

Comando reproducible para navegador con configuración aislada:

```sh
VITE_API_BASE_URL=http://localhost:8080 VITE_API_URL= VITE_LEGAL_EMAIL= VITE_PRIVACY_EMAIL= VITE_SUPPORT_EMAIL= VITE_SENTRY_DSN= npx playwright test e2e/account.spec.ts --project=chromium
```

El entorno de salida debe habilitar los lectores existentes con sus credenciales
dedicadas: `ordenfix.legal.account-read.enabled` para historial y
`ordenfix.legal.public-documents.enabled` con la frontera documental correspondiente
para versiones. Ambos nacen apagados. Este corte no cambia esos flags ni provisiona
roles. Referencias: backend `docs/plans/2026-09-06-legal-account-consent-v29-decision.md`
y `docs/plans/2026-09-05-legal-public-document-read-closure.md`.

Backend permanece en `ef8d9f4`, limpio: no se repite clean verify ni se tocan
V27–V30. Se preservan los 77 archivos ajenos no versionados del frontend.

**Pendiente para cerrar Confianza y cuenta:** identidad real del operador, buzones
reales de legal/privacidad/soporte, circuito atendido de solicitudes y baja, y
recorrido sobre backend real en el entorno de salida. El estado de verificación
de email, exportación integral y baja no se presentan como capacidades terminadas.

Commit del corte: `feat(cuenta): centraliza privacidad y documentos`. Sin push.
