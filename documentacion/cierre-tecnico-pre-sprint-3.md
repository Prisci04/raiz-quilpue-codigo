# Cierre técnico Pre-Sprint 3 — Raíz Quilpué

Fecha: 24 de octubre de 2026. Rama: pruebas/dev-aparte.
Base: 54a4665 security: reforzar autorización y sanear credenciales pre-Sprint 3.

## 1. Resumen ejecutivo

El código local pasa ESLint completo, build de producción y 459 tests.
Se mejoraron accesibilidad administrativa, seguridad del contrato Storage y
operaciones críticas de Museo. Se mantuvo la autorización consolidada.

**El cierre definitivo está condicionado a aplicar y verificar el SQL 012.**
Por decisión explícita del usuario, las operaciones nuevas de conversión,
eliminación de pieza y eliminación de aporte exigen RPCs atómicas. Mientras no
estén disponibles devuelven 503, sin fallback de escrituras parciales.

No se aplicó SQL, ni se subieron archivos, ni se modificó ningún recurso remoto.
Los únicos accesos remotos fueron GET de metadatos y consultas con limit=0.

## 2. Auditoría inicial

- Working tree inicial limpio, rama correcta. No había cambios locales que preservar.
- Seguridad previa ya consolidada: guards propios en páginas, roles activos,
  usuario interno activo, protección por origen y saneamiento de credenciales.
  No se reimplementó ni se revirtió.
- Ya existían validación de firmas/MIME/extensiones, límite 5 MiB, manejo de PDF,
  portadas separadas, conservación de archivo heredado y métricas reales.
- Modales administrativos con ARIA parcial, sin ciclo completo de foco,
  bloqueo de fondo y Escape. UsuarioFormModal solo implementaba Escape.
- Menú móvil cerrado mediante transform podía seguir participando en tabulación.
- La eliminación de inscripción no tenía confirmación.
- Uploads administrativos podían crear un bucket o hacerlo público en runtime.
- Conversión de aporte y eliminación de pieza tenían escrituras independientes.
- Rechazo de aporte verificaba estado antes de actualizar, pero no lo incluía
  como condición de la escritura, permitiendo sobrescribir una conversión concurrente.
- El PATCH de pieza accedía a body.imagen_url aunque el JSON fuese inválido.

Se siguió la secuencia: auditoría sin cambios, accesibilidad, modelo/Storage,
integridad y regresión final.

## 3. Accesibilidad y UX

### Correcciones

- AdminDialog usa dialog.showModal(): fondo inerte, nombre accesible, foco inicial,
  contención de Tab/Shift+Tab, cancelación por Escape y bloqueo de scroll.
- Durante operaciones pendientes se bloquea el cierre; los botones visibles
  respetan el mismo estado. No se simula cancelación de una solicitud ya enviada.
- Al cerrar se restaura el foco al disparador. Si su fila desapareció, se devuelve
  al título de la página. Una prueba real encontró que quitar tabindex inmediatamente
  perdía el foco: ahora se restaura ese atributo al abandonar el título.
- Migrados los ocho usos previos de modal en Actividades, Museo, Contenidos y
  Usuarios; añadida confirmación de eliminación de inscripción.
- Errores de eliminación visibles dentro del modal cuando corresponde.
- Nombres y descripciones de confirmaciones asociados a IDs existentes.
- Menú de cuenta como disclosure de enlaces normales: retirados roles menu/menuitem
  que no implementaban el patrón completo de menú ARIA.
- Escape y salida de foco cierran disclosures de cuenta, acciones y filtros.
- Sidebar móvil: inert al cerrar, foco contenido al abrir, Escape, scroll de fondo
  bloqueado y restauración del disparador. Se adapta al breakpoint de escritorio.
- Regiones desplazables de tablas con nombre y foco por teclado; aria-sort en
  participantes; editor de texto con nombre y aria-multiline.
- Labels existentes se conservaron. Inputs de archivo ocultos tienen nombre y
  salen de la tabulación; el botón visible abre el selector. FieldLabel usa
  contenido semánticamente válido dentro de label.
