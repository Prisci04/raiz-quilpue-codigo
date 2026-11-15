"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { Images, Trash2, Upload } from "lucide-react";

import AdminDialog from "@/components/admin/AdminDialog";
import { asignarFotoIntegrante, subirFotoIntegrante } from "@/lib/api/paginas";
import { initials } from "@/lib/paginas/text.mjs";

import BibliotecaDialog, { useBiblioteca } from "./BibliotecaDialog";
import { btnDanger, btnSecondary } from "./ui";

/**
 * Fotografía de un integrante del directorio: subir, elegir de la biblioteca o quitar.
 * Quitar solo elimina la relación; el servidor borra el archivo únicamente si lo subió
 * este módulo y ya nada lo usa.
 */
export default function FotoIntegrante({ integrante, busy, ejecutar }) {
  const baseId = useId();
  const archivoRef = useRef(null);
  const { biblioteca, abrir, cerrar } = useBiblioteca();
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const foto = integrante.imagen;

  function subir(event) {
    const archivo = event.target.files?.[0];

    event.target.value = "";
    if (!archivo) return;

    ejecutar(() => subirFotoIntegrante(integrante.id, archivo), "Fotografía subida.");
  }

  function elegir(imagen) {
    cerrar();
    ejecutar(() => asignarFotoIntegrante(integrante.id, imagen.id), "Fotografía actualizada.");
  }

  async function quitar() {
    setConfirmarQuitar(false);
    await ejecutar(() => asignarFotoIntegrante(integrante.id, null), "Fotografía quitada.");
  }

  return (
    <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
      {foto ? (
        <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#feca2b] bg-[#e7dcd2]">
          <Image
            src={foto.url}
            alt={`Fotografía de ${integrante.nombre}`}
            fill
            unoptimized
            sizes="56px"
            className="object-cover object-top"
          />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#feca2b] bg-[#ffdf90] font-serif text-sm font-semibold text-[#704a31]"
        >
          {initials(integrante.nombre)}
        </span>
      )}
      <button
        type="button"
        className={`${btnSecondary} w-full sm:w-auto`}
        disabled={busy}
        onClick={() => archivoRef.current?.click()}
      >
        <Upload size={16} aria-hidden="true" />
        {foto ? "Cambiar foto" : "Subir foto"}
      </button>
      <div className="col-span-2 grid grid-cols-2 gap-2 sm:contents">
        <button
          type="button"
          className={`${btnSecondary} w-full sm:w-auto ${foto ? "" : "col-span-2 sm:col-span-1"}`}
          disabled={busy}
          onClick={() => abrir()}
        >
          <Images size={16} aria-hidden="true" />
          Biblioteca
        </button>
        {foto ? (
          <button
            type="button"
            className={`${btnSecondary} w-full text-[#8d3b28] sm:w-auto`}
            disabled={busy}
            onClick={() => setConfirmarQuitar(true)}
            aria-label={`Quitar fotografía de ${integrante.nombre}`}
          >
            <Trash2 size={16} aria-hidden="true" />
            Quitar
          </button>
        ) : null}
      </div>
      <input
        ref={archivoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        tabIndex={-1}
        aria-label={`Archivo de fotografía de ${integrante.nombre}`}
        onChange={subir}
      />
      {!foto ? (
        <p className="col-span-2 text-xs text-[#7c5c47] sm:basis-full">
          Sin fotografía: el sitio muestra sus iniciales. JPG, PNG, WebP o AVIF de hasta 5 MB.
        </p>
      ) : null}

      {biblioteca ? (
        <BibliotecaDialog
          biblioteca={biblioteca}
          titulo={`Elegir fotografía de ${integrante.nombre}`}
          enUso={(imagen) => imagen.id === foto?.id}
          textoEnUso="Es la foto actual"
          onElegir={elegir}
          onClose={cerrar}
        />
      ) : null}

      {confirmarQuitar ? (
        <AdminDialog
          onClose={() => setConfirmarQuitar(false)}
          role="alertdialog"
          aria-labelledby={`${baseId}-quitar-titulo`}
          aria-describedby={`${baseId}-quitar-detalle`}
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        >
          <h2 id={`${baseId}-quitar-titulo`} className="font-serif text-lg font-medium text-[#2c1810]">
            ¿Quitar la fotografía?
          </h2>
          <p id={`${baseId}-quitar-detalle`} className="mt-2 text-sm text-[#7c6a5c]">
            {integrante.nombre} se mostrará con sus iniciales. Las imágenes de la biblioteca que usan otras
            secciones o contenidos no se eliminan.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirmarQuitar(false)} className={`${btnSecondary} w-full sm:w-auto`}>
              Cancelar
            </button>
            <button type="button" onClick={quitar} className={`${btnDanger} w-full sm:w-auto`}>
              Quitar
            </button>
          </div>
        </AdminDialog>
      ) : null}
    </div>
  );
}
