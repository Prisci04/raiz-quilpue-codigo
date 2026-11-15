# Evalúa predicciones de inscripciones confirmadas.

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)


def evaluar_modelo(
    y_real,
    y_predicho,
    y_entrenamiento,
    mostrar_grafico=False,
):
    reales = np.asarray(y_real, dtype=float)
    predichos = np.asarray(y_predicho, dtype=float)
    entrenamiento = np.asarray(y_entrenamiento, dtype=float)

    if (
        len(reales) == 0
        or len(entrenamiento) == 0
        or len(reales) != len(predichos)
    ):
        raise ValueError(
            "Los datos de evaluación no son válidos."
        )

    mae = mean_absolute_error(reales, predichos)
    rmse = np.sqrt(mean_squared_error(reales, predichos))

    # R² requiere al menos dos observaciones con varianza.
    if len(reales) >= 2 and np.var(reales) > 0:
        r2 = float(r2_score(reales, predichos))
    else:
        r2 = None

    promedio = float(entrenamiento.mean())
    predicciones_base = np.full(len(reales), promedio)
    mae_base = mean_absolute_error(reales, predicciones_base)

    comparacion = pd.DataFrame({
        "Inscripciones reales": reales,
        "Inscripciones predichas": predichos,
        "Error absoluto": np.abs(reales - predichos),
    })

    print("\n--- MÉTRICAS DEL MODELO ---")
    print(f"MAE: {mae:.2f} inscripciones")
    print(f"RMSE: {rmse:.2f} inscripciones")
    print(f"MAE del modelo base: {mae_base:.2f}")
    if r2 is not None:
        print(f"R²: {r2:.3f}")
    else:
        print("R²: No disponible")

    print("\n--- REAL VS. PREDICHO ---")
    print(comparacion.to_string(index=False))

    if mae < mae_base:
        print(
            "\nEl modelo superó al promedio histórico "
            "en este conjunto de prueba."
        )
    else:
        print(
            "\nEl modelo no superó "
            "al promedio histórico."
        )

    if mostrar_grafico:
        plt.figure(figsize=(8, 5))
        plt.scatter(reales, predichos, label="Predicciones")
        minimo = min(reales.min(), predichos.min())
        maximo = max(reales.max(), predichos.max())
        plt.plot(
            [minimo, maximo],
            [minimo, maximo],
            linestyle="--",
            label="Predicción perfecta",
        )
        plt.title(
            "Inscripciones confirmadas: real vs. predicho"
        )
        plt.xlabel("Inscripciones reales (Confirmada)")
        plt.ylabel("Inscripciones predichas")
        plt.legend()
        plt.grid(True)
        plt.tight_layout()
        plt.show()

    return {
        "mae": mae,
        "rmse": rmse,
        "mae_base": mae_base,
        "comparacion": comparacion,
        "r2": r2,
    }


if __name__ == "__main__":
    print(
        "PRUEBA CON DATOS SIMULADOS "
        "(NO SON DE RAÍZ QUILPUÉ)"
    )
    evaluar_modelo(
        y_real=[10, 20, 15, 30],
        y_predicho=[11.2, 18.5, 17, 26],
        y_entrenamiento=[12, 18, 21, 14, 19],
        mostrar_grafico=False,
    )
