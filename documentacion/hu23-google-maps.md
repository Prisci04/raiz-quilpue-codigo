# HU-23 — Google Maps

## Antecedentes — Fase 1

Implementación local sobre `pruebas/dev-aparte`, base `e5245ce`.
No se utilizaron credenciales reales ni se conectó el proyecto a Google Cloud.
No se inspeccionó ni modificó Supabase remoto.

## Implementado

- Ubicación manual y referencia Google opcional para crear/editar actividades.
- Selector moderno `PlaceAutocompleteElement`, cargado solo cuando el administrador
  abre la búsqueda y existe configuración. No se usa el Autocomplete heredado.
- Preview y ficha pública mediante Maps Embed; sin Maps JavaScript público.
- Enlaces universales «Cómo llegar» y «Abrir en Google Maps», también para una
  dirección manual o un lugar histórico. Estos enlaces no necesitan API key.
- Fallback sin claves: entrada manual, texto público, sin SDK ni iframe.
- Compatibilidad con actividades existentes y protección del PATCH parcial.
- Sin dependencias nuevas, cambios de permisos ni cambios en inscripción/cupos.

## Modelo y migración

`database-documentacion/013_actividad_google_maps.sql`:

| Campo | Tipo | Regla |
|---|---|---|
| `lugar` | Existente | Nombre/indicaciones del recinto; se conserva |
| `direccion` | `VARCHAR(500) NULL` | Texto editorial propio del evento |
| `google_place_id` | `TEXT NULL` | Referencia opaca seleccionada en Google |

Los nuevos campos admiten NULL, pero no texto compuesto solo por espacios.
No hay unicidad: varias actividades pueden compartir un lugar. No se exige
dirección para tener Place ID, ni Google para publicar. No se agregan coordenadas,
HTML, iframe, URLs persistidas ni JSON de Places. No se modifica RLS.

**SQL 013 preparado pero NO aplicado remotamente. REQUIERE APLICACIÓN REMOTA.**

Un responsable debe revisar y aplicar el SQL antes de persistir los nuevos campos.
La migración es aditiva y transaccional; contiene una reversión conceptual comentada.
Revertir las columnas eliminaría sus datos: respaldarlos primero.
El esquema efectivo remoto **NO ESTÁ VERIFICADO**.

### Despliegue antes de aplicar SQL 013

Las consultas de detalle prueban las nuevas columnas y vuelven a la proyección
histórica únicamente ante errores de columna ausente `42703` / `PGRST204` que
mencionan `direccion` o `google_place_id`. Los listados conservan su proyección
anterior y no requieren esos campos.

Las creaciones/ediciones sin ubicación adicional y los cambios rápidos de estado
siguen funcionando en el esquema anterior. Un intento de persistir dirección o
Place ID no nulos recibe HTTP 503 `ACTIVIDAD_UBICACION_UNAVAILABLE`, con un aviso
administrativo y los datos aún en el formulario. No se afirma haberlos guardado,
ni se descartan silenciosamente. Otros errores de BD no activan este fallback.

La ausencia de Google Cloud es independiente de la ausencia de SQL 013:
**con las columnas disponibles se puede guardar dirección manual sin ninguna key**.

## Contrato y modalidades

- Omitir un nuevo campo preserva su valor en PATCH.
- Enviar `null` o texto vacío limpia solo ese campo.
- Los strings se recortan; dirección admite hasta 500 caracteres; no se aceptan
  tipos arbitrarios ni caracteres de control.
- PATCH de solo `estado` mantiene una mutación de solo `estado`, sin borrar lugar,
  dirección, referencia, forma de pago ni información adicional.
- PATCH de edición combina el registro vigente con los campos recibidos antes
  de aplicar las validaciones existentes. JSON inválido/vacío se rechaza con 400
  antes de consultar el registro.
- Presencial mantiene `lugar` obligatorio, también en borrador.
- Híbrida mantiene sus reglas existentes: Google y dirección son opcionales.
- Virtual conserva textos y referencia histórica; no usa la referencia ni muestra
  dirección física, mapa o enlaces físicos en público. El texto histórico `lugar`
  conserva su presentación previa. «Quitar referencia Google» limpia explícitamente
  el ID, sin borrar `lugar` ni `direccion`.