- No se modificaron tipografías, paleta o jerarquía visual del refinamiento anterior.

### Validación

- Chromium local en perfil temporal, contra un fixture local que importa el
  lifecycle real de diálogo y CSS compartido. Viewports: 1440, 1024 y 390 px.
- Prueba real de foco, Tab/Shift+Tab, Escape, operación pendiente, scroll,
  límites del viewport y disparador eliminado. Peticiones de página externas bloqueadas.
- SSR de los componentes reales de preview y formulario de usuario; lint y build.
- **Límite:** el fixture de navegador no equivale a recorrer el admin autenticado.
  La navegación móvil y todos los formularios completos requieren revisión manual
  con datos y permisos del entorno autorizado.

## 4. Supabase y SQL

### Inventario esperado

| Entidad | Campos/contrato principal | Constraints, índices y relaciones versionadas |
| --- | --- | --- |
| usuarios | id, nombre, apellido, email, telefono, password_hash, tipo_usuario, estado, fechas | Email único normalizado, interno/público, activo/inactivo |
| roles | id, codigo, nombre, descripcion, estado, fechas | Código/nombre únicos, activo/inactivo |
| usuario_roles | usuario_id, rol_id, fecha_asignacion | PK compuesta; FK a usuarios y roles con cascade |
| sesiones | id, usuario_id, token_hash, fecha_creacion, ultima_actividad, fecha_expiracion | Hash único; FK usuario; expiración; índices de usuario y fechas |
| actividades | título, descripción, fecha/horas/lugar opcionales, público, modalidad, tipo_participacion, cupos, tipo_valor, valor_monto, forma_pago, informacion_adicional JSONB, imagen, estado, fechas | Cupos/monto no negativos; horario; modalidades; publicada/borrador/cancelada |
| actividad_inscripciones | id, actividad_id, nombre, apellido, email, telefono, fecha_creacion | FK cascade; email único por actividad; contacto; RPC de cupos |
| participantes | Proyección de actividad_inscripciones | No existe otra tabla de participantes |
| contenidos | título, descripción, resumen, contenido JSONB, tipo, imagen, fecha_publicacion, estado, fechas | Documento objeto; tipos ampliados por ALTER final de 002; publicada/borrador |
| museo_piezas | título, descripción, categoría, fecha aproximada, lugar, imagen_url, archivo_nombre, archivo_url, estado, fecha_creacion | Categorías; borrador/publicada; índice estado/categoría |
| museo_aportes | nombre, correo, título, descripción, categoría, archivo_nombre, archivo_url, informacion_adicional, estado_revision, pieza_id, fecha_creacion | Pendiente/convertido/rechazado; FK pieza ON DELETE SET NULL; índice fecha/revisión |
| archivos | Objetos de Storage referenciados mediante URL | No hay tabla propia de archivos; portada y original son referencias distintas |

### Comprobado en código

Servicios usan columnas existentes en los metadatos obtenidos. Actividades conserva
forma_pago, informacion_adicional y null. Contenidos usa los cinco tipos documentados
en el ALTER final de 002. Los campos públicos y privados se consultan mediante
clientes distintos; las funciones administrativas siguen detrás de guards.

### Comprobado en SQL versionado

- RLS habilitado en entidades relevantes.
- Tablas sensibles sin permisos anon/authenticated; uso server-side de service_role.
- Lectura anon de actividades, contenidos y piezas condicionada a publicada.
- RPC inscribir_actividad con bloqueo de fila y ejecución restringida a service_role.
- 009 y 011 documentan archivos y vínculo aporte/pieza.
- Antes de 012 no había constraint de equivalencia entre convertido y pieza_id,
  ni operación atómica para conversión/eliminación.

### Comprobado remotamente, solo lectura

Evidencia saneada: supabase-metadata-pre-sprint-3.json.

- GET OpenAPI con cliente privilegiado y GET de buckets: HTTP 200.
- Columnas de las nueve entidades consultadas, incluidos roles.estado,
  usuarios.estado, forma_pago, informacion_adicional JSONB, archivo_url y pieza_id.
