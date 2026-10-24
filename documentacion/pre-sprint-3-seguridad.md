# Pre-Sprint 3: autorización y credenciales

Revisión estática y pruebas locales del 24 de octubre de 2026, sobre
`pruebas/dev-aparte`, base `02b3e44`. Tasks 18, 19, 20 y 21.
No se verificaron credenciales ni permisos contra servicios reales.

## Flujo encontrado

- Autenticación propia, no Supabase Auth: `POST /api/auth/login` valida origen,
  JSON, correo, bcrypt y usuario interno activo. No exige un rol para iniciar
  sesión, lo que permite acceder al perfil personal.
- Token aleatorio de 256 bits en cookie `rq_session`, HttpOnly, SameSite=Lax,
  Secure en producción. En `sesiones` se guarda su SHA-256. Expiración absoluta
  de ocho horas e inactividad de treinta minutos.
- `validateSession` vuelve a consultar el usuario. Un usuario inactivo invalida
  la sesión; un usuario público activo es rechazado para el panel. No se toman
  permisos de los datos enviados por el cliente.
- `src/proxy.js` solo comprueba presencia de cookie en `/admin`. Es un prefiltro
  de navegación y no demuestra identidad ni permisos.
- El layout valida sesión interna y consulta el rol administrador para la
  navegación. Las páginas se pueden ejecutar independientemente del layout:
  esa comprobación no protege por sí sola sus cargas de datos.
- APIs: `requireInternalSession`, `requireAdministrador`,
  `requireGestorContenido`; este último también se usa desde
  `runAdminCommunity`. Las mutaciones comprueban origen y las respuestas
  administrativas usan `Cache-Control: no-store`.
- Los servicios administrativos son módulos `server-only` con cliente
  privilegiado. La autorización está en los puntos de entrada (página/handler),
  antes de invocar el servicio. No se convirtió el cliente privilegiado en un
  guard universal: también se utiliza para inscripciones y aportes públicos.

## Política antes de los cambios

| Recurso | Regla encontrada en páginas | Regla encontrada en APIs |
| --- | --- | --- |
| Dashboard | Sesión interna mediante layout; carga propia sin guard | No hay API específica del Dashboard |
| Actividades y participantes | Solo layout; datos SSR sin guard local | Administrador o editor |
| Contenidos | Solo layout; listado SSR sin guard local | Administrador o editor |
| Museo y aportes recibidos | Solo layout; datos SSR sin guard local | Administrador o editor |
| Usuarios (`/admin/configuracion`) | Sesión interna + administrador antes de renderizar | Administrador |
| Estadísticas (placeholder) | Sesión interna + administrador | No hay API específica |
| Perfil propio | Sesión interna mediante layout | Sesión interna, siempre sobre `auth.user.id` |
| Market (placeholder) | Sesión interna mediante layout | No hay API específica |
| `/api/admin` | No aplica | Solo sesión interna; devuelve `{ ok: true }` |

`usuarioTieneRol` no filtraba `roles.estado`: una relación con un rol inactivo
podía superar las comprobaciones de rol. El esquema documentado tiene
`roles.estado` y `usuarios.estado`, ambos con activo/inactivo. La tabla
`usuario_roles` no tiene un estado propio. El selector de roles asignables ya
exigía roles activos, lo que era inconsistente con el helper de autorización.

Dashboard no tenía una política de roles explícita. El usuario confirmó
alinearlo con administrador/editor activos. No se crearon roles nuevos ni se
ampliaron los permisos de editor a usuarios/estadísticas.

## Matriz resultante

Todas las columnas de rol presuponen usuario interno activo y sesión válida.
"Solo rol inactivo" significa que no hay otro rol permitido activo.