El flujo de detalle es Supabase → servicios admin/público → `mapActividadPublica`
→ `mapActividadVista` → ficha. Los nuevos valores llegan también al detalle admin.
No se cambian los contratos de autenticación ni se agregan permisos.

## UX administrativa

En `ActividadForm`, «Ubicación» queda después de los datos generales y antes de
la imagen: recinto, dirección editorial, búsqueda/aviso y referencia/preview.
Los campos y botones conservan los estilos del admin.

El widget restringe resultados a Chile y aplica un sesgo de 30 km alrededor de
Quilpué. Es un sesgo, no una restricción geográfica adicional. Sus constantes
no representan coordenadas guardadas de una actividad.

Se solicitan solo `id` y `formattedAddress` al seleccionar una sugerencia.
La dirección normalizada de Google se mantiene temporalmente en memoria para
confirmar la selección; **nunca se copia automáticamente a `direccion`**.
El administrador escribe su texto editorial en el campo independiente.
No se solicitan fotos, reseñas, datos comerciales ni coordenadas.

Editar la búsqueda invalida la selección anterior; respuestas tardías no sobrescriben
una selección más reciente ni actualizan un componente desmontado. Errores de
red/SDK permiten reintentar y conservar el uso manual. Enter en el widget no
debe enviar implícitamente el formulario: validar con el SDK real en fase 2.

El cargador comparte una promesa para evitar scripts duplicados, espera hasta
15 segundos y permite reintentar después de fallar. Sin key no crea scripts.
Los placeholders conocidos también se consideran no configurados.

## Ficha pública y Embed

Texto editorial y lugar permanecen independientes del proveedor. El iframe solo
existe con referencia, key Embed y modalidad física. Usa `place`, `q=place_id:…`,
español, región Chile, carga lazy, título accesible y referrer policy
`strict-origin-when-cross-origin`. Altura de 256 px y ancho disponible; al
reutilizarlo respetar el mínimo de Google de 200 × 200 px.

Los enlaces usan parámetros codificados y host fijo HTTPS. Si una referencia
excesivamente larga excede el límite de URL, se intenta el enlace textual;
no se trunca el Place ID. Sin datos suficientes se omite la acción.

Si Google o la red fallan, la ficha y sus textos siguen disponibles. Por aislamiento
entre orígenes no se puede detectar fiablemente un error de autorización o Place ID
dentro del iframe. No se simula una comprobación con `onLoad`: revisar con Google
real en fase 2. Los enlaces son una alternativa; también dependen de Google.

## Variables opcionales

