# HU-23 — Ubicación independiente: Leaflet, OpenStreetMap y Nominatim

Esta documentación describe la ubicación definitiva de HU-23 y su migración desde Google Maps Platform.
La arquitectura vigente sustituye Google Maps Platform; no requiere API keys,
Google Cloud, tarjetas, billing, Places ni Demo Keys. Google solo se utiliza al
abrir voluntariamente enlaces externos de navegación.

## Motivo y trazabilidad

El cliente no dispone de un medio de pago apropiado para configurar Google Cloud.
Se reutilizó HU-23 del commit `5036dd9` (integración Google con Demo Key), conservando
formularios, capas de persistencia, validaciones, semántica de PATCH y fallbacks.
La solución Google funcionaba localmente; la migración es una decisión de proyecto.
El antiguo problema de configuración Embed no es una tarea pendiente.

Auditoría Git inicial, 7 de noviembre de 2026:
- Rama `pruebas/dev-aparte`, HEAD `5036dd9`, árbol limpio.
- Referencias disponibles: `origin/main=e5245ce`, `origin/pruebas/dev-aparte=5036dd9`.
- `HEAD..origin/main`: vacío; `origin/main..HEAD`: solo `5036dd9`.
- `git diff --stat HEAD...origin/main`: vacío; main es ancestro según esas referencias.
- `git fetch --all --prune` se intentó; tras superar la restricción local de Git,
  GitHub respondió «Repository not found». No se pudo verificar la actualidad
  del remoto. No se cambiaron URL, credenciales ni ramas y no se integró nada.

## Auditoría de reutilización

| Pieza existente | Clasificación y decisión |
|---|---|
| Login, roles, guardas HTTP, CRUD general y validaciones de negocio | Reutilizables sin cambios |
| `ActividadForm` | Adaptado: estado/payload incluye coordenadas, conserva pago/documento/legacy |
| `ActividadUbicacionField` | Adaptado: conserva sección y textos editoriales, búsqueda manual |
| `ActividadFicha` y `ActividadDetallePanel` | Adaptados: mapa OSM y enlaces independientes |
| `actividad-ubicacion.mjs` | Adaptado: coordenadas, modalidades, normalización, URLs externas y error de esquema |
| `actividad-ubicacion.service.js` | Adaptado: proyecciones y escrituras seguras en esquemas parciales |
| Servicios, mappers y API de actividades | Adaptados para lectura y PATCH de coordenadas |
| SQL 019 | Adaptado localmente a migración aditiva definitiva |
| Tests HU-23 y documentación | Adaptados; se conserva el nombre histórico de algunos archivos |
| Loader y componentes Google | Específicos de Google, reemplazados y retirados después de validar equivalentes |
| Variables Google en `.env.example` | Obsoletas y retiradas; `.env.local` no se toca |

## Arquitectura definitiva

```text
Admin: lugar/dirección editorial
  → botón Buscar ubicación / Enter explícito
  → cliente buscarUbicacion
  → POST /api/admin/actividades/ubicacion
  → guarda de gestor de contenido y JSON del proyecto
  → servicio de geocodificación con caché, exclusión mutua y límite
  → Nominatim / proveedor compatible
  → hasta 5 resultados mínimos
  → selección/corrección manual → latitud/longitud en formulario
  → CRUD existente → Supabase, cuando se aplique SQL 019

Admin / público → OpenStreetMapMap → import dinámico Leaflet 1.9.4 → tiles OSM
Texto / coordenadas → Google Maps URLs → navegación externa voluntaria, sin API
```

Leaflet se integra directamente, sin wrapper React. Su CSS se importa con el
componente; la biblioteca que accede al DOM se carga solo dentro de un efecto
cliente. La renderización SSR no importa el runtime Leaflet ni requiere window.
El controlador posee mapa, capa, marcador, listeners y ResizeObserver; los libera
al desmontar. Reutiliza el marcador al cambiar coordenadas. Los cambios de zoom
son inmediatos para evitar callbacks de animación tardíos al retirar un preview.