| Recurso | Administrador activo | Editor activo | Solo rol inactivo | Sin rol / rol ajeno | Sin sesión / usuario inactivo |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Sí | Sí | No | No | No |
| Actividades: listar, crear, editar, estado, eliminar | Sí | Sí | No | No | No |
| Participantes: listar, eliminar, exportación existente | Sí | Sí | No | No | No |
| Contenidos: crear, editar, publicar, eliminar | Sí | Sí | No | No | No |
| Museo: piezas, aportes, conversión y rechazo | Sí | Sí | No | No | No |
| Media administrativa | Sí | Sí | No | No | No |
| Usuarios y configuración | Sí | No | No | No | No |
| Estadísticas (placeholder) | Sí | No | No | No | No |
| Perfil, contraseña y sesiones propias | Solo propio | Solo propio | Solo propio | Solo propio | No |
| Market (placeholder sin datos) | Sí | Sí | Sí | Sí | No |
| `/api/admin` (comprobación de sesión) | Sí | Sí | Sí | Sí | No |

Las últimas tres filas conservan sus reglas de sesión interna: no conceden
facultades de gestión por tener un rol inactivo. Un editor activo junto a un
administrador inactivo permite gestión de contenidos, pero no gestión de usuarios.
Login y `/api/auth/me` siguen separando autenticación de autorización.

## Hallazgos y correcciones

- **Crítico:** no se confirmó ningún hallazgo crítico en este alcance estático.
- **Alto:** páginas de gestión cargaban datos privilegiados sin autorización
  local. Se añadió un guard al inicio, fuera de los bloques que capturan errores
  de carga. Los formularios de creación/edición también verifican permisos antes
  de renderizar. Dashboard sigue la decisión confirmada por el usuario.
- **Alto:** roles inactivos autorizaban. La consulta de `usuarioTieneRol` ahora
  exige el código solicitado y `roles.estado = activo` con join interno.
- **Alto potencial:** recuperación de contraseña con destinatario y contraseña
  literales. Se retiraron los literales sin intentar verificar su vigencia.
- **Medio:** el listado utilizado por la protección del último administrador
  contaba roles inactivos. Ahora consulta el estado y solo mapea roles activos.
  Mantiene el contrato público `{ codigo, nombre }` de cada rol.
- **Medio:** seed SQL con credencial compartida y contraseñas previsibles de
  cuentas temporales en scripts de auditoría. Se sanearon como se detalla abajo.
- **Bajo:** ejemplo de entorno poco claro y una recomendación en `/api/admin`
  que sugería solo sesión para nuevas rutas. Se corrigieron ambos ejemplos.

Usuarios/configuración y estadísticas ya tenían guard propio correcto: no se
reescribieron por uniformidad. La validación existente de usuario inactivo,
expiración y origen se conserva.

## Inventario estático de credenciales (Task 18)

Se examinaron archivos versionados, documentación, SQL, scripts, referencias a
variables de entorno y patrones de claves/tokens/URLs autenticadas. También se
inspeccionaron 468 objetos de texto del historial accesible con patrones de clave
privada, `sb_secret_`, JWT completo y URL con usuario/contraseña: cero coincidencias.
Es una búsqueda heurística; no demuestra ausencia absoluta de secretos.
El historial de `.env*` contiene `.env.example`; no se encontró `.env.local`
versionado en ese historial. No se leyó ni modificó `.env.local` en el inventario.

| Clasificación | Ubicación antes del saneamiento | Evaluación |
| --- | --- | --- |
| 1. Secreto real probable | `scripts/reset-admin-password.mjs`, destinatario y contraseña administrativa literales; copias en `documentacion/auditoria-seguridad.md` | Utilidad que actualizaba un usuario con configuración local. Podría haberse usado; vigencia desconocida, nunca probada en esta revisión. |
| 2. Credencial de prueba | `database-documentacion/003_usuarios.sql`, comentario y seed de administrador | Contraseña compartida explícitamente de desarrollo; peligrosa si se reutilizó. `006_usuario_roles.sql` identificaba una cuenta concreta para asignarle administración. |
| 2. Credencial de prueba | `scripts/contenidos-admin-audit.mjs`, `scripts/usuarios-admin-audit.mjs`, `scripts/perfil-acceso-audit.mjs` | Contraseñas fijas válidas para cuentas temporales creadas por esas auditorías, incluyendo la contraseña de reemplazo del perfil. |
| 2. Credencial de prueba | `scripts/*validation.test.mjs`, `auth-policy.test.mjs` y entradas negativas de auditorías HTTP | Fixtures, contraseñas intencionalmente inválidas o datos simulados. No se usan como accesos reales en los tests locales; se conservan. |
| 3. Placeholder seguro | `.env.example` y ejemplo SQL saneados | Marcadores sin credenciales reales; el seed de ejemplo queda comentado. |
| 4. Falso positivo | Hash señuelo `DUMMY_PASSWORD_HASH`; nombres `password_hash`, `token_hash`, `service_role`; código de generación de tokens | No son credenciales de cuenta ni claves de Supabase. El hash señuelo tiene una deuda de coste ya documentada, fuera de estas tareas. |
| 5. Público / no secreto | URLs públicas de recursos, referencias a URL de proyecto y clave publishable, correos de contacto | No otorgan por sí mismos privilegios de servidor. No se encontraron valores literales de claves privadas/service-role/JWT en el alcance inspeccionado. |

