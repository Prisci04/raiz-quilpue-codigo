"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Inbox, X } from "lucide-react";

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
  const [selectedItem, setSelectedItem] = useState(null);
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);

  function openContent(item) {
    openerRef.current = document.activeElement;
    setSelectedItem(item);
  }

  function closeContent() {
    setSelectedItem(null);
    openerRef.current?.focus();
  }

  useEffect(() => {
    if (!selectedItem) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedItem(null);
        openerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedItem]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = tipo === "todos" || item.tipo === tipo;
      const searchableText = `${item.title} ${item.description} ${item.tipo}`.toLowerCase();
      return matchesType && (!requestedQuery || searchableText.includes(requestedQuery));
    });
  }, [items, requestedQuery, tipo]);

  const emptyMessage = error
    ? error
    : tipo === "todos"
      ? "Aún no hay contenidos publicados."
      : "No hay contenidos en esta categoría.";

  return (
    <main className="bg-[#e7dcd2] text-[#946541]">
      <section className="bg-[#bb9c82]/25 px-6 pt-16 pb-12 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">Patrimonio · Noticias · Historias · Cultura · Comunidad</div>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,3.8rem)] leading-tight font-semibold text-[#704a31]">
            Contenidos
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#946541]">
            Todo lo que queremos compartir sobre Quilpué, reunido en un solo espacio. Explora nuestras noticias, contenidos patrimoniales, cápsulas históricas, expresiones culturales y relatos de la comunidad.
          </p>
        </div>
      </section>

      <div
        className="sticky top-16 z-40 border-b border-[#bb9c82] bg-[#e7dcd2]/95 px-6 py-3 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          {FILTERS.map((filter) => {
            const active = tipo === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTipo(filter.id)}
                className={`px-3.5 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors ${
                  active
                    ? "bg-[#704a31] text-[#e7dcd2]"
                    : "border border-[#bb9c82] bg-transparent text-[#946541] hover:border-[#db700f] hover:text-[#db700f]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
          <span className="ml-auto font-mono text-[10px] text-[#946541]">
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
            <p className="font-serif text-xl text-[#946541]">{emptyMessage}</p>
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
                        onSelect={openContent}
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
                        onSelect={openContent}
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
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#704a31]/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeContent();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="content-modal-title"
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-[#bb9c82] bg-[#e7dcd2] shadow-2xl"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeContent}
              aria-label="Cerrar contenido"
              className="absolute top-3 right-3 z-10 inline-flex min-h-11 min-w-11 items-center justify-center bg-[#e7dcd2] text-[#704a31] shadow-md transition-colors hover:bg-[#704a31] hover:text-[#e7dcd2]"
            >
              <X size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <div className="relative h-52 overflow-hidden bg-[#bb9c82]/25 sm:h-72 md:h-80">
              {selectedItem.image ? (
                <Image
                  src={selectedItem.image}
                  alt={selectedItem.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 896px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-xs tracking-wide text-[#946541] uppercase">
                  Imagen próximamente
                </div>
              )}
            </div>
            <div className="p-6 sm:p-10 md:p-12">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="bg-[#946541] px-2.5 py-1 font-mono text-[10px] tracking-wide text-[#e7dcd2] uppercase">
                  {tipoLabel(selectedItem.tipo)}
                </span>
                {selectedItem.date ? (
                  <span className="font-mono text-xs text-[#946541]">
                    {formatDate(selectedItem.date)}
                  </span>
                ) : null}
              </div>
              <h2
                id="content-modal-title"
                className="mb-4 font-serif text-3xl leading-tight font-semibold text-[#704a31] sm:text-4xl"
              >
                {selectedItem.title}
              </h2>
              {selectedItem.description ? (
                <p className="mb-6 text-lg leading-relaxed text-[#946541]">
                  {selectedItem.description}
                </p>
              ) : null}
              {selectedItem.content ? (
                <div className="border-t border-[#bb9c82] pt-6">
                  <h3 className="mb-3 font-serif text-xl font-semibold text-[#704a31]">
                    Detalles
                  </h3>
                  <p className="text-base leading-loose whitespace-pre-line text-[#704a31]">
                    {selectedItem.content}
                  </p>
                </div>
              ) : null}
              <div className="mt-10 border-t border-[#bb9c82] pt-5 font-mono text-xs text-[#946541]">
                Archivo Raíz Quilpué · {tipoLabel(selectedItem.tipo)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SectionHeading({ eyebrow, title, count, countLabel }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <div>
        <div className="section-label mb-0.5">{eyebrow}</div>
        <h2 className="font-serif text-2xl font-semibold text-[#704a31]">{title}</h2>
      </div>
      <div className="h-px flex-1 bg-[#bb9c82]" />
      <span className="font-mono text-[9px] text-[#946541]">
        {count} {countLabel}
      </span>
    </div>
  );
}

function ContentCard({ item, index, featured = false, onSelect }) {
  const imageClassName = featured
    ? "aspect-[4/3]"
    : "h-40 w-40 shrink-0 sm:h-32 sm:w-48";

  return (
    <article
      className={`museum-card animate-fade-up overflow-hidden border border-[#bb9c82] bg-[#e7dcd2] ${
        featured ? "" : "flex"
      }`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className={`relative overflow-hidden bg-[#bb9c82]/25 ${imageClassName}`}>
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes={featured ? "(max-width: 768px) 100vw, 33vw" : "192px"}
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
        <h3 className={`${featured ? "text-lg" : "text-lg"} mb-2 font-serif leading-snug font-semibold text-[#946541]`}>
          {item.title}
        </h3>
        {item.description ? (
          <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-[#946541]">
            {item.description}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => onSelect(item)}
          aria-label={`Ver detalles de ${item.title}`}
          className="inline-flex min-h-10 items-center gap-2 self-start border border-[#704a31] bg-[#704a31] px-3 py-2 font-mono text-[9px] font-semibold tracking-wide text-[#e7dcd2] uppercase transition-colors active:border-[#db700f] active:bg-[#db700f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#704a31]"
        >
          Ver detalles
          <ArrowRight size={12} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
