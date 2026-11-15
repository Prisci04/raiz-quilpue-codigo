"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import AdminDialog from "@/components/admin/AdminDialog";
import { listarBiblioteca } from "@/lib/api/paginas";

import { btnIcon } from "./ui";

/**
 * Estado de la biblioteca de imágenes. `abrir(contexto)` carga las imágenes ya
 * registradas; `contexto` es libre (por ejemplo, qué imagen se va a reemplazar).
 */
export function useBiblioteca() {
  const [biblioteca, setBiblioteca] = useState(null);

  async function abrir(contexto = null) {
    setBiblioteca({ estado: "cargando", items: [], contexto });

    try {
      const items = await listarBiblioteca();

      setBiblioteca({ estado: "listo", items, contexto });
    } catch (error) {
      setBiblioteca({ estado: "error", items: [], contexto, mensaje: error.message });
    }
  }

  return { biblioteca, abrir, cerrar: () => setBiblioteca(null) };
}

/** Diálogo para elegir una imagen ya registrada en el sitio. */
export default function BibliotecaDialog({ biblioteca, titulo, enUso, textoEnUso, onElegir, onClose }) {
  const baseId = useId();

  return (
    <AdminDialog
      onClose={onClose}
      role="dialog"
      aria-labelledby={`${baseId}-biblioteca-titulo`}
      className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`${baseId}-biblioteca-titulo`} className="font-serif text-lg font-medium text-[#2c1810]">
            {titulo}
          </h2>
          <p className="mt-1 text-sm text-[#7c6a5c]">Selecciona una imagen ya registrada en el sitio.</p>
        </div>
        <button type="button" className={btnIcon} onClick={onClose} aria-label="Cerrar biblioteca">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {biblioteca.estado === "cargando" ? (
        <p role="status" className="admin-empty mt-4 text-sm text-[#7c5c47]">
          Cargando imágenes…
        </p>
      ) : null}
      {biblioteca.estado === "error" ? (
        <p role="alert" className="mt-4 text-sm text-[#8d3b28]">
          {biblioteca.mensaje}
        </p>
      ) : null}
      {biblioteca.estado === "listo" && biblioteca.items.length === 0 ? (
        <p className="admin-empty mt-4 text-sm text-[#7c5c47]">No hay imágenes registradas.</p>
      ) : null}

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {biblioteca.items.map((imagen) => {
          const usada = enUso(imagen);

          return (
            <li key={imagen.id}>
              <button
                type="button"
                disabled={usada}
                onClick={() => onElegir(imagen)}
                className="group block w-full overflow-hidden rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] text-left hover:border-[#c4a484] disabled:opacity-50"
              >
                <span className="relative block aspect-[4/3] bg-[#e7dcd2]">
                  <Image src={imagen.url} alt="" fill unoptimized sizes="200px" className="object-cover" />
                </span>
                <span className="block p-2 text-xs break-all text-[#7c5c47]">
                  {usada ? `${textoEnUso} · ` : ""}
                  {imagen.descripcion || imagen.ruta}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </AdminDialog>
  );
}
