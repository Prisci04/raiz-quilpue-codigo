"use client";

import Image from "next/image";
import Link from "next/link";
import ImagePlaceholder from "./ImagePlaceholder";
import { Calendar, Clock, MapPin } from "lucide-react";

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

export default function ActivityCard({ activity }) {
  const cupos = Number(activity.cupos) || 0;
  const inscritos = Number(activity.inscritos) || 0;
  const available = Math.max(cupos - inscritos, 0);
  const occupancy = cupos ? Math.min(100, Math.round((inscritos / cupos) * 100)) : 0;

  return (
    <article className="flex h-full flex-col overflow-hidden border border-[#bb9c82] bg-[#e7dcd2] text-[#946541] shadow-[0_10px_24px_rgba(112,74,49,0.08)]">
      <div className="relative h-[190px] w-full overflow-hidden">
        {activity.image ? (
          <Image
            src={activity.image}
            alt={activity.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <ImagePlaceholder height={190} />
        )}

        {activity.category ? (
          <span className="absolute top-3 left-3 bg-[#704a31] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-[#e7dcd2] uppercase">
            {activity.category}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
        <h2 className="font-serif text-[1.3rem] leading-snug font-semibold text-[#704a31]">
          {activity.title}
        </h2>

        <ul className="mt-3 space-y-1.5 text-[13px] text-[#946541]">
          {activity.date ? (
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[#946541]">
                <Calendar size={15} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span>{formatLongDate(activity.date)}</span>
            </li>
          ) : null}

          {activity.time ? (
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[#946541]">
                <Clock size={15} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span>{formatTime(activity.time)}</span>
            </li>
          ) : null}

          {activity.location ? (
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[#946541]">
                <MapPin size={15} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span>{activity.location}</span>
            </li>
          ) : null}
        </ul>

        <div className="mt-auto pt-4">
          <div className="mb-2 flex items-end justify-between gap-3 text-[12px]">
            <span className="text-[#946541]">
              Cupos:
              <span className="ml-1.5 tracking-wide">
                {inscritos} / {cupos}
              </span>
            </span>
            <span className="text-[#ffdf90]">{available} disponibles</span>
          </div>

          <div className="mb-4 h-[5px] overflow-hidden rounded-full bg-[#bb9c82]/40">
            <div
              className="h-full rounded-full bg-[#ffdf90]"
              style={{ width: `${occupancy}%` }}
            />
          </div>

          <Link
            href={`/actividades/${activity.id}`}
            className="flex min-h-11 w-full items-center justify-center bg-[#704a31] py-2.5 text-center text-[11px] font-medium tracking-[0.16em] text-[#e7dcd2] uppercase transition-colors hover:bg-[#db700f]"
          >
            Ver actividad
          </Link>
        </div>
      </div>
    </article>
  );
}
