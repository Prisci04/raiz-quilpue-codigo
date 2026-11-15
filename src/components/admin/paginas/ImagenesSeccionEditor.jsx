"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Images, Pencil, Trash2, Upload } from "lucide-react";

import AdminDialog from "@/components/admin/AdminDialog";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import {
  guardarDescripcionImagen,
  guardarImagenesSeccion,
  subirImagenSeccion,
} from "@/lib/api/paginas";
import { LIMITES } from "@/lib/paginas/estructura.mjs";

import BibliotecaDialog, { useBiblioteca } from "./BibliotecaDialog";
import { btnDanger, btnIcon, btnSecondary, inputClass } from "./ui";

/**
 * Envuelve un botón que puede quedar deshabilitado. Mientras `aviso` tenga texto, el botón
 * no recibe el mouse (los botones deshabilitados no lo hacen de forma fiable) y el envoltorio
 * muestra un mensaje de ayuda inmediato al pasar el cursor.
 */
function ConAviso({ aviso, children }) {
  const id = useId();

  if (!aviso) return <span className="flex w-full sm:inline-flex sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{children}</span>;

  return (
    <span
      className="group relative flex w-full cursor-not-allowed sm:inline-flex sm:w-auto [&>button]:pointer-events-none [&>button]:w-full sm:[&>button]:w-auto"
      aria-describedby={id}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute top-full left-0 z-20 mt-2 w-max max-w-[min(17rem,100%)] sm:right-0 sm:left-auto sm:max-w-[17rem] rounded-sm bg-[#2c1810] px-3 py-2 text-xs leading-snug font-normal text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100"
      >
        {aviso}
      </span>
    </span>
  );
}

/**
 * Imágenes de una sección: subir, elegir de la biblioteca, reemplazar, ordenar,
 * quitar y editar la descripción. Quitar una imagen solo elimina su relación con la
 * sección; el servidor borra el archivo únicamente si lo subió este módulo y ya no se usa.
 */
export default function ImagenesSeccionEditor({ idPagina, codigo, imagenesIniciales, max, ayuda }) {
  const baseId = useId();
  const archivoRef = useRef(null);
  const reemplazoRef = useRef(null);
  const [aReemplazar, setAReemplazar] = useState(null);
  const [imagenes, setImagenes] = useState(imagenesIniciales);
  const [descripciones, setDescripciones] = useState(() =>
    Object.fromEntries(imagenesIniciales.map((imagen) => [imagen.id, imagen.descripcion ?? ""])),
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [aQuitar, setAQuitar] = useState(null);
  const { biblioteca, abrir, cerrar: cerrarBiblioteca } = useBiblioteca();

  const completa = imagenes.length >= max;
  // Con la sección llena los botones quedan deshabilitados, pero explican por qué al pasar el mouse.
  const avisoMaximo = completa
    ? `Esta sección solo permite ${max} fotos`
    : null;

  function aplicar(lista) {
    setImagenes(lista);
    setDescripciones((actuales) =>
      Object.fromEntries(
        lista.map((imagen) => [imagen.id, actuales[imagen.id] ?? imagen.descripcion ?? ""]),
      ),
    );
  }

  async function ejecutar(accion, textoOk) {
    setBusy(true);
    setNotice(null);

    try {
      aplicar(await accion());
      setNotice({ tone: "success", text: textoOk });
      return true;
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function subir(event) {
    const archivo = event.target.files?.[0];

    event.target.value = "";
    if (!archivo) return;

    const reemplazarId = reemplazoRef.current;

    reemplazoRef.current = null;
    await ejecutar(
      () => subirImagenSeccion(idPagina, codigo, archivo, undefined, reemplazarId),
      reemplazarId ? "Imagen reemplazada." : "Imagen subida y agregada a la sección.",
    );
  }

  function reemplazarSubiendo() {
    reemplazoRef.current = aReemplazar.id;
    setAReemplazar(null);
    archivoRef.current?.click();
  }

  function reemplazarDesdeBiblioteca() {
    const id = aReemplazar.id;

    setAReemplazar(null);
    abrirBiblioteca(id);
  }

  function mover(index, delta) {
    const ids = imagenes.map((imagen) => imagen.id);
    const destino = index + delta;

    [ids[index], ids[destino]] = [ids[destino], ids[index]];
    ejecutar(() => guardarImagenesSeccion(idPagina, codigo, ids), "Orden actualizado.");
  }

  async function quitar() {
    const ids = imagenes.filter((imagen) => imagen.id !== aQuitar.id).map((imagen) => imagen.id);
    const ok = await ejecutar(
      () => guardarImagenesSeccion(idPagina, codigo, ids),
      "Imagen quitada de la sección.",
    );

    if (ok) setAQuitar(null);
  }

  async function guardarDescripcion(imagen) {
    setBusy(true);
    setNotice(null);

    try {
      const actualizada = await guardarDescripcionImagen(imagen.id, descripciones[imagen.id]);

      setImagenes((actuales) =>
        actuales.map((item) => (item.id === imagen.id ? { ...item, descripcion: actualizada.descripcion } : item)),
      );
      setDescripciones((actuales) => ({ ...actuales, [imagen.id]: actualizada.descripcion ?? "" }));
      setNotice({ tone: "success", text: "Descripción guardada." });
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function abrirBiblioteca(reemplazar = null) {
    setNotice(null);
    abrir(reemplazar);
  }

  async function elegir(imagen) {
    const reemplazar = biblioteca.contexto;
    const ids = imagenes.map((item) => item.id);

    if (reemplazar) {
      ids[ids.indexOf(reemplazar)] = imagen.id;
    } else {
      ids.push(imagen.id);
    }

    cerrarBiblioteca();
    await ejecutar(
      () => guardarImagenesSeccion(idPagina, codigo, ids),
      reemplazar ? "Imagen reemplazada." : "Imagen agregada a la sección.",
    );
  }

  return (
    <div className="space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold tracking-wide text-[#704a31] uppercase">
          Imágenes <span className="font-normal text-[#7c5c47]">({imagenes.length}/{max})</span>
        </h3>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <ConAviso aviso={avisoMaximo}>
            <button
              type="button"
              className={btnSecondary}
              disabled={busy || completa}
              onClick={() => {
                reemplazoRef.current = null;
                archivoRef.current?.click();
              }}
            >
              <Upload size={16} aria-hidden="true" />
              Subir imagen
            </button>
          </ConAviso>
          <ConAviso aviso={avisoMaximo}>
            <button type="button" className={btnSecondary} disabled={busy || completa} onClick={() => abrirBiblioteca()}>
              <Images size={16} aria-hidden="true" />
              Elegir de la biblioteca
            </button>
          </ConAviso>
        </div>
        <input
          ref={archivoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo de imagen"
          onChange={subir}
        />
      </div>

      <p className="text-xs leading-relaxed text-[#7c5c47]">
        {ayuda} Formatos JPG, PNG, WebP o AVIF de hasta 5 MB.
        {completa ? " Se alcanzó el máximo: toca la foto (o pasa el mouse sobre ella) y pulsa el lápiz para cambiarla, o quita una para agregar otra." : ""}
      </p>

      {notice ? (
        <AdminNotice tone={notice.tone} sticky={false} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminNotice>
      ) : null}

      {imagenes.length === 0 ? (
        <p className="admin-empty px-3 py-8 text-center text-sm text-[#7c5c47]">
          <ImagePlus size={22} className="mx-auto mb-2" aria-hidden="true" />
          Esta sección no tiene imágenes asignadas: el sitio muestra las fotografías predeterminadas.
        </p>
      ) : (
        <ol className="space-y-3">
          {imagenes.map((imagen, index) => {
            const valor = descripciones[imagen.id] ?? "";
            const cambiada = valor !== (imagen.descripcion ?? "");
            const nombre = imagen.descripcion || `imagen ${index + 1}`;

            return (
              <li
                key={imagen.id}
                className="flex flex-col gap-3 rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] p-3 sm:flex-row"
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setAReemplazar(imagen)}
                  aria-label={`Cambiar la foto: ${nombre}`}
                  title="Cambiar foto"
                  className="group relative h-28 w-full shrink-0 cursor-pointer overflow-hidden rounded-sm bg-[#e7dcd2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#704a31] disabled:cursor-not-allowed sm:w-44"
                >
                  <Image
                    src={imagen.url}
                    alt=""
                    fill
                    unoptimized
                    sizes="176px"
                    className="object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#704a31] text-xs font-semibold text-white"
                  >
                    {index + 1}
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#2c1810]/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <Pencil size={22} />
                    Cambiar foto
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute right-1 bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[#704a31] shadow transition-opacity group-hover:opacity-0"
                  >
                    <Pencil size={14} />
                  </span>
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <label htmlFor={`${baseId}-${imagen.id}`} className="block text-[13px] font-medium text-[#2c1810]">
                    Descripción
                  </label>
                  <div className="flex max-w-md flex-col gap-2 sm:flex-row">
                    <input
                      id={`${baseId}-${imagen.id}`}
                      type="text"
                      value={valor}
                      maxLength={LIMITES.imagen.descripcion}
                      disabled={busy}
                      onChange={(event) =>
                        setDescripciones((actuales) => ({ ...actuales, [imagen.id]: event.target.value }))
                      }
                      className={`${inputClass} mt-0`}
                    />
                    <button
                      type="button"
                      className={`${btnSecondary} w-full sm:w-auto`}
                      disabled={busy || !cambiada}
                      onClick={() => guardarDescripcion(imagen)}
                    >
                      Guardar
                    </button>
                  </div>
                  <p className="text-xs break-all text-[#7c5c47]">{imagen.ruta}</p>
                </div>
                <div className="grid shrink-0 grid-cols-3 gap-2 sm:flex sm:items-start [&>button]:w-full sm:[&>button]:w-10">
                  <button
                    type="button"
                    className={btnIcon}
                    disabled={busy || index === 0}
                    onClick={() => mover(index, -1)}
                    aria-label={`Subir ${nombre}`}
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={btnIcon}
                    disabled={busy || index === imagenes.length - 1}
                    onClick={() => mover(index, 1)}
                    aria-label={`Bajar ${nombre}`}
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${btnIcon} text-[#8d3b28]`}
                    disabled={busy}
                    onClick={() => setAQuitar(imagen)}
                    aria-label={`Quitar ${nombre} de la sección`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {aReemplazar ? (
        <AdminDialog
          onClose={() => setAReemplazar(null)}
          role="dialog"
          aria-labelledby={`${baseId}-reemplazar-titulo`}
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        >
          <h2 id={`${baseId}-reemplazar-titulo`} className="font-serif text-lg font-medium text-[#2c1810]">
            Cambiar foto
          </h2>
          <p className="mt-2 text-sm text-[#7c6a5c]">
            La nueva imagen ocupará el mismo lugar que “{aReemplazar.descripcion || aReemplazar.ruta}”.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" className={btnSecondary} onClick={reemplazarSubiendo}>
              <Upload size={16} aria-hidden="true" />
              Subir una imagen nueva
            </button>
            <button type="button" className={btnSecondary} onClick={reemplazarDesdeBiblioteca}>
              <Images size={16} aria-hidden="true" />
              Elegir de la biblioteca
            </button>
          </div>
          <div className="mt-5 flex sm:justify-end">
            <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={() => setAReemplazar(null)}>
              Cancelar
            </button>
          </div>
        </AdminDialog>
      ) : null}

      {aQuitar ? (
        <AdminDialog
          onClose={() => setAQuitar(null)}
          busy={busy}
          role="alertdialog"
          aria-labelledby={`${baseId}-quitar-titulo`}
          aria-describedby={`${baseId}-quitar-detalle`}
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        >
          <h2 id={`${baseId}-quitar-titulo`} className="font-serif text-lg font-medium text-[#2c1810]">
            ¿Quitar imagen de la sección?
          </h2>
          <p id={`${baseId}-quitar-detalle`} className="mt-2 text-sm text-[#7c6a5c]">
            La imagen dejará de mostrarse en esta sección. Las fotografías de la biblioteca que usan otras
            secciones o contenidos no se eliminan.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" disabled={busy} onClick={() => setAQuitar(null)} className={`${btnSecondary} w-full sm:w-auto`}>
              Cancelar
            </button>
            <button type="button" disabled={busy} onClick={quitar} className={`${btnDanger} w-full sm:w-auto`}>
              {busy ? "Quitando…" : "Quitar"}
            </button>
          </div>
        </AdminDialog>
      ) : null}

      {biblioteca ? (
        <BibliotecaDialog
          biblioteca={biblioteca}
          titulo={biblioteca.contexto ? "Elegir imagen de reemplazo" : "Biblioteca de imágenes"}
          enUso={(imagen) => imagenes.some((item) => item.id === imagen.id)}
          textoEnUso="Ya está en esta sección"
          onElegir={elegir}
          onClose={cerrarBiblioteca}
        />
      ) : null}
    </div>
  );
}
