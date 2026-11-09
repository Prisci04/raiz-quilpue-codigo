# HU-22 — Asistente y base de conocimiento

Implementación local en `pruebas/dev-aparte`. **La API Key del cliente todavía no
existe. No se conecta ninguna API externa de IA.** El sistema funciona con el
proveedor mock, incluso si se selecciona `AI_PROVIDER=qwen`.

## Arquitectura

```text
/asistente + widget público → AssistantProvider → POST /api/ia/chat
Admin → probar asistente → POST /api/admin/ia/probar
                                ↓
                       handleChatRequest / answerChat
                                ↓
              configuración → recuperación de contexto → provider
                       ↓                          ↓
              repository / local-store       mock (hoy)
                       ↓                     Qwen (pendiente)
          disco local o Supabase (optativo)
```

- `src/lib/ai/contracts.mjs`: validación y proyección pública de configuración.
- `src/lib/ai/http.js`: cuerpo acotado, errores seguros, permisos y límites.
- `src/services/ai/repository.js`: adaptadores de almacenamiento intercambiables.
- `context.mjs` y `public-context.js`: recuperación y selección de información.
- `chat.mjs`: orquestación común, independiente del frontend y del proveedor.
- `providers.mjs` y `qwen-config.mjs`: contrato de proveedor y preparación de variables.
- `src/components/ai/`: conversación compartida, chat, widget y estilos.
- `src/components/admin/ai/AIAdminPanel.jsx`: administración editorial.

## Administrar IA

Ruta `/admin/ia`, incluida en la navegación y búsqueda del panel. Usa la misma
guarda de gestor de contenido que actividades y museo: **administrador o editor**
activo. La guarda se ejecuta en la página y en cada API, antes de leer el cuerpo
o acceder a datos. Las mutaciones mantienen la comprobación de origen existente.

Permite guardar nombre, activación, saludo, respuesta sin información y
comportamiento. La base de conocimiento permite crear múltiples secciones con
título, categoría, contenido, orden y estado; editar, desactivar o eliminar con
confirmación. Hasta 200 secciones; contenido de hasta 8000 caracteres. El orden
desempata resultados de la búsqueda. Solo las secciones activas alimentan el chat.
El botón **Ayuda (?)** explica su uso sin terminología técnica.

**Probar asistente** utiliza la misma orquestación que el público, con endpoint
autenticado y una conversación separada. Usa los datos ya guardados y reinicia
su conversación al guardar cambios. La desactivación también afecta la prueba.
Los errores de guardado conservan el formulario y nunca muestran éxito simulado.

## Persistencia y SQL 020

Sin SQL remoto, el modo predeterminado es `AI_STORAGE=local`: configuración y
conocimiento se guardan en `.local/ia/store.json`, excluido de Git. El archivo se
crea al guardar por primera vez; antes se usa una configuración inicial y una
base editorial vacía. Escrituras secuenciales y reemplazo por archivo temporal
evitan que dos guardados del mismo proceso se intercalen. No es un almacenamiento
distribuido: necesita **un solo proceso y un disco persistente**, con respaldo y
permisos del servidor apropiados. No usarlo como persistencia en funciones efímeras
o múltiples réplicas.

`database-documentacion/020_asistente_ia.sql` queda preparado, **sin ejecutar**:

- `ia_configuracion`: una fila, mensajes, comportamiento, activación y fechas.
- `ia_conocimiento`: UUID, título, categoría, contenido, orden, estado y fechas.
- RLS en ambas tablas; sin acceso directo a configuración desde `anon` o
  `authenticated`. El servidor expone solo nombre, saludo y activación.
- Lectura `anon` de conocimiento activo; escrituras solo por `service_role` en
  servidor, detrás de las guardas del proyecto. Un JWT Supabase `authenticated`
  no equivale a los roles del panel.
- Índice de estado/orden y actualización automática de `updated_at`.
- No crea tablas de conversaciones, campos de claves ni modifica tablas ajenas.

