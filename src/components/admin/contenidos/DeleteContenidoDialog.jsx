"use client";

export default function DeleteContenidoDialog({ titulo, busy, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c1810]/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="eliminar-contenido-titulo"
        className="w-full max-w-md border border-[#e6ddd4] bg-white p-5"
      >
        <h2 id="eliminar-contenido-titulo" className="text-lg font-semibold text-[#2c1810]">
          ¿Eliminar contenido?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#4d4036]">
          ¿Eliminar &quot;{titulo}&quot;?
        </p>
        <p className="mt-1 text-sm text-[#7c5c47]">Esta acción no se puede deshacer.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-10 items-center border border-[#e6ddd4] bg-white px-4 text-sm text-[#2c1810] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-h-10 items-center bg-[#8d3b28] px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
