"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ActivityCard from "@/components/actividades/ActivityCard";
import ActividadesCalendar from "@/components/actividades/ActividadesCalendar";
import ViewTabs from "@/components/actividades/ViewTabs";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 12;

export default function ActividadesView({ activities = [], error = "", initialView = "actividades" }) {
  const [view, setView] = useState(initialView);
  const [pageIndex, setPageIndex] = useState(0);
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleActivities = useMemo(() => {
    if (!normalizedQuery) return activities;

    return activities.filter((activity) => {
      const text = `${activity.titulo} ${activity.lugar ?? ""} ${activity.descripcion}`.toLowerCase();
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
      <section className="site-page-hero bg-[#bb9c82]/25 px-6">
        <div className="site-page-hero-inner mx-auto max-w-7xl">
          <div>
            <p className="site-page-hero-eyebrow mb-3 font-sans font-semibold tracking-[0.18em] text-[#db700f] uppercase">
              Talleres · Visitas · Conferencias
            </p>
            <h1 className="site-page-hero-title font-serif text-[#704a31]">
              Actividades
            </h1>
            <p className="site-page-hero-description mt-3 max-w-2xl">
              Descubre y participa en actividades que mantienen viva la historia y cultura de Quilpué, desde talleres y encuentros hasta muchas otras experiencias para compartir en comunidad.
            </p>
          </div>
        </div>
      </section>

      <ViewTabs
        value={view}
        onChange={handleViewChange}
        count={visibleActivities.length}
      />

      <section className="px-6 py-4">
        <div className="mx-auto flex max-w-7xl justify-end">
          <label className="flex min-h-11 w-full max-w-sm items-center gap-2 border border-[#bb9c82] bg-[#f4ece4] px-4 text-[#946541]">
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

      <section
        id="actividades-list"
        className="mx-auto max-w-[1200px] px-4 pt-8 pb-16 sm:px-8 sm:pt-12 sm:pb-20"
      >
        {view === "calendario" ? (
          <div>
            {error ? (
              <p className="mb-4 border border-[#bb9c82] px-6 py-4 text-center text-lg">
                {error}
              </p>
            ) : null}
            <ActividadesCalendar activities={visibleActivities} />
          </div>
        ) : visibleActivities.length === 0 ? (
          <div className="border border-[#bb9c82] px-6 py-14 text-center text-lg">
            {emptyMessage}
          </div>
        ) : (
          <div className="flex w-full flex-col">
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
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
