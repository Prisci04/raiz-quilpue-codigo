"use client";

import { useEffect, useMemo, useState } from "react";
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

  return `${String(day).padStart(2, "0")}/${String(month).padStart(
    2,
    "0"
  )}/${year}`;
}

function tipoLabel(tipo) {
  return FILTERS.find((item) => item.id === tipo)?.label ?? tipo;
}

export default function ContenidoView({ items = [], error = "" }) {
  const [tipo, setTipo] = useState("todos");
  const [selectedItem, setSelectedItem] = useState(null);

  const visibleItems = useMemo(() => {
    if (tipo === "todos") return items;

    return items.filter((item) => item.tipo === tipo);
  }, [items, tipo]);

  const emptyMessage = error
    ? error
    : tipo === "todos"
      ? "Aún no hay contenidos publicados."
      : "No hay contenidos en esta categoría.";

  useEffect(() => {
    if (!selectedItem) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setSelectedItem(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedItem]);

  return (
    <>
      <main className="min-h-screen bg-[#ebe4d4] text-[#3d2f24]">
        <section className="mx-auto max-w-5xl px-6 py-14 sm:px-8 sm:py-16">
          <header className="max-w-2xl">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b78a27]">
              Patrimonio · Noticias · Historias
            </p>

            <h1 className="font-serif text-5xl font-normal text-[#5c4033] sm:text-6xl">
              Contenidos
            </h1>

            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#6b5344]">
              Noticias, patrimonio y cápsulas históricas que construyen la
              memoria de Quilpué.
            </p>
          </header>

          <div
            className="mt-10 flex flex-wrap gap-3"
            aria-label="Filtrar contenidos"
          >
            {FILTERS.map((filter) => {
              const active = tipo === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTipo(filter.id)}
                  className={`border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    active
                      ? "border-[#5c4033] bg-[#5c4033] text-white"
                      : "border-[#cdbda9] bg-transparent text-[#5c4033] hover:border-[#5c4033] hover:bg-[#f4eee4]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-b border-[#cfc1ae] pb-4">
            <p className="text-sm text-[#a47d22]">
              {visibleItems.length}{" "}
              {visibleItems.length === 1 ? "contenido" : "contenidos"}
            </p>
          </div>

          {visibleItems.length === 0 ? (
            <div className="mt-10 border border-[#d7c8b6] bg-[#f6f1e8] px-6 py-14 text-center">
              <p className="font-serif text-xl text-[#5c4033]">
                {emptyMessage}
              </p>
            </div>
          ) : (
            <ul className="mt-8 grid gap-6 md:grid-cols-2">
              {visibleItems.map((item) => (
                <li
                  key={item.id}
                  className="group flex flex-col overflow-hidden border border-[#d8cab8] bg-[#f7f2e9] transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  {item.image ? (
                    <div className="relative h-44 w-full overflow-hidden sm:h-52">
                      <Image
                        src={item.image}
                        alt={item.title || "Contenido de Raíz Quilpué"}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-[#ddd2c2] sm:h-64">
                      <span className="text-sm text-[#7a6658]">
                        Sin imagen disponible
                      </span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5 sm:p-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b88b28]">
                      {tipoLabel(item.tipo)}
                      {item.date ? ` · ${formatDate(item.date)}` : ""}
                    </p>

                    <h2 className="mt-3 font-serif text-xl leading-tight text-[#2c1a0e] sm:text-2xl">
                      {item.title || "Contenido sin título"}
                    </h2>

                    {item.description ? (
                      <p className="mt-4 line-clamp-3 text-sm leading-7 text-[#6b5344]">
                        {item.description}
                      </p>
                    ) : null}

                    <div className="mt-auto pt-6">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="inline-flex w-fit border border-[#7b523b] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b523b] transition hover:bg-[#7b523b] hover:text-white"
                      >
                        Ver detalle →
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedItem(null);
            }
          }}
        >
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="contenido-modal-title"
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto bg-[#f7f2e9] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              aria-label="Cerrar detalle"
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center bg-[#f7f2e9]/95 text-2xl text-[#5c4033] shadow-sm transition hover:bg-white"
            >
              ×
            </button>

            {selectedItem.image ? (
              <div className="relative h-64 w-full sm:h-80 lg:h-[390px]">
                <Image
                  src={selectedItem.image}
                  alt={selectedItem.title || "Contenido de Raíz Quilpué"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 896px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center bg-[#ddd2c2]">
                <span className="text-sm text-[#7a6658]">
                  Sin imagen disponible
                </span>
              </div>
            )}

            <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b88b28]">
                {tipoLabel(selectedItem.tipo)}
                {selectedItem.date
                  ? ` · ${formatDate(selectedItem.date)}`
                  : ""}
              </p>

              <h2
                id="contenido-modal-title"
                className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-[#2c1a0e] sm:text-4xl lg:text-5xl"
              >
                {selectedItem.title || "Contenido sin título"}
              </h2>

              {selectedItem.description ? (
                <p className="mt-6 max-w-3xl border-l-2 border-[#b88b28] pl-5 text-base leading-7 text-[#725a49]">
                  {selectedItem.description}
                </p>
              ) : null}

              <div className="mt-8 border-t border-[#d8cab8] pt-8">
                <div className="max-w-3xl whitespace-pre-line text-[15px] leading-8 text-[#4f3c2f] sm:text-base">
                  {selectedItem.content ||
                    selectedItem.description ||
                    "No hay información adicional disponible para este contenido."}
                </div>
              </div>

              <div className="mt-10 border-t border-[#d8cab8] pt-6">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b523b] transition hover:text-[#b88b28]"
                >
                  ← Volver a contenidos
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}