El mapa se abre en Quilpué para selección manual sin coordenadas; ese centro
orientativo nunca se guarda hasta que el administrador elige un punto.
Se usa un marcador HTML constante, sin imágenes externas ni HTML del proveedor.
El mapa es secundario al contenido, de ancho disponible y 288 px de alto.

## Modelo y contrato

| Campo | Tipo SQL | Semántica |
|---|---|---|
| lugar | Existente | Recinto/indicaciones editoriales; obligatorio para presencial |
| direccion | VARCHAR(500), nullable | Texto editorial, nunca sobrescrito por una búsqueda |
| latitud | DOUBLE PRECISION, nullable | WGS84, -90 a 90 |
| longitud | DOUBLE PRECISION, nullable | WGS84, -180 a 180 |
| google_place_id | TEXT, nullable | Legacy conservado; no participa en búsquedas, mapas o navegación nuevos |

Las coordenadas son una pareja: ambas nulas o ambas numéricas finitas y en rango.
La API no convierte strings, booleanos, Infinity ni NaN en coordenadas.
No hay geocodificación inversa, backfill, JSON Nominatim persistido ni relación
entre coordenadas y credenciales. Cambiar proveedor no pierde los puntos guardados.

- Omitir campos en PATCH conserva los valores actuales.
- Cambiar solo una coordenada numérica conserva su pareja vigente, si es válida.
- Un null explícito en una coordenada sin enviar la otra limpia ambas.
- Enviar una nula y la otra numérica se rechaza.
- Quitar coordenadas no borra lugar, dirección ni el ID legacy.
- El PATCH exclusivo de estado mantiene su mutación exclusiva.
- Presencial e híbrida admiten búsqueda/mapa/enlaces; virtual no los monta.
  Los datos históricos de una virtual se conservan para una decisión posterior.

Sin coordenadas, se conserva lugar/dirección y se pueden abrir enlaces textuales.
El ID Google histórico no se convierte automáticamente a coordenadas ni se envía
a un SDK. Sin texto ni coordenadas suficientes no se inventa un destino.

## Nominatim: política y operación

