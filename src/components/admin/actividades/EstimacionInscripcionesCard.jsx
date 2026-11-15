"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Sparkles } from "lucide-react";

import {
  cuposEsperaDesdeFormulario,
  cuposMaxDesdeFormulario,
  estimacionListaParaCalcular,
} from "@/lib/ml/estimacion.mjs";
import { calcularEstimacionInscripciones } from "@/lib/api/estimacion";

function huellaFormulario(form) {
  return [
    form.fecha ?? "",
    form.hora_inicio ?? "",
    form.cupos ?? "",
    form.cupos_espera ?? "",
    form.id_modalidad ?? "",
    form.id_publico ?? "",
    form.id_costo ?? "",
  ].join("|");
}

/**
 * Tarjeta de estimación de inscripciones confirmadas.
 * Solo visible con participación Inscripción. No guarda la actividad.
 * Usa Cupos y Cupos de espera del formulario (sin duplicar campos).
 */
export default function EstimacionInscripcionesCard({ form, visible }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [huellaCalculada, setHuellaCalculada] = useState("");

  const huellaActual = useMemo(() => huellaFormulario(form ?? {}), [form]);
  const listo = estimacionListaParaCalcular(form);
  const desactualizada = Boolean(resultado) && huellaCalculada !== huellaActual;

  useEffect(() => {
    if (!visible) {
      setResultado(null);
      setError("");
      setHuellaCalculada("");
    }
  }, [visible]);

  if (!visible) return null;

  async function calcular() {
    if (!listo || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await calcularEstimacionInscripciones({
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        cupos_max: cuposMaxDesdeFormulario(form),
        cupos_espera: cuposEsperaDesdeFormulario(form),
        id_modalidad: Number(form.id_modalidad),
        id_publico: Number(form.id_publico),
        id_costo: Number(form.id_costo),
      });
      setResultado(data);
      setHuellaCalculada(huellaActual);
    } catch (calcError) {
      setResultado(null);
      setHuellaCalculada("");
      setError(calcError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="admin-card border border-[#eadfd4] bg-[#fbf8f5] p-4 sm:p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-base font-medium text-[#2c1810]">
              Estimación de inscripciones
            </h3>
            <span className="rounded-md bg-[#efe6dc] px-2 py-0.5 text-[11px] font-medium text-[#7c5c47]">
              En pruebas
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#7c6a5c]">
            Te da una idea aproximada de cuántas personas podrían confirmar
            inscripción, según la fecha, hora, modalidad, público, costo y los
            cupos que configuraste (oficiales + espera). No supera ese límite.
            No reemplaza tu criterio ni se guarda con la actividad.
          </p>
        </div>
        <Sparkles className="hidden h-5 w-5 shrink-0 text-[#c4a04a] sm:block" aria-hidden="true" />
      </div>

      {!listo ? (
        <p className="mt-4 text-sm text-[#8d7b6d]">
          Completa fecha, hora de inicio, modalidad, público y costo para
          calcular la estimación. Los cupos del formulario se usan si los indicas.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={busy}
            onClick={calcular}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm bg-[#1e4536] px-4 text-sm font-medium text-white hover:bg-[#16352a] disabled:opacity-50 sm:w-auto"
          >
            <Calculator size={16} aria-hidden="true" />
            {busy ? "Calculando…" : "Calcular estimación"}
          </button>
          {desactualizada ? (
            <p className="text-xs text-[#9a6708]">
              Cambiaste algún dato: vuelve a calcular para actualizar el resultado.
            </p>
          ) : null}
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-[#8d3b28]">
          {error}
        </p>
      ) : null}

      {resultado && !desactualizada ? (
        <div className="mt-4 rounded-lg border border-[#dceee0] bg-white px-4 py-3">
          <p className="text-[12px] text-[#7c5c47]">Estimación aproximada</p>
          <p className="mt-1 text-2xl font-medium tracking-tight text-[#1e4536] tabular-nums">
            {resultado.estimado}{" "}
            <span className="text-base font-normal text-[#5c4636]">
              inscripciones confirmadas
            </span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#8d7b6d]">
            Es una orientación en pruebas. No supera los cupos oficiales más los
            de espera que indicaste.
          </p>
        </div>
      ) : null}
    </aside>
  );
}