Solo se agregaron entradas vacías a `.env.example`:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps JavaScript + Places en Admin |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` | Embed en Admin y público |

Son claves de navegador, visibles por diseño. No tratarlas como secretos servidor
ni darles permisos de otras APIs. Usar claves separadas por propósito y ambiente,
con restricciones HTTP referrer y por API. No usar una key sin restricciones.

Next incorpora las variables públicas al bundle durante el build: configurarlas
requiere reconstruir y desplegar. Cambiar solo el entorno de un proceso ya compilado
no habilita el cliente. `.env.local` no fue modificado.

## Pendiente — Fase 2 Google Cloud

1. Obtener el proyecto autorizado y revisar facturación/cuotas.
2. Habilitar Maps JavaScript API y Places API (New).
3. Habilitar Maps Embed API.
4. Crear las claves de navegador separadas.
5. Restringirlas por API y dominios/referrers de desarrollo y producción.
6. Revisar/aplicar SQL 013 con autorización y comprobar columnas/constraints
   y recarga de schema cache de PostgREST.
7. Configurar variables reales fuera del repositorio y reconstruir.
8. Probar autocomplete real: Chile, sesgo Quilpué, teclado, selección, borrado,
   nuevas búsquedas, ID, error de red/autorización y reintento.
9. Confirmar que `formattedAddress` no se persiste como dirección editorial.
10. Probar preview, mapa público, ID obsoleto/inválido y navegación móvil.
11. Comprobar en producción restricciones, consola, cuotas y fallback.
12. Revisar requisitos vigentes de atribución, privacidad y términos de Places
    antes de habilitarlo para usuarios finales.

No hay solicitudes Places al guardar, visitar listados ni con keys ausentes.
Autocomplete y `fetchFields` pueden generar consumo: el widget gestiona sesiones
y solo se piden los campos necesarios. No se monta un mapa dinámico JavaScript.
Revisar precios/cuotas vigentes al activar la cuenta; no se validaron consumos reales.

## Validación local

Suite nueva, aislada de servicios externos:

- `scripts/hu23-ubicacion.test.mjs`: normalización, modalidades, URLs y fallback.
- `scripts/hu23-places.test.mjs`: loader/widget simulados, campos mínimos,
  exclusión de respuestas tardías, errores/reintento.
- `scripts/hu23-persistencia.test.mjs`: handlers/servicios reales, BD simulada;
  create/read/edit, publicación, null/omisión, PATCH inválido, esquema anterior.
- `scripts/hu23-interfaz.test.mjs`: componentes reales renderizados; Embed,
  formulario, detalle, legado y virtuales.
- `scripts/hu23-browser.test.mjs`: Chromium con formulario/editor reales y API
  local; entrada manual, guardado, quitar referencia, teclado/foco y tamaños
  1440/1024/390 px, incluida dirección larga. Bloquea solicitudes externas.
  Sin Chrome/Edge/Chromium se omite con motivo; `TEST_BROWSER_PATH` permite
  indicar el ejecutable.

Ejecutar en PowerShell:

~~~powershell
$hu23Tests = @(rg --files scripts | Where-Object { $_.EndsWith('.test.mjs') })
node --test @hu23Tests
npm.cmd run lint
git diff --check
npm.cmd run build
~~~

Resultados: **513 aprobadas, 0 fallidas, 0 omitidas; 31 nuevas**.
ESLint y build de producción aprobados. El primer build no pudo descargar Poppins
bajo la red restringida; el reintento con acceso autorizado compiló. No se cambió
la tipografía para sortear esa restricción. No se ejecutaron scripts de inspección
remota, recuperación de credenciales ni SQL.

Esto no sustituye la validación real de Google, del esquema Supabase ni una revisión
visual en el entorno final. Revisar `/admin/actividades/nueva`, edición, detalle
admin y `/actividades/[id]` con datos históricos, manuales e híbridos.

## Referencias

- [PlaceAutocompleteElement: eventos y opciones](https://developers.google.com/maps/documentation/javascript/reference/places-widget#PlaceAutocompleteElement)
- [Maps Embed: modo place y referrer policy](https://developers.google.com/maps/documentation/embed/embedding-map)
- [Maps URLs: enlaces universales sin API key](https://developers.google.com/maps/documentation/urls/get-started)
- [Restricciones de claves](https://developers.google.com/maps/api-security-best-practices)
- [Políticas de Places](https://developers.google.com/maps/documentation/places/web-service/policies)

## Fase 2 — Demo Key

Esta fase amplía la base anterior, sin reescribir los contratos de actividades ni
aplicar SQL remoto. Las secciones anteriores describen la Fase 1; la estrategia
vigente de representación es la siguiente:

| Configuración y datos | Resultado en preview y ficha pública |
|---|---|
| Modalidad virtual o desconocida | Sin mapa ni enlaces físicos |
| Sin Place ID | Lugar/dirección y enlaces textuales, si hay datos |
| Place ID y key Embed | Maps Embed preferido, aunque también exista key JavaScript |
| Place ID, key JavaScript y Embed vacío | Maps JavaScript con marcador moderno |
| Place ID sin ninguna key | Texto y enlaces, sin cargar Google |

La decisión reside en `googleMapsRenderer` y `GoogleMapsLocation`; Admin y público
comparten el mismo criterio. No se analiza el contenido de la credencial para
determinar si es Demo o estándar. La Demo Key es temporal, para desarrollo,
pruebas, revisión del equipo y demostración académica; no es una credencial de
producción definitiva y no se asume que permita Maps Embed.

### Places y selección

Se mantiene `PlaceAutocompleteElement`, con `gmp-select`/`gmp-error`, restricción
de resultados a Chile y sesgo de 30 km alrededor de Quilpué. No se limita la
búsqueda a esa zona ni se restringe a comercios: admite direcciones y recintos.

Al seleccionar se piden únicamente `id`, `formattedAddress` y `location`.
La ubicación geográfica adicional se necesita para dibujar el marcador. Dirección
Google y coordenadas permanecen en memoria, separadas de `direccion`, que sigue
siendo editorial. No se solicitan fotos, reseñas, teléfono ni horarios.

Una búsqueda nueva invalida el Place ID anterior; las respuestas tardías se
descartan mediante una secuencia y el desmontaje cancela su aplicación. Quitar
la referencia envía `google_place_id: null` sin borrar lugar ni dirección.
El estado indica «seleccionada», sin afirmar que ya se persistió en Supabase.
Enter permite seleccionar sugerencias sin enviar implícitamente la actividad.

### Mapa y recursos

El loader comparte una carga del SDK y promesas por biblioteca para `places`,
`maps`, `marker` y `core`. Reutiliza un SDK moderno existente; no añade scripts sin key.
Los fallos de script y las esperas excesivas se convierten en errores controlados,
con reintento explícito. Los errores de autenticación posteriores también notifican
al componente de mapa, sin registrar credenciales ni mensajes crudos del SDK.

`GoogleMapsJavaScriptMap` usa `Map` y `AdvancedMarkerElement`, sin el marcador
legacy. El identificador público de estilo `DEMO_MAP_ID` no es una API key ni
condiciona el código a una Demo Key. Cuando se abre un Place ID persistido, solo
se solicita `location`; una selección recién obtenida reutiliza sus coordenadas.
El controlador espera `tilesloaded` antes de informar que el mapa está listo,
descarta respuestas obsoletas y, al desmontar/cambiar selección, retira el marcador,
limpia listeners mediante `core.event` y libera su contenedor.

Se conserva la atribución estándar de Google y se usa `gestureHandling:
"cooperative"` para el scroll. El contenedor ocupa el ancho disponible y 256 px
de altura. Si falla el mapa, permanecen el texto, los enlaces y el reintento.
Los enlaces universales con Place ID y encoding siguen siendo independientes del
proveedor de visualización. Las actividades virtuales no montan estos componentes.

### SQL 013 y pruebas sin persistencia

SQL 013 sigue siendo compatible y no necesita cambios: solo persiste `direccion`
y `google_place_id`, nunca coordenadas ni respuestas completas de Places.
**No fue aplicado ni se verificó remotamente el esquema.**

Autocomplete, preview y enlaces pueden probarse antes de aplicarlo. El guardado
de ubicación adicional seguirá devolviendo 503 si faltan columnas, conservando el
formulario y mostrando el error; no se simula persistencia ni se pierde el input.

### Validación de esta fase

- Suite HU-23: pruebas de credenciales, estrategia compartida, loader concurrente,
  selección/cambio/error/reintento, respuestas tardías, mapa/marcador y cleanup.
- Render real de componentes: modalidades presencial/híbrida/virtual, cero keys,
  solo JavaScript, ambas keys, legado y archivo de datos sin dirección o Place ID.
- Chromium aislado: formulario/editor reales, API local simulada y ningún acceso
  a Supabase. Escenario sin Google y escenario de SDK simulado en 1440/1024/390 px;
  teclado/foco, sugerencias, selección, cambio, quitar referencia, error/reintento,
  modalidad virtual y respuesta 503 que conserva los datos.
- Resultado local: **526 pruebas aprobadas, 0 fallidas, 0 omitidas; HU-23: 44**.
  Lint y build de producción aprobados. Node emite el aviso ya existente sobre
  módulos ES en archivos `.js`; no se cambió `package.json` para ocultarlo.

Las pruebas anteriores no prueban que una credencial tenga permisos o cuotas
válidas. La validación real de Google está separada y es optativa:

~~~powershell
$env:HU23_LIVE_GOOGLE = '1'
node --test --test-name-pattern='LIVE Google' scripts/hu23-browser.test.mjs
Remove-Item Env:HU23_LIVE_GOOGLE
~~~

Este modo carga las variables con `@next/env`, exige Maps configurado y deja Embed
vacío solo en el bundle aislado de prueba, sin modificar `.env.local`. Compila
componentes cliente como en la aplicación y permite solicitudes
exclusivamente al servidor local y los servicios de Google. Prueba nuevas/edición
con registros locales, Places y mapa públicos; las escrituras siguen simuladas.
No imprime la key, los URLs de solicitudes con credenciales ni errores crudos de
Google. El perfil y bundle de prueba se eliminan al finalizar. No modifica la
configuración de Google Cloud ni equivale a validar la autenticación del admin.

**Validación real de Google aprobada en Chromium**: sugerencias accesibles, selección
por teclado, Place ID real, marcador y mapa, nueva actividad y edición, cambio de
selección, preview público, quitar referencia, modalidad virtual, dirección editorial
preservada y error 503 simulado. Resoluciones: 1440, 1024 y 390 px; se revisaron
capturas de esos tamaños. Es una prueba de los componentes reales con Google y una
API local, no una prueba autenticada contra el backend de producción.

La primera ejecución fue bloqueada por `ERR_NETWORK_ACCESS_DENIED`; se reintentó
con acceso de red autorizado. La comprobación real permitió ajustar Enter para no
cancelar la selección nativa y corregir la biblioteca usada para limpiar listeners.
Los dobles de pruebas reflejan ahora la separación real entre `maps` y `core`.

**Pendiente de configuración local:** al verificar el entorno se encontró el mismo
valor configurado en Maps y Embed. Se solicitó dejar Embed vacío; no se alteró
`.env.local`. Hasta corregirlo, la aplicación normal preferirá Embed, aunque esta
key temporal no se haya validado para ese servicio. El bundle aislado confirmó el
recorrido Maps JavaScript sin asumir permisos Embed ni modificar variables locales.

## Migración futura a Google Cloud del cliente

La transición reutiliza componentes, Place IDs y modelo actuales:

1. Obtener un proyecto autorizado y claves estándar del cliente.
2. Habilitar Maps JavaScript API y Places API (New) para búsqueda y mapas dinámicos.
3. Habilitar Maps Embed API para la ficha y preview preferidos.
4. Restringir las keys por API y por referrers/dominios de cada ambiente.
5. Configurar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` y
   `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` en local y Vercel.