- RPC inscribir_actividad anunciada; no se anunciaban las tres RPC nuevas de Museo.
- Bucket public-media público, 5242880 bytes, JPEG/PNG/WebP/AVIF/PDF.
- GET públicos con limit=0: actividades, contenidos y museo_piezas devuelven 200.
  Usuarios, roles, sesiones, inscripciones, aportes y usuario_roles rechazan el
  acceso. No se recuperó ninguna fila ni se probó una credencial de usuario.
- El catálogo OpenAPI público devuelve 401; no impide los tres GET públicos
  anteriores. No se interpretó como ausencia de tablas o fallo de credenciales.

### NO VERIFICADO CONTRA ESQUEMA REMOTO

Índices efectivos, definiciones completas de constraints/FKs, políticas RLS
efectivas, políticas de objetos Storage y ejecución/concurrencia del SQL 012.
Los GET con limit=0 prueban acceso al endpoint, no el filtrado RLS de filas concretas.

### Diferencias clasificadas

| Gravedad | Diferencia | Tratamiento |
| --- | --- | --- |
| Alta | RPCs/constraint de integridad de Museo aún no existentes remotamente | Preparado 012; fallo seguro 503, pendiente aplicación |
| Media | Runtime de portadas podía cambiar privacidad/provisionar buckets | Retiradas esas mutaciones; valida configuración existente |
| Baja / documentación | 009 incluye museo_piezas.fecha_actualizacion; metadatos remotos no la incluyen | El código no la usa; no se preparó un ALTER especulativo |
| Solo documentación | Buckets/políticas Storage no estaban descritos junto al SQL | Contrato efectivo documentado aquí y en snapshot |

## 5. Storage

- Bucket esperado y comprobado: public-media.
- Público: los originales de aportes pendientes también son accesibles por URL.
  No se cambió a privado porque rompería el contrato de URLs existente.
- Se añadió aviso al formulario público: archivo con enlace público y recomendación
  de no incluir datos personales sensibles. Moderación del registro no implica
  privacidad del archivo.
- Portadas administrativas: JPEG, PNG, WebP, AVIF; máximo 5 MiB.
- Originales de aportes: los anteriores y PDF; mismo límite.
- Se conservan controles MIME, extensión y firma binaria. PDF nunca se convierte
  en portada de imagen; archivo original y portada personalizada siguen separados.
- Contextos/rutas: contenidos/id/portada, actividades/id/portada,
  museo/id/portada y museo/aportes/UUID.ext.
- Uploads no crean buckets ni cambian privacidad. Validan bucket público existente,
  su límite y MIME aplicable; configuración incompatible causa error sin mutación.
- Constantes de bucket, tamaño y MIME de Museo centralizadas sin ampliar tipos.
- Cleanup de aportes usa parser de URL del proyecto, bucket y UUID/extensión,
  incluyendo PDF. Ya no extrae una ruta de un hostname arbitrario.
- Una subida fallida no da por creado el archivo ni intenta borrarlo. Si la subida
  fue exitosa y falla la inserción del aporte, compensa solo ese archivo.
- Un fallo de cleanup se registra para intervención posterior. No revierte una
  transacción de BD ya confirmada ni se presenta como atomicidad distribuida.
- Sigue pendiente una decisión de retención/privacidad de originales y revisión
  de las políticas Storage efectivas. No se ejecutó upload/remove remoto.

## 6. Integridad transaccional

### Conversión aporte → pieza

**Antes:** SELECT de aporte, INSERT de pieza y UPDATE de aporte independientes.

**Riesgo:** pieza huérfana si falla el UPDATE; dos solicitudes podían crear dos
piezas; una eliminación concurrente podía perder información sobre archivo compartido.

**Después:** una llamada a convertir_aporte_museo. El SQL propuesto bloquea el
aporte FOR UPDATE, valida pendiente/sin pieza, crea borrador y marca convertido
en la misma transacción. PDF/original heredado se conservan.

**Garantías del diseño SQL:** una segunda conversión del mismo aporte espera y
obtiene ALREADY_PROCESSED; excepciones revierten ambas escrituras. No se usa un
estado de negocio como marcador temporal de bloqueo.

