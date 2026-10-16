"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Inbox, Search, X } from "lucide-react";
import { MUSEO_CATEGORIES } from "@/lib/community-validation.mjs";

const FILTERS = MUSEO_CATEGORIES;
// CAMBIAR IMÁGENES DE CATEGORÍAS AQUÍ: se usan rutas de public/images para facilitar su reemplazo.
const COLLECTIONS = [
  {
    id: "fotografias",
    label: "Fotografías",
    description: "Calles, barrios, paisajes, edificios y momentos de la vida cotidiana.",
    image: "/images/contenido/archivo-historico.jpg",
  },
  {
    id: "documentos",
    label: "Documentos",
    description: "Afiches, cartas, mapas, periódicos, invitaciones y otros documentos históricos.",
    image: "/images/contenido/2025.jpeg",
  },
  {
    id: "objetos_piezas",
    label: "Objetos y piezas",
    description: "Objetos cotidianos, herramientas y elementos de distintas épocas.",
    image: "/images/contenido/reloj y vaca Quilpué -01.jpeg",
  },
  {
    id: "memorias_relatos",
    label: "Memorias y relatos",
    description: "Recuerdos, testimonios y relatos de personas vinculadas con Quilpué.",
    image: "/images/contenido/capsula-recuerdos1.jpg",
  },
  {
    id: "lugares_memoria",
    label: "Lugares con memoria",
    description: "Espacios, edificios, calles y lugares importantes para la memoria colectiva.",
    image: "/images/contenido/iglesia desde plaza.jpg",
  },
  {
    id: "cultura_comunidad",
    label: "Cultura y comunidad",
    description: "Celebraciones, actividades, organizaciones, tradiciones y expresiones culturales.",
    image: "/images/contenido/carozzi.jpeg",
  },
];

function tipoLabel(tipo) {
  return FILTERS.find((filter) => filter.id === tipo)?.label ?? tipo;
}

