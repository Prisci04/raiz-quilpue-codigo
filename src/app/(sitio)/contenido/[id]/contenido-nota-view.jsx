import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ContenidoDocumento, {
  TIPO_LABELS,
} from "@/components/contenido/ContenidoDocumento";

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

export default function ContenidoNotaView({ contenido }) {
  const dateLabel = formatLongDate(contenido.date);
  const tipoLabel = TIPO_LABELS[contenido.tipo] ?? "";
  const summary = contenido.summary?.trim() ?? "";

  return (
    <main className="bg-[#e7dcd2] pb-16 text-[#704a31]">
      <article className="mx-auto max-w-3xl px-6 pt-8 sm:pt-10">
        <Link
          href="/contenido"
          className="inline-flex h-11 items-center gap-2 border border-[#bb9c82] bg-[#f4ece4] px-4 text-sm text-[#704a31]"
        >
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
          Volver a contenidos
        </Link>

        <div className="relative mt-6 h-64 overflow-hidden bg-[#bb9c82]/35 sm:h-96">
          {contenido.image ? (
            <Image
              src={contenido.image}
              alt={contenido.title || "Portada del contenido"}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center font-mono text-[10px] tracking-wide text-[#946541] uppercase">
              Imagen próximamente
            </div>
          )}
        </div>

        <div className="mt-8">
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

          <h1 className="mt-5 font-serif text-4xl leading-tight font-medium text-[#5c331c] sm:text-5xl">
            {contenido.title || "Contenido"}
          </h1>

          <div className="mt-5 h-px w-16 bg-[#c4a04a]" />

          {summary ? (
            <p className="mt-6 font-serif text-lg leading-relaxed text-[#704a31] italic">
              {summary}
            </p>
          ) : null}

          <ContenidoDocumento documento={contenido.body} />
        </div>
      </article>
    </main>
  );
}
