"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Inbox, Search, X } from "lucide-react";

const FILTERS = [
  { id: "noticia", label: "Noticias" },
  { id: "patrimonio", label: "Patrimonio" },
  { id: "capsula_historica", label: "Cápsulas históricas" },
  { id: "cultura", label: "Cultura" },
  { id: "comunidad", label: "Comunidad" },
];

function tipoLabel(tipo) {
  return FILTERS.find((filter) => filter.id === tipo)?.label ?? tipo;
}

function formatDate(dateString) {
  if (!dateString) return "";

  const raw = String(dateString).slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return "";

  return new Date(year, month - 1, day).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MuseoView({ items = [], error = "" }) {
  const [activeTipo, setActiveTipo] = useState("todos");
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);

  const availableFilters = useMemo(() => {
    const types = new Set(items.map((item) => item.tipo));
    return FILTERS.filter((filter) => types.has(filter.id));
  }, [items]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-CL");

    return items.filter((item) => {
      const matchesType = activeTipo === "todos" || item.tipo === activeTipo;
      const searchableText =
        `${item.title} ${item.description} ${item.content} ${item.tipo}`.toLocaleLowerCase(
          "es-CL",
        );
      return matchesType && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [activeTipo, items, query]);

  function openItem(item) {
    openerRef.current = document.activeElement;
    setSelectedItem(item);
  }

  function closeItem() {
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
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  return (
    <main className="bg-[#e7dcd2] text-[#946541]">
      <section className="relative isolate flex min-h-[620px] items-center overflow-hidden bg-[#704a31] text-[#e7dcd2] sm:min-h-[680px]">
        <div className="absolute inset-y-0 right-0 -z-10 w-full sm:left-[38%] sm:w-auto">
          <Image
            src="/images/contenido/archivo-historico.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 62vw"
            className="object-cover opacity-70"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#704a31] via-[#704a31]/90 to-[#704a31]/45" />
        <div className="mx-auto w-full max-w-7xl px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <p className="mb-5 text-[11px] font-semibold tracking-[0.22em] text-[#e48d40] uppercase">
              Archivo vivo · Raíz Quilpué
            </p>
            <p className="mb-4 font-mono text-xs tracking-[0.2em] text-[#e7dcd2]/75 uppercase">
              Museo Digital de Quilpué
            </p>
            <h1 className="font-serif text-[clamp(2.8rem,7vw,5.5rem)] leading-[1.06] font-light text-[#e7dcd2]">
              La memoria de Quilpué
              <br />
              <em className="text-[#e48d40]">vive en sus historias</em>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#e7dcd2]/85 sm:text-lg">
              Un espacio para recorrer los contenidos publicados sobre el
              patrimonio, la cultura y las historias de Quilpué.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#coleccion"
                className="inline-flex min-h-12 items-center gap-2 bg-[#db700f] px-5 py-3 text-sm font-semibold text-[#e7dcd2] transition-colors hover:bg-[#e48d40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7dcd2]"
              >
                Explorar el museo
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </a>
              <a
                href="mailto:raizquilpue@gmail.com?subject=Aporte%20al%20Museo%20Digital"
                className="inline-flex min-h-12 items-center border border-[#e7dcd2]/60 px-5 py-3 text-sm font-semibold text-[#e7dcd2] transition-colors hover:bg-[#e7dcd2] hover:text-[#704a31]"
              >
                Proponer un aporte
              </a>
            </div>
          </div>
        </div>
        <p className="absolute right-6 bottom-5 hidden font-mono text-[10px] tracking-[0.16em] text-[#e7dcd2]/70 uppercase lg:block">
          Quilpué · Archivo abierto
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="grid gap-8 border-b border-[#bb9c82] pb-12 md:grid-cols-[1fr_0.65fr] md:items-end">
          <div>
            <p className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
              Un territorio · muchas historias
            </p>
            <h2 className="font-serif text-3xl leading-tight font-semibold text-[#704a31] sm:text-4xl">
              Un archivo que reúne la memoria local
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-[#946541] sm:text-base">
            Explora imágenes, relatos y publicaciones disponibles. Cada registro
            conserva la información que se ha compartido hasta ahora.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <div className="border-l-2 border-[#db700f] bg-[#bb9c82]/20 px-4 py-3">
            <p className="font-serif text-lg font-semibold text-[#704a31]">
              Registros publicados
            </p>
            <p className="mt-1 text-sm text-[#946541]">
              {items.length} {items.length === 1 ? "registro" : "registros"} en el archivo
            </p>
          </div>
          <Link
            href="/contenido?tipo=patrimonio"
            className="inline-flex min-h-12 items-center border border-[#bb9c82] px-4 py-3 text-sm font-semibold text-[#704a31] transition-colors hover:border-[#db700f] hover:text-[#db700f]"
          >
            Ver contenidos patrimoniales
            <ArrowRight size={15} className="ml-2" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section
        id="coleccion"
        className="scroll-mt-20 bg-[#704a31] py-16 text-[#e7dcd2] sm:py-20"
        aria-labelledby="collection-heading"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-5 border-t border-[#e7dcd2]/20 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 font-mono text-[10px] tracking-[0.2em] text-[#e48d40] uppercase">
                Exposición digital
              </p>
              <h2
                id="collection-heading"
                className="font-serif text-3xl leading-tight font-light sm:text-4xl"
              >
                Explora la <em className="text-[#e48d40]">colección</em>
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#e7dcd2]/70">
                Busca por título, tema o historia y abre una ficha para conocer
                más sobre cada publicación.
              </p>
            </div>
            <p className="font-mono text-xs text-[#e7dcd2]/70">
              {visibleItems.length}{" "}
              {visibleItems.length === 1 ? "registro" : "registros"}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filtrar por categoría"
            >
              <button
                type="button"
                aria-pressed={activeTipo === "todos"}
                onClick={() => setActiveTipo("todos")}
                className={`min-h-10 border px-4 py-2 font-mono text-[10px] tracking-wide uppercase transition-colors ${
                  activeTipo === "todos"
                    ? "border-[#db700f] bg-[#db700f] text-[#e7dcd2]"
                    : "border-[#e7dcd2]/30 text-[#e7dcd2]/75 hover:border-[#e48d40] hover:text-[#e48d40]"
                }`}
              >
                Todas
              </button>
              {availableFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={activeTipo === filter.id}
                  onClick={() => setActiveTipo(filter.id)}
                  className={`min-h-10 border px-4 py-2 font-mono text-[10px] tracking-wide uppercase transition-colors ${
                    activeTipo === filter.id
                      ? "border-[#db700f] bg-[#db700f] text-[#e7dcd2]"
                      : "border-[#e7dcd2]/30 text-[#e7dcd2]/75 hover:border-[#e48d40] hover:text-[#e48d40]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className="relative block w-full lg:max-w-sm">
              <span className="sr-only">Buscar en el museo</span>
              <Search
                size={17}
                strokeWidth={1.8}
                aria-hidden="true"
                className="absolute top-1/2 left-4 -translate-y-1/2 text-[#e7dcd2]/60"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en el archivo..."
                className="min-h-12 w-full border border-[#e7dcd2]/30 bg-[#e7dcd2]/5 py-3 pr-4 pl-11 text-sm text-[#e7dcd2] outline-none placeholder:text-[#e7dcd2]/50 focus:border-[#e48d40]"
              />
            </label>
          </div>

          {error ? (
            <p className="mt-8 border border-[#e7dcd2]/20 px-5 py-10 text-center text-[#e7dcd2]/80">
              {error}
            </p>
          ) : visibleItems.length ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  aria-label={`Abrir ficha de ${item.title}`}
                  className="group animate-fade-up border border-[#e7dcd2]/20 bg-[#e7dcd2]/5 text-left transition-colors hover:border-[#e48d40]/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e48d40]"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <div className="relative h-56 overflow-hidden bg-[#bb9c82]/30">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-[10px] tracking-wide text-[#e7dcd2]/70 uppercase">
                        Imagen próximamente
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-wide text-[#e48d40] uppercase">
                      <span>{tipoLabel(item.tipo)}</span>
                      {item.date ? <span>{formatDate(item.date)}</span> : null}
                    </div>
                    <h3 className="font-serif text-xl leading-snug font-semibold text-[#e7dcd2]">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#e7dcd2]/70">
                        {item.description}
                      </p>
                    ) : null}
                    <span className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] font-semibold tracking-wide text-[#e48d40] uppercase">
                      Abrir ficha
                      <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-8 border border-[#e7dcd2]/20 px-6 py-14 text-center">
              <Inbox
                size={32}
                strokeWidth={1.5}
                aria-hidden="true"
                className="mx-auto mb-4 text-[#e48d40]"
              />
              <p className="font-serif text-xl text-[#e7dcd2]">
                {items.length
                  ? "No encontramos registros con esa búsqueda o categoría."
                  : "Aún no hay registros publicados en el museo."}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#bb9c82]/25 px-6 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
              Un museo hecho entre todos
            </p>
            <h2 className="font-serif text-3xl leading-tight font-semibold text-[#704a31] sm:text-4xl">
              ¿Tienes un recuerdo o registro sobre Quilpué?
            </h2>
          </div>
          <div>
            <p className="text-sm leading-relaxed text-[#946541] sm:text-base">
              Si quieres proponer una fotografía, documento o relato para el
              archivo, puedes escribir al equipo de Raíz Quilpué. La
              información se coordinará directamente.
            </p>
            <a
              href="mailto:raizquilpue@gmail.com?subject=Aporte%20al%20Museo%20Digital"
              className="mt-5 inline-flex min-h-12 items-center gap-2 bg-[#704a31] px-5 py-3 text-sm font-semibold text-[#e7dcd2] transition-colors hover:bg-[#db700f]"
            >
              Contactar a Raíz Quilpué
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#704a31]/75 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeItem();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="museum-item-title"
            className="relative grid max-h-[90vh] w-full max-w-5xl overflow-y-auto border border-[#bb9c82] bg-[#e7dcd2] shadow-2xl lg:grid-cols-2"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeItem}
              aria-label="Cerrar ficha"
              className="absolute top-3 right-3 z-10 inline-flex min-h-11 min-w-11 items-center justify-center bg-[#e7dcd2] text-[#704a31] shadow-md transition-colors hover:bg-[#704a31] hover:text-[#e7dcd2]"
            >
              <X size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-[#704a31] p-5 sm:min-h-80 lg:min-h-full">
              {selectedItem.image ? (
                <Image
                  src={selectedItem.image}
                  alt={selectedItem.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-4"
                />
              ) : (
                <span className="font-mono text-xs tracking-wide text-[#e7dcd2]/70 uppercase">
                  Imagen próximamente
                </span>
              )}
            </div>
            <div className="overflow-y-auto p-6 sm:p-9">
              <p className="mb-3 font-mono text-[10px] tracking-[0.18em] text-[#db700f] uppercase">
                Ficha de colección
              </p>
              <div className="mb-4 flex flex-wrap items-center gap-3">
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
                id="museum-item-title"
                className="mb-6 font-serif text-3xl leading-tight font-semibold text-[#704a31] sm:text-4xl"
              >
                {selectedItem.title}
              </h2>
              {selectedItem.description ? (
                <div className="mb-6">
                  <h3 className="mb-2 font-mono text-[10px] tracking-wide text-[#db700f] uppercase">
                    Sobre este registro
                  </h3>
                  <p className="text-sm leading-relaxed text-[#946541]">
                    {selectedItem.description}
                  </p>
                </div>
              ) : null}
              {selectedItem.content ? (
                <div className="border-t border-[#bb9c82] pt-5">
                  <h3 className="mb-3 font-mono text-[10px] tracking-wide text-[#db700f] uppercase">
                    Historia
                  </h3>
                  <p className="text-sm leading-loose whitespace-pre-line text-[#704a31]">
                    {selectedItem.content}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
