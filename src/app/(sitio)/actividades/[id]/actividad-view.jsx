"use client";

import { useState } from "react";
import ActividadFicha from "@/components/actividades/ActividadFicha";
import {
  esParticipacionInscripcion,
  inscripcionAceptaNuevos,
  inscripcionEnEspera,
} from "@/lib/actividades";

export default function ActividadView({ activity }) {
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
  });

  const finalizada = Boolean(activity.pasada);
  const requiereInscripcion = esParticipacionInscripcion(activity.tipo_participacion) && !finalizada;
  const hasCupos = inscripcionAceptaNuevos(activity);
  const enEspera = inscripcionEnEspera(activity);
  const inputClass =
    "min-h-12 border border-[#bb9c82] bg-[#e7dcd2] px-4 text-[#704a31] outline-none";

  function handleFormChange(event) {
    const { name, value } = event.target;
    if (name === "telefono") {
      let digits = value.replace(/\D/g, "");
      if (digits.startsWith("56") && digits.length >= 11) digits = digits.slice(2);
      digits = digits.slice(0, 9);
      const formatted = digits.length <= 1
        ? digits
        : digits.length <= 5
          ? `${digits.slice(0, 1)} ${digits.slice(1)}`
          : `${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5)}`;
      setFormData((current) => ({ ...current, telefono: formatted }));
      return;
    }
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleInscriptionSubmit(event) {
    event.preventDefault();
    setConfirmation("");
    setFormError("");

    if (!hasCupos) {
      setFormError("No quedan cupos ni lugares en lista de espera para esta actividad.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/actividades/${activity.id}/inscripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(formData),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.error?.message || "No fue posible registrar la inscripción.");
      }
      setConfirmation(
        body?.data?.lista_espera
          ? "Quedaste en lista de espera. Te contactaremos si se libera un cupo."
          : "¡Inscripción realizada correctamente!",
      );
      setFormData({ nombre: "", apellido: "", email: "", telefono: "" });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-[#e7dcd2] text-[#704a31]">
      <ActividadFicha
        activity={activity}
        backHref="/actividades"
        backLabel="Volver a actividades"
      >
        {esParticipacionInscripcion(activity.tipo_participacion) && finalizada ? (
          <p className="mt-10 border border-[#bb9c82] bg-[#f4ece4] px-5 py-4 text-sm text-[#704a31]">
            Las inscripciones de esta actividad ya cerraron.
          </p>
        ) : requiereInscripcion ? (
          <form
            onSubmit={handleInscriptionSubmit}
            className="mt-10 border border-[#bb9c82] bg-[#f4ece4] p-5 sm:p-6"
          >
            <h2 className="font-sans text-xl font-medium text-[#5c331c]">Inscripción</h2>
            {enEspera ? (
              <p className="mt-2 text-sm leading-relaxed text-[#704a31]">
                Los cupos están completos. Tu inscripción quedará en lista de espera
                {Number.isInteger(activity.cupos_espera) && activity.cupos_espera > 0
                  ? ` (hasta ${activity.cupos_espera} ${activity.cupos_espera === 1 ? "persona" : "personas"})`
                  : ""}.
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                Nombre
                <input name="nombre" value={formData.nombre} onChange={handleFormChange} required className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm">
                Apellido
                <input name="apellido" value={formData.apellido} onChange={handleFormChange} required className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                Correo electrónico
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                  title="Usa un correo con @ y un dominio como .cl o .com"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                Teléfono
                <span className="flex min-h-12 border border-[#bb9c82] bg-[#e7dcd2]">
                  <span className="flex items-center px-3 text-sm font-medium text-[#704a31]" aria-hidden="true">+56</span>
                  <input
                    name="telefono"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="9 1234 5678"
                    value={formData.telefono}
                    onChange={handleFormChange}
                    required
                    minLength={11}
                    maxLength={11}
                    pattern="9 \d{4} \d{4}"
                    title="Celular de 9 dígitos, por ejemplo 9 1234 5678"
                    className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-[#704a31] outline-none"
                  />
                </span>
              </label>
            </div>
            <button
              type="submit"
              disabled={!hasCupos || submitting}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center bg-[#704a31] px-6 text-[12px] font-semibold tracking-[0.12em] text-[#f4ece4] uppercase disabled:opacity-50 sm:w-auto"
            >
              {submitting ? "Enviando…" : "Inscribirme"}
            </button>
            {formError ? (
              <p role="alert" className="mt-3 text-sm font-semibold text-[#a5452d]">{formError}</p>
            ) : null}
            {confirmation ? (
              <p className="mt-3 text-sm font-semibold text-[#db700f]">{confirmation}</p>
            ) : null}
          </form>
        ) : null}
      </ActividadFicha>
    </main>
  );
}
