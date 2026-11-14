# API de Raíz Quilpué

Base URL local:

```text
http://localhost:3000
```

Antes de probar, levanta el servidor:

```bash
npm run dev
```

## Estado actual

El portal público consulta las actividades publicadas y registra las inscripciones y aportes al Museo mediante la API. Las rutas administrativas requieren sesión interna y rol editor o administrador; no se debe consultar Supabase directamente desde el navegador.

El esquema vive en `database-documentacion/001_roles.sql` a `018_museo_aportes.sql`. Esos archivos SQL son la fuente de verdad: no hay tabla `sesiones`, no hay `museo_piezas` y las categorías se persisten por ID.

---

## Actividades

### 1. Listar actividades públicas

`GET /api/actividades`

Devuelve solo actividades publicadas, ordenadas por `fecha` ascendente y `id` ascendente.

#### Query params

| Parámetro | Tipo | Obligatorio | Default | Validación |
|---|---|---|---|---|
| `page` | entero | No | `1` | Entero >= 1 |
| `limit` | entero | No | `10` | Entero entre 1 y 100 |

#### Ejemplos

```text
GET http://localhost:3000/api/actividades
GET http://localhost:3000/api/actividades?page=1
GET http://localhost:3000/api/actividades?page=1&limit=10
GET http://localhost:3000/api/actividades?page=2&limit=10
```

#### Respuesta 200

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "titulo": "Ruta Patrimonial por Quilpué",
      "descripcion": "Recorrido guiado por distintos puntos históricos de Quilpué.",
      "fecha": "2026-09-26",
      "hora_inicio": "11:00:00",
      "ubicacion": "Plaza Eugenio Rengifo, Quilpué",
      "cupos": 30,
      "imagen_url": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

Si no hay resultados, igual responde `200` con `data: []`.

#### Errores

| Caso | URL de ejemplo | HTTP | Código |
|---|---|---|---|
| `page=0` | `/api/actividades?page=0` | 400 | `INVALID_PAGINATION` |
| `page=abc` | `/api/actividades?page=abc` | 400 | `INVALID_PAGINATION` |
| `limit=0` | `/api/actividades?limit=0` | 400 | `INVALID_PAGINATION` |
| `limit=99999` | `/api/actividades?limit=99999` | 400 | `INVALID_PAGINATION` |
| Error interno | — | 500 | `INTERNAL_SERVER_ERROR` |

---

### 2. Obtener una actividad por ID

`GET /api/actividades/{id}`

Devuelve una actividad publicada. Si no existe o no está publicada, responde 404.

El `id` debe ser un entero mayor que 0.

#### Ejemplos

```text
GET http://localhost:3000/api/actividades/2
GET http://localhost:3000/api/actividades/3
GET http://localhost:3000/api/actividades/4
```

En los datos actuales, el `id=1` no está publicado. Por eso `/api/actividades/1` responde 404.

#### Respuesta 200

```json
{
  "success": true,
  "data": {
    "id": 2,
    "titulo": "Ruta Patrimonial por Quilpué",
    "descripcion": "Recorrido guiado por distintos puntos históricos de Quilpué.",
    "fecha": "2026-09-26",
    "hora_inicio": "11:00:00",
    "ubicacion": "Plaza Eugenio Rengifo, Quilpué",
    "cupos": 30,
    "imagen_url": null
  }
}
```

#### Errores

| Caso | URL de ejemplo | HTTP | Código |
|---|---|---|---|
| ID no numérico | `/api/actividades/abc` | 400 | `INVALID_ACTIVITY_ID` |
| ID negativo | `/api/actividades/-1` | 400 | `INVALID_ACTIVITY_ID` |
| ID inexistente o no publicada | `/api/actividades/1` | 404 | `ACTIVITY_NOT_FOUND` |
| ID inexistente | `/api/actividades/999999` | 404 | `ACTIVITY_NOT_FOUND` |
| Error interno | — | 500 | `INTERNAL_SERVER_ERROR` |

---

### 3. Inscribirse en una actividad

`POST /api/actividades/{id}/inscripciones`

Registra nombre, apellido, correo y teléfono de una persona en una actividad publicada que requiere inscripción. La API valida que existan cupos.

```json
{
  "nombre": "Ana",
  "apellido": "Pérez",
  "email": "ana@example.com",
  "telefono": "+56912345678"
}
```

### 4. Enviar un aporte al Museo Digital

`POST /api/museo/aportes`

Recibe el formulario de colaboración (`nombre`, `correo`, `id_categoria_museo`, `titulo`, `descripcion`, `fecha_aproximada`, `lugar`) y una imagen obligatoria en `archivo` (JPG, PNG, WEBP o AVIF, máximo 5 MB). La imagen se guarda en `museo/aportes/{uuid}.ext`. No se aceptan PDF.

El aporte queda en revisión `Pendiente`. El listado público del museo solo muestra aportes `Aprobado`; no hay conversión a otra tabla.

### Administración

Las rutas `GET/POST /api/admin/actividades`, `GET/PATCH/DELETE /api/admin/actividades/{id}` y `GET /api/admin/actividades/{id}/participantes` gestionan actividades e inscripciones.

