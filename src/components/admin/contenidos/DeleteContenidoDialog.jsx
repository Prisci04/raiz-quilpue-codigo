"use client";

import AdminDialog from "@/components/admin/AdminDialog";
export default function DeleteContenidoDialog({ titulo, busy, onCancel, onConfirm, error = "" }) {
  return (
      <AdminDialog onClose={onCancel} busy={busy}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eliminar-contenido-titulo"
        aria-describedby="eliminar-contenido-ayuda"
        className="w-full max-w-md rounded-md border border-[#e6ddd4] bg-white p-5"
      >
        <h2 id="eliminar-contenido-titulo" className="text-lg font-semibold text-[#2c1810]">
          ¿Eliminar contenido?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#4d4036]">
          ¿Eliminar &quot;{titulo}&quot;?
        </p>
        <p id="eliminar-contenido-ayuda" className="mt-1 text-sm text-[#7c5c47]">Esta acción no se puede deshacer.</p>
        {error ? <p role="alert" className="mt-3 text-sm text-[#8d3b28]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-10 items-center rounded-md border border-[#e6ddd4] bg-white px-4 text-sm text-[#2c1810] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-h-10 items-center rounded-md bg-[#8d3b28] px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </AdminDialog>
  );
}
