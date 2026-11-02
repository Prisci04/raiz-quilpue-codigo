"use client";

import AdminDialog from "@/components/admin/AdminDialog";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import { deletePiezaMuseo, getPiezaMuseo, savePiezaMuseo } from "@/lib/api/community";
import { discardUploadedPortada, uploadAporteImage } from "@/lib/api/media";
import { getCatalogos } from "@/lib/api/catalogos";

const PORTADA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const PORTADA_MAX_BYTES = 5 * 1024 * 1024;
const inputClass =
  "mt-1.5 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] outline-none focus:border-[#c4a484]";

function emptyForm(categorias) {
  return {
    titulo: "",
    descripcion: "",
    id_categoria_museo: categorias[0]?.id ? String(categorias[0].id) : "",
    fecha_aproximada: "",
    lugar: "",
    imagen_url: "",
  };
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`admin-field block min-w-0 ${className}`}>
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

function formFromPiece(piece, categorias) {
  return {
    titulo: piece.titulo ?? "",
    descripcion: piece.descripcion ?? "",
    id_categoria_museo: piece.id_categoria_museo
      ? String(piece.id_categoria_museo)
      : categorias[0]?.id
        ? String(categorias[0].id)
        : "",
    fecha_aproximada: piece.fecha_aproximada ?? "",
    lugar: piece.lugar ?? "",
    imagen_url: piece.imagen_url ?? "",
  };
}

function piecePayload(form) {
  return {
    titulo: form.titulo,
    descripcion: form.descripcion,
    id_categoria_museo: form.id_categoria_museo,
    fecha_aproximada: form.fecha_aproximada,
    lugar_referencia: form.lugar,
    imagen_url: form.imagen_url,
  };
}