Las rutas `GET/POST /api/admin/museo`, `GET/PATCH/DELETE /api/admin/museo/{id}`, `GET /api/admin/museo/aportes`, `POST /api/admin/museo/aportes/{id}/aprobar`, `POST /api/admin/museo/aportes/{id}/rechazar` y `DELETE /api/admin/museo/aportes/{id}` gestionan piezas y aportes. Estas rutas requieren sesión interna y rol de gestor de contenidos.

Las categorías oficiales del museo son `Fotografías`, `Documentos`, `Objetos y piezas`, `Memorias y relatos`, `Lugares de memoria` y `Cultura y comunidad`.

#### Gestión de Páginas (Inicio y Quiénes somos)

Todas estas rutas exigen sesión interna y rol administrador o editor. Las mutaciones validan el origen y, al guardar, invalidan `/` y `/quienes-somos`. La estructura de las páginas es fija: no se pueden crear páginas, secciones ni campos nuevos. El diseño completo está en `documentacion/gestion-paginas.md`.

| Método y ruta | Descripción |
|---|---|
| `GET /api/admin/paginas/{id}` | Contenido de la página (`1` Inicio, `2` Quiénes somos) con campos, valores, integrantes, imágenes y catálogo de cargos |
| `PATCH /api/admin/paginas/{id}/secciones/{codigo}` | Body `{ "campos": { "codigo_campo": "texto" } }`. Solo actualiza `valor` de campos existentes |
| `POST /api/admin/paginas/valores` | Crea un valor al final de la lista (`texto_superior`, `titulo`, `descripcion`) |
| `PATCH /api/admin/paginas/valores` | Reordena: `{ "ids": [..] }` con todos los valores en el orden deseado |
| `PATCH` / `DELETE /api/admin/paginas/valores/{id}` | Edita / elimina un valor (el orden se compacta) |
| `POST /api/admin/paginas/integrantes` | Crea un integrante (`id_cargo` del catálogo `cargos_organizacion`, `nombre_integrante`, `descripcion`) |
| `PATCH /api/admin/paginas/integrantes` | Reordena el directorio con `{ "ids": [..] }` |
| `PATCH` / `DELETE /api/admin/paginas/integrantes/{id}` | Edita / elimina un integrante |
| `POST /api/admin/paginas/integrantes/{id}/imagen` | `multipart/form-data` con `file`. Sube la fotografía del integrante a `paginas/quienes-somos/directorio/{uuid}.ext` y la deja asignada |
| `PATCH /api/admin/paginas/integrantes/{id}/imagen` | `{ "id_imagen": 12 }` asigna una imagen de la biblioteca; `{ "id_imagen": null }` quita la foto |
| `GET /api/admin/paginas/imagenes` | Biblioteca de imágenes registradas en `public-media` (excluye `museo/aportes/`) |
| `POST /api/admin/paginas/{id}/secciones/{codigo}/imagenes` | `multipart/form-data` con `file` (y `descripcion` opcional). Sube a `paginas/{pagina}/{seccion}/{uuid}.ext`, registra en `imagenes` y asocia en `imagenes_seccion` |
| `PATCH /api/admin/paginas/{id}/secciones/{codigo}/imagenes` | `{ "ids": [..] }` define las imágenes de la sección y su orden (asociar, reordenar, reemplazar, quitar) |
| `PATCH /api/admin/paginas/imagenes/{id}` | Edita `descripcion_imagen` |

Las listas devuelven siempre `{ "items": [...] }` completa y ordenada; las imágenes, `{ "imagenes": [...] }`. Los errores de validación responden `400 VALIDATION`; los elementos inexistentes, `404 NOT_FOUND`.

---

## Formato de errores

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAGINATION",
    "message": "Los parámetros de paginación no son válidos"
  }
}
```

Códigos actuales:

| Código | HTTP | Significado |
|---|---|---|
| `INVALID_PAGINATION` | 400 | `page` o `limit` no son válidos |
| `INVALID_ACTIVITY_ID` | 400 | El `id` no es un entero mayor que 0 |
| `ACTIVITY_NOT_FOUND` | 404 | La actividad no existe o no está publicada |
| `INTERNAL_SERVER_ERROR` | 500 | Error interno. No se exponen detalles de Supabase |

---

## Cómo probarlo en Postman

1. Method: `GET`
2. URL: una de las de este documento
3. No agregar Authorization
4. No agregar headers especiales
5. No agregar body
6. Send

---

## Services públicos

| Función | Ruta actual |
|---|---|
| `getActividadesPublicadas({ page, limit })` | `GET /api/actividades` |
| `getActividadPublicadaById(id)` | `GET /api/actividades/{id}` |

El admin no usa las rutas públicas para editar actividades. Sus rutas administrativas incluyen:

| Función | Ruta actual |
|---|---|
| `listActividadesAdmin()` | `GET /api/admin/actividades` |
| `saveActividad(datos)` | `POST /api/admin/actividades` |
| `saveActividad(id, datos)` | `PATCH /api/admin/actividades/{id}` |
| `deleteActividad(id)` | `DELETE /api/admin/actividades/{id}` |

`listActividadesAdmin` lista todos los estados, no solo `Publicada`. Crear, editar y borrar no se exponen en `/api/actividades`.
