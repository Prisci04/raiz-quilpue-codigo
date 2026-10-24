"use client";

import AdminDialog from "@/components/admin/AdminDialog";
import ContenidoDocumento from "@/components/contenido/ContenidoDocumento";

export default function ContenidoPreviewDialog({ titulo, resumen, contenido, onClose }) {
  return (
      <AdminDialog onClose={onClose}
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
            className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm text-[#7c5c47] hover:text-[#2c1810]"
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
      </AdminDialog>
  );
}
