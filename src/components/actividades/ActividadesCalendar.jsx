"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import ImagePlaceholder from "./ImagePlaceholder";
import { labelLugarActividad } from "@/lib/actividades";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function parseActivityDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPanelDate(date) {
  const formatted = date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
  });
  return `Actividades del ${formatted}`;
}

function formatMonthTitle(date) {
  const month = date.toLocaleDateString("es-CL", { month: "long" });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

function formatShortTime(time) {
  if (!time) return "";
  const match = String(time).match(/(\d{1,2}:\d{2})/);
  return match ? `${match[1]}h` : time;
}

function isSameDay(date, other) {
  return toDateKey(date) === toDateKey(other);
}

export default function ActividadesCalendar({ activities = [] }) {
  const initialMonth = useMemo(() => {
    const firstDated = activities.find((activity) =>
      parseActivityDate(activity.fecha)
    );
    return firstDated
      ? startOfMonth(parseActivityDate(firstDated.fecha))
      : startOfMonth(new Date());
  }, [activities]);

  const [monthDate, setMonthDate] = useState(initialMonth);
  const [selectedKey, setSelectedKey] = useState(null);
  const today = useMemo(() => new Date(), []);

  const activitiesByDate = useMemo(() => {
    const grouped = new Map();

    for (const activity of activities) {
      const parsed = parseActivityDate(activity.fecha);
      if (!parsed) continue;
      const key = toDateKey(parsed);
      const current = grouped.get(key) ?? [];
      current.push(activity);
      grouped.set(key, current);
    }

    return grouped;
  }, [activities]);

  const days = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = startOfMonth(monthDate);
    const firstWeekday = (first.getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [monthDate]);

  const selectedDate = selectedKey
    ? parseActivityDate(selectedKey)
    : null;
  const selectedActivities = selectedKey
    ? (activitiesByDate.get(selectedKey) ?? [])
    : [];

  function changeMonth(offset) {
    setMonthDate(
      new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1)
    );
    setSelectedKey(null);
  }

  function handleSelectDay(key, hasActivities) {
    if (!hasActivities) return;
    setSelectedKey((current) => (current === key ? null : key));
  }

  function closeAgenda() {
    setSelectedKey(null);
  }

  useEffect(() => {
    if (!selectedKey) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") closeAgenda();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedKey]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Mes anterior"
          className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[#bb9c82] text-[#946541]"
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <h2 className="font-serif text-lg text-[#704a31] sm:text-2xl">
          {formatMonthTitle(monthDate)}
        </h2>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Mes siguiente"
          className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[#bb9c82] text-[#946541]"
        >
          <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <div className="overflow-hidden border border-[#bb9c82] bg-[#e7dcd2]">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="border-b border-[#bb9c82] px-1 py-1.5 text-center text-[10px] tracking-[0.12em] text-[#946541] uppercase sm:px-2 sm:py-2 sm:text-[11px] sm:tracking-[0.14em]"
            >
              {day}
            </div>
          ))}

          {days.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-12 border-r border-b border-[#bb9c82] bg-[#e7dcd2] sm:min-h-[72px] md:min-h-[108px]"
                />
              );
            }

            const key = toDateKey(date);
            const dayActivities = activitiesByDate.get(key) ?? [];
            const hasActivities = dayActivities.length > 0;
            const isToday = isSameDay(date, today);
            const isSelected = selectedKey === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectDay(key, hasActivities)}
                disabled={!hasActivities}
                aria-pressed={isSelected}
                className={`min-h-12 border-r border-b border-[#bb9c82] p-1.5 text-left align-top sm:min-h-[72px] sm:p-2 md:min-h-[108px] ${
                  isSelected ? "bg-[#687a42]/18" : "bg-[#e7dcd2]"
                } ${hasActivities ? "cursor-pointer" : "cursor-default"}`}
              >
                {isToday ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center bg-[#946541] px-1 text-[12px] font-semibold text-[#e7dcd2]">
                    {date.getDate()}
                  </span>
                ) : (
                  <span
                    className={`text-[13px] ${
                      isSelected
                        ? "font-semibold text-[#687a42]"
                        : "text-[#946541]"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                )}

                {hasActivities ? (
                  <span
                    className="mt-1 flex justify-center md:hidden"
                    aria-hidden="true"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#db700f]" />
                  </span>
                ) : null}

                <div className="mt-2 hidden space-y-1 md:block">
                  {dayActivities.map((activity) => (
                    <span
                      key={activity.id}
                      className="block truncate border-l-[3px] border-[#db700f] pl-1.5 text-[10px] leading-4 text-[#704a31]"
                      title={activity.titulo}
                    >
                      {activity.titulo}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#946541] sm:mt-4 sm:text-[12px]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#db700f]" />
            Con actividad
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-5 min-w-5 items-center justify-center bg-[#946541] px-1 text-[10px] font-semibold text-[#e7dcd2]">
              H
            </span>
            Hoy
          </span>
        </div>
        <p>Toca un día para ver su agenda</p>
      </div>

      {selectedDate && selectedActivities.length > 0 ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-[#704a31]/45"
            aria-label="Cerrar agenda"
            onClick={closeAgenda}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-title"
            className="absolute inset-x-0 bottom-0 flex max-h-[82vh] flex-col bg-[#e7dcd2] shadow-[0_-16px_40px_rgba(112,74,49,0.2)] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-[min(32rem,calc(100%-2rem))] sm:max-h-[80vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:border-[#bb9c82]"
          >
            <div className="mx-auto mt-2 h-1 w-10 bg-[#bb9c82] sm:hidden" aria-hidden="true" />

            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center bg-[#687a42] text-[#e7dcd2]">
                  <span className="font-serif text-lg leading-none font-bold">
                    {selectedDate.getDate()}
                  </span>
                  <span className="mt-0.5 font-mono text-[7px] tracking-[0.12em] uppercase">
                    {selectedDate
                      .toLocaleDateString("es-CL", { month: "short" })
                      .replace(".", "")}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
                    Agenda del día
                  </p>
                  <h3
                    id="agenda-title"
                    className="font-serif text-lg leading-snug font-semibold text-[#704a31] sm:text-xl"
                  >
                    {formatPanelDate(selectedDate)}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAgenda}
                aria-label="Cerrar agenda"
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-[#704a31]"
              >
                <X size={20} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
              {selectedActivities.map((activity) => (
                <li key={activity.id} className="border-t border-[#bb9c82]/70">
                  <Link
                    href={`/actividades/${activity.id}`}
                    className="flex min-h-16 w-full items-center gap-4 px-3 py-3.5 text-left"
                  >
                    <span className="w-14 shrink-0 font-mono text-sm font-semibold text-[#db700f]">
                      {formatShortTime(activity.hora_inicio) || "—"}
                    </span>
                    <span className="relative hidden h-12 w-12 shrink-0 overflow-hidden sm:block">
                      {activity.imagen_url ? (
                        <Image
                          src={activity.imagen_url}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <ImagePlaceholder height={48} className="h-12" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-base leading-snug font-semibold text-[#704a31]">
                        {activity.titulo}
                      </span>
                      {labelLugarActividad(activity, "") ? (
                        <span className="mt-0.5 block truncate text-sm text-[#946541]">
                          {labelLugarActividad(activity)}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight
                      size={16}
                      strokeWidth={1.8}
                      className="shrink-0 text-[#db700f]"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
