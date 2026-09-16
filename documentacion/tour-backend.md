# Tour por el backend

Esta guía explica **cómo está armado el backend de Actividades** y **en qué orden mirar las carpetas** si quieres hacer lo mismo para otro módulo (por ejemplo Contenido).

No hace falta saber Next.js de memoria. La idea es: **abre los archivos en este orden, entiende qué hace cada uno, y después copia el patrón.**

La documentación de las URLs (qué responde cada endpoint) está en [`api-endpoints.md`](./api-endpoints.md). Este archivo habla del **orden de las carpetas**.

---

## Idea general

El dato no va directo de la página a Supabase.

Va por capas, de abajo hacia arriba:

```text
1. Tabla en Supabase
2. Service          → pregunta a la base de datos
3. API (route.js)   → expone esa data en una URL
4. Cliente (lib/api)→ la página llama a esa URL
5. Página           → muestra los datos
```

Ejemplo real con Actividades:

```text
tabla "actividades"
        ↓
src/services/actividades.service.js
        ↓
GET /api/actividades          ← src/app/api/actividades/route.js
GET /api/actividades/12       ← src/app/api/actividades/[id]/route.js
        ↓
src/lib/api/actividades.js
        ↓
src/app/actividades/page.jsx
```

Si haces Contenido, el camino es el mismo. Solo cambian nombres de tabla, archivos y URLs.

---

## Qué NO tienes que crear

Estos archivos ya existen y se reutilizan. Léelos, no los copies.

| Archivo | Para qué sirve |
|---|---|
| `src/lib/supabase/server.js` | Cliente de Supabase que usa el **servidor**. El service lo llama con `getSupabaseServerClient()`. |
| `src/lib/http.js` | Respuestas JSON, errores, paginación y validar el `id`. |
| `src/lib/supabase.js` | Cliente del navegador. Las APIs públicas **no** lo usan. |

De `http.js` vas a reutilizar sobre todo:

- `jsonSuccess(...)` → respuesta OK: `{ success: true, data }`
- `jsonError(...)` → respuesta de error: `{ success: false, error: { code, message } }`
- `parsePaginationParams(...)` → lee `?page=` y `?limit=`
- `parsePositiveInteger(...)` → valida el `id` de la URL
- `logInternalError(...)` → registra el error sin mostrarlo al usuario

---

## Paso 0 — Mira primero estos dos archivos

Antes de crear nada, abre:

1. `src/lib/supabase/server.js`
2. `src/lib/http.js`

Con eso ya sabes **cómo se habla con la base** y **cómo se responde en JSON**.

El resto del tour es “un módulo nuevo usa esas dos herramientas”.

---

## Paso 1 — El service (aquí vive la query)

**Archivo a mirar:** `src/services/actividades.service.js`

Este archivo es el corazón del backend. Habla con Supabase. Las rutas API no deberían armar queries: solo llaman funciones de aquí.

Hoy hace dos cosas:

- `getActividades({ page, limit })` → lista paginada
- `getActividadById(id)` → una sola actividad, o `null` si no existe

Reglas que ya tiene Actividades (y que Contenido debería copiar):

- Lee la tabla `"actividades"`.
- Solo trae filas con `estado = "publicada"`.
- No expone columnas internas: arma un objeto público con `mapActividadPublica`.
- Pagina con `.range(...)`.
- Si la página pedida no tiene datos, igual responde lista vacía (no tira error).

Columnas públicas de Actividades:

```text
id, titulo, descripcion, fecha, hora_inicio, ubicacion, cupos, imagen_url
```

### Si haces Contenido

Crea:

```text
src/services/contenido.service.js
```

Copia el de actividades y cambia:

- `.from("contenido")` (o el nombre real de la tabla)
- las columnas
- los nombres de las funciones: `getContenidos`, `getContenidoById`
- el mapper: `mapContenidoPublico`

---

## Paso 2 — Las APIs (aquí nace la URL)

En Next.js, **la carpeta es la URL**.

Cada archivo se llama `route.js` y exporta funciones HTTP: `GET`, `POST`, etc.

Hoy Actividades solo tiene `GET`. No hay crear, editar ni borrar desde estas rutas.

### API 1 — Listar

| Qué | Valor |
|---|---|
| Archivo | `src/app/api/actividades/route.js` |
| URL | `GET /api/actividades?page=1&limit=10` |
| Llama a | `getActividades(...)` |

Qué hace, en orden:

1. Lee `page` y `limit` de la URL.
2. Si están mal → `400 INVALID_PAGINATION`.
3. Pide los datos al service.
4. Responde `{ success: true, data, pagination }`.
5. Si algo explota → `500 INTERNAL_SERVER_ERROR`.

Respuesta de ejemplo:

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

Para Contenido crea:

```text
src/app/api/contenido/route.js
```

