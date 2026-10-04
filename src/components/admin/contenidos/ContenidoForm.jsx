"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ImageIcon } from "lucide-react";
import ContenidoEditor from "@/components/admin/contenidos/ContenidoEditor";
import ContenidoPreviewDialog from "@/components/admin/contenidos/ContenidoPreviewDialog";
import DeleteContenidoDialog from "@/components/admin/contenidos/DeleteContenidoDialog";
import {
  createContenido,
  deleteContenido,
  getContenidoAdmin,
  updateContenido,
} from "@/lib/api/contenidos";
import {
  DESCRIPCION_MAX_LENGTH,
  RESUMEN_MAX_LENGTH,
  TITULO_MAX_LENGTH,
} from "@/lib/contenidos/documento.mjs";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] outline-none focus:border-[#c4a484]";

function FieldLabel({ children, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] font-medium text-[#2c1810]">{children}</span>
      {hint ? <span className="text-[12px] text-[#8d7b6d]">{hint}</span> : null}
    </div>
  );
}

export default function ContenidoForm({ mode, contenidoId }) {
  const router = useRouter();
  const editing = mode === "edit";
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function save(estado, action) {
    setSaving(action);
    setError("");
    setSuccess("");

    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      resumen: form.resumen,
      tipo: form.tipo,
      estado,
      contenido: form.contenido,
    };

    try {
      if (editing) {
        const saved = await updateContenido(contenidoId, payload);
        setForm((current) => ({
          ...current,
          estado: saved.estado,
          fecha_texto: saved.fecha_texto ?? "",
          contenido: saved.contenido ?? current.contenido,
        }));
        setSuccess("Contenido actualizado correctamente.");
      } else {
        await createContenido(payload);
        router.push("/admin/contenidos?creado=1");
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving("");
    }
  }

  async function confirmRemoval() {
    setSaving("eliminar");
    setError("");

    try {
      await deleteContenido(contenidoId);
      router.push("/admin/contenidos?eliminado=1");
    } catch (deleteError) {
      setSaving("");
      setConfirmDelete(false);
      setError(deleteError.message);
    }
  }

  const busy = Boolean(saving);
  const primaryEstado = editing ? form.estado : "publicada";
  const primaryLabel = editing ? "Guardar cambios" : "Publicar";

  return (
    <section>
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
          <h1 className="mt-2 text-[clamp(1.8rem,3vw,2.2rem)] font-semibold tracking-tight text-[#2c1810]">
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
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e6ddd4] bg-white px-3 text-sm text-[#2c1810]"
        >
          <Eye size={16} strokeWidth={1.8} aria-hidden="true" />
          Vista previa
        </button>
      </div>

      {loading ? <p className="mt-6 text-sm text-[#7c5c47]">Cargando contenido…</p> : null}
      {error ? (
        <p className="mt-4 text-sm text-[#8d3b28]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 text-sm text-[#2d7a46]" role="status">
          {success}
        </p>
      ) : null}

      {!loading ? (
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save(primaryEstado, "primary");
          }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block rounded-2xl border border-[#e7dfd6] bg-white p-4">
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
            <label className="block rounded-2xl border border-[#e7dfd6] bg-white p-4">
              <FieldLabel>Tipo de contenido *</FieldLabel>
              <select
                value={form.tipo}
                onChange={(event) => updateField("tipo", event.target.value)}
                className={fieldClass}
              >
                <option value="patrimonio">Patrimonio</option>
                <option value="noticia">Noticia</option>
                <option value="capsula_historica">Cápsula histórica</option>
              </select>
            </label>
            <label className="block rounded-2xl border border-[#e7dfd6] bg-white p-4">
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
            <label className="block rounded-2xl border border-[#e7dfd6] bg-white p-4">
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
              <p className="mt-1.5 rounded-xl border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#7c5c47]">
                {form.fecha_texto || "Se asigna al publicar"}
              </p>
            </label>
          </div>

          <label className="block rounded-2xl border border-[#e7dfd6] bg-white p-4">
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

          <div className="rounded-2xl border border-[#e7dfd6] bg-white p-4">
            <FieldLabel>Imagen de portada</FieldLabel>
            <div className="mt-3 flex min-h-28 items-center gap-4 rounded-xl border border-dashed border-[#e6ddd4] bg-[#fbfaf8] p-4">
              {form.imagen_url ? (
                <img
                  src={form.imagen_url}
                  alt=""
                  className="h-20 w-28 rounded-lg object-cover"
                />
              ) : (
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg bg-[#f3eee8] text-[#b7a394]">
                  <ImageIcon size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
              )}
              <p className="max-w-md text-sm leading-relaxed text-[#7c5c47]">
                La carga de imágenes queda pendiente hasta conectar el almacenamiento. No es
                obligatoria.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e7dfd6] bg-white p-4">
            <FieldLabel>Contenido *</FieldLabel>
            <div className="mt-3">
              <ContenidoEditor
                key={editing ? `edit-${contenidoId}` : "nuevo"}
                initialContent={form.contenido}
                onChange={(contenido) => updateField("contenido", contenido)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {editing ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="inline-flex min-h-10 items-center rounded-xl border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28] disabled:opacity-50"
              >
                Eliminar
              </button>
            ) : (
              <Link href="/admin/contenidos" className="text-sm text-[#7c5c47] hover:text-[#2c1810]">
                Cancelar
              </Link>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => save("borrador", "draft")}
                className="inline-flex min-h-10 items-center rounded-xl border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50"
              >
                {saving === "draft" ? "Guardando…" : "Guardar borrador"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => save(primaryEstado, "primary")}
                className="inline-flex min-h-10 items-center rounded-xl bg-[#2c1810] px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving === "primary" ? "Guardando…" : primaryLabel}
              </button>
            </div>
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
