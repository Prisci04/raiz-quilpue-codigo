"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  actualizarEstimaciones,
  getEstadoEstimaciones,
} from "@/lib/api/ml-modelo";

function formatearFecha(iso) {
  if (!iso) return "Aún no hay una actualización registrada";
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Santiago",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Sección admin: actualización manual del modelo experimental.
 * Sin métricas técnicas (MAE, RMSE, etc.).
 */
export default function EstimacionesInscripcionesSection() {
  const [busy, setBusy] = useState(false);
  const [loadingEstado, setLoadingEstado] = useState(true);
  const [fecha, setFecha] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [tono, setTono] = useState("info");

  const cargarEstado = useCallback(async () => {
    setLoadingEstado(true);
    try {
      const data = await getEstadoEstimaciones();
      setFecha(data?.fecha_actualizacion ?? null);
    } catch (error) {
      setMensaje(error.message);
      setTono("error");
    } finally {
      setLoadingEstado(false);
    }
  }, []);

  useEffect(() => {
    void cargarEstado();
  }, [cargarEstado]);

  async function onActualizar() {
    if (busy) return;
    setBusy(true);
    setMensaje("");
    try {
      const data = await actualizarEstimaciones();
      setFecha(data?.fecha_actualizacion ?? fecha);
      setMensaje(data?.mensaje || "Listo.");
      setTono(data?.actualizado ? "ok" : "info");
      if (data?.fecha_actualizacion) {
        setFecha(data.fecha_actualizacion);
      }
    } catch (error) {
      setMensaje(error.message);
      setTono("error");
    } finally {
      setBusy(false);
    }
  }

  const mensajeClass =
    tono === "error"
      ? "text-[#8d3b28]"
      : tono === "ok"
        ? "text-[#1e4536]"
        : "text-[#7c6a5c]";

  return (
    <section className="admin-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium tracking-tight text-[#2c1810]">
            Estimaciones de inscripciones
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#7c6a5c]">
            Orientación en pruebas para el formulario de actividades. Se actualiza
            sola cuando hay actividades nuevas finalizadas; también puedes
            forzar una revisión aquí.
          </p>
        </div>
        <span className="rounded-md bg-[#efe6dc] px-2 py-0.5 text-[11px] font-medium text-[#7c5c47]">
          En pruebas
        </span>
      </div>

      <p className="text-sm text-[#5c4636]">
        <span className="text-[#8a7968]">Última actualización: </span>
        {loadingEstado ? "Cargando…" : formatearFecha(fecha)}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={busy}
          onClick={onActualizar}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm bg-[#1e4536] px-4 text-sm font-medium text-white hover:bg-[#16352a] disabled:opacity-50 sm:w-auto"
        >
          <RefreshCw
            size={16}
            className={busy ? "animate-spin" : undefined}
            aria-hidden="true"
          />
          {busy ? "Actualizando…" : "Actualizar predicciones"}
        </button>
      </div>

      {mensaje ? (
        <p role="status" className={`text-sm ${mensajeClass}`}>
          {mensaje}
        </p>
      ) : null}
    </section>
  );
}
