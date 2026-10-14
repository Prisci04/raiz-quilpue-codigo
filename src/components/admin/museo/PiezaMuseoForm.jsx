"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import { deletePiezaMuseo, getPiezaMuseo, savePiezaMuseo } from "@/lib/api/community";
import { discardUploadedPortada, uploadPortada } from "@/lib/api/media";
import { MUSEO_CATEGORIES } from "@/lib/community-validation.mjs";

const PORTADA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const PORTADA_MAX_BYTES = 5 * 1024 * 1024;
const EMPTY = {
  titulo: "",
  descripcion: "",
  categoria: "fotografias",
  fecha_aproximada: "",
  lugar: "",
  imagen_url: "",
  archivo_nombre: "",
  archivo_url: "",
  estado: "borrador",
};
const inputClass =
  "mt-1.5 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] outline-none focus:border-[#c4a484]";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block rounded-sm border border-[#e7dfd6] bg-white p-4 ${className}`}>
      <span className="text-[13px] font-medium text-[#2c1810]">{label}</span>
      {children}
    </label>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formFromPiece(piece) {
  return {
    titulo: piece.titulo ?? "",
    descripcion: piece.descripcion ?? "",
    categoria: piece.categoria ?? "fotografias",
    fecha_aproximada: piece.fecha_aproximada ?? "",
    lugar: piece.lugar ?? "",
    imagen_url: piece.imagen_url ?? "",
    archivo_nombre: piece.archivo_nombre ?? "",
    archivo_url: piece.archivo_url ?? "",
    estado: piece.estado ?? "borrador",
  };
}

function piecePayload(form, estado) {
  return {
    titulo: form.titulo,
    descripcion: form.descripcion,
    categoria: form.categoria,
    fecha_aproximada: form.fecha_aproximada,
    lugar: form.lugar,
    imagen_url: form.imagen_url || null,
    estado,
  };
}

export default function PiezaMuseoForm({ pieceId = null, initialPiece = null }) {
  const editing = Boolean(pieceId);
  const router = useRouter();
  const fileRef = useRef(null);
  const [form, setForm] = useState(() => (initialPiece ? formFromPiece(initialPiece) : EMPTY));
  const [loading, setLoading] = useState(editing && !initialPiece);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [portadaFile, setPortadaFile] = useState(null);
  const [confirmPortada, setConfirmPortada] = useState(false);

  useEffect(() => {
    if (!editing || initialPiece) return undefined;
    let active = true;
    getPiezaMuseo(pieceId)
      .then((piece) => {
        if (active) setForm(formFromPiece(piece));
      })
      .catch((loadErrorCaught) => {
        if (active) {
          setError(loadErrorCaught.message);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editing, pieceId, initialPiece]);

  const portadaPreview = useMemo(() => {
    if (!portadaFile) return "";
    return URL.createObjectURL(portadaFile);
  }, [portadaFile]);

  useEffect(() => {
    if (!portadaPreview) return undefined;
    return () => URL.revokeObjectURL(portadaPreview);
  }, [portadaPreview]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function choosePortada(event) {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;

    if (!PORTADA_TYPES.includes(next.type)) {
      setError("El formato de imagen no está permitido.");
      return;
    }

    if (next.size === 0 || next.size > PORTADA_MAX_BYTES) {
      setError(next.size > PORTADA_MAX_BYTES ? "La imagen supera el máximo de 5 MB." : "El archivo no es válido.");
      return;
    }

    setError("");
    setConfirmPortada(false);
    setPortadaFile(next);
  }

  async function persist(estado, payload) {
    let uploaded = null;
    const nextPayload = { ...payload };

    if (portadaFile) {
      if (!editing) {
        const created = await savePiezaMuseo({ ...nextPayload, imagen_url: null }, null);
        setUploading(true);
        try {
          uploaded = await uploadPortada(portadaFile, created.id, "museo");
          await savePiezaMuseo({ ...nextPayload, imagen_url: uploaded.url }, created.id);
          router.push("/admin/museo?creado=1");
        } catch (imageError) {
          if (uploaded?.url) await discardUploadedPortada(uploaded.url).catch(() => {});
          router.push(`/admin/museo/${created.id}/editar`);
          throw new Error(imageError.message || "La pieza se creó, pero no se pudo subir la imagen.");
        }
        return null;
      }

      setUploading(true);
      uploaded = await uploadPortada(portadaFile, pieceId, "museo");
      nextPayload.imagen_url = uploaded.url;
    }

    try {
      const saved = await savePiezaMuseo(nextPayload, pieceId);
      if (!editing) {
        router.push("/admin/museo?creado=1");
        return null;
      }
      setPortadaFile(null);
      setForm(formFromPiece(saved));
      setSuccess("Pieza guardada correctamente.");
      router.refresh();
      return saved;
    } catch (saveError) {
      if (uploaded?.url) await discardUploadedPortada(uploaded.url).catch(() => {});
      throw saveError;
    }
  }

  async function save(estado) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await persist(estado, piecePayload(form, estado));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function removePortada() {
    setConfirmPortada(false);
    if (portadaFile) {
      setPortadaFile(null);
      return;
    }
    if (!editing || !form.imagen_url) return;

    setSaving(true);
    setError("");
    try {
      const saved = await savePiezaMuseo(piecePayload({ ...form, imagen_url: "" }, form.estado), pieceId);
      setForm(formFromPiece(saved));
      setSuccess("La imagen se eliminó.");
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError("");
    try {
      await deletePiezaMuseo(pieceId);
      router.push("/admin/museo?eliminado=1");
    } catch (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      setDeleteConfirm(false);
    }
  }

  const busy = saving || uploading;
  const portadaVisible = portadaPreview || form.imagen_url || "";

  return (
    <section>
      <div>
        <p className="text-[13px] text-[#8d7b6d]">
          <Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link>
          <span className="px-1.5" aria-hidden="true">›</span>
          <Link href="/admin/museo" className="hover:text-[#2c1810]">Museo Digital</Link>
          <span className="px-1.5" aria-hidden="true">›</span>
          {editing ? "Editar pieza" : "Nueva pieza"}
        </p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,3vw,2.4rem)] font-semibold tracking-tight text-[#2c1810]">
          {editing ? "Editar pieza" : "Nueva pieza"}
        </h1>
        <p className="mt-1 text-sm text-[#7c6a5c]">Crea una ficha para la colección digital de Raíz Quilpué.</p>
      </div>
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
      {success ? <AdminNotice>{success}</AdminNotice> : null}
      {loading ? (
        <p className="mt-6 text-sm text-[#7c5c47]">Cargando pieza…</p>
      ) : !loadError ? (
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save(editing ? form.estado : "publicada");
          }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Título *">
              <input required maxLength={200} value={form.titulo} onChange={(event) => update("titulo", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Categoría *">
              <select value={form.categoria} onChange={(event) => update("categoria", event.target.value)} className={inputClass}>
                {MUSEO_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Descripción *" className="lg:col-span-2">
              <textarea required maxLength={10000} rows={5} value={form.descripcion} onChange={(event) => update("descripcion", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Fecha aproximada">
              <input maxLength={120} placeholder="Ej.: década de 1950" value={form.fecha_aproximada ?? ""} onChange={(event) => update("fecha_aproximada", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Lugar">
              <input maxLength={250} value={form.lugar ?? ""} onChange={(event) => update("lugar", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Estado">
              <select value={form.estado} onChange={(event) => update("estado", event.target.value)} className={inputClass}>
                <option value="borrador">Borrador</option>
                <option value="publicada">Publicada</option>
              </select>
            </Field>
          </div>

          <div className="rounded-sm border border-[#e7dfd6] bg-white p-4">
            <span className="text-[13px] font-medium text-[#2c1810]">Imagen de la pieza</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex min-h-40 w-full max-w-sm items-center justify-center overflow-hidden rounded-sm border border-dashed border-[#e6ddd4] bg-[#fbfaf8] disabled:opacity-50"
            >
              {portadaVisible ? (
                // La vista previa puede ser un archivo local (blob:) antes de subirlo.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portadaVisible} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-[#b7a394]">
                  <ImageIcon size={22} strokeWidth={1.6} aria-hidden="true" />
                  <p className="text-sm text-[#7c5c47]">{uploading ? "Subiendo imagen..." : "Selecciona una imagen"}</p>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept={PORTADA_TYPES.join(",")} className="sr-only" onChange={choosePortada} />
            {portadaFile ? (
              <p className="mt-3 text-sm text-[#4d4036]">
                {portadaFile.name}
                <span className="text-[#8d7b6d]"> · {formatFileSize(portadaFile.size)}</span>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex min-h-10 items-center rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50">
                {portadaVisible ? "Cambiar imagen" : "Seleccionar imagen"}
              </button>
              {portadaFile ? (
                <button type="button" disabled={busy} onClick={() => { setPortadaFile(null); setConfirmPortada(false); }} className="inline-flex min-h-10 items-center rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50">
                  Quitar
                </button>
              ) : null}
              {editing && form.imagen_url && !portadaFile ? (
                <button type="button" disabled={busy} onClick={() => setConfirmPortada(true)} className="inline-flex min-h-10 items-center rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28] disabled:opacity-50">
                  Eliminar imagen
                </button>
              ) : null}
            </div>
            {confirmPortada ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#4d4036]">
                <p>¿Quitar la imagen?</p>
                <button type="button" className="font-medium text-[#8d3b28]" onClick={removePortada}>Quitar</button>
                <button type="button" className="text-[#7c5c47]" onClick={() => setConfirmPortada(false)}>Cancelar</button>
              </div>
            ) : null}
            <p className="mt-2 text-[12px] text-[#8d7b6d]">JPEG, PNG, WebP o AVIF. Máximo 5 MB. No es obligatoria.</p>
            {form.archivo_url ? (
              <p className="mt-3 text-sm text-[#4d4036]">
                Archivo original del aporte:{" "}
                <a href={form.archivo_url} target="_blank" rel="noreferrer" className="font-medium text-[#a5452d] underline underline-offset-2">
                  {form.archivo_nombre || "Abrir archivo"}
                </a>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {editing ? (
              <button type="button" onClick={() => setDeleteConfirm(true)} disabled={busy} className="min-h-10 rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28]">
                Eliminar pieza
              </button>
            ) : (
              <Link href="/admin/museo" className="text-sm text-[#7c5c47]">Cancelar</Link>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => save("borrador")} className="min-h-10 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810]">
                {busy ? "Guardando…" : "Guardar borrador"}
              </button>
              <button type="submit" disabled={busy} className="min-h-10 rounded-sm bg-[#2c1810] px-4 text-sm font-medium text-white">
                {busy ? "Guardando…" : editing ? "Guardar cambios" : "Publicar pieza"}
              </button>
            </div>
          </div>
        </form>
      ) : null}
      {deleteConfirm ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#2c1810]/55 p-4">
          <section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="font-serif text-xl font-semibold text-[#2c1810]">¿Eliminar pieza?</h2>
            <p className="mt-2 text-sm text-[#7c6a5c]">Esta acción no se puede deshacer.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteConfirm(false)} className="min-h-10 border border-[#e6ddd4] px-4 text-sm">Cancelar</button>
              <button type="button" disabled={busy} onClick={remove} className="min-h-10 bg-[#a5452d] px-4 text-sm text-white">Eliminar</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
