"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

function formatLongDate(dateString) {
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

function focusableElements(container) {
  if (!container) return [];

  return [
    ...container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ];
}

export default function ContenidoPreviewModal({ item, tipoLabel, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = "contenido-preview-title";
  const summaryId = "contenido-preview-summary";
  const dateLabel = formatLongDate(item?.date);
  const summary = item?.summary?.trim() ?? "";

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const elements = focusableElements(dialogRef.current);

      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#2c1810]/55 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={summary ? summaryId : undefined}
        className="relative flex max-h-[100dvh] w-full flex-col overflow-y-auto bg-[#f4ece4] sm:max-h-[min(92dvh,860px)] sm:max-w-3xl"
      >
        <div className="relative h-56 shrink-0 bg-[#bb9c82]/35 sm:h-72">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.title || "Portada del contenido"}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center font-mono text-[10px] tracking-wide text-[#946541] uppercase">
              Imagen próximamente
            </div>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 inline-flex h-11 w-11 items-center justify-center bg-[#f4ece4] text-[#704a31]"
          >
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-center gap-3">
            {tipoLabel ? (
              <span className="bg-[#704a31] px-2.5 py-1 font-mono text-[10px] tracking-wide text-[#f4ece4] uppercase">
                {tipoLabel}
              </span>
            ) : null}
            {dateLabel ? (
              <span className="font-mono text-[11px] text-[#946541]">{dateLabel}</span>
            ) : null}
          </div>

          <h2
            id={titleId}
            className="mt-5 font-serif text-3xl leading-tight font-medium text-[#5c331c] sm:text-4xl"
          >
            {item.title || "Contenido"}
          </h2>

          <div className="mt-5 h-px w-16 bg-[#c4a04a]" />

          {summary ? (
            <p
              id={summaryId}
              className="mt-6 font-sans text-base leading-relaxed text-[#704a31] italic sm:text-lg"
            >
              {summary}
            </p>
          ) : null}

          <Link
            href={`/contenido/${item.id}`}
            className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#704a31] px-5 font-mono text-[11px] tracking-[0.14em] text-[#f4ece4] uppercase"
          >
            Ver nota completa
            <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
