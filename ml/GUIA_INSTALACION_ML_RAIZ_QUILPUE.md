# Raíz Quilpué — Guía de instalación y ejecución del módulo ML

> **Para el equipo de desarrollo.** Instrucciones para configurar Next.js, Python, FastAPI y Supabase en **Windows / PowerShell**, con la arquitectura implementada actualmente. No requiere modificar la estructura de la base de datos.
>
> **Estado actual:** integración local implementada y comprobada parcialmente. El modelo se ha entrenado de manera **experimental** con solo tres actividades; **no está validado para orientar decisiones reales**. El despliegue de FastAPI y el reentrenamiento automático/manual aún están pendientes.

## 1. ¿Qué hace cada parte?

```text
Administrador Next.js
    │
    │ POST /api/admin/actividades/estimacion (sesión autorizada)
    ▼
API interna de Next.js
    │
    │ ML_INFERENCE_URL + ML_INFERENCE_SECRET (solo servidor)
    ▼
FastAPI (ml/api_inferencia.py)
    │
    ▼
ml/prediccion.py → modelo .joblib → inscripciones estimadas
```

- **Estadísticas** (`/admin/estadisticas`): gráficos de actividades e inscripciones obtenidos de Supabase. No requiere ejecutar el modelo para leer los datos, aunque sí necesita el proyecto Next.js y su conexión habitual a Supabase.
- **Crear actividad**: en actividades de tipo **Inscripción**, el botón **Calcular estimación** consulta FastAPI a través de una ruta protegida de Next.js. No guarda la actividad ni reentrena.
- **Entrenamiento** (`ml/entrenamiento.py`): lee el histórico desde Supabase, selecciona actividades **Finalizadas** con participación **Inscripción**, cuenta únicamente inscripciones **Confirmadas** y entrena si corresponde.
- **Modelo**: `PoissonRegressor` con seis variables: mes, día de la semana, hora de inicio, modalidad, público y costo. **No utiliza cupos máximos**.

> Importante: el objetivo es **predecir inscripciones confirmadas**, no comprobar quién asistió físicamente. Las inscripciones ficticias usadas para pruebas no permiten estimar la precisión real del modelo.

## 2. Requisitos previos

Instalar:

1. **Git**.
2. **Node.js** y **npm** compatibles con el `package.json` del proyecto (si existe un campo `engines`, respetarlo).
3. **Python** compatible con las versiones definidas en `ml/requirements.txt` (el proyecto se ha probado localmente con Python 3.14).
4. Acceso autorizado al proyecto **Supabase**.
5. El código del repositorio Raíz Quilpué, incluidos `src/` y `ml/`.

Comprobar herramientas en PowerShell:

```powershell
node --version
npm --version
py --version
git --version
```

Todos los comandos siguientes se ejecutan **desde la carpeta raíz del repositorio**, donde se encuentran `package.json`, `src/` y `ml/`.

## 3. Instalar Next.js y sus dependencias

Si el repositorio no está en el equipo, clónalo mediante el acceso Git que corresponda. Después, desde la raíz:

```powershell
npm install
```

La dependencia `recharts` ya se incorporó al proyecto según la implementación de Cursor. No es necesario instalarla aparte si está declarada en `package.json`.

## 4. Crear el entorno Python e instalar las dependencias

### Primera instalación

```powershell
py -m venv .venv-ml
.\.venv-ml\Scripts\python.exe -m pip install --upgrade pip
.\.venv-ml\Scripts\python.exe -m pip install -r ml\requirements.txt
```

Si `py` no está disponible, utilizar la ruta del ejecutable Python instalado. En el equipo en que se desarrolló el módulo se utilizó también:

```powershell
& C:/Python314/python.exe -m venv .venv-ml
```

El archivo `ml/requirements.txt` debe incluir las dependencias que realmente usa el proyecto, entre ellas `numpy`, `pandas`, `scikit-learn`, `matplotlib`, `joblib`, `supabase`, `python-dotenv`, `fastapi`, `uvicorn` y `pydantic`. **No es necesario instalarlas una por una** si ya están ahí.