function formatDate(dateString) {
  if (!dateString) return "";

  if (/^\d{4}$/.test(String(dateString))) return String(dateString);
  const raw = String(dateString).slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return String(dateString);

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
  const [showContribution, setShowContribution] = useState(false);
  const [contributionSent, setContributionSent] = useState(false);
  const [contributionError, setContributionError] = useState("");
  const [sendingContribution, setSendingContribution] = useState(false);
  const contributionDialogRef = useRef(null);
  const contributionCloseRef = useRef(null);
  const contributionOpenerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);

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

  function openContribution() {
    contributionOpenerRef.current = document.activeElement;
    setContributionSent(false);
    setContributionError("");
    setShowContribution(true);
  }

  function closeContribution() {
    setShowContribution(false);
    setContributionSent(false);
    setContributionError("");
    contributionOpenerRef.current?.focus();
  }

  async function submitContribution(event) {
    event.preventDefault();
    setContributionError("");
    setSendingContribution(true);
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    try {
      const response = await fetch("/api/museo/aportes", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.error?.message || "No fue posible enviar el aporte.");
      }
      setContributionSent(true);
      formElement.reset();
    } catch (submitError) {
      setContributionError(submitError.message);
    } finally {
      setSendingContribution(false);
    }
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

  useEffect(() => {
    if (!showContribution) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    contributionCloseRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeContribution();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = contributionDialogRef.current?.querySelectorAll(
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
  }, [showContribution]);

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
              Un archivo comunitario de fotografías, documentos, objetos,
              relatos y lugares que guardan la memoria de Quilpué.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#coleccion"
                className="inline-flex min-h-12 items-center gap-2 bg-[#db700f] px-5 py-3 text-sm font-semibold text-[#e7dcd2] transition-colors hover:bg-[#e48d40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7dcd2]"
              >
                Explorar el museo
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </a>
              <button
                type="button"
                aria-expanded={showContribution}
                aria-controls="museo-contribution-form"
                onClick={openContribution}
                className="inline-flex min-h-12 items-center border border-[#e7dcd2]/60 px-5 py-3 text-sm font-semibold text-[#e7dcd2] transition-colors hover:bg-[#e7dcd2] hover:text-[#704a31]"
              >
                Quiero dar mi aporte
              </button>
            </div>
          </div>
        </div>
        <p className="absolute right-6 bottom-5 hidden font-mono text-[10px] tracking-[0.16em] text-[#e7dcd2]/70 uppercase lg:block">
          Quilpué · Archivo abierto
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="border-b border-[#bb9c82] pb-8">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
            Un territorio · muchas historias
          </p>
          <h2 className="font-serif text-3xl leading-tight font-semibold text-[#704a31] sm:text-4xl">
            ¿Qué encontrarás en el museo?
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#946541] sm:text-base">
            Seis maneras de recorrer la memoria: cada colección es una puerta a
            otras voces, lugares y épocas.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COLLECTIONS.map((collection, index) => (
            <button
              key={collection.id}
              type="button"
              onClick={() => {
                setActiveTipo(collection.id);
                document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group overflow-hidden rounded-xl border border-[#bb9c82]/60 bg-[#f8f3ed] text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#db700f]/70 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#db700f]"
            >
              <div className="relative h-52 overflow-hidden bg-[#bb9c82]/30">
                <Image
                  src={collection.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/65 via-transparent to-transparent" />
                <span className="absolute right-4 bottom-4 rounded-full border border-white/60 bg-[#2c1810]/25 px-3 py-1 font-mono text-[10px] tracking-[0.16em] text-white uppercase backdrop-blur-sm">
                  Colección {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="font-serif text-xl font-semibold text-[#704a31]">
                  {collection.label}
                </h3>
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-[#946541]">
                  {collection.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 border-b border-[#db700f]/40 pb-1 font-mono text-[10px] font-semibold tracking-wide text-[#a4542c] uppercase transition-colors group-hover:border-[#db700f] group-hover:text-[#db700f]">
                  Explorar colección <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-6 text-sm text-[#946541]">
          {items.length} {items.length === 1 ? "registro publicado" : "registros publicados"} en el archivo.
        </p>
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

          <div className="mt-8 flex flex-col gap-5">
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
              {FILTERS.map((filter) => (
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
            <label className="relative block w-full">
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
                className="min-h-12 w-full border border-[#e7dcd2]/30 bg-[#e7dcd2]/5 py-3 pr-4 pl-11 text-sm text-[#e7dcd2] outline-none placeholder:text-[#e7dcd2]/50 focus:border-[#e48d40] sm:max-w-xl"
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
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
              Un museo hecho entre todos
            </p>
            <h2 className="font-serif text-3xl leading-tight font-semibold text-[#704a31] sm:text-4xl">
              ¿Tienes un recuerdo o registro sobre Quilpué?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#946541] sm:text-base">
              Comparte una fotografía, un documento, un objeto o un recuerdo
              para que siga viva la memoria de Quilpué.
            </p>
            <button
              type="button"
              aria-expanded={showContribution}
              aria-controls="museo-contribution-form"
              onClick={openContribution}
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-sm bg-[#704a31] px-6 py-3 text-sm font-semibold text-[#e7dcd2] transition-colors hover:bg-[#db700f]"
            >
              Quiero dar mi aporte
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {showContribution ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#704a31]/75 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeContribution();
          }}
        >
          <section
            ref={contributionDialogRef}
            id="museo-contribution-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contribution-title"
            className="relative max-h-[90dvh] w-full max-w-4xl overflow-y-auto border border-[#bb9c82] bg-[#e7dcd2] p-5 shadow-2xl sm:p-8"
          >
            <button
              ref={contributionCloseRef}
              type="button"
              onClick={closeContribution}
              aria-label="Cerrar formulario de colaboración"
              className="absolute top-3 right-3 inline-flex h-10 w-10 items-center justify-center text-[#704a31] hover:bg-[#bb9c82]/30"
            >
              <X size={20} />
            </button>
            {contributionSent ? (
              <div className="py-12 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-[#db700f]">Museo Digital</p>
                <h2 id="contribution-title" className="mt-3 font-serif text-3xl font-semibold text-[#704a31]">Gracias por compartir tu historia</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#946541]">Tu aporte y el archivo fueron recibidos por Raíz Quilpué. El equipo los revisará antes de publicarlos en el museo.</p>
                <button type="button" onClick={closeContribution} className="mt-6 min-h-11 bg-[#704a31] px-5 text-sm font-semibold text-[#e7dcd2]">Cerrar</button>
              </div>
            ) : (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#db700f]">Formulario de colaboración</p>
                <h2 id="contribution-title" className="mt-2 font-serif text-3xl font-semibold text-[#704a31]">Comparte una pieza de tu historia</h2>
                <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submitContribution}>
                  <label className="grid gap-1.5 text-sm text-[#704a31]">Nombre *<input name="nombre" required maxLength={160} className="min-h-11 border border-[#bb9c82] bg-[#f4ece4] px-3 outline-none focus:border-[#db700f]" /></label>
                  <label className="grid gap-1.5 text-sm text-[#704a31]">Correo *<input name="correo" required type="email" maxLength={254} className="min-h-11 border border-[#bb9c82] bg-[#f4ece4] px-3 outline-none focus:border-[#db700f]" /></label>
                  <label className="grid gap-1.5 text-sm text-[#704a31] sm:col-span-2">Tipo de aporte *<select name="categoria" required defaultValue="" className="min-h-11 border border-[#bb9c82] bg-[#f4ece4] px-3 outline-none focus:border-[#db700f]"><option value="" disabled>Selecciona una opción</option>{FILTERS.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
                  <label className="grid gap-1.5 text-sm text-[#704a31] sm:col-span-2">Título *<input name="titulo" required maxLength={200} className="min-h-11 border border-[#bb9c82] bg-[#f4ece4] px-3 outline-none focus:border-[#db700f]" /></label>
                  <label className="grid gap-1.5 text-sm text-[#704a31] sm:col-span-2">Descripción *<textarea name="descripcion" required maxLength={10000} rows={4} className="border border-[#bb9c82] bg-[#f4ece4] p-3 outline-none focus:border-[#db700f]" /></label>
                  <label className="grid gap-1.5 text-sm text-[#704a31]">Fecha aproximada<input name="fecha_aproximada" type="date" className="min-h-11 border border-[#bb9c82] bg-[#f4ece4] px-3 outline-none focus:border-[#db700f]" /><span className="text-xs text-[#946541]">Selecciona la fecha desde el calendario.</span></label>
                  <label className="grid gap-1.5 text-sm text-[#704a31]">Lugar<input name="lugar" maxLength={250} className="min-h-11 border border-[#bb9c82] bg-[#f4ece4] px-3 outline-none focus:border-[#db700f]" /></label>
                  <label className="grid gap-1.5 text-sm text-[#704a31] sm:col-span-2">Archivo / imagen *<input name="archivo" type="file" required accept="image/jpeg,image/png,image/webp,image/avif,.pdf,application/pdf" className="min-h-11 border border-[#bb9c82] bg-[#f4ece4] p-2 text-sm" /><span className="text-xs text-[#946541]">Fotografía JPG, PNG, WebP o AVIF, o un PDF. Máximo 5 MB.</span></label>
                  <label className="grid gap-1.5 text-sm text-[#704a31] sm:col-span-2">Información adicional<textarea name="informacion_adicional" maxLength={3000} rows={3} className="border border-[#bb9c82] bg-[#f4ece4] p-3 outline-none focus:border-[#db700f]" /></label>
                  {contributionError ? <p role="alert" className="text-sm font-semibold text-[#a5452d] sm:col-span-2">{contributionError}</p> : null}
                  <div className="flex justify-end sm:col-span-2"><button type="submit" disabled={sendingContribution} className="inline-flex min-h-12 items-center gap-2 bg-[#704a31] px-6 text-sm font-semibold text-[#e7dcd2] hover:bg-[#db700f] disabled:opacity-50">{sendingContribution ? "Enviando…" : "Enviar aporte"}<ArrowRight size={16} /></button></div>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}

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
