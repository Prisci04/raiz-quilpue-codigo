"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ActivityCard from "@/components/actividades/ActivityCard";
import ActividadesCalendar from "@/components/actividades/ActividadesCalendar";
import ViewTabs from "@/components/actividades/ViewTabs";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 6;

export default function ActividadesView({ activities = [], error = "", initialView = "actividades" }) {
  const [view, setView] = useState(initialView);
  const [pageIndex, setPageIndex] = useState(0);
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleActivities = useMemo(() => {
    if (!normalizedQuery) return activities;

    return activities.filter((activity) => {
      const text = `${activity.title} ${activity.location} ${activity.description}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [activities, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(visibleActivities.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pageItems = visibleActivities.slice(
    safePageIndex * PAGE_SIZE,
    safePageIndex * PAGE_SIZE + PAGE_SIZE
  );

  function goToPage(page) {
    const nextIndex = Math.min(Math.max(page - 1, 0), totalPages - 1);
    setPageIndex(nextIndex);
    document.getElementById("actividades-list")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const emptyMessage = error
    ? error
    : normalizedQuery
      ? "No hay actividades con esa búsqueda."
      : "Aún no hay actividades publicadas.";

  function handleViewChange(nextView) {
    setView(nextView);
    setPageIndex(0);
  }

  function handleQueryChange(event) {
    setQuery(event.target.value);
    setPageIndex(0);
  }

  return (
    <main className="bg-[#e7dcd2] text-[#946541]">
      <section className="bg-[#bb9c82]/25">
        <div className="mx-auto max-w-[1200px] px-4 pt-8 pb-5 sm:px-8 sm:pt-16 sm:pb-8 lg:flex lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
            Talleres · Visitas · Conferencias
          </p>
          <h1 className="mt-3 font-serif text-[clamp(2.1rem,5vw,3.8rem)] leading-none font-semibold text-[#704a31]">
            Actividades
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed sm:mt-6 sm:text-[17px]">
            Participa en talleres, visitas guiadas, conferencias y festivales que
            conectan a la comunidad de Quilpué con su patrimonio.
          </p>
          </div>
          <label className="mt-5 flex min-h-12 w-full items-center gap-2 border border-[#bb9c82] bg-[#f4ece4] px-4 text-[#946541] lg:mt-0 lg:w-80 lg:shrink-0">
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Buscar actividad</span>
            <input
              value={query}
              onChange={handleQueryChange}
              placeholder="Buscar actividad, lugar..."
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[#946541]/70"
            />
          </label>
        </div>
      </section>

      <ViewTabs
        value={view}
        onChange={handleViewChange}
        count={visibleActivities.length}
      />

      <section
        id="actividades-list"
        className="mx-auto max-w-[1200px] px-4 pt-8 pb-16 sm:px-8 sm:pt-12 sm:pb-20"
      >
        {visibleActivities.length === 0 ? (
          <div className="border border-[#bb9c82] px-6 py-14 text-center text-lg">
            {emptyMessage}
          </div>
        ) : view === "calendario" ? (
          <ActividadesCalendar activities={visibleActivities} />
        ) : (
          <div className="flex w-full flex-col">
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-3">
              {pageItems.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
            <Pagination
              currentPage={safePageIndex + 1}
              totalPages={totalPages}
              onPageChange={goToPage}
              label="Paginación de actividades"
              className="mt-8"
            />
          </div>
        )}
      </section>
    </main>
  );
}
