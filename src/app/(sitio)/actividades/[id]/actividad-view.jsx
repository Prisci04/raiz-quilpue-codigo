"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";

function formatLongDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = String(dateString).split("-").map(Number);
  const date =
    year && month && day ? new Date(year, month - 1, day) : new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  const formatted = date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return formatted
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTime(time) {
  if (!time) return "";
  const match = String(time).match(/(\d{1,2}:\d{2})/);
  return match ? `${match[1]} horas` : time;
}

export default function ActividadView({ activity }) {
  const [confirmation, setConfirmation] = useState("");
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
  });

  const cupos = Number(activity.cupos) || 0;
  const hasCupos = cupos > 0;
  const pendingDetails = [
    { label: "Público", value: "Pendiente de completar" },
    { label: "Edad o requisito de edad", value: "Pendiente de completar" },
    {
      label: "Cupos",
      value: hasCupos ? `${cupos} cupos` : "Pendiente de confirmar",
    },
    { label: "Modalidad", value: "Pendiente de completar" },
    { label: "Valor", value: "Pendiente de completar" },
    {
      label: "Información de inscripción",
      value: "Formulario disponible a continuación",
    },
    {
      label: "¿Requiere inscripción previa?",
      value: "Pendiente de completar",
    },
    { label: "Requisitos de participación", value: "Pendiente de completar" },
    { label: "Materiales necesarios", value: "Pendiente de completar" },
    { label: "Recomendaciones", value: "Pendiente de completar" },
    {
      label: "Consideraciones de accesibilidad",
      value: "Pendiente de completar",
    },
    { label: "Indicaciones especiales", value: "Pendiente de completar" },
  ];

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleInscriptionSubmit(event) {
    event.preventDefault();

    if (!hasCupos) {
      setConfirmation("No quedan cupos disponibles para esta actividad.");
      return;
    }

    setConfirmation("¡Inscripción realizada correctamente!");
    setFormData({ nombre: "", apellido: "", email: "", telefono: "" });
  }

  const inputClass =
    "min-h-12 border border-[#bb9c82] bg-[#f4ece4] px-4 text-[#946541] outline-none";

  return (
    <main className="bg-[#e7dcd2] pb-16 text-[#946541]">
      <article className="mx-auto max-w-[1100px] px-4 pt-4 sm:px-8 sm:pt-8">
        <Link
          href="/actividades"
          className="inline-flex h-11 w-11 items-center justify-center border border-[#bb9c82] bg-[#f4ece4] text-[#704a31] lg:w-auto lg:gap-2 lg:px-4"
        >
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="text-sm max-lg:sr-only">Volver a actividades</span>
        </Link>

        <div className="mt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#bb9c82]/40 lg:sticky lg:top-24">
          {activity.image ? (
            <Image
              src={activity.image}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, #c4a88e 0%, #e48d40 48%, #db700f 100%)",
              }}
            />
          )}
        </div>

        <div>
        <p className="mt-5 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase lg:mt-0">
          Actividad
        </p>
        <h1 className="mt-2 font-serif text-[clamp(1.8rem,7vw,2.6rem)] leading-tight font-semibold text-[#704a31]">
          {activity.title}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 bg-[#704a31] px-3 py-1.5 text-xs text-[#e7dcd2]">
            <Calendar size={13} strokeWidth={1.8} aria-hidden="true" />
            Fecha: {activity.date ? formatLongDate(activity.date) : "Pendiente de completar"}
          </span>
          <span className="inline-flex items-center gap-1.5 border border-[#bb9c82] bg-[#f4ece4] px-3 py-1.5 text-xs">
            <Clock size={13} strokeWidth={1.8} aria-hidden="true" />
            Horario: {activity.time ? formatTime(activity.time) : "Pendiente de completar"}
          </span>
        </div>

        <ul className="mt-5 space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <MapPin size={16} strokeWidth={1.7} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">Lugar / punto de encuentro: </span>
              {activity.location || "Pendiente de completar"}
            </span>
          </li>
        </ul>

        <p className="mt-5 text-[15px] leading-7">
          {activity.fullDescription || activity.description || "Descripción pendiente de completar."}
        </p>

        <section className="mt-7 border-t border-[#bb9c82] pt-6">
          <h2 className="font-serif text-xl font-semibold text-[#704a31]">
            Información para participar
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pendingDetails.map(({ label, value }) => (
              <div
                key={label}
                className="border border-[#bb9c82] bg-[#f4ece4] px-4 py-3"
              >
                <dt className="text-xs font-semibold text-[#704a31]">{label}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-[#946541]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <form
          onSubmit={handleInscriptionSubmit}
          className="mt-8 space-y-4 border border-[#bb9c82] bg-[#f4ece4] p-5"
        >
          <h2 className="font-serif text-2xl font-semibold text-[#704a31]">
            Inscripción
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              Nombre
              <input
                name="nombre"
                value={formData.nombre}
                onChange={handleFormChange}
                required
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Apellido
              <input
                name="apellido"
                value={formData.apellido}
                onChange={handleFormChange}
                required
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              Correo electrónico
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                required
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              Teléfono
              <input
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleFormChange}
                required
                className={inputClass}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!hasCupos}
            className="inline-flex min-h-12 w-full items-center justify-center bg-[#db700f] px-6 text-[12px] font-semibold tracking-[0.14em] text-[#e7dcd2] uppercase disabled:opacity-50"
          >
            Confirmar inscripción
          </button>
          {confirmation ? (
            <p className="text-sm font-semibold text-[#db700f]">{confirmation}</p>
          ) : null}
        </form>
        </div>
        </div>
      </article>
    </main>
  );
}
