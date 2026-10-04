"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Ticket } from "lucide-react";

function formatShortDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = String(dateString).split("-").map(Number);
  const date =
    year && month && day ? new Date(year, month - 1, day) : new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(time) {
  if (!time) return "";

  const match = String(time).match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : time;
}

export default function ActivityCard({ activity }) {
  const cupos = Number(activity.cupos) || 0;
  const when = [formatShortDate(activity.date), formatTime(activity.time)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/actividades/${activity.id}`}
      className="flex gap-3 border border-[#bb9c82] bg-[#f4ece4] p-3 text-[#946541] shadow-[0_8px_20px_rgba(112,74,49,0.06)] md:h-full md:flex-col md:gap-0 md:overflow-hidden md:p-0 md:hover:-translate-y-0.5"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-[#bb9c82]/50 md:h-48 md:w-full">
        {activity.image ? (
          <Image
            src={activity.image}
            alt=""
            fill
            sizes="(max-width: 768px) 96px, 33vw"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(145deg, #c4a88e 0%, #e48d40 55%, #db700f 100%)",
            }}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center md:px-4 md:pt-4 md:pb-5">
        <h2 className="font-serif text-[1.05rem] leading-snug font-semibold text-[#704a31] md:text-[1.3rem]">
          {activity.title}
        </h2>

        {when ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px]">
            <Calendar size={14} strokeWidth={1.7} aria-hidden="true" />
            <span>{when}</span>
          </p>
        ) : null}

        {activity.location ? (
          <p className="mt-1 flex items-center gap-1.5 text-[13px]">
            <MapPin size={14} strokeWidth={1.7} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{activity.location}</span>
          </p>
        ) : null}

        {cupos > 0 ? (
          <p className="mt-2 hidden items-center gap-1.5 text-[12px] text-[#946541] md:flex">
            <Ticket size={14} strokeWidth={1.7} aria-hidden="true" />
            {cupos} cupos
          </p>
        ) : null}
      </div>
    </Link>
  );
}
