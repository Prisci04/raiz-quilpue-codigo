#config del modelo

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import PoissonRegressor


# 1. VARIABLES QUE UTILIZAREMOS

# hora y cupos: magnitud continua. mes/día como categoría evita
# que un lunes (0) se interprete como "mucho menos" que un viernes (4)
# y dispare la predicción con pocos datos.
variables_numericas = [
    "hora",
    "cupos_max",
]

variables_categoricas = [
    "mes",
    "dia_semana",
    "id_modalidad",
    "id_publico",
    "id_costo",
]


# 2. PREPARACIÓN DE VARIABLES NUMÉRICAS
# Sin StandardScaler: con pocos registros el escalado dispara
# predicciones fuera de rango.

preprocesador_numerico = Pipeline([
    (
        "completar",
        SimpleImputer(
            strategy="median",
            keep_empty_features=True
        )
    ),
])


# 3. PREPARACIÓN DE VARIABLES CATEGÓRICAS

preprocesador_categorico = Pipeline([
    (
        "completar",
        SimpleImputer(
            strategy="constant",
            fill_value=-1
        )
    ),
    (
        "codificar",
        OneHotEncoder(handle_unknown="ignore")
    )
])


# 4. UNIR LOS PREPROCESADORES

preprocesador = ColumnTransformer([
    (
        "numericas",
        preprocesador_numerico,
        variables_numericas
    ),
    (
        "categoricas",
        preprocesador_categorico,
        variables_categoricas
    )
])


# 5. CREAR EL MODELO

def crear_modelo():

    modelo = Pipeline([
        ("preprocesamiento", preprocesador),
        (
            "regresion",
            PoissonRegressor(
                alpha=1.0,
                max_iter=1000
            )
        )
    ])

    return modelo


# 6. COMPROBAR LA CONFIGURACIÓN

if __name__ == "__main__":

    modelo = crear_modelo()

    print("Modelo configurado correctamente.")
    print("\nAlgoritmo: PoissonRegressor")
    print("\nPipeline:")
    print(modelo)