### Comprobar la instalación

```powershell
.\.venv-ml\Scripts\python.exe -m pip check
.\.venv-ml\Scripts\python.exe -m pip show scikit-learn fastapi supabase
```

> **No subir `.venv-ml/` a Git.** Cada integrante crea su propio entorno virtual.

## 5. Configurar `.env.local`

En la **raíz** del repositorio, crear o completar `.env.local`. Si existe `.env.example`, usarlo como plantilla.

```dotenv
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE

# Solo backend / entrenamiento: entregar únicamente a quien lo necesite
SUPABASE_SECRET_KEY=sb_secret_TU_CLAVE_PRIVADA

# Next.js → FastAPI local
ML_INFERENCE_URL=http://127.0.0.1:8000
ML_INFERENCE_SECRET=COLOCA_UN_SECRETO_LARGO_Y_ALEATORIO

# Puerto del servicio Python local
ML_INFERENCE_PORT=8000
```

**Reglas de seguridad:**

- `NEXT_PUBLIC_...` indica variables públicas aptas para el navegador; **nunca** anteponer `NEXT_PUBLIC_` a `SUPABASE_SECRET_KEY` o `ML_INFERENCE_SECRET`.
- Las claves privadas deben permanecer exclusivamente en el servidor y se comparten con el equipo **solo por un canal seguro y según sus permisos**.
- La misma clave `ML_INFERENCE_SECRET` debe ser utilizada por Next.js y FastAPI **cuando son dos servicios independientes**. Si ambos procesos leen el `.env.local` de esta misma carpeta durante el desarrollo, bastará con configurarla una vez.
- **No subir `.env.local` a GitHub.** Verificar que esté ignorado por `.gitignore`.
- Mantener un `.env.example` **sin credenciales reales** en el repositorio.
- Si un secreto se divulga, reemplazarlo en todos los servicios donde se utilice.

**¿Todos los integrantes necesitan las mismas variables?**

| Trabajo que harán | Configuración requerida |
|---|---|
| Solo interfaz Next.js y datos públicos de Supabase | Variables públicas de Supabase y demás configuración propia del proyecto |
| Probar la tarjeta de predicción en local | `ML_INFERENCE_URL`, secreto compartido y un servicio FastAPI accesible |
| Ejecutar FastAPI localmente | Python instalado, dependencias, secreto y el archivo `.joblib` autorizado |
| Entrenar con Supabase | Python, dependencias y acceso de servidor autorizado a Supabase |
| Usar la aplicación ya desplegada | No necesitan instalar Python: el servidor desplegado proporciona la inferencia |

`127.0.0.1` **es cada computador**: si una compañera ejecuta Next.js en su PC, esa URL apunta a su propia máquina, no a la tuya.

## 6. Archivos del modelo

Los archivos de entrenamiento guardados localmente incluyen:

```text
ml/
  modelos/
    ...modelo....joblib
    ultimo_entrenamiento.json
```

- `.joblib`: modelo entrenado y su pipeline de preprocesamiento.
- `ultimo_entrenamiento.json`: huella o información de control del histórico procesado.
- **No cambiar el nombre del `.joblib` a mano**: `persistencia.py` define la ruta que utiliza el código. Verificar el nombre exacto en ese archivo.
- Si otra persona debe probar FastAPI sin entrenar, necesita que se le proporcione una **copia autorizada y compatible** del modelo experimental, sin publicarla en un repositorio abierto.
- `joblib.load()` debe ejecutarse únicamente con archivos confiables, generados por este proyecto.

## 7. Ejecutar localmente (dos terminales)

### Terminal 1 — FastAPI (Python)

Desde la raíz del proyecto:

```powershell
.\.venv-ml\Scripts\python.exe ml\api_inferencia.py
```

Esta es la forma de arranque informada por Cursor. Si el archivo no inicia el servidor por sí solo, y la instancia de FastAPI se llama `app`, usar:

