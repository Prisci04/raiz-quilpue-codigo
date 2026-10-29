"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ImageIcon } from "lucide-react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import ContenidoEditor from "@/components/admin/contenidos/ContenidoEditor";
import ContenidoPreviewDialog from "@/components/admin/contenidos/ContenidoPreviewDialog";
import DeleteContenidoDialog from "@/components/admin/contenidos/DeleteContenidoDialog";
import {
  createContenido,
  deleteContenido,
  getContenidoAdmin,
  updateContenido,
} from "@/lib/api/contenidos";
import { discardUploadedPortada, uploadPortada } from "@/lib/api/media";
import {
  DESCRIPCION_MAX_LENGTH,
  RESUMEN_MAX_LENGTH,
  TIPOS_CONTENIDO,
  TIPO_LABELS_ADMIN,
  TITULO_MAX_LENGTH,
} from "@/lib/contenidos/documento.mjs";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
const PORTADA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const PORTADA_MAX_BYTES = 5 * 1024 * 1024;

function imageNoticeMessage(imageNotice) {
  if (imageNotice === "subir") {
    return "El contenido se guardó, pero no se pudo subir la imagen.";
  }

  if (imageNotice === "guardar") {
    return "El contenido se guardó, pero no se pudo asociar la imagen.";
  }

  return "";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const fieldClass =
  "mt-1.5 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] outline-none focus:border-[#c4a484]";

function FieldLabel({ children, hint }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] font-medium text-[#2c1810]">{children}</span>
      {hint ? <span className="text-[12px] text-[#8d7b6d]">{hint}</span> : null}
    </span>
  );
}

