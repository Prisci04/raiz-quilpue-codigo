"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";

const MODALIDAD = {
  presencial: "Presencial",
  virtual: "Virtual",
  hibrida: "Híbrida",
};

function formatLongDate(dateString) {
  if (!dateString) return "Fecha pendiente";

  const [year, month, day] = String(dateString).split("-").map(Number);
  const date =
    year && month && day ? new Date(year, month - 1, day) : new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Fecha pendiente";

  const formatted = date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatClock(time) {
  if (!time) return "";
  const match = String(time).match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : String(time);
}

function formatHorario(inicio, fin) {
  const start = formatClock(inicio);
  const end = formatClock(fin);
  if (start && end) return `${start} a ${end} horas`;
  if (start || end) return `${start || end} horas`;
  return "Horario pendiente";
}

function cuposText(activity) {
  if (activity.pasada) return "Actividad finalizada";
  if (activity.tipo_participacion === "inscripcion") {
    if (!Number.isInteger(activity.cupos)) return "Inscripción abierta";
    const remaining = Number.isInteger(activity.cupos_disponibles)
      ? activity.cupos_disponibles
      : activity.cupos;
    return remaining > 0 ? `${remaining} cupos disponibles` : "Sin cupos";
  }
  const cupos = Number.isInteger(activity.cupos) ? activity.cupos : null;
  return cupos === null ? "Cupos por confirmar" : `Cupos: ${cupos}`;
}

export default function ActivityCard({ activity }) {
  const modalidad = MODALIDAD[activity.modalidad] ?? null;

  return (
    <Link
      href={`/actividades/${activity.id}`}
      className="flex h-full flex-col bg-[#f4ece4] text-[#5c331c]"
    >
      <div className="relative h-40 w-full overflow-hidden bg-[#bb9c82]/40 sm:h-44">
        {activity.imagen_url ? (
          <Image
            src={activity.imagen_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center font-mono text-[10px] tracking-wide text-[#946541] uppercase">
            Imagen próximamente
          </div>
        )}
        {activity.pasada ? (
          <span className="absolute top-3 left-3 bg-[#704a31] px-2 py-1 text-[11px] font-bold tracking-wide text-[#f4ece4] uppercase">
            Finalizada
          </span>
        ) : modalidad ? (
          <span className="absolute top-3 left-3 bg-[#e6b325] px-2 py-1 text-[11px] font-bold tracking-wide text-[#3d2914] uppercase">
            {modalidad}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
        <h2 className="font-sans text-[1.2rem] leading-snug font-semibold text-[#5c331c] sm:text-[1.35rem]">
          {activity.titulo}
        </h2>

        <ul className="mt-3 space-y-1.5 text-[13px] text-[#5c4638]">
          <li className="flex items-start gap-2">
            <Calendar size={15} strokeWidth={1.7} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{formatLongDate(activity.fecha)}</span>
          </li>
          <li className="flex items-start gap-2">
            <Clock size={15} strokeWidth={1.7} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{formatHorario(activity.hora_inicio, activity.hora_fin)}</span>
          </li>
          <li className="flex items-start gap-2">
            <MapPin size={15} strokeWidth={1.7} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{activity.lugar || "Lugar pendiente"}</span>
          </li>
        </ul>

        <div className="mt-auto pt-3">
          <p className="text-[13px] text-[#5c331c]">
            {cuposText(activity)}
          </p>

          <span className="mt-3 inline-flex min-h-9 w-full items-center justify-center bg-[#704a31] px-3 text-[10px] font-medium tracking-wide text-[#f4ece4] uppercase">
            Ver actividad
          </span>
        </div>
      </div>
    </Link>
  );
}