6. Reconstruir/redeployar: Next incorpora `NEXT_PUBLIC_*` durante la compilación.
7. Validar dominio público, Places, Embed, enlaces, errores, cuotas y modalidades.
8. Retirar la Demo Key del entorno temporal y de cualquier despliegue de demostración.

No se requiere reescribir HU-23 ni migrar ubicaciones por cambiar de credencial.
Con key Embed válida y Place ID se elige Embed automáticamente. Si se mantiene
el mapa JavaScript en producción, revisar también el identificador de estilo y
la configuración definitiva de mapas del cliente; no cambiarlo por una API key.
La aplicación de SQL 013, políticas/términos/privacidad y verificación de permisos
efectivos siguen siendo tareas autorizadas independientes antes de producción.

## Preparación para otras desarrolladoras

1. Incorporar el código mediante el flujo Git acordado por el equipo.
2. Crear su propio `.env.local` en la raíz, ignorado por Git.
3. Configurar localmente (recibir la credencial por un canal privado):

~~~dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<DEMO_KEY_COMPARTIDA_PRIVADAMENTE>
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=
~~~

4. Ejecutar `npm run dev`; no editar componentes ni copiar la key a `.env.example`.
5. Probar crear/editar sin asumir que SQL 013 ya esté aplicado. No commitear
   `.env.local` ni compartir capturas/logs con credenciales.