Eso te deja la URL `GET /api/contenido`.

### API 2 — Ver una sola

| Qué | Valor |
|---|---|
| Archivo | `src/app/api/actividades/[id]/route.js` |
| URL | `GET /api/actividades/12` |
| Llama a | `getActividadById(id)` |

Los corchetes `[id]` significan: esa parte de la URL es variable.

Qué hace, en orden:

1. Lee el `id` de la URL.
2. Si no es un número entero mayor que 0 → `400 INVALID_ACTIVITY_ID`.
3. Busca la actividad en el service.
4. Si no existe o no está publicada → `404 ACTIVITY_NOT_FOUND`.
5. Si existe → `{ success: true, data: { ... } }`.

Para Contenido crea:

```text
src/app/api/contenido/[id]/route.js
```

Eso te deja la URL `GET /api/contenido/12`.

Cambia los códigos de error a algo como `INVALID_CONTENT_ID` y `CONTENT_NOT_FOUND`.

---

## Paso 3 — El cliente que usa la página

**Archivo a mirar:** `src/lib/api/actividades.js`

Ojo: esto **no habla con Supabase**. Llama a **nuestra propia API**.

La página no debería hacer `fetch("/api/actividades")` a mano. Ese trabajo vive acá.

Hoy hace:

- Arma la URL interna (`http://localhost:3000/api/actividades?...`).
- Llama `GET /api/actividades`.
- Si `success` es falso, lanza un error.
- Traduce los nombres de la API a los nombres que usa la UI.

Traducción de nombres:

| Viene de la API | Lo usa el frontend como |
|---|---|
| `titulo` | `title` |
| `descripcion` | `description` y `fullDescription` |
| `fecha` | `date` |
| `hora_inicio` | `time` (ejemplo: `"10:00 hrs"`) |
| `ubicacion` | `location` |
| `imagen_url` | `image` |
| `cupos` | `cupos` |

Para Contenido crea:

```text
src/lib/api/contenido.js
```

Ahí van funciones tipo `fetchContenidosPublicos` y un mapper a los nombres que use tu página.

---

## Paso 4 — La página solo consume

**Archivo a mirar:** `src/app/actividades/page.jsx`

La página es un Server Component. No arma queries. Solo hace esto:

1. Llama `fetchActividadesPublicas(...)`.
2. Si sale bien, le pasa los datos a la vista.
3. Si falla, muestra la vista vacía con un mensaje de error.

`src/app/contenido/page.jsx` todavía es un placeholder. Cuando el backend de contenido exista, debería hacer lo mismo.

---

## Orden recomendado para armar Contenido

Hazlo en este orden. No empieces por la página.

1. Confirma en Supabase el nombre de la tabla y las columnas (y si hay un campo tipo `estado`).
2. Crea `src/services/contenido.service.js`.
3. Crea `src/app/api/contenido/route.js` (lista).
4. Crea `src/app/api/contenido/[id]/route.js` (detalle).
5. Prueba las URLs en el navegador o Postman. Guía: [`api-endpoints.md`](./api-endpoints.md).
6. Crea `src/lib/api/contenido.js`.
7. Recién ahí conecta `src/app/contenido/page.jsx`.

---

## Qué no copiar (no es backend)

Estos archivos sirven para la UI o para datos de prueba. No los uses como modelo del backend.

| Archivo / carpeta | Por qué no |
|---|---|
| `src/lib/actividades-mock.js` | Datos falsos para maquetar la UI. |
| `src/components/actividades/` | Cards, calendario, tabs. Es frontend. |
| `src/lib/supabase.js` | Cliente del browser. Las APIs públicas usan `server.js`. |

---

## Mini checklist

Si tu módulo nuevo está bien copiado, deberías poder responder sí a esto:

- [ ] El service es el único que habla con Supabase.
- [ ] La API solo valida params, llama al service y responde JSON.
- [ ] Hay un `GET` de lista y un `GET` de detalle.
- [ ] Los errores usan `jsonError` con código y mensaje.
- [ ] La página no llama a Supabase directo: pasa por `src/lib/api/...`.
- [ ] No creaste otro cliente de Supabase ni otro `http.js`.

---

## Resumen de archivos

### Ya existen (reutilizar)

```text
src/lib/supabase/server.js
src/lib/http.js
```

### Ejemplo actual: Actividades

```text
src/services/actividades.service.js
src/app/api/actividades/route.js
src/app/api/actividades/[id]/route.js
src/lib/api/actividades.js
src/app/actividades/page.jsx
```

### Lo que tendrías que crear para Contenido

```text
src/services/contenido.service.js
src/app/api/contenido/route.js
src/app/api/contenido/[id]/route.js
src/lib/api/contenido.js
```

Y después conectar `src/app/contenido/page.jsx`.
