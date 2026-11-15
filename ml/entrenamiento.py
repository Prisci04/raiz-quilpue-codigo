# ==========================================
# RAÍZ QUILPUÉ - MACHINE LEARNING
# Entrenamiento desde histórico Supabase
# ==========================================

import hashlib
import json

import numpy as np
import pandas as pd

from cargar_datos import (
    VARIABLE_OBJETIVO,
    VARIABLES_PREDICTORAS,
    VERSION_ESQUEMA_PREDICTORES,
    COLUMNAS_HUELLA,
    agregar_features_temporales,
    cargar_datos,
    preparar_matriz_X,
)
from evaluacion import evaluar_modelo
from modelo import crear_modelo
from persistencia import (
    guardar_estado_entrenamiento,
    guardar_modelo,
    cargar_huella_ultimo_entrenamiento,
)


MIN_ACTIVIDADES = 3


# 1. HUELLA DEL HISTÓRICO

def calcular_huella_dataset(df):
    if df is None or df.empty:
        return hashlib.sha256(b"empty").hexdigest()

    cols = [c for c in COLUMNAS_HUELLA if c in df.columns]
    ordenado = (
        df[cols]
        .copy()
        .sort_values(["id_actividad"] if "id_actividad" in cols else cols)
        .reset_index(drop=True)
    )
    registros = ordenado.astype(object).where(pd.notnull(ordenado), None)
    payload = json.dumps(
        {
            "esquema": VERSION_ESQUEMA_PREDICTORES,
            "predictoras": list(VARIABLES_PREDICTORAS),
            "registros": registros.to_dict(orient="records"),
        },
        ensure_ascii=False,
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def historial_ha_cambiado(df):
    huella_actual = calcular_huella_dataset(df)
    huella_previa = cargar_huella_ultimo_entrenamiento()
    if huella_previa is None:
        return True, huella_actual
    return huella_actual != huella_previa, huella_actual


# 2. PREPARACIÓN

def preparar_xy(df):
    df_feat = agregar_features_temporales(df)
    X = preparar_matriz_X(df_feat)
    y = df_feat[VARIABLE_OBJETIVO].astype(int)
    return df_feat, X, y


def division_cronologica(X, y, df, ratio_train=0.80):
    corte = int(len(df) * ratio_train)
    if corte < 1:
        corte = 1
    if corte >= len(df):
        corte = len(df) - 1
    if corte < 1 or corte >= len(df):
        raise ValueError(
            "No hay suficientes filas para dividir "
            "entrenamiento y prueba."
        )
    return (
        X.iloc[:corte].copy(),
        X.iloc[corte:].copy(),
        y.iloc[:corte].copy(),
        y.iloc[corte:].copy(),
        corte,
    )


# 3. ENTRENAMIENTO

def entrenar(df=None, mostrar_grafico=False):
    """
    Siempre entrena y muestra resultados cuando hay
    al menos MIN_ACTIVIDADES. Guarda el modelo al final.
    """
    if df is None:
        df = cargar_datos()

    print(f"\nActividades válidas: {len(df)}")

    if df.empty:
        print("\nNo hay datos para entrenar.")
        return {"ok": False, "razon": "sin_datos"}

    cambio, huella = historial_ha_cambiado(df)
    if cambio:
        print("\nEl histórico cambió respecto al último entrenamiento.")
    else:
        print(
            "\nEl histórico es el mismo que en el último entrenamiento; "
            "igual se vuelve a entrenar (modo manual / CLI)."
        )

    if len(df) < MIN_ACTIVIDADES:
        print(
            f"\nDatos insuficientes: {len(df)} de "
            f"{MIN_ACTIVIDADES} actividades requeridas."
        )
        return {
            "ok": False,
            "razon": "datos_insuficientes",
            "n": len(df),
            "minimo": MIN_ACTIVIDADES,
            "huella": huella,
        }

    df_feat, X, y = preparar_xy(df)

    print("\nVariables predictoras:", VARIABLES_PREDICTORAS)
    print("Variable objetivo:", VARIABLE_OBJETIVO)
    print("\nVariables X:")
    print(X.head())
    print("\nVariable objetivo y:")
    print(y.head())

    resultados = None
    metricas_ilustrativas = False

    if len(df_feat) >= 2:
        X_train, X_test, y_train, y_test, corte = division_cronologica(
            X, y, df_feat
        )

        print("\n--- DIVISIÓN DE DATOS ---")
        print(f"Entrenamiento: {len(X_train)}")
        print(f"Prueba: {len(X_test)}")

        if len(X_test) == 1:
            metricas_ilustrativas = True
            print(
                "\nCon una sola actividad de prueba las métricas "
                "son orientativas y R² no se puede calcular bien."
            )

        modelo_eval = crear_modelo()
        modelo_eval.fit(X_train, y_train)
        predicciones = modelo_eval.predict(X_test)

        resultados = evaluar_modelo(
            y_real=y_test,
            y_predicho=predicciones,
            y_entrenamiento=y_train,
            mostrar_grafico=mostrar_grafico,
        )

        comparacion = pd.DataFrame({
            "Actividad": df_feat["titulo"].iloc[corte:].values,
            "Real": y_test.values,
            "Predicho": np.round(predicciones, 2),
        })
        print("\n--- COMPARACIÓN ---")
        print(comparacion.to_string(index=False))

        if resultados["mae"] < resultados["mae_base"]:
            print("\nEl modelo obtuvo menor error que el promedio histórico.")
        else:
            print("\nEl modelo no superó al promedio histórico en esta prueba.")

    print(
        f"\nEntrenando el modelo final con las "
        f"{len(df_feat)} actividades..."
    )
    modelo = crear_modelo()
    modelo.fit(X, y)
    print("Modelo entrenado correctamente.")

    ruta = guardar_modelo(modelo)
    metricas_guardadas = None
    if resultados is not None:
        metricas_guardadas = {
            "mae": resultados["mae"],
            "rmse": resultados["rmse"],
            "mae_base": resultados["mae_base"],
            "r2": resultados["r2"],
            "ilustrativas": metricas_ilustrativas,
        }

    guardar_estado_entrenamiento(
        huella=huella,
        n_filas=len(df),
        metricas=metricas_guardadas,
        metricas_ilustrativas=metricas_ilustrativas,
        esquema=VERSION_ESQUEMA_PREDICTORES,
        predictoras=list(VARIABLES_PREDICTORAS),
        y_min=int(y.min()),
        y_max=int(y.max()),
        y_media=float(y.mean()),
    )

    print(f"\nModelo guardado en: {ruta}")
    return {
        "ok": True,
        "guardado": True,
        "ruta": str(ruta),
        "resultados": resultados,
        "metricas_ilustrativas": metricas_ilustrativas,
        "huella": huella,
    }


if __name__ == "__main__":
    entrenar(mostrar_grafico=False)