Cuando un responsable aplique manualmente SQL 020 y verifique sus permisos, puede
seleccionar `AI_STORAGE=supabase` en el entorno del servidor y reiniciar. El código
usa entonces el adaptador Supabase. **No migra automáticamente el archivo local**;
exportar, revisar y trasladar sus secciones expresamente si se desea conservarlas.
Un esquema ausente o un fallo de almacenamiento devuelve un error explícito, sin
cambiar silenciosamente a otra base ni inventar un guardado exitoso.

## Contexto y respuestas actuales

La búsqueda normaliza palabras, prioriza coincidencias de título/categoría y
contenido, excluye información inactiva y selecciona hasta cinco pasajes, con un
presupuesto total de 3000 caracteres. Se pueden sustituir estas funciones por
recuperación semántica en el futuro manteniendo el contrato del chat/proveedor.
No se usan embeddings, pgvector ni búsquedas vectoriales.

Fuentes:

- Secciones editoriales activas del repositorio seleccionado.
- Actividades y contenidos, filtrados por publicación.
- Piezas del museo, con proyección pública mínima y filtro explícito de aprobación
  en servidor, como el servicio público existente del museo.
- Lugares públicos y una descripción institucional tomada de Quiénes somos.

Cada fuente dinámica selecciona campos públicos explícitos, hasta ocho filas,
con búsquedas estructuradas de hasta tres palabras y timeout de 2,5 segundos.
Las preguntas generales de actividades recuperan próximas publicaciones por fecha
chilena; las del museo recuperan piezas aprobadas, sin exigir esas palabras en el título.
No se consultan usuarios, correos de aportantes, inscripciones ni información
administrativa privada. Los fallos individuales de fuentes públicas no impiden
usar las demás; sin datos relevantes se reconoce la falta de información.

El mock **extractivo** muestra fragmentos del contexto y enlaces internos válidos,
sin afirmar hechos adicionales. El mensaje de desconocimiento es configurable.
Las instrucciones de comportamiento se guardan para el proveedor futuro; el mock
no las interpreta como órdenes de generación. Las respuestas se muestran como
texto React, sin interpretar HTML ni enlaces arbitrarios enviados por un usuario.

## Chat público y widget

`/asistente` ofrece saludo, sugerencias, mensajes diferenciados, envío, estado de
carga, errores y enlaces relacionados. El widget inferior derecho abre/cierra y
permite continuar en la página completa. Ambos comparten una única conversación
en memoria dentro del layout público y el mismo endpoint; no duplican lógica de IA.

- Hasta 24 mensajes visibles y cuatro mensajes anteriores enviados por consulta.
- No se guardan conversaciones en disco, base de datos, cookies ni localStorage.
  Se conservan al navegar entre páginas públicas y se pierden al recargar o salir.
- Nueva conversación cancela cualquier respuesta pendiente.
- Enter envía; Mayús + Enter inserta una línea; se respeta composición de texto.
- Log accesible, etiquetas, foco visible y Escape para cerrar el widget con retorno
  al lanzador. El diálogo del widget es no modal: no bloquea el resto de la página.
- Adaptación a 390 px y vistas de poca altura, incluida disponibilidad de espacio
  para teclado móvil. Los efectos respetan movimiento reducido.
- El widget se oculta en el chat completo y cuando el asistente está desactivado.
  La configuración se vuelve a consultar al abrir, recuperar foco o visibilidad;
  la página permite comprobar disponibilidad tras una desactivación.
- La desactivación siempre se comprueba en servidor por consulta, aunque el
  visitante todavía tenga una configuración anterior en pantalla.

## API y límites

| Ruta | Métodos | Acceso |
| --- | --- | --- |
| `/api/ia/configuracion` | GET | Proyección pública, sin comportamiento interno |
| `/api/ia/chat` | POST | Público, origen del sitio y límites |
| `/api/admin/ia/configuracion` | GET, PUT | Gestor de contenido |
| `/api/admin/ia/conocimiento` | GET, POST | Gestor de contenido |
| `/api/admin/ia/conocimiento/[id]` | PUT, DELETE | Gestor de contenido |
| `/api/admin/ia/probar` | POST | Gestor de contenido; mismo backend de chat |