```powershell
.\.venv-ml\Scripts\python.exe -m uvicorn api_inferencia:app --app-dir ml --host 127.0.0.1 --port 8000
```

Mantener la terminal abierta. Una verificación básica es abrir:

`http://127.0.0.1:8000/salud`

> No publicar el endpoint `/predecir` sin autorización; Cursor verificó que las peticiones sin el secreto recibían `401`.

### Terminal 2 — Next.js

```powershell
npm run dev
```

Abrir `http://localhost:3000` (o el puerto que indique la terminal), iniciar sesión en el panel y navegar hasta:

- **Estadísticas**: `http://localhost:3000/admin/estadisticas`.
- **Actividades → Crear actividad**: escoger participación **Inscripción**, completar fecha, hora, modalidad, público y costo, y pulsar **Calcular estimación**.

Si has cambiado `.env.local`, **reinicia ambos procesos** para que lean la configuración actualizada.

## 8. Ejecutar las pruebas de Python por separado

```powershell
# Revisar conexión con Supabase / consulta de prueba
.\.venv-ml\Scripts\python.exe ml\conexion_supabase.py

# Entrenamiento experimental (consulta Supabase, evalúa y guarda si corresponde)
.\.venv-ml\Scripts\python.exe ml\entrenamiento.py

# Predicción de ejemplo local
.\.venv-ml\Scripts\python.exe ml\prediccion.py
```

La primera implementación de `conexion_supabase.py` usaba IDs específicos de actividades (5, 6 y 7) para probar la conexión; Cursor posteriormente incorporó consultas por catálogos y filtros al proceso de datos. **No confundir una consulta de diagnóstico con el dataset completo del entrenamiento**.

### Resultado experimental registrado

- Actividades elegibles: **3**.
- Partición de evaluación: **2 entrenamiento / 1 prueba**.
- MAE: **12,51** inscripciones; error del modelo base: **2,50**.
- R²: no disponible con una sola observación de prueba.
- Predicción de ejemplo de `prediccion.py`: **30 inscripciones**.

**No presentar esa predicción como fiable:** el conjunto es minúsculo y contiene inscripciones de demostración. El entrenamiento final con tres actividades se logró ejecutar, y se comprobó la existencia del `.joblib` y el `.json`.

## 9. ¿Qué datos entran al entrenamiento?

El dataset del entrenamiento debe incluir únicamente:

1. Actividades con estado **Finalizada** (catálogo `estado`; ID observado: `3`).
2. Actividades cuyo tipo de participación sea **Inscripción** (resolver por catálogo, no asumir identificadores arbitrarios).
3. **Cantidad de inscripciones Confirmadas** (catálogo `estado_inscripcion`; ID observado: `1`).

Se excluyen las personas en **Lista de espera** (`2`) y **Cancelada** (`3`) del valor objetivo, y también las actividades de participación abierta. Los cupos de espera no se suman al total confirmado.

Si se modifica una actividad finalizada o cambia su número de confirmadas, el histórico puede cambiar. El código usa una **huella del histórico** para evitar entrenamientos repetidos con los mismos datos.

> La detección de cambios **no es una ejecución automática**: el sistema solo compara y entrena cuando alguien o algún servicio ejecuta el proceso de entrenamiento.

## 10. Comprobaciones funcionales recomendadas

| Verificación | Resultado esperado |
|---|---|
| Abrir Estadísticas como administrador | Carga datos reales de Supabase y gráficos Recharts |
| Entrar sin sesión a la ruta API de Next.js | Acceso denegado (`401` u otra respuesta de autorización correcta según implementación) |
| Crear actividad con participación abierta | No se ofrece predicción de inscripciones |
| Crear actividad con participación Inscripción | Aparece opción **Calcular estimación** al completar los datos |
| Cambiar fecha/hora/modalidad tras calcular | La estimación previa se invalida |
| Detener FastAPI e intentar estimar | El formulario sigue funcionando; aparece aviso comprensible |
| Solicitar predicción desde Python sin el secreto | Rechazo de acceso (`401`, según prueba de Cursor) |
| Ejecutar entrenamiento sin cambios en el histórico | Evita repetir entrenamiento según la huella implementada |

