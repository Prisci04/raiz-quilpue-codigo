"use client";

import ContenidoDocumento from "@/components/contenido/ContenidoDocumento";

export default function ContenidoPreviewDialog({ titulo, resumen, contenido, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2c1810]/40 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vista-previa-titulo"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md border border-[#e6ddd4] bg-[#fffdf9] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-[12px] font-medium tracking-[0.14em] text-[#db700f] uppercase">
            Vista previa
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#7c5c47] hover:text-[#2c1810]"
          >
            Cerrar
          </button>
        </div>
        <h2
          id="vista-previa-titulo"
          className="mt-3 font-serif text-3xl leading-tight font-medium text-[#5c331c]"
        >
          {titulo || "Sin título"}
        </h2>
        {resumen ? (
          <p className="mt-4 font-serif text-lg leading-relaxed text-[#704a31] italic">{resumen}</p>
        ) : null}
        <ContenidoDocumento documento={contenido} />
      </div>
    </div>
  );
}
