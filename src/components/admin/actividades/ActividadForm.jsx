"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import { deleteActividad, getActividadAdmin, saveActividad } from "@/lib/api/community";

const EMPTY = {
  titulo: "",
  descripcion: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  lugar: "",
  publico_objetivo: "",
  modalidad: "presencial",
  tipo_participacion: "abierta",
  cupos: "",
  tipo_valor: "gratuito",
  valor_monto: "",
  imagen_url: "",
  estado: "borrador",
};

const inputClass = "mt-1.5 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] outline-none focus:border-[#c4a484]";

function Field({ label, children, className = "" }) {
  return <label className={`block rounded-sm border border-[#e7dfd6] bg-white p-4 ${className}`}><span className="text-[13px] font-medium text-[#2c1810]">{label}</span>{children}</label>;
}

export default function ActividadForm({ activityId = null }) {
  const editing = Boolean(activityId);
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    getActividadAdmin(activityId)
      .then((activity) => {
        if (!active) return;
        setForm(Object.fromEntries(Object.keys(EMPTY).map((key) => [
          key,
          key.startsWith("hora_") && activity[key] ? activity[key].slice(0, 5) : activity[key] ?? "",
        ])));
      })
      .catch((loadError) => { if (active) { setError(loadError.message); setLoadError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activityId, editing]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function save(state) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await saveActividad({
        ...form,
        cupos: form.cupos === "" ? null : Number(form.cupos),
        valor_monto: form.valor_monto === "" ? null : Number(form.valor_monto),
        estado: state,
      }, activityId);
      if (!editing) {
        router.push("/admin/actividades?creado=1");
        return;
      }
      setForm(Object.fromEntries(Object.keys(EMPTY).map((key) => [
        key,
        key.startsWith("hora_") && saved[key] ? saved[key].slice(0, 5) : saved[key] ?? "",
      ])));
      setSuccess("Actividad guardada correctamente.");
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
      await deleteActividad(activityId);
      router.push("/admin/actividades?eliminado=1");
    } catch (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <section>
      <div>
        <p className="text-[13px] text-[#8d7b6d]"><Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link><span className="px-1.5" aria-hidden="true">›</span><Link href="/admin/actividades" className="hover:text-[#2c1810]">Actividades</Link><span className="px-1.5" aria-hidden="true">›</span>{editing ? "Editar actividad" : "Nueva actividad"}</p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,3vw,2.4rem)] font-semibold tracking-tight text-[#2c1810]">{editing ? "Editar actividad" : "Nueva actividad"}</h1>
        <p className="mt-1 text-sm text-[#7c6a5c]">Completa los datos que se mostrarán en la programación de Raíz Quilpué.</p>
      </div>
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
      {success ? <AdminNotice>{success}</AdminNotice> : null}
      {loading ? <p className="mt-6 text-sm text-[#7c5c47]">Cargando actividad…</p> : !loadError ? (
        <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); save(editing ? form.estado : "publicada"); }}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Nombre de la actividad *"><input required maxLength={180} value={form.titulo} onChange={(event) => update("titulo", event.target.value)} className={inputClass} /></Field>
            <Field label="Modalidad *"><select value={form.modalidad} onChange={(event) => update("modalidad", event.target.value)} className={inputClass}><option value="presencial">Presencial</option><option value="virtual">Online</option><option value="hibrida">Híbrida</option></select></Field>
            <Field label="Tipo de participación *"><select value={form.tipo_participacion} onChange={(event) => update("tipo_participacion", event.target.value)} className={inputClass}><option value="abierta">Participación abierta</option><option value="inscripcion">Inscripción previa</option><option value="pendiente">Por confirmar</option></select></Field>
            <Field label="Estado de la actividad *"><select value={form.estado} onChange={(event) => update("estado", event.target.value)} className={inputClass}><option value="borrador">Borrador</option><option value="publicada">Publicada</option><option value="cancelada">Cancelada</option></select></Field>
            <Field label="Descripción *" className="lg:col-span-2"><textarea required rows={5} maxLength={10000} value={form.descripcion} onChange={(event) => update("descripcion", event.target.value)} className={inputClass} /></Field>
            <Field label="Fecha"><input type="date" value={form.fecha ?? ""} onChange={(event) => update("fecha", event.target.value)} className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Hora de inicio"><input type="time" value={form.hora_inicio ?? ""} onChange={(event) => update("hora_inicio", event.target.value)} className={inputClass} /></Field><Field label="Hora de término"><input type="time" value={form.hora_fin ?? ""} onChange={(event) => update("hora_fin", event.target.value)} className={inputClass} /></Field></div>
            <Field label="Lugar"><input maxLength={250} value={form.lugar ?? ""} onChange={(event) => update("lugar", event.target.value)} className={inputClass} /></Field>
            <Field label="Cupos"><input type="number" min="0" step="1" value={form.cupos ?? ""} onChange={(event) => update("cupos", event.target.value)} className={inputClass} /><span className="mt-1 block text-xs text-[#8d7b6d]">Déjalo vacío si no hay límite o aún no está confirmado.</span></Field>
            <Field label="Público"><input maxLength={250} placeholder="Público general, personas mayores..." value={form.publico_objetivo ?? ""} onChange={(event) => update("publico_objetivo", event.target.value)} className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Valor"><select value={form.tipo_valor} onChange={(event) => update("tipo_valor", event.target.value)} className={inputClass}><option value="gratuito">Gratuito</option><option value="pagado">Pagado</option><option value="voluntario">Aporte voluntario</option><option value="pendiente">Por confirmar</option></select></Field>{form.tipo_valor === "pagado" ? <Field label="Monto ($)"><input type="number" min="0" step="1" value={form.valor_monto ?? ""} onChange={(event) => update("valor_monto", event.target.value)} className={inputClass} /></Field> : null}</div>
            <Field label="Imagen de la actividad (URL)" className="lg:col-span-2"><input type="text" maxLength={2000} placeholder="/images/... o https://..." value={form.imagen_url ?? ""} onChange={(event) => update("imagen_url", event.target.value)} className={inputClass} /><span className="mt-1 block text-xs text-[#8d7b6d]">Usa una imagen del sitio, del almacenamiento público de Supabase o de Unsplash.</span></Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {editing ? <button type="button" onClick={() => setDeleteConfirm(true)} disabled={saving} className="min-h-10 rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28]">Eliminar actividad</button> : <Link href="/admin/actividades" className="text-sm text-[#7c5c47]">Cancelar</Link>}
            <div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => save("borrador")} className="min-h-10 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50">{saving ? "Guardando…" : "Guardar borrador"}</button><button type="submit" disabled={saving} className="min-h-10 rounded-sm bg-[#2c1810] px-4 text-sm font-medium text-white disabled:opacity-50">{saving ? "Guardando…" : editing ? "Guardar cambios" : "Publicar actividad"}</button></div>
          </div>
        </form>
      ) : null}
      {deleteConfirm ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#2c1810]/55 p-4"><section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><h2 className="font-serif text-xl font-semibold text-[#2c1810]">¿Eliminar actividad?</h2><p className="mt-2 text-sm text-[#7c6a5c]">La lista de participantes también se eliminará.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDeleteConfirm(false)} className="min-h-10 border border-[#e6ddd4] px-4 text-sm">Cancelar</button><button type="button" disabled={saving} onClick={remove} className="min-h-10 bg-[#a5452d] px-4 text-sm text-white">Eliminar</button></div></section></div> : null}
    </section>
  );
}
