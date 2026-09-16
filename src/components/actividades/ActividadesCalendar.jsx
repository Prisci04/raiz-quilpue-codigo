"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import ImagePlaceholder from "./ImagePlaceholder";

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
  const day = date.getDate();
  const month = date
    .toLocaleDateString("es-CL", { month: "long" })
    .toUpperCase();
  return `Actividades del ${day} de ${month}`;
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

export default function ActividadesCalendar({ activities = [], onView }) {
  const initialMonth = useMemo(() => {
    const firstDated = activities.find((activity) =>
      parseActivityDate(activity.date)
    );
    return firstDated
      ? startOfMonth(parseActivityDate(firstDated.date))
      : startOfMonth(new Date());
  }, [activities]);

  const [monthDate, setMonthDate] = useState(initialMonth);
  const [selectedKey, setSelectedKey] = useState(null);
  const today = useMemo(() => new Date(), []);

  const activitiesByDate = useMemo(() => {
    const grouped = new Map();

    for (const activity of activities) {
      const parsed = parseActivityDate(activity.date);
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
    setSelectedKey(key);
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="rounded-md border border-[#d7c8b6] px-3 py-2 text-sm text-[#5c4033]"
        >
          ←
        </button>
        <h2 className="font-serif text-2xl text-[#2c1a0e]">{formatMonthTitle(monthDate)}</h2>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-md border border-[#d7c8b6] px-3 py-2 text-sm text-[#5c4033]"
        >
          →
        </button>
      </div>

      <div className="overflow-hidden border border-[#e6dccb] bg-[#f7f1e8]">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="border-b border-[#e6dccb] px-2 py-2 text-center text-[11px] tracking-[0.14em] text-[#8a6f5c] uppercase"
            >
              {day}
            </div>
          ))}

          {days.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[108px] border-r border-b border-[#e6dccb] bg-[#f7f1e8]"
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
                className={`min-h-[108px] border-r border-b border-[#e6dccb] p-2 text-left align-top ${
                  isSelected
                    ? "bg-[#f4e6c4]"
                    : "bg-[#f7f1e8]"
                } ${hasActivities ? "cursor-pointer" : "cursor-default"}`}
              >
                {isToday ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] bg-[#5c4033] px-1 text-[12px] font-semibold text-white">
                    {date.getDate()}
                  </span>
                ) : (
                  <span
                    className={`text-[13px] ${
                      isSelected ? "font-semibold text-[#c9a227]" : "text-[#6b5344]"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                )}

                <div className="mt-2 space-y-1">
                  {dayActivities.map((activity) => (
                    <span
                      key={activity.id}
                      className="block truncate bg-[#c9a227] px-1.5 py-0.5 text-[10px] leading-4 text-white"
                      title={activity.title}
                    >
                      {activity.title}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && selectedActivities.length > 0 ? (
        <div className="mt-5 border-l-4 border-[#c9a227] bg-[#f3ebe1] px-5 py-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#c9a227] uppercase">
            {formatPanelDate(selectedDate)}
          </p>

          <div className="mt-3 space-y-2">
            {selectedActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 bg-[#efe4d0] px-3 py-3"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden">
                  {activity.image ? (
                    <Image
                      src={activity.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <ImagePlaceholder height={56} className="h-14" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-[1.05rem] font-semibold text-[#3d2f24]">
                    {activity.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-[#8a6f5c]">
                    {[formatShortTime(activity.time), activity.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onView?.(activity.id)}
                  className="shrink-0 text-sm text-[#8a6f5c] transition-colors hover:text-[#5c4033]"
                >
                  Ver →
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#8a6f5c]">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 bg-[#c9a227]" />
            Actividad programada
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] bg-[#5c4033] px-1 text-[10px] font-semibold text-white">
              H
            </span>
            Hoy
          </span>
        </div>
        <p>Haz clic en un día con actividad para verla</p>
      </div>
    </div>
  );
}
