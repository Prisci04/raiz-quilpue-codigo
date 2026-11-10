"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle, Plus, Pencil, Trash2, Save, MessageCircle, BookOpen, Search, Settings2, CheckCircle2, LoaderCircle, FlaskConical, ArrowUpRight } from "lucide-react";
import { AssistantMark } from "@/components/ai/AssistantIdentity";
import AnimatedContent from "@/components/motion/AnimatedContent";
import AdminDialog from "@/components/admin/AdminDialog";
import { AssistantProvider, aiRequest } from "@/components/ai/AssistantProvider";
import ChatPanel from "@/components/ai/ChatPanel";
import "@/components/ai/assistant.css";

const empty = { titulo: "", categoria: "General", contenido: "", orden: 0, activo: true };
const fieldClass = "ai-admin-field";
const buttonClass = "ai-admin-button";
const help = "En esta sección puedes agregar, editar y organizar información que el asistente utilizará para responder preguntas de los visitantes. Cada sección de conocimiento ayuda a la IA a comprender mejor Raíz Quilpué y su entorno cultural. Puedes activar, desactivar o actualizar la información cuando lo necesites.";

export default function AIAdminPanel() {
  const [config, setConfig] = useState(null);
  const [runtime, setRuntime] = useState(null);
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const prefix = useId();
  const addButton = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([aiRequest("/api/admin/ia/configuracion", { signal: controller.signal }), aiRequest("/api/admin/ia/conocimiento", { signal: controller.signal }), aiRequest("/api/admin/ia/estado", { signal: controller.signal })])
      .then(([value, sections, status]) => { setConfig(value); setKnowledge(sections); setRuntime(status); })
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
  const visibleKnowledge = knowledge.filter((row) =>
    (statusFilter === "all" || row.activo === (statusFilter === "active")) &&
    `${row.titulo} ${row.categoria} ${row.contenido}`.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")));
  return <section className="admin-page ai-admin min-w-0">
    <AnimatedContent as="header" className="ai-admin-header">
      <div><p className="ai-eyebrow"><AssistantMark /> Raíz Quilpué IA <span className="ai-experience-badge">Experiencia IA</span></p><h1>Administrar IA</h1><p className="ai-admin-intro">Una voz para el territorio. Configura la experiencia y enriquece lo que compartimos.</p></div>
      <div className="ai-admin-header-actions">{config ? <span className={`ai-state${config.activo ? " is-active" : ""}`}>{config.activo ? "Activo" : "Inactivo"} · Formulario</span> : null}<button type="button" className={buttonClass} onClick={() => setHelpOpen(true)} aria-haspopup="dialog" aria-label="Ayuda sobre Administrar IA"><HelpCircle size={18} aria-hidden="true" />Ayuda (?)</button></div>
    </AnimatedContent>
    {error ? <p role="alert" className="mb-4 border border-[#bb9c82] p-4 text-sm text-[#8d3b28]">{error}</p> : null}
    {notice ? <p role="status" className="ai-admin-notice"><CheckCircle2 size={18} aria-hidden="true" />{notice}</p> : null}
    {loading ? <p role="status" className="ai-admin-loading"><LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />Cargando información del asistente…</p> : !config ? <p className="admin-empty">No se pudo cargar la administración. Recarga la página para intentarlo de nuevo.</p> : <>
      <div className="ai-admin-overview">
        <AnimatedContent className="ai-metric ai-metric-dark" distance={18}><span className="ai-metric-label"><MessageCircle size={17} aria-hidden="true" /> Estado del asistente</span><strong>{config.activo ? "Activo" : "Inactivo"}<span className="ai-metric-dot" aria-hidden="true" /></strong><small>Configuración del formulario · Guarda para aplicar</small></AnimatedContent>
        <AnimatedContent className="ai-metric" delay={80} distance={18}><span className="ai-metric-label"><BookOpen size={17} aria-hidden="true" /> Biblioteca cultural</span><strong>{knowledge.length}<span>secciones</span></strong><small>{knowledge.filter((row) => row.activo).length} activas para orientar las respuestas</small></AnimatedContent>
        <AnimatedContent className="ai-metric" delay={160} distance={18}><span className="ai-metric-label"><FlaskConical size={17} aria-hidden="true" /> Proveedor</span><strong>{runtime?.provider === "qwen" ? "Qwen" : runtime?.provider === "mock" ? "Mock" : "Sin configurar"}<span>{runtime?.configured ? runtime.provider === "mock" ? "demostración" : "configurado" : "pendiente"}</span></strong><small>{runtime?.storage === "supabase" ? "Persistencia Supabase" : "Almacenamiento local de desarrollo"} · {runtime?.configured ? "Configuración disponible" : "Revisa las variables del servidor"}</small></AnimatedContent>
      </div>
      <div className="ai-admin-workspace">
        <AnimatedContent as="form" className="ai-admin-card admin-form ai-config-form" onSubmit={saveConfig} aria-busy={busy}>
          <div className="ai-card-heading"><span className="ai-card-icon"><Settings2 size={20} aria-hidden="true" /></span><div><h2>Configuración</h2><p>Define cómo recibe y acompaña a los visitantes.</p></div></div>
          <label className="ai-activation"><input type="checkbox" checked={config.activo} disabled={busy} onChange={(event) => changeConfig("activo", event.target.checked)} /><span>Asistente activo<small>Permite conversar desde el portal</small></span></label>
          {[{ title: "01 · Identidad y bienvenida", fields: [{ key: "nombre", label: "Nombre del asistente", max: 80 }, { key: "mensaje_inicial", label: "Mensaje inicial", max: 600, multiline: true }] },
            { title: "02 · Respuestas y orientación", fields: [{ key: "mensaje_desconocido", label: "Respuesta cuando no tiene información", max: 600, multiline: true },
              { key: "instrucciones", label: "Comportamiento e indicaciones", max: 2000, multiline: true }] }].map((group) => <fieldset key={group.title} className="ai-config-group"><legend>{group.title}</legend>{group.fields.map((item) => <label key={item.key} className="block text-sm font-medium">{item.label}
              {item.multiline ? <textarea className={fieldClass} name={item.key} rows={3} maxLength={item.max} required disabled={busy} value={config[item.key]} onChange={(event) => changeConfig(item.key, event.target.value)} />
                : <input className={fieldClass} name={item.key} maxLength={item.max} required disabled={busy} value={config[item.key]} onChange={(event) => changeConfig(item.key, event.target.value)} />}
            </label>)}</fieldset>)}
          <p className="text-xs leading-6 text-[#7c5c47]">{runtime?.provider === "qwen" ? "La IA usará las indicaciones guardadas junto al contexto público del portal." : "El modo Mock muestra fragmentos de la información disponible; las indicaciones se aplicarán al usar Qwen."} Los cambios se aplican al guardar.</p>
          <button type="submit" disabled={busy} className={buttonClass + " ai-primary"}><Save size={16} aria-hidden="true" />{busy ? "Guardando…" : "Guardar configuración"}</button>
        </AnimatedContent>
        <AnimatedContent as="section" className="ai-admin-preview" aria-labelledby={prefix + "-preview"}>
          <div className="ai-preview-heading"><h2 id={prefix + "-preview"} className="flex items-center gap-2 font-serif text-xl"><MessageCircle size={20} aria-hidden="true" />Probar asistente</h2><span className="ai-experience-badge">Vista previa</span></div>
          <p className="mb-4 text-xs leading-6 text-[#7c5c47]">Prueba las respuestas con la configuración y las secciones guardadas. La conversación es temporal.</p>
          <AssistantProvider preview key={revision}><ChatPanel /></AssistantProvider>
        </AnimatedContent>
      </div>
      <AnimatedContent as="section" className="ai-admin-card ai-knowledge" aria-labelledby={prefix + "-knowledge"}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="ai-card-heading"><span className="ai-card-icon"><BookOpen size={22} aria-hidden="true" /></span><div><p className="ai-eyebrow">La memoria que compartimos</p><h2 id={prefix + "-knowledge"}>Base de conocimiento</h2><p>Una biblioteca viva de información pública y verificada. {knowledge.length}/200 secciones.</p></div></div>
          <button ref={addButton} type="button" disabled={busy || knowledge.length >= 200} className={buttonClass + " shrink-0"} onClick={() => edit({ ...empty, orden: Math.min(9999, knowledge.length ? Math.max(...knowledge.map((row) => row.orden)) + 1 : 0) })}><Plus size={17} aria-hidden="true" />Agregar sección</button>
        </div>
        {knowledge.length ? <div className="ai-knowledge-filters"><label className="ai-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar en la base de conocimiento</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, categoría o contenido…" /></label><label><span className="sr-only">Filtrar por estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={fieldClass}><option value="all">Todos los estados</option><option value="active">Activas</option><option value="inactive">Inactivas</option></select></label><span aria-live="polite">{visibleKnowledge.length} secciones</span></div> : null}
        {!knowledge.length ? <div className="ai-knowledge-empty"><BookOpen size={30} aria-hidden="true" /><h3>El conocimiento comienza aquí</h3><p>Todavía no hay secciones. Agrega información sobre la corporación, visitas o preguntas frecuentes.</p></div> : !visibleKnowledge.length ? <p className="ai-knowledge-empty">No hay secciones que coincidan. Prueba otra búsqueda o cambia el estado.</p> : <ol className="ai-knowledge-list">
          {visibleKnowledge.map((row, index) => <AnimatedContent as="li" key={row.id} delay={Math.min(index, 4) * 65} distance={16} className="ai-knowledge-item">
            <div className="min-w-0"><div className="ai-knowledge-meta"><span className="ai-category">{row.categoria}</span><span className={`ai-state${row.activo ? " is-active" : ""}`}>{row.activo ? "Activa" : "Inactiva"}</span><span>Orden {row.orden}</span></div><h3 className="mt-3 text-lg wrap-anywhere">{row.titulo}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 wrap-anywhere text-[#7c5c47]">{row.contenido}</p></div>
            <div className="ai-knowledge-actions"><button type="button" className={buttonClass} disabled={busy} onClick={() => edit(row)} aria-label={`Editar ${row.titulo}`}><Pencil size={15} aria-hidden="true" />Editar<ArrowUpRight size={14} aria-hidden="true" /></button><button type="button" className={buttonClass} disabled={busy} onClick={() => { setDialogError(""); setDeleting(row); }} aria-label={`Eliminar ${row.titulo}`}><Trash2 size={15} aria-hidden="true" />Eliminar</button></div>
          </AnimatedContent>)}
        </ol>}
      </AnimatedContent>
    </>}
    {helpOpen ? <AdminDialog onClose={() => setHelpOpen(false)} aria-labelledby={prefix + "-help"} className="ai-admin-dialog ai-help-dialog max-w-lg bg-[#fffdf9] p-6"><span className="ai-card-icon"><HelpCircle size={24} aria-hidden="true" /></span><p className="ai-eyebrow mt-4">Una guía para comenzar</p><h2 id={prefix + "-help"} className="font-serif text-2xl mt-2">¿Cómo administrar el asistente?</h2><p className="mt-4 text-sm leading-7">{help}</p><div className="ai-help-tip"><BookOpen size={20} aria-hidden="true" /><p>Guarda tus cambios y usa «Probar asistente» para revisar cómo responde antes de seguir organizando la información.</p></div><button type="button" className={buttonClass + " ai-primary mt-5"} onClick={() => setHelpOpen(false)}>Entendido</button></AdminDialog> : null}
    {editing ? <AdminDialog onClose={() => setEditing(null)} busy={busy} aria-labelledby={prefix + "-edit"} className="ai-admin-dialog max-w-2xl bg-[#fffdf9] p-5 sm:p-6">
      <form onSubmit={saveSection} className="admin-form space-y-4"><h2 id={prefix + "-edit"} className="font-serif text-xl">{editing.id ? "Editar sección" : "Agregar sección"}</h2>
        {[{ key: "titulo", label: "Título", max: 160 }, { key: "categoria", label: "Categoría", max: 80 }].map((item) => <label key={item.key} className="block text-sm">{item.label}<input name={item.key} required maxLength={item.max} className={fieldClass} disabled={busy} value={editing[item.key]} onChange={(event) => setEditing({ ...editing, [item.key]: event.target.value })} /></label>)}
        <label className="block text-sm">Contenido<textarea name="contenido" required maxLength={8000} rows={7} className={fieldClass} disabled={busy} value={editing.contenido} onChange={(event) => setEditing({ ...editing, contenido: event.target.value })} /></label>
        <label className="block text-sm">Orden<input name="orden" type="number" min={0} max={9999} required className={fieldClass} disabled={busy} value={editing.orden} onChange={(event) => setEditing({ ...editing, orden: event.target.value === "" ? "" : Number(event.target.value) })} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input name="activo" type="checkbox" checked={editing.activo} disabled={busy} onChange={(event) => setEditing({ ...editing, activo: event.target.checked })} />Sección activa</label>
        {dialogError ? <p role="alert" className="text-sm text-[#8d3b28]">{dialogError}</p> : null}
        <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} className={buttonClass} onClick={() => setEditing(null)}>Cancelar</button><button type="submit" disabled={busy} className={buttonClass + " ai-primary"}>{busy ? "Guardando…" : "Guardar sección"}</button></div>
      </form>
    </AdminDialog> : null}
    {deleting ? <AdminDialog onClose={() => setDeleting(null)} busy={busy} aria-labelledby={prefix + "-delete"} className="max-w-lg bg-[#fffdf9] p-6"><h2 id={prefix + "-delete"} className="font-serif text-xl">Eliminar sección</h2><p className="mt-4 text-sm leading-7 wrap-anywhere">¿Eliminar «{deleting.titulo}»? También puedes cancelar y desactivarla desde Editar para conservarla.</p>{dialogError ? <p role="alert">{dialogError}</p> : null}<div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className={buttonClass} disabled={busy} onClick={remove}>{busy ? "Eliminando…" : "Eliminar sección"}</button></div></AdminDialog> : null}
  </section>;
}