No se ejecutaron auditorías HTTP heredadas ni se inició sesión con los valores
encontrados. No se contactó Supabase para confirmar ningún hallazgo.

## Saneamiento aplicado (Task 19)

- Recuperación manual: requiere `RESET_ADMIN_EMAIL` y `RESET_ADMIN_PASSWORD`
  suministrados al proceso para esa invocación, sin valores por defecto. Valida
  la política existente de contraseña antes de leer configuración o crear el
  cliente. Usa bcrypt coste 12, errores sin credenciales y salida solo con el
  número de cuentas actualizadas. Se retiró el login automático posterior.
  La utilidad no fue ejecutada contra el entorno real. Los tests sustituyen
  Supabase y la lectura de configuración antes de ejecutarla.
- No guardar las variables `RESET_ADMIN_*` en archivos versionados. El script
  puede leer la configuración existente de `.env.local` cuando se ejecute
  deliberadamente, pero no escribe ese archivo ni imprime sus valores.
- El ejemplo de usuario inicial en `003_usuarios.sql` queda no ejecutable,
  con `admin@example.com` y `TU_PASSWORD`. Aprovisionar una cuenta nueva requiere
  una operación manual autorizada con una contraseña única; no ejecutar placeholders.
- `006_usuario_roles.sql` usa el parámetro de sesión SQL `raiz.bootstrap_email`,
  suministrado fuera del repositorio. Sin él no asigna ningún rol. No se alteraron
  definiciones de tablas, políticas RLS ni grants; ningún SQL fue ejecutado.
- Contraseñas temporales de las tres auditorías: generadas mediante el generador
  criptográfico ya existente. Se conservan las pruebas negativas con claves inválidas.
- Documento histórico: retirados los valores de recuperación, conservando su
  contenido como evidencia histórica y enlazando esta revisión actual.
- `.env.example`: URL y claves de ejemplo explícitas, distinguiendo la clave de
  servidor de las variables públicas. Sin cambios en `.env.local`.

Los valores originales siguen en commits anteriores. Si alguno se utilizó en
una cuenta real, un responsable debe cambiar esa contraseña por un canal seguro
y revocar las sesiones de esa cuenta. No se rotaron secretos, ni se reescribió Git.

## Tests y validaciones

- `scripts/admin-authorization.test.mjs`: 383 casos. Ejecuta guards, validación de
  sesión, helper de roles, páginas SSR y todos los métodos exportados por los
  handlers administrativos. Next/React mantienen la compilación de JSX; cookies,
  redirecciones y repositorios se sustituyen por dobles locales.
- Comprueba ausencia/corrupción de cookie, sesión inexistente, usuario inactivo,
  usuario público, sin rol, rol ajeno, rol inactivo, rol activo permitido,
  editor contra administración de usuarios, roles combinados, fallo de consulta,
  desactivación de rol entre solicitudes y origen inválido.
- Las denegaciones comprueban que no se leen cuerpos ni se ejecutan consultas
  o acciones de negocio; solo se permiten las consultas de autorización. Los
  casos positivos ejecutan las páginas y lecturas API con repositorios simulados.
- `scripts/credential-recovery.test.mjs`: dos casos, con subprocesos aislados,
  cliente Supabase simulado, lectura de configuración sustituida y red bloqueada.
  Verifica rechazo temprano de entradas inválidas y recuperación con contraseña
  suministrada, coste 12 y sin valores sensibles en la salida.
