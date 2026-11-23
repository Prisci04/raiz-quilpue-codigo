
# Machine Learning - Raíz Quilpué

## Objetivo

Desarrollar un modelo de Machine Learning para estimar
la asistencia a futuras actividades culturales de
Raíz Quilpué.

Modelo candidato: Regresión de Poisson (PoissonRegressor).

Tecnologías:
- Python
- pandas
- NumPy
- scikit-learn
- Matplotlib

## 1. Requisitos previos

- Python instalado.
- Visual Studio Code o Cursor.
- Acceso a una terminal PowerShell.
- Dependencias especificadas en requirements.txt.

## 2. Crear el entorno virtual

Abrir la terminal en la raíz del proyecto.

Crear el entorno virtual con Python 3.14:

    & C:/Python314/python.exe -m venv .venv-ml

Nota: si Python está instalado en otra ubicación,
se debe utilizar la ruta correspondiente.

El entorno se creará en:

    raiz-quilpue-codigo/.venv-ml/

## 3. Instalar dependencias

Desde la raíz del proyecto ejecutar:

    .\.venv-ml\Scripts\python.exe -m pip install -r ml\requirements.txt

Esto instala las librerías necesarias dentro
del entorno virtual.

## 4. Ejecutar los archivos

Para cargar el dataset:

    .\.venv-ml\Scripts\python.exe ml\cargar_datos.py

Para ejecutar el entrenamiento:

    .\.venv-ml\Scripts\python.exe ml\entrenamiento.py

El entrenamiento completo se habilitará cuando
existan suficientes registros históricos reales.

## 5. Datos

Fuente principal: Supabase (`conexion_supabase.py` + `cargar_datos.py`).

Se usan solo actividades `Finalizada` con participación
`Inscripción`. El objetivo es `total_inscripciones`
(conteo agregado de inscripciones `Confirmada`).

No se leen nombres, correos ni teléfonos.

`data/asistencias.csv` queda como legado / referencia;
el entrenamiento ya no depende de él.

Credenciales solo en `.env.local` del servidor
(`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`).
Nunca en el frontend.

### Ejecución

Entrenamiento (a mano):

    .\.venv-ml\Scripts\python.exe ml\entrenamiento.py

Servicio de estimación / actualización (FastAPI, localhost):

    .\.venv-ml\Scripts\python.exe ml\api_inferencia.py

Actualizar solo si el histórico cambió:

    .\.venv-ml\Scripts\python.exe ml\actualizar_modelo.py

En `.env.local` del proyecto Next.js:

    ML_INFERENCE_URL=http://127.0.0.1:8000
    ML_INFERENCE_SECRET=un-secreto-largo

El modelo se actualiza desde Estadísticas (botón) o al finalizar
actividades (en segundo plano, solo si cambió el histórico).
El `.joblib` vive en el host Python (no en Vercel); Next solo llama
a `ML_INFERENCE_URL`.

## 6. Metodología

El proceso contempla:

1. Carga de datos.
2. Limpieza y validación.
3. Separación de X e y.
4. División de entrenamiento y prueba.
5. Preprocesamiento.
6. Entrenamiento del modelo.
7. Generación de predicciones.
8. Evaluación mediante métricas.
9. Integración con el backend.

Cuando exista suficiente información histórica,
se utilizará inicialmente una división temporal
aproximada de 80 % entrenamiento y 20 % prueba.

## 7. GitHub

No subir el entorno virtual al repositorio.

Agregar al archivo .gitignore:

    .venv-ml/

Las dependencias se reconstruyen utilizando
requirements.txt.