**Limitaciones:** REQUIERE APLICACIÓN REMOTA. Se probó el cliente y su fallo seguro
con dobles locales; no se ejecutó PL/pgSQL ni concurrencia real en PostgreSQL.

### Eliminación de pieza / aporte

**Antes:** se restauraba el aporte antes de borrar la pieza, en escrituras
independientes. Borrar un aporte podía competir con su conversión. Repetir la
eliminación de un aporte inexistente podía fallar por usar single().

**Riesgo:** aporte pendiente con pieza aún existente si falla el DELETE; pérdida
de un original compartido por una carrera de conversión/eliminación.

**Después:**

- eliminar_pieza_museo bloquea la pieza y la elimina. El trigger BEFORE DELETE
  restaura los aportes vinculados como pendiente/sin pieza dentro de la misma TX.
  La constraint exige convertido si y solo si hay pieza_id.
- eliminar_aporte_museo bloquea el aporte como la conversión. Conserva la pieza y
  marca conservación de archivo si está vinculada o hay otras referencias de
  piezas/aportes al mismo archivo.
- Eliminación repetida de pieza devuelve inexistente; la de aporte ya ausente
  no repite cleanup. No se fabrica éxito de conversión.
- Rechazo: UPDATE condicionado a pendiente y pieza_id NULL, evitando sobrescribir
  una conversión concurrente.
- Solo se limpia una portada propia de la pieza eliminada. Su original permanece
  disponible para el aporte restaurado. Archivos compartidos se conservan por defecto.

**Garantías:** una única operación de BD por eliminación; sin escritura parcial
de respaldo. Si falta la RPC o su permiso, respuesta 503 y ninguna mutación local.

**Limitaciones:** mismas dependencias de aplicación/prueba SQL. Storage ocurre
después del commit y es best effort: pueden quedar objetos huérfanos si falla.
La detección de referencias pertenece al snapshot de la transacción; no garantiza
atomicidad frente a escrituras externas arbitrarias que reutilicen URLs después.

## 7. Cambios SQL

- SQL existente: sin modificaciones en este bloque.
- Nuevo: database-documentacion/012_museo_integridad.sql.
  Constraint de vínculo/estado, índice de pieza_id, trigger de restauración y
  tres RPCs SECURITY INVOKER, search_path fijo y EXECUTE solo service_role.
- El preflight rechaza estados heredados inconsistentes. No los repara ni los
  sobrescribe automáticamente. El parche completo usa BEGIN/COMMIT.
- **REQUIERE APLICACIÓN REMOTA**, por un responsable y después de revisar/probar.
  Ninguna parte de este SQL fue ejecutada en Supabase.
- Nuevo: database-documentacion/tests/012_museo_integridad.test.sql.
  Prueba manual para una BD local/de pruebas: fixtures, PDF, repetición,
  conservación, permisos y fallo inducido después de crear una pieza. ROLLBACK final.
  Incluye instrucciones de concurrencia en dos sesiones. **NO EJECUTADA**:
  no hay PostgreSQL/psql local disponible y no se hicieron escrituras remotas.
- No se modificaron tablas, RLS, policies o buckets remotos.

## 8. Archivos modificados

El listado completo de archivos modificados y nuevos aparece al final del informe.

## 9. Tests y validaciones

| Comprobación | Resultado |
| --- | --- |
| Suite Node completa | 459 tests; 459 aprobados; 0 fallidos; 0 omitidos |
| ESLint completo | Correcto |
| Build producción Next.js 16.3.8 | Correcto |
| git diff --check | Correcto |
| Nuevos archivos: whitespace | Correcto |
| Marcadores de conflicto / imports | Sin marcadores; imports comprobados por lint/build |
| Inspección remota | GET de metadatos y limit=0; sin escrituras |
| SQL 012 y prueba SQL local | Preparados; NO ejecutados |

Tests nuevos de este bloque: 27 casos.

- admin-accessibility.test.mjs: 1 prueba de lifecycle en Chromium, tres viewports,
  múltiples escenarios de foco/teclado/cierre/scroll.
