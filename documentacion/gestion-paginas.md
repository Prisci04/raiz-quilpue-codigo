# Gestión de Páginas

Módulo del panel administrativo (`/admin/paginas`) que edita el contenido de las páginas públicas **Inicio** y **Quiénes somos**. Lee y escribe las tablas `paginas`, `secciones_pagina`, `campos_seccion`, `valores`, `cargos_organizacion`, `integrantes_directorio`, `imagenes` e `imagenes_seccion` (`database-documentacion/019` a `026`). No crea tablas ni columnas.

## Reglas

- La estructura es fija y vive en React (`src/lib/paginas/estructura.mjs`): quién edita solo cambia **contenido**. No hay forma de crear páginas, secciones, campos ni cambiar tipos de sección. Un test (`scripts/paginas-validation.test.mjs`) compara esa estructura con los INSERT de `020` y `021`.
- Solo se actualiza `valor` de `campos_seccion` (el rol `service_role` no tiene `INSERT`). Si algún código no existe en la base no se modifica nada.
- Textos planos: React los escapa al renderizar, no se interpreta HTML. Los párrafos se separan con una línea en blanco y se conservan los saltos de línea.
- Los cargos del directorio se eligen del catálogo `cargos_organizacion` (por `id_cargo`); nunca se escribe un cargo como texto.

## Dónde está cada cosa

| Capa | Archivos |
|---|---|
| Estructura, validación, texto | `src/lib/paginas/{estructura,validation,text,errors}.mjs` |
| Datos y reglas de negocio | `src/services/paginas.service.js` |
| HTTP y revalidación | `src/lib/paginas/http.js`, `src/app/api/admin/paginas/**` |
| Cliente del navegador | `src/lib/api/paginas.js` |
| Interfaz | `src/components/admin/paginas/*`, `src/app/admin/(panel)/paginas/page.jsx` |
| Sitio público | `src/app/(sitio)/page.jsx`, `home-view.jsx`, `quienes-somos/page.jsx` |

La lectura de una página es **una sola consulta** con relaciones embebidas (sin N+1). La lectura pública usa la clave publicable y las políticas RLS de solo lectura; las escrituras usan `service_role` únicamente en el servidor y después de validar sesión y rol.

## Qué se edita en cada sección

| Página | Sección | Textos (`campos_seccion`) | Listas / imágenes |
|---|---|---|---|
| Inicio | `portada` | `texto_superior`, `titulo`, `descripcion` | hasta 8 imágenes |
| Inicio | `presentacion` | `texto_superior`, `titulo`, `contenido` | hasta 3 imágenes |
| Quiénes somos | `presentacion_mision` | `texto_superior`, `titulo_pagina`, `titulo_mision`, `parrafos_mision` | — |
| Quiénes somos | `valores` | `titulo_seccion` | `valores` (CRUD + orden) |
| Quiénes somos | `directorio` | `titulo_seccion` | `integrantes_directorio` (CRUD + orden) |
| Quiénes somos | `cierre` | `titulo_cierre`, `contenido_cierre` | — |

Se mantienen en el código: Fundadores y año de fundación, y los títulos fijos "Nuestra misión", "Nuestros valores" y "Quienes hacen posible Raíz Quilpué", porque la base no tiene campos para ellos.

El título de la portada es un único texto. Con saltos de línea se respetan las líneas (con tres, la del medio se destaca); sin saltos se reparte en tres líneas.

## Imágenes

- Bucket público `public-media`. Las subidas nuevas van a `paginas/{pagina}/{seccion}/{uuid}.ext` y se validan igual que el resto del sitio (JPG, PNG, WebP o AVIF, 5 MB, firma real del archivo).
- Cada imagen se registra en `imagenes` (con su bucket y ruta reales) y se asocia en `imagenes_seccion` con su orden.
- La biblioteca permite reutilizar imágenes existentes (actividades, contenidos, museo). No ofrece `museo/aportes/` porque pueden estar pendientes de revisión.
- **Quitar una imagen de una sección solo elimina la relación.** El archivo físico se elimina únicamente si lo subió este módulo (`paginas/...`) y ya ninguna sección lo usa. Los archivos de `actividades/`, `contenidos/` y `museo/` nunca se tocan.
- Mientras una sección no tenga imágenes asignadas, el sitio público muestra las fotografías que ya usaba.

## Consistencia sin transacciones

`supabase-js` no ofrece transacciones de varias sentencias y no se permiten funciones SQL nuevas. Cada operación compuesta se ordena para no perder datos si falla a medias: se inserta o actualiza primero y se borra al final (por ejemplo, al cambiar las imágenes de una sección se hace `upsert` y recién después se eliminan las relaciones retiradas). `valores.orden` e `integrantes_directorio.orden` no tienen restricción de unicidad, así que el reordenamiento se hace con actualizaciones individuales y el borrado compacta el orden a 1..n.

## Contenido inicial

- `node scripts/paginas-contenido-inicial.mjs [--dry-run]` copia a la base los textos que hoy muestra el sitio. Solo escribe campos vacíos o con el texto semilla de los SQL (nunca pisa un texto ya editado) y es idempotente.
- `node scripts/paginas-imagenes-iniciales.mjs [--dry-run]` copia a Storage (sin mover ni borrar los originales) las imágenes del carrusel, de la presentación y las fotos del directorio, y las registra para que aparezcan en el editor. Solo asocia a secciones o integrantes que aún no tienen imagen. Esas copias se llaman `inicial-*` (no UUID), por lo que el panel nunca las borra de Storage.

## Fotografía de cada integrante

`integrantes_directorio.id_imagen` (opcional, FK a `imagenes` con `ON DELETE RESTRICT`; definida en `database-documentacion/024_integrantes_directorio.sql`) guarda la foto de cada persona. Desde el panel se puede subir una foto nueva, elegir una de la biblioteca o quitarla (con confirmación). Sin foto, el sitio muestra las iniciales.

- Las subidas van a `paginas/quienes-somos/directorio/{uuid}.ext`.
- Cambiar o quitar la foto, o eliminar al integrante, solo borra la relación. El archivo físico se elimina únicamente si lo subió este módulo y ni otra sección ni otro integrante lo usan.
## Verificación

- `node --test scripts/paginas-validation.test.mjs`: estructura contra los SQL, validaciones, texto y rutas de Storage.
- `node --test scripts/admin-authorization.test.mjs`: todas las rutas `api/admin/paginas/**` y la página `/admin/paginas` niegan acceso sin sesión, con cookie inválida, sin rol o con rol ajeno.
- `AUDIT_ADMIN_EMAIL=... AUDIT_ADMIN_PASSWORD=... node scripts/paginas-admin-audit.mjs`: recorre el flujo real contra el servidor y la base (textos, valores, integrantes, imágenes, Storage, reflejo público) y deja todo como estaba.
