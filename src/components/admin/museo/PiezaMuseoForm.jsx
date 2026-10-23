"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import { deletePiezaMuseo, getPiezaMuseo, savePiezaMuseo } from "@/lib/api/community";
import { MUSEO_CATEGORIES } from "@/lib/community-validation.mjs";

const EMPTY = { titulo: "", descripcion: "", categoria: "fotografias", fecha_aproximada: "", lugar: "", imagen_url: "", estado: "borrador" };
const inputClass = "mt-1.5 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] outline-none focus:border-[#c4a484]";

function Field({ label, children, className = "" }) {
  return <label className={`block rounded-sm border border-[#e7dfd6] bg-white p-4 ${className}`}><span className="text-[13px] font-medium text-[#2c1810]">{label}</span>{children}</label>;
}

export default function PiezaMuseoForm({ pieceId = null }) {
  const editing = Boolean(pieceId);
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [archivo, setArchivo] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    getPiezaMuseo(pieceId)
      .then((piece) => { if (active) { setForm(Object.fromEntries(Object.keys(EMPTY).map((key) => [key, piece[key] ?? ""]))); setArchivo(piece); } })
      .catch((loadError) => { if (active) { setError(loadError.message); setLoadError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editing, pieceId]);

  async function save(estado) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await savePiezaMuseo({ ...form, estado }, pieceId);
      if (!editing) {
        router.push("/admin/museo?creado=1");
        return;
      }
      setForm(Object.fromEntries(Object.keys(EMPTY).map((key) => [key, saved[key] ?? ""])));
      setArchivo(saved);
      setSuccess("Pieza guardada correctamente.");
      router.refresh();
    } catch (saveError) {
      setError(saveError.message);
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

  const archivoLabel = /\.(jpe?g|png|webp|avif)$/i.test(archivo?.archivo_nombre ?? "")
    ? "Abrir imagen"
    : /\.pdf$/i.test(archivo?.archivo_nombre ?? "") ? "Abrir PDF" : "Abrir documento";

  return (
    <section>
      <div><p className="text-[13px] text-[#8d7b6d]"><Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link><span className="px-1.5" aria-hidden="true">›</span><Link href="/admin/museo" className="hover:text-[#2c1810]">Museo Digital</Link><span className="px-1.5" aria-hidden="true">›</span>{editing ? "Editar pieza" : "Nueva pieza"}</p><h1 className="mt-2 font-serif text-[clamp(2rem,3vw,2.4rem)] font-semibold tracking-tight text-[#2c1810]">{editing ? "Editar pieza" : "Nueva pieza"}</h1><p className="mt-1 text-sm text-[#7c6a5c]">Crea una ficha para la colección digital de Raíz Quilpué.</p></div>
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}{success ? <AdminNotice>{success}</AdminNotice> : null}
      {loading ? <p className="mt-6 text-sm text-[#7c5c47]">Cargando pieza…</p> : !loadError ? <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); save(editing ? form.estado : "publicada"); }}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Título *"><input required maxLength={200} value={form.titulo} onChange={(event) => setForm((state) => ({ ...state, titulo: event.target.value }))} className={inputClass} /></Field>
          <Field label="Categoría *"><select value={form.categoria} onChange={(event) => setForm((state) => ({ ...state, categoria: event.target.value }))} className={inputClass}>{MUSEO_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></Field>
          <Field label="Descripción *" className="lg:col-span-2"><textarea required maxLength={10000} rows={5} value={form.descripcion} onChange={(event) => setForm((state) => ({ ...state, descripcion: event.target.value }))} className={inputClass} /></Field>
          <Field label="Fecha aproximada"><input maxLength={120} placeholder="Ej.: década de 1950" value={form.fecha_aproximada ?? ""} onChange={(event) => setForm((state) => ({ ...state, fecha_aproximada: event.target.value }))} className={inputClass} /></Field>
          <Field label="Lugar"><input maxLength={250} value={form.lugar ?? ""} onChange={(event) => setForm((state) => ({ ...state, lugar: event.target.value }))} className={inputClass} /></Field>
          <Field label="Imagen (URL)" className="lg:col-span-2"><input type="text" maxLength={2000} placeholder="/images/... o https://..." value={form.imagen_url ?? ""} onChange={(event) => setForm((state) => ({ ...state, imagen_url: event.target.value }))} className={inputClass} /><span className="mt-1 block text-xs text-[#8d7b6d]">Usa una imagen del sitio, del almacenamiento público de Supabase o de Unsplash.</span></Field>
          {archivo?.archivo_url ? (
            <div className="rounded-sm border border-[#e7dfd6] bg-white p-4 lg:col-span-2">
              <p className="text-[13px] font-medium text-[#2c1810]">Archivo de la pieza</p>
              {archivo.archivo_nombre ? <p className="mt-1 break-words text-sm text-[#7c6a5c]">{archivo.archivo_nombre}</p> : null}
              <a href={archivo.archivo_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center text-sm font-medium text-[#a5452d] underline underline-offset-2">
                {archivoLabel}
              </a>
            </div>
          ) : null}
          <Field label="Estado"><select value={form.estado} onChange={(event) => setForm((state) => ({ ...state, estado: event.target.value }))} className={inputClass}><option value="borrador">Borrador</option><option value="publicada">Publicada</option></select></Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">{editing ? <button type="button" onClick={() => setDeleteConfirm(true)} disabled={saving} className="min-h-10 rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28]">Eliminar pieza</button> : <Link href="/admin/museo" className="text-sm text-[#7c5c47]">Cancelar</Link>}<div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => save("borrador")} className="min-h-10 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810]">{saving ? "Guardando…" : "Guardar borrador"}</button><button type="submit" disabled={saving} className="min-h-10 rounded-sm bg-[#2c1810] px-4 text-sm font-medium text-white">{saving ? "Guardando…" : editing ? "Guardar cambios" : "Publicar pieza"}</button></div></div>
      </form> : null}
      {deleteConfirm ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#2c1810]/55 p-4"><section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><h2 className="font-serif text-xl font-semibold text-[#2c1810]">¿Eliminar pieza?</h2><p className="mt-2 text-sm text-[#7c6a5c]">Esta acción no se puede deshacer.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDeleteConfirm(false)} className="min-h-10 border border-[#e6ddd4] px-4 text-sm">Cancelar</button><button type="button" disabled={saving} onClick={remove} className="min-h-10 bg-[#a5452d] px-4 text-sm text-white">Eliminar</button></div></section></div> : null}
    </section>
  );
}
