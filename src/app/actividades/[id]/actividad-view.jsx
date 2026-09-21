"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket } from "lucide-react";

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
  const heroImage = activity.image || "/images/contenido/iglesia desde plaza.jpg";

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

  return (
    <main className="bg-[#e7dcd2] text-[#946541]">
      <div className="relative h-56 w-full overflow-hidden sm:h-80 lg:h-[28rem]">
        <Image
          src={heroImage}
          alt={activity.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          unoptimized
        />
      </div>

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/actividades"
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-[#704a31]"
        >
          <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          Volver a actividades
        </Link>

        <p className="text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
          Actividad
        </p>
        <h1 className="mt-3 font-serif text-[clamp(1.85rem,6vw,3.2rem)] leading-tight font-semibold text-[#704a31]">
          {activity.title}
        </h1>

        <ul className="mt-6 space-y-3 text-sm sm:text-base">
          {activity.date ? (
            <li className="flex items-start gap-3">
              <Calendar size={18} strokeWidth={1.7} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{formatLongDate(activity.date)}</span>
            </li>
          ) : null}
          {activity.time ? (
            <li className="flex items-start gap-3">
              <Clock size={18} strokeWidth={1.7} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{formatTime(activity.time)}</span>
            </li>
          ) : null}
          {activity.location ? (
            <li className="flex items-start gap-3">
              <MapPin size={18} strokeWidth={1.7} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{activity.location}</span>
            </li>
          ) : null}
          <li className="flex items-start gap-3">
            <Ticket size={18} strokeWidth={1.7} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{cupos} cupos</span>
          </li>
        </ul>

        {activity.fullDescription || activity.description ? (
          <p className="mt-8 text-base leading-relaxed text-[#946541] sm:text-[1.05rem] sm:leading-8">
            {activity.fullDescription || activity.description}
          </p>
        ) : null}

        <div className="mt-10 border-t border-[#bb9c82] pt-8">
          <form onSubmit={handleInscriptionSubmit} className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[#704a31]">
              Inscripción
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                Nombre
                <input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleFormChange}
                  required
                  className="min-h-12 border border-[#bb9c82] bg-[#e7dcd2] px-3 text-[#946541]"
                />
              </label>
              <label className="grid gap-2 text-sm">
                Apellido
                <input
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleFormChange}
                  required
                  className="min-h-12 border border-[#bb9c82] bg-[#e7dcd2] px-3 text-[#946541]"
                />
              </label>
              <label className="grid gap-2 text-sm sm:col-span-2">
                Correo electrónico
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  className="min-h-12 border border-[#bb9c82] bg-[#e7dcd2] px-3 text-[#946541]"
                />
              </label>
              <label className="grid gap-2 text-sm sm:col-span-2">
                Teléfono
                <input
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleFormChange}
                  required
                  className="min-h-12 border border-[#bb9c82] bg-[#e7dcd2] px-3 text-[#946541]"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!hasCupos}
              className="inline-flex min-h-12 w-full items-center justify-center bg-[#db700f] px-6 text-[11px] font-medium tracking-[0.16em] text-[#e7dcd2] uppercase disabled:opacity-50 sm:w-auto"
            >
              Confirmar inscripción
            </button>
          </form>

          {confirmation ? (
            <p className="mt-4 text-sm font-semibold text-[#db700f]">
              {confirmation}
            </p>
          ) : null}
        </div>
      </article>
    </main>
  );
}
