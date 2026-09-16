"use client";

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const tabs = [
  { id: "actividades", label: "Actividades", icon: GridIcon },
  { id: "calendario", label: "Calendario", icon: CalendarIcon },
];

export default function ViewTabs({ value, onChange, count = 0 }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e0d5c4] py-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Vista de actividades">
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
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors ${
                active
                  ? "bg-[#5c4033] text-white"
                  : "border border-[#d7c8b6] bg-transparent text-[#5c4033] hover:bg-[#f3ebe1]"
              }`}
            >
              <Icon />
              {tab.label}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-[#c9a227]">
        {count} {count === 1 ? "actividad programada" : "actividades programadas"}
      </p>
    </div>
  );
}