export default function PiezaMuseoForm({
  pieceId = null,
  initialPiece = null,
  categorias: initialCategorias = [],
}) {
  const editing = Boolean(pieceId);
  const router = useRouter();
  const fileRef = useRef(null);
  const [categorias, setCategorias] = useState(initialCategorias);
  const [form, setForm] = useState(() =>
    initialPiece ? formFromPiece(initialPiece, initialCategorias) : emptyForm(initialCategorias),
  );
  const [loading, setLoading] = useState(editing && !initialPiece);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [portadaFile, setPortadaFile] = useState(null);

  useEffect(() => {
    if (initialCategorias.length) return undefined;
    let active = true;
    getCatalogos(["categoria_museo"])
      .then((data) => {
        if (!active) return;
        const items = data?.categoria_museo ?? [];
        setCategorias(items);
        setForm((current) =>
          current.id_categoria_museo
            ? current
            : { ...current, id_categoria_museo: items[0]?.id ? String(items[0].id) : "" },
        );
      })
      .catch((loadErrorCaught) => {
        if (active) setError(loadErrorCaught.message);
      });
    return () => {
      active = false;
    };
  }, [initialCategorias]);

  useEffect(() => {
    if (!editing || initialPiece) return undefined;
    let active = true;
    getPiezaMuseo(pieceId)
      .then((piece) => {
        if (active) setForm(formFromPiece(piece, categorias));
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
  }, [editing, pieceId, initialPiece, categorias]);

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
    setPortadaFile(next);
  }

  async function persist(payload) {
    let uploaded = null;
    const nextPayload = { ...payload };

    if (portadaFile) {
      setUploading(true);
      uploaded = await uploadAporteImage(portadaFile);
      nextPayload.imagen_url = uploaded.url;
    }

    if (!nextPayload.imagen_url) {
      throw new Error("La imagen de la pieza es obligatoria.");
    }

    try {
      const saved = await savePiezaMuseo(nextPayload, pieceId);
      if (!editing) {
        router.push("/admin/museo?creado=1");
        return null;
      }
      router.push("/admin/museo?guardado=1");
      return saved;
    } catch (saveError) {
      if (uploaded?.url) await discardUploadedPortada(uploaded.url).catch(() => {});
      throw saveError;
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await persist(piecePayload(form));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
      setUploading(false);
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
    <section className="admin-page">
      <div>
        <p className="text-[13px] text-[#8d7b6d]">
          <Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link>
          <span className="px-1.5" aria-hidden="true">›</span>
          <Link href="/admin/museo" className="hover:text-[#2c1810]">Museo Digital</Link>
          <span className="px-1.5" aria-hidden="true">›</span>
          {editing ? "Editar pieza" : "Nueva pieza"}
        </p>
        <h1 className="mt-2 font-serif text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium tracking-tight text-[#2c1810]">
          {editing ? "Editar pieza" : "Nueva pieza"}
        </h1>
        <p className="mt-1 text-sm text-[#7c6a5c]">Crea una ficha para la colección digital de Raíz Quilpué.</p>
      </div>
      {error ? <AdminNotice tone="error" onDismiss={() => setError("")}>{error}</AdminNotice> : null}
      {success ? <AdminNotice onDismiss={() => setSuccess("")}>{success}</AdminNotice> : null}
      {loading ? (
        <p className="admin-empty mt-6 text-sm text-[#7c5c47]">Cargando pieza…</p>
      ) : !loadError ? (
        <form
          className="admin-form mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <p className="text-xs leading-relaxed text-[#7c5c47]">Los campos con * son obligatorios. Los demás son opcionales.</p>
          <div className="admin-card grid gap-5 p-4 sm:p-6 lg:grid-cols-2">
            <h2 className="font-serif text-lg font-medium text-[#2c1810] lg:col-span-2">Datos de la pieza</h2>
            <Field label="Título *">
              <input required maxLength={200} value={form.titulo} onChange={(event) => update("titulo", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Categoría *">
              <select required value={form.id_categoria_museo} onChange={(event) => update("id_categoria_museo", event.target.value)} className={inputClass}>
                <option value="" disabled>Selecciona una categoría</option>
                {categorias.map((category) => (
                  <option key={category.id} value={category.id}>{category.nombre}</option>
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
          </div>

          <div className="admin-card p-4 sm:p-6">
            <span className="text-[13px] font-medium text-[#2c1810]">Imagen de la pieza *</span>
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
            <input ref={fileRef} tabIndex={-1} aria-label="Imagen de la pieza" type="file" accept={PORTADA_TYPES.join(",")} className="sr-only" onChange={choosePortada} />
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
                <button type="button" disabled={busy} onClick={() => setPortadaFile(null)} className="inline-flex min-h-10 items-center rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50">
                  Quitar
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-[12px] text-[#8d7b6d]">JPEG, PNG, WebP o AVIF. Máximo 5 MB. La imagen es obligatoria.</p>
          </div>

          <div className="admin-form-actions flex flex-wrap items-center justify-end gap-3">
            {editing ? (
              <button type="button" onClick={() => setDeleteConfirm(true)} disabled={busy} className="min-h-10 rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28]">
                Eliminar pieza
              </button>
            ) : (
              <Link href="/admin/museo" className="inline-flex min-h-11 items-center rounded-sm px-4 text-sm text-[#7c5c47]">Cancelar</Link>
            )}
            <button type="submit" disabled={busy} className="min-h-10 rounded-sm bg-[#2c1810] px-4 text-sm font-medium text-white">
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      ) : null}
      {deleteConfirm ? (
          <AdminDialog onClose={() => setDeleteConfirm(false)} busy={busy} role="alertdialog" aria-labelledby="delete-pieza-title" aria-describedby="delete-pieza-description" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="delete-pieza-title" className="font-serif text-lg font-medium text-[#2c1810]">¿Eliminar pieza?</h2>
            <p id="delete-pieza-description" className="mt-2 text-sm text-[#7c6a5c]">Esta acción no se puede deshacer.</p>
            {error ? <p role="alert" className="mt-3 text-sm text-[#8d3b28]">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setDeleteConfirm(false)} className="min-h-10 border border-[#e6ddd4] px-4 text-sm">Cancelar</button>
              <button type="button" disabled={busy} onClick={remove} className="min-h-10 bg-[#a5452d] px-4 text-sm text-white">Eliminar</button>
            </div>
          </AdminDialog>
      ) : null}
    </section>
  );
}
