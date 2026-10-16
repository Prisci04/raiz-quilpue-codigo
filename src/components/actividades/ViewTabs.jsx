"use client";

import { Calendar, LayoutGrid } from "lucide-react";

const tabs = [
  { id: "actividades", label: "Actividades", icon: LayoutGrid },
  { id: "calendario", label: "Calendario", icon: Calendar },
];

export default function ViewTabs({ value, onChange, count = 0 }) {
  return (
    <div className="sticky top-16 z-40 border-b border-[#bb9c82] bg-[#e7dcd2]/95 px-6 py-3 backdrop-blur-md sm:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Vista de actividades">
          {tabs.map((tab) => {
          const active = value === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-2 py-1 text-[9px] font-medium tracking-normal uppercase transition-colors sm:px-2.5 ${
                active
                  ? "bg-[#704a31] text-[#e7dcd2]"
                  : "border border-[#bb9c82] bg-transparent text-[#946541] hover:border-[#db700f] hover:text-[#db700f]"
              }`}
            >
              <Icon size={12} strokeWidth={1.8} aria-hidden="true" />
              {tab.label}
            </button>
          );
          })}
        </div>

        <p className="text-xs text-[#db700f]">
          {count} {count === 1 ? "actividad programada" : "actividades programadas"}
        </p>
      </div>
    </div>
  );
}