Mensaje: 1–1200 caracteres. Historial: solo roles visitante/asistente, hasta 12
mensajes y 8000 caracteres en total. El cuerpo se lee con límite de bytes real,
sin confiar en Content-Length: 20 KB para chat, 12 KB para configuración y 40 KB
para conocimiento. JSON inválido y tipos incorrectos se rechazan antes del contexto.
Las respuestas llevan `Cache-Control: no-store`.

Protección básica por proceso: 10 consultas/minuto por cliente, 100 globales/minuto,
ocho consultas simultáneas y un mapa acotado de identificadores hash efímeros, sin
guardar IPs crudas. La cabecera de cliente requiere un proxy de confianza que
reescriba `X-Forwarded-For`; el límite global sigue operando aunque se altere una
identidad. No es un limitador distribuido. Antes de habilitar un proveedor de pago
en producción se necesita un control centralizado y presupuesto de consumo.
El cliente aplica un timeout de 20 segundos; no hay reintentos automáticos.
No se registran preguntas, respuestas, claves ni errores crudos de proveedores.

## Qwen: pendiente de conexión real

Variables **solo del servidor**, documentadas en `.env.example`:

```dotenv
AI_PROVIDER=mock
AI_STORAGE=local
QWEN_API_KEY=
QWEN_BASE_URL=
QWEN_MODEL=
```

No tienen prefijo `NEXT_PUBLIC_`. `readQwenServerConfig` prepara clave, URL HTTPS y
modelo sin asumir un endpoint o modelo. **Cambiar `AI_PROVIDER=qwen` todavía usa
mock**, con o sin variables completas; no hay código que envíe una consulta externa.
El frontend no conoce Qwen ni recibe esos valores.

Pendiente para una fase autorizada posterior:

1. Obtener la API Key del cliente y confirmar proveedor, región, endpoint, modelo,
   costes y condiciones de uso según su documentación vigente.
2. Configurar los secretos en el servidor, sin incorporarlos al repositorio.
3. Implementar el adaptador Qwen detrás de `respond({message, history, config,
   context, signal})`: instrucciones de seguridad fijas, contexto tratado como
   datos, límite de respuesta, timeout, cancelación y errores sanitizados.
4. Mantener filtros públicos, permisos y validaciones; implementar control de
   abuso distribuido y presupuesto antes de permitir gasto real.
5. Probar con datos autorizados y activar explícitamente el proveedor. No se
   requiere rehacer el chat, widget ni CRUD para cambiar de proveedor.

## Verificación

```powershell
node --test scripts/hu22-*.test.mjs
node --test scripts/*.test.mjs
npm.cmd run lint
git diff --check
npm.cmd run build
```

Las pruebas HU-22 cubren CRUD local durable, errores del adaptador Supabase,
permisos antes de acceso a datos, configuración pública, contexto, mock/Qwen
pendiente, cuerpo inválido, origen, desactivación, abuso, SSR y navegador. El
recorrido Chromium usa componentes y APIs reales con un repositorio temporal,
autenticación de prueba y fuentes públicas controladas: no escribe datos remotos.
Revisa Admin/ayuda/CRUD/preview, conversación compartida, errores, teclado, móvil
y movimiento reducido a 1440/1024/390 px y una vista móvil corta de 390 × 430.
Capturas temporales: `rq-hu22-widget-*.png`, `rq-hu22-chat-*.png`, `rq-hu22-admin-*.png`.

Resultado: **19 pruebas HU-22 y 456 pruebas totales aprobadas, sin omisiones**;
lint, `git diff --check` y build de producción aprobados. También se comprobó el
build servido por Next a las tres anchuras: respuesta mock real y conservación
de la conversación al navegar entre el chat y el widget, sin escrituras remotas.

No se aplica SQL 020, no se modifica Supabase remoto, no se toca `.env.local`
y no se hace push como parte de esta implementación.
