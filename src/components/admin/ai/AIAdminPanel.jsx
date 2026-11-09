"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle, Plus, Pencil, Trash2, Save, MessageCircle } from "lucide-react";
import AdminDialog from "@/components/admin/AdminDialog";
import { AssistantProvider, aiRequest } from "@/components/ai/AssistantProvider";
import ChatPanel from "@/components/ai/ChatPanel";
import "@/components/ai/assistant.css";

const empty = { titulo: "", categoria: "General", contenido: "", orden: 0, activo: true };
const fieldClass = "mt-2 min-h-11 w-full rounded-sm border border-[#bb9c82] bg-[#fffdf9] px-3 py-2 text-sm";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-[#bb9c82] px-4 py-2 text-sm";
const help = "En esta sección puedes agregar, editar y organizar información que el asistente utilizará para responder preguntas de los visitantes. Cada sección de conocimiento ayuda a la IA a comprender mejor Raíz Quilpué y su entorno cultural. Puedes activar, desactivar o actualizar la información cuando lo necesites.";

export default function AIAdminPanel() {
  const [config, setConfig] = useState(null);
  const [knowledge, setKnowledge] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [dialogError, setDialogError] = useState("");
  const [revision, setRevision] = useState(0);
  const prefix = useId();
  const addButton = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([aiRequest("/api/admin/ia/configuracion", { signal: controller.signal }), aiRequest("/api/admin/ia/conocimiento", { signal: controller.signal })])
      .then(([value, sections]) => { setConfig(value); setKnowledge(sections); })
      .catch((failure) => { if (failure.name !== "AbortError") setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  function changeConfig(field, value) { setConfig((current) => ({ ...current, [field]: value })); }
  async function saveConfig(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      setConfig(await aiRequest("/api/admin/ia/configuracion", { method: "PUT", body: JSON.stringify(config) }));
      setNotice("Configuración guardada."); setRevision((value) => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  function edit(value) { setDialogError(""); setEditing({ ...value }); }
  async function saveSection(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setDialogError(""); setNotice("");
    try {
      const value = await aiRequest("/api/admin/ia/conocimiento" + (editing.id ? "/" + editing.id : ""), { method: editing.id ? "PUT" : "POST", body: JSON.stringify(editing) });
      setKnowledge((rows) => [...rows.filter((row) => row.id !== value.id), value].sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo)));
      setEditing(null); setNotice("Sección guardada."); setRevision((value) => value + 1);
    } catch (failure) { setDialogError(failure.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (busy) return; setBusy(true); setDialogError("");
    try {
      await aiRequest("/api/admin/ia/conocimiento/" + deleting.id, { method: "DELETE" });
      setKnowledge((rows) => rows.filter((row) => row.id !== deleting.id)); setDeleting(null);
      setNotice("Sección eliminada."); setRevision((value) => value + 1);
      // The row action disappears after deletion; return to a stable control.
      addButton.current?.focus();
    } catch (failure) { setDialogError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="admin-page min-w-0">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><p className="section-label mb-2">Información y comunidad</p><h1>Administrar IA</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#7c5c47]">Dale una voz a Raíz Quilpué y organiza lo que el asistente comparte con los visitantes.</p></div>
      <button type="button" className={buttonClass} onClick={() => setHelpOpen(true)} aria-label="Ayuda sobre Administrar IA"><HelpCircle size={18} aria-hidden="true" />Ayuda (?)</button>
    </header>
    {error ? <p role="alert" className="mb-4 border border-[#bb9c82] p-4 text-sm text-[#8d3b28]">{error}</p> : null}
    {notice ? <p role="status" className="mb-4 border border-[#bb9c82] bg-[#fffdf9] p-4 text-sm">{notice}</p> : null}
    {loading ? <p role="status">Cargando información del asistente…</p> : !config ? <p className="admin-empty">No se pudo cargar la administración. Recarga la página para intentarlo de nuevo.</p> : <>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
        <form className="admin-card admin-form min-w-0 space-y-5 p-4 sm:p-6" onSubmit={saveConfig} aria-busy={busy}>
          <h2 className="font-serif text-xl">Configuración</h2>
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={config.activo} disabled={busy} onChange={(event) => changeConfig("activo", event.target.checked)} />Asistente activo</label>
          {[{ key: "nombre", label: "Nombre del asistente", max: 80 }, { key: "mensaje_inicial", label: "Mensaje inicial", max: 600, multiline: true },
            { key: "mensaje_desconocido", label: "Respuesta cuando no tiene información", max: 600, multiline: true },
            { key: "instrucciones", label: "Comportamiento e indicaciones", max: 2000, multiline: true }].map((item) => <label key={item.key} className="block text-sm font-medium">{item.label}
              {item.multiline ? <textarea className={fieldClass} name={item.key} rows={3} maxLength={item.max} required disabled={busy} value={config[item.key]} onChange={(event) => changeConfig(item.key, event.target.value)} />
                : <input className={fieldClass} name={item.key} maxLength={item.max} required disabled={busy} value={config[item.key]} onChange={(event) => changeConfig(item.key, event.target.value)} />}
            </label>)}
          <p className="text-xs leading-6 text-[#7c5c47]">Las respuestas actuales muestran la información disponible. Las indicaciones de comportamiento se conservarán para el asistente conectado.</p>
          <button type="submit" disabled={busy} className={buttonClass + " bg-[#704a31] text-[#f4ece4]"}><Save size={16} aria-hidden="true" />{busy ? "Guardando…" : "Guardar configuración"}</button>
        </form>
        <section className="min-w-0" aria-labelledby={prefix + "-preview"}>
          <h2 id={prefix + "-preview"} className="mb-2 flex items-center gap-2 font-serif text-xl"><MessageCircle size={20} aria-hidden="true" />Probar asistente</h2>
          <p className="mb-4 text-xs leading-6 text-[#7c5c47]">Prueba las respuestas con la configuración y las secciones guardadas. La conversación es temporal.</p>
          <AssistantProvider preview key={revision}><ChatPanel /></AssistantProvider>
        </section>
      </div>
      <section className="admin-card mt-6 p-4 sm:p-6" aria-labelledby={prefix + "-knowledge"}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div><h2 id={prefix + "-knowledge"} className="font-serif text-xl">Base de conocimiento</h2><p className="mt-2 text-sm leading-6 text-[#7c5c47]">Comparte información pública y verificada. Las secciones activas podrán aparecer en las respuestas. {knowledge.length}/200 secciones.</p></div>
          <button ref={addButton} type="button" disabled={busy || knowledge.length >= 200} className={buttonClass + " shrink-0"} onClick={() => edit({ ...empty, orden: Math.min(9999, knowledge.length ? Math.max(...knowledge.map((row) => row.orden)) + 1 : 0) })}><Plus size={17} aria-hidden="true" />Agregar sección</button>
        </div>
        {!knowledge.length ? <p className="admin-empty text-sm">Todavía no hay secciones. Agrega información sobre la corporación, visitas o preguntas frecuentes.</p> : <ol className="grid gap-3">
          {knowledge.map((row) => <li key={row.id} className="flex min-w-0 flex-col justify-between gap-4 rounded-sm border border-[#e6ddd4] p-4 sm:flex-row">
            <div className="min-w-0"><p className="text-xs text-[#7c5c47]">Orden {row.orden} · {row.categoria} · {row.activo ? "Activa" : "Inactiva"}</p><h3 className="mt-1 text-lg wrap-anywhere">{row.titulo}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 wrap-anywhere text-[#7c5c47]">{row.contenido}</p></div>
            <div className="flex shrink-0 items-start gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => edit(row)} aria-label={`Editar ${row.titulo}`}><Pencil size={15} aria-hidden="true" />Editar</button><button type="button" className={buttonClass} disabled={busy} onClick={() => { setDialogError(""); setDeleting(row); }} aria-label={`Eliminar ${row.titulo}`}><Trash2 size={15} aria-hidden="true" />Eliminar</button></div>
          </li>)}
        </ol>}
      </section>
    </>}
    {helpOpen ? <AdminDialog onClose={() => setHelpOpen(false)} aria-labelledby={prefix + "-help"} className="max-w-lg bg-[#fffdf9] p-6"><h2 id={prefix + "-help"} className="font-serif text-xl">¿Cómo administrar el asistente?</h2><p className="mt-4 text-sm leading-7">{help}</p><button type="button" className={buttonClass + " mt-5"} onClick={() => setHelpOpen(false)}>Entendido</button></AdminDialog> : null}
    {editing ? <AdminDialog onClose={() => setEditing(null)} busy={busy} aria-labelledby={prefix + "-edit"} className="max-w-2xl bg-[#fffdf9] p-5 sm:p-6">
      <form onSubmit={saveSection} className="admin-form space-y-4"><h2 id={prefix + "-edit"} className="font-serif text-xl">{editing.id ? "Editar sección" : "Agregar sección"}</h2>
        {[{ key: "titulo", label: "Título", max: 160 }, { key: "categoria", label: "Categoría", max: 80 }].map((item) => <label key={item.key} className="block text-sm">{item.label}<input name={item.key} required maxLength={item.max} className={fieldClass} disabled={busy} value={editing[item.key]} onChange={(event) => setEditing({ ...editing, [item.key]: event.target.value })} /></label>)}
        <label className="block text-sm">Contenido<textarea name="contenido" required maxLength={8000} rows={7} className={fieldClass} disabled={busy} value={editing.contenido} onChange={(event) => setEditing({ ...editing, contenido: event.target.value })} /></label>
        <label className="block text-sm">Orden<input name="orden" type="number" min={0} max={9999} required className={fieldClass} disabled={busy} value={editing.orden} onChange={(event) => setEditing({ ...editing, orden: event.target.value === "" ? "" : Number(event.target.value) })} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input name="activo" type="checkbox" checked={editing.activo} disabled={busy} onChange={(event) => setEditing({ ...editing, activo: event.target.checked })} />Sección activa</label>
        {dialogError ? <p role="alert" className="text-sm text-[#8d3b28]">{dialogError}</p> : null}
        <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} className={buttonClass} onClick={() => setEditing(null)}>Cancelar</button><button type="submit" disabled={busy} className={buttonClass + " bg-[#704a31] text-[#f4ece4]"}>{busy ? "Guardando…" : "Guardar sección"}</button></div>
      </form>
    </AdminDialog> : null}
    {deleting ? <AdminDialog onClose={() => setDeleting(null)} busy={busy} aria-labelledby={prefix + "-delete"} className="max-w-lg bg-[#fffdf9] p-6"><h2 id={prefix + "-delete"} className="font-serif text-xl">Eliminar sección</h2><p className="mt-4 text-sm leading-7 wrap-anywhere">¿Eliminar «{deleting.titulo}»? También puedes cancelar y desactivarla desde Editar para conservarla.</p>{dialogError ? <p role="alert">{dialogError}</p> : null}<div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className={buttonClass} disabled={busy} onClick={remove}>{busy ? "Eliminando…" : "Eliminar sección"}</button></div></AdminDialog> : null}
  </section>;
}
