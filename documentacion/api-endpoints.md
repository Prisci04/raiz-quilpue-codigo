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

Hasta ahora solo existe el módulo público de **Actividades**.

- Autenticación: no se usa.
- Headers: no se requieren.
- Métodos disponibles: solo `GET`.
- El frontend debe consumir esta API, no Supabase de forma directa.
- La página pública `/actividades` ya consume `GET /api/actividades`. El flujo es: página → API → base de datos.

Estos endpoints son públicos porque el portal cultural solo consulta actividades con estado `publicada`.

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

## No implementado todavía

Estos métodos no existen en este sprint:

- `POST /api/actividades`
- `PUT /api/actividades/{id}`
- `PATCH /api/actividades/{id}`
- `DELETE /api/actividades/{id}`

Next.js responde `405 Method Not Allowed` si se usan.