export default function ContenidoForm({ mode, contenidoId, imageNotice = "" }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const editing = mode === "edit";
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(() => imageNoticeMessage(imageNotice));
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPortada, setConfirmPortada] = useState(false);
  const [portadaFile, setPortadaFile] = useState(null);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    resumen: "",
    tipo: "patrimonio",
    estado: "borrador",
    imagen_url: null,
    fecha_texto: "",
    contenido: EMPTY_DOC,
  });

  useEffect(() => {
    router.prefetch("/admin/contenidos");
  }, [router]);

  useEffect(() => {
    if (!editing) return undefined;

    let active = true;

    getContenidoAdmin(contenidoId)
      .then((contenido) => {
        if (!active) return;
        setForm({
          titulo: contenido.titulo ?? "",
          descripcion: contenido.descripcion ?? "",
          resumen: contenido.resumen ?? "",
          tipo: contenido.tipo ?? "patrimonio",
          estado: contenido.estado ?? "borrador",
          imagen_url: contenido.imagen_url ?? null,
          fecha_texto: contenido.fecha_texto ?? "",
          contenido: contenido.contenido ?? EMPTY_DOC,
        });
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contenidoId, editing]);

  const portadaPreview = useMemo(() => {
    if (!portadaFile) return "";
    return URL.createObjectURL(portadaFile);
  }, [portadaFile]);

  useEffect(() => {
    if (!portadaPreview) return undefined;
    return () => URL.revokeObjectURL(portadaPreview);
  }, [portadaPreview]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function contentPayload(estado) {
    return {
      titulo: form.titulo,
      descripcion: form.descripcion,
      resumen: form.resumen,
      tipo: form.tipo,
      estado,
      contenido: form.contenido,
    };
  }

  function applySaved(saved) {
    setPortadaFile(null);
    setForm((current) => ({
      ...current,
      estado: saved.estado,
      fecha_texto: saved.fecha_texto ?? "",
      imagen_url: saved.imagen_url ?? null,
      contenido: saved.contenido ?? current.contenido,
    }));
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

  async function saveExisting(payload) {
    let uploaded = null;
    const nextPayload = { ...payload };

    if (portadaFile) {
      setUploading(true);
      uploaded = await uploadPortada(portadaFile, contenidoId);
      nextPayload.imagen_url = uploaded.url;
    }

    try {
      await updateContenido(contenidoId, nextPayload);
      router.replace("/admin/contenidos?guardado=1");
      return true;
    } catch (saveError) {
      if (uploaded?.url) {
        await discardUploadedPortada(uploaded.url).catch(() => {});
      }

      throw saveError;
    }
  }

  async function saveNew(payload) {
    const created = await createContenido(payload);

    if (!portadaFile) {
      router.replace("/admin/contenidos?creado=1");
      return true;
    }

    let uploaded = null;
    setUploading(true);

    try {
      uploaded = await uploadPortada(portadaFile, created.id);
      await updateContenido(created.id, { ...payload, imagen_url: uploaded.url });
      router.replace("/admin/contenidos?creado=1");
      return true;
    } catch {
      if (uploaded?.url) {
        await discardUploadedPortada(uploaded.url).catch(() => {});
        router.replace(`/admin/contenidos/${created.id}/editar?imagen=guardar`);
        return true;
      }

      router.replace(`/admin/contenidos/${created.id}/editar?imagen=subir`);
      return true;
    }
  }

  async function save(estado, action) {
    setSaving(action);
    setError("");
    setSuccess("");
    let left = false;

    try {
      const payload = contentPayload(estado);

      if (editing) {
        left = await saveExisting(payload);
      } else {
        left = await saveNew(payload);
      }
    } catch (saveError) {
      setError(saveError.message || "No se pudo subir la imagen.");
    } finally {
      if (!left) {
        setSaving("");
        setUploading(false);
      }
    }
  }

  async function removePortada() {
    setConfirmPortada(false);

    if (portadaFile) {
      setPortadaFile(null);
      return;
    }

    if (!editing || !form.imagen_url) return;

    setSaving("imagen");
    setError("");

    try {
      const saved = await updateContenido(contenidoId, {
        ...contentPayload(form.estado),
        imagen_url: null,
      });
      applySaved(saved);
      setSuccess("La imagen de portada se eliminó.");
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setSaving("");
    }
  }

  async function confirmRemoval() {
    setSaving("eliminar");
    setError("");

    try {
      await deleteContenido(contenidoId);
      router.replace("/admin/contenidos?eliminado=1");
    } catch (deleteError) {
      setSaving("");
      setConfirmDelete(false);
      setError(deleteError.message);
    }
  }

  const busy = Boolean(saving) || uploading;
  const portadaVisible = portadaPreview || form.imagen_url || "";

  return (
    <section className="admin-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-[#8d7b6d]">
            <Link href="/admin" className="hover:text-[#2c1810]">
              Gestión
            </Link>
            <span className="px-1.5" aria-hidden="true">
              ›
            </span>
            <Link href="/admin/contenidos" className="hover:text-[#2c1810]">
              Contenidos
            </Link>
            <span className="px-1.5" aria-hidden="true">
              ›
            </span>
            {editing ? "Editar contenido" : "Nuevo contenido"}
          </p>
          <h1 className="mt-2 text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium tracking-tight text-[#2c1810]">
            {editing ? "Editar contenido" : "Nuevo contenido"}
          </h1>
          <p className="mt-1 text-sm text-[#7c6a5c]">
            {editing
              ? "Modifica la información y el contenido del elemento."
              : "Completa la información del contenido."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-[#e6ddd4] bg-white px-3 text-sm text-[#2c1810]"
        >
          <Eye size={16} strokeWidth={1.8} aria-hidden="true" />
          Vista previa
        </button>
      </div>

      {loading ? <p className="admin-empty mt-6 text-sm text-[#7c5c47]">Cargando contenido…</p> : null}
      {error ? <AdminNotice tone="error" onDismiss={() => setError("")}>{error}</AdminNotice> : null}
      {success ? <AdminNotice onDismiss={() => setSuccess("")}>{success}</AdminNotice> : null}

      {!loading ? (
        <form
          className="admin-form mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            save(form.estado, "primary");
          }}
        >
          <p className="text-xs leading-relaxed text-[#7c5c47]">Los campos con * son obligatorios. Los demás son opcionales.</p>
          <div className="admin-card grid gap-5 p-4 sm:p-6 lg:grid-cols-2">
            <h2 className="font-serif text-lg font-medium text-[#2c1810] lg:col-span-2">Datos del contenido</h2>
            <label className="admin-field block min-w-0">
              <FieldLabel hint={`${form.titulo.length}/${TITULO_MAX_LENGTH}`}>
                Título *
              </FieldLabel>
              <input
                value={form.titulo}
                maxLength={TITULO_MAX_LENGTH}
                onChange={(event) => updateField("titulo", event.target.value)}
                className={fieldClass}
                required
              />
            </label>
            <label className="admin-field block min-w-0">
              <FieldLabel>Tipo de contenido *</FieldLabel>
              <select
                value={form.tipo}
                onChange={(event) => updateField("tipo", event.target.value)}
                className={fieldClass}
              >
                {TIPOS_CONTENIDO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {TIPO_LABELS_ADMIN[tipo]}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field block min-w-0">
              <FieldLabel hint={`${form.descripcion.length}/${DESCRIPCION_MAX_LENGTH}`}>
                Descripción de tarjeta *
              </FieldLabel>
              <textarea
                value={form.descripcion}
                maxLength={DESCRIPCION_MAX_LENGTH}
                rows={3}
                onChange={(event) => updateField("descripcion", event.target.value)}
                className={fieldClass}
                required
              />
              <p className="mt-2 text-[12px] text-[#8d7b6d]">
                Texto breve que se muestra en el listado de contenidos.
              </p>
            </label>
            <label className="admin-field block min-w-0">
              <FieldLabel>Estado</FieldLabel>
              <select
                value={form.estado}
                onChange={(event) => updateField("estado", event.target.value)}
                className={fieldClass}
              >
                <option value="borrador">Borrador</option>
                <option value="publicada">Publicado</option>
              </select>
              <p className="mt-4 text-[13px] font-medium text-[#2c1810]">Fecha de publicación</p>
              <p className="mt-1.5 rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#7c5c47]">
                {form.fecha_texto || "Se asigna al publicar"}
              </p>
            </label>
          </div>

          <label className="admin-card block p-4 sm:p-6">
            <FieldLabel hint={`${form.resumen.length}/${RESUMEN_MAX_LENGTH}`}>
              Resumen para pop-up *
            </FieldLabel>
            <textarea
              value={form.resumen}
              maxLength={RESUMEN_MAX_LENGTH}
              rows={4}
              onChange={(event) => updateField("resumen", event.target.value)}
              className={fieldClass}
              required
            />
            <p className="mt-2 text-[12px] text-[#8d7b6d]">
              Texto que se muestra en la vista rápida del contenido.
            </p>
          </label>

          <div className="admin-card p-4 sm:p-6">
            <FieldLabel>Imagen de portada</FieldLabel>
            <div className="mt-3 flex min-h-40 max-w-sm items-center justify-center overflow-hidden rounded-sm border border-dashed border-[#e6ddd4] bg-[#fbfaf8]">
              {portadaVisible ? (
                // La vista previa puede ser un archivo local (blob:) antes de subirlo.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portadaVisible} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-[#b7a394]">
                  <ImageIcon size={22} strokeWidth={1.6} aria-hidden="true" />
                  <p className="text-sm text-[#7c5c47]">
                    {uploading ? "Subiendo imagen..." : "Selecciona una imagen"}
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              tabIndex={-1}
              aria-label="Imagen de portada"
              type="file"
              accept={PORTADA_TYPES.join(",")}
              className="sr-only"
              onChange={choosePortada}
            />
            {portadaFile ? (
              <p className="mt-3 text-sm text-[#4d4036]">
                {portadaFile.name}
                <span className="text-[#8d7b6d]"> · {formatFileSize(portadaFile.size)}</span>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-10 items-center rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50"
              >
                {portadaVisible ? "Cambiar imagen" : "Seleccionar imagen"}
              </button>
              {portadaFile ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPortadaFile(null);
                    setConfirmPortada(false);
                  }}
                  className="inline-flex min-h-10 items-center rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50"
                >
                  Quitar
                </button>
              ) : null}
              {editing && form.imagen_url && !portadaFile ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmPortada(true)}
                  className="inline-flex min-h-10 items-center rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28] disabled:opacity-50"
                >
                  {saving === "imagen" ? "Eliminando..." : "Eliminar imagen"}
                </button>
              ) : null}
            </div>
            {confirmPortada ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#4d4036]">
                <p>¿Quitar la imagen de portada?</p>
                <button
                  type="button"
                  className="font-medium text-[#8d3b28]"
                  onClick={removePortada}
                >
                  Quitar
                </button>
                <button
                  type="button"
                  className="text-[#7c5c47]"
                  onClick={() => setConfirmPortada(false)}
                >
                  Cancelar
                </button>
              </div>
            ) : null}
            <p className="mt-2 text-[12px] text-[#8d7b6d]">
              JPEG, PNG, WebP o AVIF. Máximo 5 MB. No es obligatoria.
            </p>
          </div>

          <div className="admin-card p-4 sm:p-6">
            <FieldLabel>Contenido *</FieldLabel>
            <div className="mt-3">
              <ContenidoEditor
                key={editing ? `edit-${contenidoId}` : "nuevo"}
                initialContent={form.contenido}
                onChange={(contenido) => updateField("contenido", contenido)}
              />
            </div>
          </div>

          <div className="admin-form-actions flex flex-wrap items-center justify-end gap-3">
            {editing ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="inline-flex min-h-10 items-center rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28] disabled:opacity-50"
              >
                Eliminar
              </button>
            ) : (
              <Link href="/admin/contenidos" className="inline-flex min-h-11 items-center rounded-sm px-4 text-sm text-[#7c5c47] hover:text-[#2c1810]">
                Cancelar
              </Link>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-10 items-center rounded-sm bg-[#2c1810] px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      ) : null}

      {preview ? (
        <ContenidoPreviewDialog
          titulo={form.titulo}
          resumen={form.resumen}
          contenido={form.contenido}
          onClose={() => setPreview(false)}
        />
      ) : null}
      {confirmDelete ? (
        <DeleteContenidoDialog
          titulo={form.titulo}
          busy={saving === "eliminar"}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={confirmRemoval}
        />
      ) : null}
    </section>
  );
}
