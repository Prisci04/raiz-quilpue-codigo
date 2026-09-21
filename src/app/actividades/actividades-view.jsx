"use client";

import { useState } from "react";
import ActivityCard from "@/components/actividades/ActivityCard";
import ActividadesCalendar from "@/components/actividades/ActividadesCalendar";
import ViewTabs from "@/components/actividades/ViewTabs";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 3;

export default function ActividadesView({ activities = [], error = "", initialView = "actividades" }) {
  const [view, setView] = useState(initialView);
  const [pageIndex, setPageIndex] = useState(0);

  const totalPages = Math.max(1, Math.ceil(activities.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pageItems = activities.slice(
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
    : "Aún no hay actividades publicadas.";

  function handleViewChange(nextView) {
    setView(nextView);
    setPageIndex(0);
  }

  return (
    <main className="bg-[#e7dcd2] text-[#946541]">
      <section className="bg-[#bb9c82]/25">
        <div className="mx-auto max-w-[1200px] px-4 pt-12 pb-8 sm:px-8 sm:pt-20 sm:pb-10">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
            Talleres · Visitas · Conferencias
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2.5rem,5vw,3.8rem)] leading-none font-semibold text-[#704a31]">
            Actividades
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed sm:mt-8 sm:text-[17px]">
            Participa en talleres, visitas guiadas, conferencias y festivales que
            conectan a la comunidad de Quilpué con su patrimonio.
          </p>
        </div>
      </section>

      <ViewTabs
        value={view}
        onChange={handleViewChange}
        count={activities.length}
      />

      <section
        id="actividades-list"
        className="mx-auto max-w-[1200px] px-4 pt-8 pb-16 sm:px-8 sm:pt-12 sm:pb-20"
      >
        {activities.length === 0 ? (
          <div className="border border-[#bb9c82] px-6 py-14 text-center text-lg">
            {emptyMessage}
          </div>
        ) : view === "calendario" ? (
          <ActividadesCalendar activities={activities} />
        ) : (
          <div className="flex w-full flex-col">
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-3">
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