- Suite completa: **432 tests, 432 aprobados, 0 fallidos, 0 omitidos**.
- `npm.cmd run lint`: sin errores.
- `npm.cmd run build`: correcto con Next.js 16.3.8.
- `git diff --check`: correcto.

Para repetir los tests en PowerShell:

```powershell
$testFiles = @(rg --files scripts -g '*.test.mjs')
node --test $testFiles
```

El nuevo arnés requiere Node con `module.registerHooks` (>=22.15); se validó con
Node 24.21.0. No instala dependencias nuevas. Estas pruebas no verifican RLS ni
el esquema remoto; el contrato de rol activo se basa en el SQL versionado.

## Pendientes y límites

- Confirmación externa de si se usaron las contraseñas expuestas; cambio y
  revocación de sesiones si corresponde. La limpieza del árbol actual no borra
  el historial ni otros clones.
- Verificar en un entorno autorizado que el esquema real coincide con
  `roles.estado`, `usuarios.estado` y las relaciones documentadas. Ante errores
  de consulta el acceso falla cerrado; no se añaden permisos de respaldo.
- Los servicios de bajo nivel continúan siendo internos y no guardan permisos
  por sí mismos. Cada nuevo punto de entrada debe utilizar el guard adecuado
  antes de invocarlos. No mezclar funciones públicas y administrativas del
  servicio de comunidad al añadir endpoints.
- Perfil propio, Market placeholder y comprobación `/api/admin` siguen con la
  regla explícita de sesión interna. La futura gestión real de Market deberá
  definir permisos cuando se implemente, sin inferirlos del placeholder.
- Deudas previas fuera del alcance: rate limiting distribuido del login/cambio
  de contraseña, límites de cuerpo y confianza en cabeceras de proxy. La auditoría
  histórica no se presenta como evidencia de vigencia de avisos de dependencias.
- La recuperación manual conserva su función de actualizar la contraseña; no
  se amplió para gestionar sesiones ni se ejecutó. Ante un incidente, revocar
  sesiones explícitamente mediante el procedimiento autorizado.

## Estado Git

Rama `pruebas/dev-aparte`, cambios locales sin commit, push, merge, rebase ni
cambio de rama. Sin migraciones, creación de usuarios, borrado de datos,
modificación de secretos remotos ni cambios visuales/de negocio.

## Archivos modificados o nuevos

- `.env.example`
- `database-documentacion/003_usuarios.sql`
- `database-documentacion/006_usuario_roles.sql`
- `documentacion/auditoria-seguridad.md`
- `documentacion/pre-sprint-3-seguridad.md`
- `scripts/admin-authorization.test.mjs`
- `scripts/contenidos-admin-audit.mjs`
- `scripts/credential-recovery.test.mjs`
- `scripts/perfil-acceso-audit.mjs`
- `scripts/reset-admin-password.mjs`
- `scripts/usuarios-admin-audit.mjs`
- `src/app/admin/(panel)/actividades/[id]/editar/page.jsx`
- `src/app/admin/(panel)/actividades/[id]/participantes/page.jsx`
- `src/app/admin/(panel)/actividades/nueva/page.jsx`
- `src/app/admin/(panel)/actividades/page.jsx`
- `src/app/admin/(panel)/contenidos/[id]/editar/page.jsx`
- `src/app/admin/(panel)/contenidos/nuevo/page.jsx`
- `src/app/admin/(panel)/contenidos/page.jsx`
- `src/app/admin/(panel)/market/page.jsx`
- `src/app/admin/(panel)/museo/[id]/editar/page.jsx`
- `src/app/admin/(panel)/museo/nueva/page.jsx`
- `src/app/admin/(panel)/museo/page.jsx`
- `src/app/admin/(panel)/page.jsx`
- `src/app/admin/(panel)/perfil/page.jsx`
- `src/app/api/admin/route.js`
- `src/lib/auth/guard.js`
- `src/lib/auth/page-guard.js`
- `src/services/usuarios.service.js`
