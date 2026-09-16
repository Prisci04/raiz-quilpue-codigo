"use client";

import Image from "next/image";
import ImagePlaceholder from "./ImagePlaceholder";

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

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-6.2 7-11.2A7 7 0 1 0 5 9.8C5 14.8 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.8" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export default function ActivityCard({ activity, onView }) {
  const cupos = Number(activity.cupos) || 0;
  const inscritos = Number(activity.inscritos) || 0;
  const available = Math.max(cupos - inscritos, 0);
  const occupancy = cupos ? Math.min(100, Math.round((inscritos / cupos) * 100)) : 0;

  return (
    <article className="flex h-full flex-col overflow-hidden bg-[#f4eee4] text-[#3d2f24] shadow-[0_10px_24px_rgba(44,26,14,0.06)]">
      <div className="relative h-[220px] w-full overflow-hidden">
        {activity.image ? (
          <Image
            src={activity.image}
            alt={activity.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <ImagePlaceholder height={220} />
        )}

        {activity.category ? (
          <span className="absolute top-3 left-3 bg-[#c9a227] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
            {activity.category}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-5 pb-5">
        <h2 className="font-serif text-[1.45rem] leading-snug font-semibold text-[#2c1a0e]">
          {activity.title}
        </h2>

        <ul className="mt-4 space-y-2 text-[13.5px] text-[#5d493e]">
          {activity.date ? (
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[#8a6f5c]">
                <CalendarIcon />
              </span>
              <span>{formatLongDate(activity.date)}</span>
            </li>
          ) : null}

          {activity.time ? (
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[#8a6f5c]">
                <ClockIcon />
              </span>
              <span>{formatTime(activity.time)}</span>
            </li>
          ) : null}

          {activity.location ? (
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[#8a6f5c]">
                <PinIcon />
              </span>
              <span>{activity.location}</span>
            </li>
          ) : null}
        </ul>

        <div className="mt-auto pt-5">
          <div className="mb-2 flex items-end justify-between gap-3 text-[12px]">
            <span className="text-[#6b5344]">
              Cupos:
              <span className="ml-1.5 tracking-wide">
                {inscritos} / {cupos}
              </span>
            </span>
            <span className="text-[#c9a227]">{available} disponibles</span>
          </div>

          <div className="mb-4 h-[5px] overflow-hidden rounded-full bg-[#e7dcc8]">
            <div
              className="h-full rounded-full bg-[#c9a227]"
              style={{ width: `${occupancy}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => onView?.(activity.id)}
            className="w-full bg-[#5c4033] py-3 text-[12px] font-medium tracking-[0.16em] text-white uppercase transition-colors hover:bg-[#4a3228]"
          >
            Ver actividad
          </button>
        </div>
      </div>
    </article>
  );
}
