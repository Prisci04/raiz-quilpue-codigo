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

Para habilitar inscripciones, piezas del Museo y aportes, ejecutar una vez `database-documentacion/009_actividades_museo.sql` en el editor SQL de Supabase.

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

Recibe los datos del formulario de colaboración y el nombre del archivo seleccionado. Como indica el formulario, el archivo no se transfiere ni almacena en el servidor.

### Administración

Las rutas `GET/POST /api/admin/actividades`, `GET/PATCH/DELETE /api/admin/actividades/{id}` y `GET /api/admin/actividades/{id}/participantes` gestionan actividades e inscripciones.

Las rutas `GET/POST /api/admin/museo`, `GET/PATCH/DELETE /api/admin/museo/{id}`, `GET /api/admin/museo/aportes` y `DELETE /api/admin/museo/aportes/{id}` gestionan piezas y aportes. Estas rutas requieren sesión interna y rol de gestor de contenidos.

Las categorías del museo son `fotografias`, `documentos`, `objetos_piezas`, `memorias_relatos`, `lugares_memoria` y `cultura_comunidad`.

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

`listActividadesAdmin` lista todos los estados, no solo `publicada`. Crear, editar y borrar no se exponen en `/api/actividades`.