**Leer y respetar la [política oficial de Nominatim](https://operations.osmfoundation.org/policies/nominatim/).**
Esta es una búsqueda puntual de actividades culturales, elegida expresamente
por el equipo; no es un servicio genérico de geocodificación ni autocomplete.

Solo el administrador inicia una búsqueda, mediante botón o Enter. Escribir,
montar una pantalla, guardar, abrir el sitio público o tener una actividad antigua
no dispara consultas. No hay debounce, scraping, búsqueda masiva, prefetch,
geocodificación en segundo plano ni reintentos automáticos.

El servicio servidor:
- normaliza una consulta de 3–300 caracteres;
- solicita como máximo 5 resultados en español;
- usa un viewbox orientativo de Valparaíso, con bounded=0: sin restricción de país;
- se identifica como Raíz Quilpué mediante User-Agent;
- conserva solo etiqueta y pareja de coordenadas de cada resultado;
- mantiene caché en memoria de 100 consultas, durante 15 minutos;
- admite una petición externa activa por proceso y separa inicios al menos 1,1 s;
- responde 429 si está ocupado o aún no corresponde otra petición;
- respeta Retry-After numérico del proveedor, sin reintentar;
- limita espera a 10 s y propaga cancelación;
- convierte errores externos en mensajes controlados.

**El límite del servicio público es por aplicación, sumando usuarios.**
La memoria de un proceso no garantiza coordinación entre réplicas, regiones ni
funciones serverless. Por eso, en Vercel se bloquea el endpoint público de Nominatim
con 503 antes de hacer solicitudes. En otros despliegues de producción también
se bloquea, salvo declaración explícita de una instancia/proceso único.
No se presenta este control como un limitador distribuido.

Para producción:
1. Usar una pasarela centralizada con caché y límite global, o proveedor compatible
   que permita el tráfico del despliegue.
2. Configurar su URL de búsqueda en NOMINATIM_SEARCH_URL.
3. En un servidor propio realmente único puede declararse
   NOMINATIM_SINGLE_INSTANCE=1. No habilita Nominatim público en Vercel.
4. Reiniciar/desplegar y comprobar operación y políticas del proveedor.

Si no hay proveedor configurado en producción, se informa la limitación; el
administrador puede seleccionar/corregir el punto directamente en el mapa.
El formulario no cambia al sustituir el proveedor.

## Tiles, atribución y costes

Se usa por defecto `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, con atribución
visible «© OpenStreetMap contributors» y el crédito de Leaflet.
El navegador conserva caché HTTP y Referer; no se añaden cabeceras no-cache.
No hay proxy de tiles, descarga offline, bucles ni descarga masiva. Se carga
solo la vista; keepBuffer=0 y updateWhenIdle evitan cargar anillos adicionales
o actualizar continuamente durante desplazamiento. El proveedor de tiles puede
sustituirse con NEXT_PUBLIC_OSM_TILE_URL; revisar también su atribución/licencia
antes de cambiarlo.

Leaflet es open source, licencia BSD-2-Clause. OpenStreetMap no requiere Google
Cloud. Los servidores públicos tienen capacidad y políticas de uso: no se promete
gratuidad ilimitada, disponibilidad permanente ni SLA. Un mayor tráfico puede
requerir infraestructura propia o un proveedor con condiciones distintas.
[Política de tiles](https://operations.osmfoundation.org/policies/tiles/).

## Experiencia administrativa y pública

El administrador mantiene sus datos editoriales, busca y elige un resultado.
También puede abrir el mapa sin buscar, hacer clic para seleccionar/corregir
el punto o usar teclado: enfocar el mapa, moverlo con flechas y pulsar
«Seleccionar centro del mapa». Cambiar ubicación devuelve foco a la búsqueda.
Quitar coordenadas conserva textos y referencia legacy.

Hay loading, cancelación, resultados vacíos, errores y reintento manual. Una
respuesta cancelada/tardía no repone resultados ni modifica una pantalla desmontada.
Los textos de resultados se presentan como texto React, nunca como HTML.

La ficha pública y el detalle administrativo muestran el mapa solo con una
modalidad física y coordenadas válidas. Los enlaces «Cómo llegar» y «Abrir en
Google Maps» usan URLs HTTPS con api=1, coordenadas o texto codificado. No cargan
scripts, iframes, Places ni APIs de Google y siguen disponibles si fallan los tiles.
Los mapas virtuales, búsqueda física y enlaces físicos no aparecen.

## SQL 019: preparado, no aplicado

El script definitivo se encuentra en `database-documentacion/019_actividad_ubicacion.sql`.
Ahora agrega direccion, legacy google_place_id, latitud y longitud si faltan, con
constraint de rangos y pareja nullable. No borra filas, columnas, RLS ni permisos;
no rellena coordenadas inventadas. Es transaccional y revisable manualmente.

**No se ejecutó SQL ni se inspeccionó Supabase remoto.**
Otra integrante puede estar cambiando la base: revisar el esquema real y coordinar
la aplicación manual de este SQL antes de usar persistencia definitiva.

Las lecturas conservan las columnas de ubicación disponibles ante errores de
columna ausente 42703/PGRST204; descartan únicamente la proyección ausente.
Las escrituras solo pueden reintentarse omitiendo campos ausentes nulos; si
se perdería información no nula devuelven 503 ACTIVIDAD_UBICACION_UNAVAILABLE.
Otros errores no se ocultan. La ausencia de la columna Google legacy no impide
guardar coordenadas si las demás columnas existen.

Antes de aplicar SQL se pueden probar búsqueda, mapa, selección y enlaces.
No se afirma haber guardado un punto si el backend rechazó la escritura.

## Configuración y equipo

No hay credenciales de mapas. `.env.example` conserva Supabase e incorpora solo
configuración opcional de proveedores, sin valores sensibles:

```dotenv
NOMINATIM_SEARCH_URL=
NOMINATIM_SINGLE_INSTANCE=
NEXT_PUBLIC_OSM_TILE_URL=
```

Para desarrollo local basta instalar dependencias con el flujo habitual y ejecutar
`npm run dev`. Nominatim público es el proveedor por defecto en desarrollo.
Las antiguas variables Google de un .env.local existente se ignoran; esta migración
no lee ni modifica ese archivo. No se deben versionar credenciales.

En Vercel, configurar una pasarela/proveedor de geocodificación para habilitar
búsqueda administrativa, y opcionalmente otro proveedor de tiles. Las variables
NEXT_PUBLIC se incorporan al bundle: requieren nuevo build/deployment. Las URLs
del servicio servidor no se envían al cliente. No se configuró Vercel remotamente.

## Pruebas y resultados

Se adaptaron los tests HU-23 existentes, incluidos los nombres históricos
hu23-places y hu23-ubicacion de documentación; no se abandonó la cobertura
de integridad, null/omisión, modalidades, fallbacks o errores de esquema.

- Ubicación: tipos, rangos, pareja, null, legacy, modalidades y navegación.
- Geocodificación: consulta explícita, validación, resultados mínimos, caché,
  concurrencia, límite, cancelación, timeout, fallo externo y bloqueo distribuido.
- Persistencia: handlers/mappers/servicios reales con auth/BD simuladas;
  create/read/edit, PATCH parcial/estado, legado y esquemas parcialmente migrados.
- Interfaz: SSR sin DOM, controles accesibles y modalidades, sin configuración Google.
- Leaflet: marcador, cambio de punto, error de tiles, cleanup y fallo parcial de montaje.
- Chromium: componentes, editor, Leaflet y CSS reales; API local y tiles simulados
  por defecto, a 1440/1024/390 px. Buscar, seleccionar, corregir, teclado, quitar,
  cancelación, respuesta tardía, ausencia de resultados, error, virtual, público
  y 503 con datos conservados. No hay escrituras reales.

Se ejecutó además Chromium con tiles reales y se revisaron capturas de los tres
tamaños. Una única búsqueda puntual de prueba a Nominatim para Quilpué devolvió
un resultado con coordenadas válidas y campos mínimos; no se guardó en la base.
Esto no sustituye pruebas del admin autenticado, del esquema real ni del despliegue.

```powershell
$hu23Tests = @(rg --files scripts | Where-Object { $_.EndsWith('.test.mjs') -and $_ -match 'hu23-' })
node --test @hu23Tests
$allTests = @(rg --files scripts | Where-Object { $_.EndsWith('.test.mjs') })
node --test @allTests
npm.cmd run lint
git diff --check
npm.cmd run build
```

Prueba visual optativa con tiles reales (la búsqueda y la BD siguen simuladas):
```powershell
$env:HU23_LIVE_OSM_TILES = '1'
node --test scripts/hu23-browser.test.mjs
Remove-Item Env:HU23_LIVE_OSM_TILES
```

Resultado verificado: HU-23 36 aprobadas; suite completa 526 aprobadas, sin fallos
ni omisiones. Lint y git diff --check aprobados.
El build pasó al autorizar la descarga de Poppins existente; no se cambió la fuente.
Node conserva su aviso preexistente de módulos ES en archivos .js; no se modificó
el tipo global del proyecto para ocultarlo.

## Pendientes antes de producción

- Recuperar acceso al remoto Git y revisar novedades antes de integrar.
- Coordinar/aplicar SQL 019 manualmente, con verificación del esquema real.
- Configurar geocodificación apropiada para el despliegue y su límite global.
- Validar rutas autenticadas, persistencia real, dominio, contacto público,
  privacidad y políticas del proveedor con el cliente.
- Cambiar tiles o geocodificación si el tráfico excede el uso razonable público.

## Referencias

- [Leaflet estable e instalación](https://leafletjs.com/install.html)
- [Leaflet API](https://leafletjs.com/reference.html)
- [Nominatim: búsqueda](https://nominatim.org/release-docs/latest/api/Search/)
- [Nominatim: política de uso](https://operations.osmfoundation.org/policies/nominatim/)
- [OpenStreetMap: política de tiles](https://operations.osmfoundation.org/policies/tiles/)
- [OpenStreetMap: atribución](https://www.openstreetmap.org/copyright)
- [Google Maps URLs sin API](https://developers.google.com/maps/documentation/urls/get-started)
