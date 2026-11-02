"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, Inbox } from "lucide-react";
import ContenidoPreviewModal from "@/components/contenido/ContenidoPreviewModal";

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "noticia", label: "Noticias" },
  { id: "patrimonio", label: "Patrimonio" },
  { id: "capsula_historica", label: "Cápsulas históricas" },
  { id: "cultura", label: "Cultura" },
  { id: "comunidad", label: "Comunidad" },
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

export default function ContenidoView({
  items = [],
  error = "",
  initialTipo = "todos",
  initialQuery = "",
}) {
  const requestedQuery = initialQuery.trim().toLowerCase();
  const initialType = FILTERS.some((filter) => filter.id === initialTipo)
    ? initialTipo
    : "todos";
  const [tipo, setTipo] = useState(initialType);
  const [selectedId, setSelectedId] = useState(null);
  const closePreview = useCallback(() => setSelectedId(null), []);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = tipo === "todos" || item.tipo === tipo;
      const searchableText = `${item.title} ${item.description} ${item.summary} ${item.tipo}`.toLowerCase();
      return matchesType && (!requestedQuery || searchableText.includes(requestedQuery));
    });
  }, [items, requestedQuery, tipo]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const emptyMessage = error
    ? error
    : tipo === "todos"
      ? "Aún no hay contenidos publicados."
      : "No hay contenidos en esta categoría.";

  return (
    <main className="bg-[#e7dcd2] text-[#946541]">
      <section className="site-page-hero bg-[#bb9c82]/25 px-6">
        <div className="site-page-hero-inner mx-auto max-w-7xl">
          <div className="site-page-hero-eyebrow mb-3 font-sans font-semibold tracking-[0.18em] text-[#db700f] uppercase">Patrimonio · Noticias · Historias · Cultura · Comunidad</div>
          <h1 className="site-page-hero-title font-serif text-[#704a31]">
            Contenidos
          </h1>
          <p className="site-page-hero-description mt-3 max-w-2xl text-[#946541]">
            Todo lo que queremos compartir sobre Quilpué, reunido en un solo espacio. Explora nuestras noticias, contenidos patrimoniales, cápsulas históricas, expresiones culturales y relatos de la comunidad.
          </p>
        </div>
      </section>

      <div
        className="sticky top-16 z-40 border-b border-[#bb9c82] bg-[#e7dcd2]/95 px-6 py-3 backdrop-blur-md"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-nowrap items-center gap-1 overflow-x-auto">
          {FILTERS.map((filter) => {
            const active = tipo === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTipo(filter.id)}
                className={`shrink-0 whitespace-nowrap px-2 py-1 font-sans text-[9px] font-medium tracking-normal uppercase transition-colors sm:px-2.5 ${
                  active
                    ? "bg-[#704a31] text-[#e7dcd2]"
                    : "border border-[#bb9c82] bg-transparent text-[#946541] hover:border-[#db700f] hover:text-[#db700f]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
          <span className="ml-auto shrink-0 whitespace-nowrap pl-2 font-sans text-[9px] text-[#946541]">
            {visibleItems.length} {visibleItems.length === 1 ? "publicación" : "publicaciones"}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-6 py-12">
        {visibleItems.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mb-4 flex justify-center text-[#946541]" aria-hidden="true">
              <Inbox size={36} strokeWidth={1.5} />
            </div>
            <p className="font-sans text-base text-[#946541]">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {(tipo === "todos" || tipo === "patrimonio") &&
            visibleItems.some((item) => item.tipo === "patrimonio") ? (
              <section>
                <SectionHeading
                  eyebrow="Colección"
                  title="Patrimonio cultural"
                  count={visibleItems.filter((item) => item.tipo === "patrimonio").length}
                  countLabel="piezas"
                />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {visibleItems
                    .filter((item) => item.tipo === "patrimonio")
                    .map((item, index) => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        index={index}
                        featured
                        onOpen={setSelectedId}
                      />
                    ))}
                </div>
              </section>
            ) : null}

            {(tipo === "todos" || tipo !== "patrimonio") &&
            visibleItems.some((item) => item.tipo !== "patrimonio") ? (
              <section>
                <SectionHeading
                  eyebrow="Publicaciones"
                  title="Noticias y publicaciones"
                  count={visibleItems.filter((item) => item.tipo !== "patrimonio").length}
                  countLabel="artículos"
                />
                <div className="space-y-4">
                  {visibleItems
                    .filter((item) => item.tipo !== "patrimonio")
                    .map((item, index) => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        index={index}
                        onOpen={setSelectedId}
                      />
                    ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        <div className="border-t border-[#bb9c82] pt-8 text-center">
          <p className="font-mono text-[10px] tracking-[0.14em] text-[#946541] uppercase">
            Aquí aparecerán nuevos contenidos cuando sean publicados.
          </p>
        </div>
      </div>
      {selectedItem ? (
        <ContenidoPreviewModal
          item={selectedItem}
          tipoLabel={tipoLabel(selectedItem.tipo)}
          onClose={closePreview}
        />
      ) : null}
    </main>
  );
}

function SectionHeading({ eyebrow, title, count, countLabel }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <div>
        <div className="section-label mb-0.5">{eyebrow}</div>
        <h2 className="font-sans text-xl leading-tight font-semibold text-[#704a31]">{title}</h2>
      </div>
      <div className="h-px flex-1 bg-[#bb9c82]" />
      <span className="font-mono text-[9px] text-[#946541]">
        {count} {countLabel}
      </span>
    </div>
  );
}

function ContentCard({ item, index, featured = false, onOpen }) {
  const imageClassName = featured
    ? "aspect-[4/3] w-full"
    : "aspect-[4/3] w-full md:w-64 md:shrink-0";

  return (
    <article
      className={`museum-card animate-fade-up overflow-hidden border border-[#bb9c82] bg-[#e7dcd2] ${
        featured ? "" : "flex flex-col md:flex-row"
      }`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className={`relative overflow-hidden bg-[#bb9c82]/25 ${imageClassName}`}>
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes={featured ? "(max-width: 768px) 100vw, 33vw" : "(max-width: 768px) 100vw, 256px"}
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[10px] tracking-wide text-[#946541] uppercase">
            Imagen próximamente
          </div>
        )}
        <div className="absolute top-3 left-3 bg-[#946541] px-2 py-0.5 font-mono text-[8px] tracking-wide text-[#e7dcd2] uppercase">
          {tipoLabel(item.tipo)}
        </div>
      </div>
      <div className={`min-w-0 ${featured ? "p-5" : "flex flex-1 flex-col justify-center px-5 py-4"}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] text-[#946541]">
            {item.date ? formatDate(item.date) : ""}
          </span>
        </div>
        <h3 className="mb-2 font-sans text-lg leading-snug font-semibold text-[#946541]">
          {item.title}
        </h3>
        {item.description ? (
          <p className="mb-3 line-clamp-3 text-sm leading-normal text-[#946541]">
            {item.description}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="content-card-detail inline-flex items-center gap-1 font-sans text-[#db700f] uppercase"
        >
          Ver detalle
          <ArrowRight size={10} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