No hay dependencias nuevas para esta fase. Las claves de navegador son visibles
por diseño en el bundle y las solicitudes de Google; eso no autoriza publicarlas
en Git, documentación, fixtures de fuente ni logs adicionales.

## Preparación para Vercel

**Commit/push no basta para que Google Maps aparezca en Vercel.** Antes de la demo:

1. Entrar al proyecto correcto de Vercel.
2. Configurar las variables de entorno fuera del repositorio.
3. Elegir explícitamente los ámbitos Preview y/o Production correspondientes.
4. Crear un nuevo deployment/redeploy para incorporar las variables al cliente.
5. Probar la URL pública, permisos/referrers, cuotas, errores y responsive.

Para una demostración temporal, mantener Embed vacío si no existe una key apta
para ese servicio; Maps JavaScript será la alternativa automática. No asumir que
la Demo Key autoriza cualquier dominio, API o consumo. Para producción definitiva,
sustituir variables por las del cliente, habilitar/restringir APIs, configurar Embed
y redeployar. Esta fase no creó ni modificó recursos remotos en Vercel o Google Cloud.

Referencias adicionales: [carga moderna de Maps JavaScript](https://developers.google.com/maps/documentation/javascript/load-maps-js-api),
[marcadores modernos y Map ID](https://developers.google.com/maps/documentation/javascript/advanced-markers/add-marker),
[alcance de Demo Keys](https://developers.google.com/maps/documentation/javascript/demo-key).