Las comprobaciones de navegación y autorización con **una sesión real del administrador** deben hacerse manualmente; Cursor no pudo verificar ese clic autenticado.

## 11. Problemas frecuentes

**`ModuleNotFoundError` en Python:**

```powershell
.\.venv-ml\Scripts\python.exe -m pip install -r ml\requirements.txt
```

**No encuentra `.env.local`:** confirmar que está en la raíz del proyecto y que las variables tienen los mismos nombres que espera el código.

**`Connection refused` / no responde en el puerto 8000:** abrir FastAPI en la Terminal 1; comprobar `ML_INFERENCE_URL` y que el puerto coincida con el realmente utilizado.

**`401 Unauthorized`:** comprobar autenticación administrativa en Next.js y que el secreto compartido de inferencia coincida en ambos servicios. No copiar el secreto a componentes cliente ni escribirlo en las respuestas HTTP.

**No se encuentra el `.joblib`:** comprobar la ruta definida en `ml/persistencia.py` y que el entrenamiento haya guardado una versión. No inventar ni sustituir el archivo por otro desconocido.

**Modelo sin predicción:** puede ser normal si está sin entrenar, no validado o si el servicio no está disponible. No eliminar las verificaciones de seguridad para ocultar el error.

**Cambios en `.env.local` que no surten efecto:** detener Next.js/FastAPI e iniciarlos de nuevo.

**Los gráficos muestran inscripciones pero no asistencia real:** comportamiento esperado. Los conteos se basan en los estados de inscripción de Supabase.

## 12. Pendientes para cerrar el proyecto

### Pendiente A — Confirmar integración en el navegador

- Probar Estadísticas y Crear actividad con sesión de administrador real.
- Revisar que la tarjeta **En pruebas** muestre la estimación correcta y nunca bloquee el formulario.
- Comprobar permisos y manejo de errores.

### Pendiente B — Despliegue de FastAPI

- Elegir dónde alojar Python (p. ej., Railway, Fly.io, VPS u otro host compatible).
- Configurar las variables secretas **en el servidor**, no en el navegador.
- Proporcionar el `.joblib` experimental mediante un mecanismo seguro y compatible, o generar el modelo en el entorno de ejecución.
- Configurar `ML_INFERENCE_URL` en el servidor Next.js con la URL privada o protegida del servicio desplegado.
- Probar comunicación HTTPS y autenticación entre servicios.

### Pendiente C — Automatización de entrenamiento (se dejó para después)

- Configurar una ejecución programada o cola de trabajos con infraestructura compatible con Python.
- Usar el filtro de actividades finalizadas y la huella del histórico ya implementados.
- Evitar ejecuciones simultáneas, conservar el modelo anterior ante fallos y registrar errores.
- Añadir opcionalmente un botón administrativo **Actualizar modelo** que invoque el mismo proceso de actualización, sin duplicar lógica.
- Persistir de manera fiable los archivos del modelo y el registro de la última actualización. **No confiar en el disco temporal de Vercel para esto**.

### Pendiente D — Validación real

- Reunir muchas más actividades **con datos auténticos**.
- Evaluar el modelo con suficientes observaciones posteriores y comparar con una alternativa simple.
- Mostrar las estimaciones fuera de pruebas únicamente cuando estén justificadas por los resultados.

---

**Resumen operativo diario:** abrir la raíz del proyecto → iniciar FastAPI en una terminal → iniciar `npm run dev` en otra → entrar al administrador → comprobar Estadísticas y el botón **Calcular estimación**. Para actualizar el modelo manualmente mientras no exista automatización: `.\.venv-ml\Scripts\python.exe ml\entrenamiento.py` (desde la raíz, usando la sintaxis correcta de PowerShell que aparece en la sección 8).
