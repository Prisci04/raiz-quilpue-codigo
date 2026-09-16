"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "noticia", label: "Noticias" },
  { id: "patrimonio", label: "Patrimonio" },
  { id: "capsula_historica", label: "Cápsulas históricas" },
];

function formatDate(dateString) {
  if (!dateString) return "";

  const raw = String(dateString).slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);

  if (!year || !month || !day) return "";

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function tipoLabel(tipo) {
  return FILTERS.find((item) => item.id === tipo)?.label ?? tipo;
}

export default function ContenidoView({ items = [], error = "" }) {
  const [tipo, setTipo] = useState("todos");

  const visibleItems = useMemo(() => {
    if (tipo === "todos") return items;
    return items.filter((item) => item.tipo === tipo);
  }, [items, tipo]);

  const emptyMessage = error
    ? error
    : tipo === "todos"
      ? "Aún no hay contenidos publicados."
      : "No hay contenidos en esta categoría.";

  return (
    <main className="bg-[#ebe4d4] text-[#3d2f24]">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 sm:px-8 sm:pt-20">
        <h1 className="font-serif text-5xl font-normal text-[#5c4033]">
          Contenidos
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#6b5344]">
          Noticias, patrimonio y cápsulas históricas de Quilpué.
        </p>

        <div
          className="mt-8 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filtrar contenidos"
        >
          {FILTERS.map((filter) => {
            const active = tipo === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTipo(filter.id)}
                className={`px-3.5 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase ${
                  active
                    ? "bg-[#5c4033] text-white"
                    : "border border-[#d7c8b6] bg-transparent text-[#5c4033]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-[#c9a227]">
          {visibleItems.length}{" "}
          {visibleItems.length === 1 ? "contenido" : "contenidos"}
        </p>

        {visibleItems.length === 0 ? (
          <p className="mt-10 text-[#6b5344]">{emptyMessage}</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {visibleItems.map((item) => (
              <li
                key={item.id}
                className="border border-[#e0d5c4] bg-[#f6f1e8] p-5"
              >
                {item.image ? (
                  <div className="relative mb-4 h-40 w-full overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover"
                    />
                  </div>
                ) : null}

                <p className="text-[10px] font-semibold tracking-[0.16em] text-[#c9a227] uppercase">
                  {tipoLabel(item.tipo)}
                  {item.date ? ` · ${formatDate(item.date)}` : ""}
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[#2c1a0e]">
                  {item.title}
                </h2>
                {item.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-[#6b5344]">
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