- storage-contract.test.mjs: 7 casos de configuración sin provisioning, URL propia,
  validación PDF, subida, fallo de subida y compensación tras fallo de BD.
- museo-integrity.test.mjs: 9 casos de RPC única, 503 sin fallback, repetición,
  archivos compartidos, limpieza conservadora, fallo de Storage y rechazo concurrente.
- pre-sprint-regression.test.mjs: 10 casos de servicios y render SSR reales,
  Home, catálogo/detalle, formularios, Museo, Dashboard y métricas.
- Se conservaron y ejecutaron las 432 pruebas previas, incluyendo las 383 de
  autorización. Los repositorios de los tests de aplicación son simulados y
  la red está bloqueada. No se ejecutaron auditorías heredadas destructivas.

Comandos de validación en PowerShell:

~~~powershell
$testFiles = @(rg --files scripts -g '*.test.mjs')
node --test $testFiles
npm.cmd run lint
git diff --check
npm.cmd run build
~~~

Node validado: 24.21.0. El arnés existente requiere module.registerHooks.
La prueba de navegador usa Chromium instalado y un perfil temporal sin datos;
no instala dependencias y se omite explícitamente si no hay navegador disponible.

## 10. Regresión funcional

| Área | Estado | Observaciones |
| --- | --- | --- |
| Home / próxima actividad | Correcto local | Servicios + SSR y tests de fechas/Santiago; sin cambios de lógica |
| Actividades públicas | Correcto local | Publicación, detalle, cupos cero, pasada/abierta, contacto y resultados RPC |
| Admin Actividades / participantes | Correcto local | Null, pago, documento, cambio rápido, permisos y confirmación de baja |
| Contenidos | Correcto local | Documento, filtro publicado, validación y SSR de preview; edición visual manual pendiente |
| Museo público | Correcto local / metadatos remotos | PDF, portada nula y archivo heredado; modal real autenticado/no autenticado pendiente manual |
| Museo admin: conversión/eliminaciones | Bloqueo seguro preparado | 503 hasta aplicar 012; pruebas de cliente/dobles, SQL real pendiente |
| Museo admin: edición/rechazo | Correcto local | PATCH inválido 400; rechazo condicionado; portada/original conservados |
| Dashboard | Correcto local | Datos de servicios, 0 real, ausencia como —, gráficos sin NaN/Infinity |
| Exportaciones PDF | Código/build revisados | Descarga, paginación y lectura visual del PDF pendientes en navegador |
| Seguridad | Correcto local | 383 casos previos; ninguna regresión de sesión/rol/usuario/origen |
| Responsive / accesibilidad | Parcialmente comprobado en navegador | Lifecycle a 1440/1024/390; recorrido completo del admin pendiente |

## 11. Riesgos pendientes

- **Crítico:** ninguno confirmado nuevo. No equivale a auditoría exhaustiva de
  infraestructura, dependencias o políticas remotas.
- **Alto:** aplicación/pruebas del SQL 012. Hasta entonces tres operaciones
  administrativas de Museo devuelven 503 deliberadamente.
- **Alto condicionado, previo:** contraseñas retiradas del historial anterior.
  Si se usaron realmente, cambio externo y revocación de sesiones por el responsable.
  No se probaron ni se rotaron.
- **Medio:** archivos pendientes públicos; decidir retención/privacidad y mantener
  el aviso. Cambiar a bucket privado requiere otro contrato, fuera de este bloque.
- **Medio:** políticas RLS/Storage e índices efectivos no inspeccionados.
- **Medio:** limpieza de objetos puede fallar tras un commit; revisar logs y
  huérfanos mediante un procedimiento autorizado. No se añadió una cola.
- **Medio, previo:** rate limiting, límites de cuerpo y confianza en proxy siguen
  documentados en la revisión de seguridad; no se amplió su alcance aquí.
- **Bajo:** diferencia documental de fecha_actualizacion de piezas; revisión
  manual de todos los modales, menú móvil y PDF de exportación.

## 12. Pendientes que bloquean el cierre / base de Sprint 3

Un pendiente técnico concreto: aplicar 012 en un entorno autorizado y validar
conversión, rechazo concurrente, eliminación, repetición y permisos antes de
considerar operativa esta versión como base consolidada de Museo.

No se declara cierre definitivo ni ausencia de bloqueadores mientras esas
operaciones permanezcan deliberadamente indisponibles. No bloquea trabajar en
otras tareas aisladas, pero sí entregar esta revisión como base plenamente operativa.

## 13. Recomendaciones manuales

1. Revisar preflight y SQL 012. Probar primero en una BD local/de pruebas
   con datos ficticios y ejecutar el test SQL; probar dos sesiones concurrentes.
2. Aplicación remota únicamente por responsable autorizado fuera de este bloque.
   Comprobar EXECUTE exclusivo de service_role y recarga de esquema.
3. Abrir admin con administrador y editor activos, y comprobar denegaciones con
   roles/usuarios inactivos en un entorno de pruebas.
4. Recorrer modales y sidebar con Tab, Shift+Tab y Escape; repetir a 1440,
   1024 y 390 px, con errores y operaciones pendientes.
5. Comparar creación/edición de Actividades, Contenidos y Museo; participantes,
   portadas, PDF original y archivo heredado. Usar solo datos de prueba autorizados.
6. Descargar Dashboard y participantes en PDF, revisar cero/ausencia, filas,
   paginación y títulos largos. No se ha verificado la descarga real.
7. Inspeccionar policies de BD/Storage e índices en el panel de Supabase,
   sin asumir que los metadatos GET equivalen a esa comprobación.
8. Revisar aviso de archivos públicos y acordar retención/cleanup antes de recibir
   documentos sensibles. No borrar objetos reales como parte de esta revisión.

## 14. Estado Git

Rama pruebas/dev-aparte. Working tree con cambios locales pendientes de revisión.
No había cambios locales al inicio.

**NO commit. NO push. NO merge. NO rebase. NO cambio de rama.
NO cambios remotos en Supabase. NO modificación de .env.local ni secretos.**

Los archivos y cantidades de este bloque se detallan a continuación.

### Modificados (23)

- src/app/(sitio)/museo/museo-view.jsx
- src/app/api/admin/museo/[id]/route.js
- src/app/api/museo/aportes/route.js
- src/components/admin/AdminHeader.jsx
- src/components/admin/AdminSidebar.jsx
- src/components/admin/actividades/ActividadForm.jsx
- src/components/admin/actividades/ActividadesPanel.jsx
- src/components/admin/actividades/ParticipantesPanel.jsx
- src/components/admin/admin-ui.css
- src/components/admin/contenidos/ContenidoEditor.jsx
- src/components/admin/contenidos/ContenidoForm.jsx
- src/components/admin/contenidos/ContenidoPreviewDialog.jsx
- src/components/admin/contenidos/ContenidosPanel.jsx
- src/components/admin/contenidos/DeleteContenidoDialog.jsx
- src/components/admin/museo/MuseoPanel.jsx
- src/components/admin/museo/PiezaMuseoForm.jsx
- src/components/admin/usuarios/UsuarioFormModal.jsx
- src/components/admin/usuarios/UsuariosPanel.jsx
- src/lib/admin-community-http.js
- src/lib/media/museo-policy.mjs
- src/lib/media/policy.mjs
- src/services/admin-community.service.js
- src/services/storage.service.js

### Nuevos (12)

- database-documentacion/012_museo_integridad.sql
- database-documentacion/tests/012_museo_integridad.test.sql
- documentacion/cierre-tecnico-pre-sprint-3.md
- documentacion/supabase-metadata-pre-sprint-3.json
- scripts/admin-accessibility.test.mjs
- scripts/museo-integrity.test.mjs
- scripts/pre-sprint-regression.test.mjs
- scripts/storage-contract.test.mjs
- scripts/supabase-readonly-inspect.mjs
- src/components/admin/AdminDialog.jsx
- src/lib/museo/errors.mjs
- src/lib/ui/dialog.mjs
