"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CircleCheck, Clock3, Eye, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import { deleteActividad, getParticipantes, saveActividad } from "@/lib/api/community";

const dateLabel = (value) => {
  if (!value) return "Fecha pendiente";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function Status({ value }) {
  const published = value === "publicada";
  const cancelled = value === "cancelada";
  const label = published ? "Publicada" : cancelled ? "Cancelada" : "Borrador";
  const style = published
    ? "bg-[#e5f6ea] text-[#1c7a42]"
    : cancelled
      ? "bg-[#fde8e2] text-[#a5452d]"
      : "bg-[#fff3d6] text-[#9a6708]";
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>;
}

function ParticipantsDialog({ activity, participants, loading, error, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#2c1810]/55 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="participants-title" className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#efe6dc] bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#8d7b6d]">Inscripciones</p>
            <h2 id="participants-title" className="mt-1 font-serif text-2xl font-semibold text-[#2c1810]">{activity.titulo}</h2>
            <p className="mt-1 text-sm text-[#7c6a5c]">{participants.length} participantes registrados</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar participantes" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#7c6756] hover:bg-[#f3eee8]"><X size={18} /></button>
        </div>
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {loading ? <p className="py-10 text-center text-sm text-[#7c6a5c]">Cargando participantes…</p> : participants.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-[#efe6dc] text-xs uppercase tracking-wide text-[#8d7b6d]"><th className="px-3 py-3">Nombre</th><th className="px-3 py-3">Correo</th><th className="px-3 py-3">Teléfono</th><th className="px-3 py-3">Inscripción</th></tr></thead>
              <tbody>{participants.map((person) => <tr key={person.id} className="border-b border-[#f3eee8] text-[#4d4036]"><td className="px-3 py-3">{person.nombre} {person.apellido}</td><td className="px-3 py-3">{person.email}</td><td className="px-3 py-3">{person.telefono}</td><td className="px-3 py-3">{new Date(person.fecha_creacion).toLocaleDateString("es-CL")}</td></tr>)}</tbody>
            </table>
          </div>
        ) : !loading && !error ? <p className="py-10 text-center text-sm text-[#7c6a5c]">Esta actividad todavía no tiene inscripciones.</p> : null}
      </section>
    </div>
  );
}

export default function ActividadesPanel({ activities = [], error = "", notice = "" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todas");
  const [actionError, setActionError] = useState("");
  const [noticeText, setNoticeText] = useState(notice);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [participantsActivity, setParticipantsActivity] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsError, setParticipantsError] = useState("");
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const visible = useMemo(() => activities.filter((activity) => {
    const term = query.trim().toLocaleLowerCase("es-CL");
    const matchesQuery = !term || `${activity.titulo} ${activity.descripcion} ${activity.lugar ?? ""}`.toLocaleLowerCase("es-CL").includes(term);
    return matchesQuery && (filter === "todas" || activity.estado === filter);
  }), [activities, filter, query]);

  async function toggleStatus(activity) {
    setBusyId(activity.id);
    setActionError("");
    try {
      const next = activity.estado === "publicada" ? "borrador" : "publicada";
      await saveActividad({
        ...activity,
        hora_inicio: typeof activity.hora_inicio === "string" ? activity.hora_inicio.slice(0, 5) : activity.hora_inicio,
        hora_fin: typeof activity.hora_fin === "string" ? activity.hora_fin.slice(0, 5) : activity.hora_fin,
        estado: next,
      }, activity.id);
      setNoticeText(next === "publicada" ? "Actividad publicada correctamente." : "Actividad guardada como borrador.");
      router.refresh();
    } catch (saveError) {
      setActionError(saveError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeActivity() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setActionError("");
    try {
      await deleteActividad(deleteTarget.id);
      setDeleteTarget(null);
      setNoticeText("Actividad eliminada correctamente.");
      router.refresh();
    } catch (deleteError) {
      setActionError(deleteError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function showParticipants(activity) {
    setParticipantsActivity(activity);
    setParticipants([]);
    setParticipantsError("");
    setParticipantsLoading(true);
    try {
      setParticipants(await getParticipantes(activity.id));
    } catch (loadError) {
      setParticipantsError(loadError.message);
    } finally {
      setParticipantsLoading(false);
    }
  }

  const cards = [
    { label: "Total actividades", value: activities.length, icon: CalendarDays, id: "todas" },
    { label: "Publicadas", value: activities.filter((item) => item.estado === "publicada").length, icon: CircleCheck, id: "publicada" },
    { label: "Borradores", value: activities.filter((item) => item.estado === "borrador").length, icon: Clock3, id: "borrador" },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-[#8d7b6d]"><Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link><span className="px-1.5" aria-hidden="true">›</span>Actividades</p>
          <h1 className="mt-2 font-serif text-[clamp(2rem,3vw,2.6rem)] font-semibold tracking-tight text-[#2c1810]">Actividades</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#7c6a5c]">Administra la programación y consulta desde cada actividad a las personas inscritas.</p>
        </div>
      </div>
      {noticeText ? <AdminNotice>{noticeText}</AdminNotice> : null}
      {error || actionError ? <AdminNotice tone="error">{error || actionError}</AdminNotice> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, id }) => <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-4 text-left ${filter === id ? "border-[#1e4536]" : "border-[#efe6dc]"}`}><span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#f3eee8] text-[#5c4636]"><Icon size={18} /></span><span><span className="block text-[13px] text-[#8a7968]">{label}</span><span className="mt-0.5 block text-2xl font-semibold text-[#2c1810]">{value}</span></span></button>)}
      </div>

      <div className="mt-4 rounded-2xl border border-[#efe6dc] bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-2 overflow-x-auto">{[["todas", "Todas"], ["publicada", "Publicadas"], ["borrador", "Borradores"], ["cancelada", "Canceladas"]].map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={`h-9 shrink-0 rounded-sm px-4 text-[13px] ${filter === id ? "bg-[#1e4536] font-medium text-white" : "border border-[#eadfd4] text-[#3d342c] hover:bg-[#faf6f1]"}`}>{label}</button>)}</div>
          <div className="flex flex-1 gap-2 sm:ml-auto sm:max-w-md"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar actividades..." aria-label="Buscar actividades" className="h-9 min-w-0 flex-1 rounded-sm border border-[#eadfd4] bg-[#fbf8f5] px-3 text-sm outline-none focus:border-[#c4a484]" /><Link href="/admin/actividades/nueva" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm bg-[#c45c38] px-4 text-sm font-medium text-white hover:bg-[#a84c2c]"><Plus size={15} />Nueva actividad</Link></div>
        </div>
        {visible.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[770px] border-collapse text-left text-sm"><thead><tr className="border-y border-[#efe6dc] text-xs uppercase tracking-wide text-[#8d7b6d]"><th className="px-3 py-3">Actividad</th><th className="px-3 py-3">Fecha y lugar</th><th className="px-3 py-3">Modalidad</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Acciones</th></tr></thead><tbody>{visible.map((activity) => <tr key={activity.id} className="border-b border-[#f3eee8]"><td className="max-w-xs px-3 py-4"><p className="truncate font-medium text-[#2c1810]">{activity.titulo}</p><p className="mt-1 truncate text-xs text-[#8d7b6d]">{activity.descripcion}</p></td><td className="px-3 py-4 text-[#5c4d42]">{dateLabel(activity.fecha)}<p className="mt-1 text-xs text-[#8d7b6d]">{activity.lugar || "Lugar pendiente"}</p></td><td className="px-3 py-4 text-[#5c4d42]">{activity.modalidad === "virtual" ? "Online" : activity.modalidad === "hibrida" ? "Híbrida" : "Presencial"}</td><td className="px-3 py-4"><Status value={activity.estado} /></td><td className="px-3 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => showParticipants(activity)} title="Ver participantes" aria-label={`Ver participantes de ${activity.titulo}`} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[#1e4536] hover:bg-[#e5f6ea]"><Users size={15} /><span className="hidden lg:inline">Participantes</span></button><Link href={`/admin/actividades/${activity.id}/editar`} title="Editar" aria-label={`Editar ${activity.titulo}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#7c6756] hover:bg-[#efe6dc]"><Pencil size={15} /></Link>{activity.estado === "publicada" ? <Link href={`/actividades/${activity.id}`} target="_blank" title="Ver actividad" aria-label={`Ver ${activity.titulo} en el portal`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#7c6756] hover:bg-[#efe6dc]"><Eye size={15} /></Link> : null}<button type="button" disabled={busyId === activity.id} onClick={() => toggleStatus(activity)} className="rounded-md px-2 text-xs text-[#5c4636] hover:bg-[#f3eee8] disabled:opacity-50">{activity.estado === "publicada" ? "Borrador" : "Publicar"}</button><button type="button" disabled={busyId === activity.id} onClick={() => setDeleteTarget(activity)} aria-label={`Eliminar ${activity.titulo}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#a5452d] hover:bg-[#fff3f0]"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <p className="px-3 py-12 text-center text-sm text-[#7c5c47]">No hay actividades con ese criterio.</p>}
      </div>
      {participantsActivity ? <ParticipantsDialog activity={participantsActivity} participants={participants} loading={participantsLoading} error={participantsError} onClose={() => setParticipantsActivity(null)} /> : null}
      {deleteTarget ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#2c1810]/55 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-activity-title" className="w-full max-w-md rounded-xl border border-[#efe6dc] bg-white p-6 shadow-2xl"><h2 id="delete-activity-title" className="font-serif text-xl font-semibold text-[#2c1810]">¿Eliminar actividad?</h2><p className="mt-2 text-sm leading-relaxed text-[#7c6a5c]">Se eliminará “{deleteTarget.titulo}” y su listado de participantes. Esta acción no se puede deshacer.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="min-h-10 rounded-sm border border-[#e6ddd4] px-4 text-sm">Cancelar</button><button type="button" disabled={busyId === deleteTarget.id} onClick={removeActivity} className="min-h-10 rounded-sm bg-[#a5452d] px-4 text-sm font-medium text-white disabled:opacity-50">{busyId === deleteTarget.id ? "Eliminando…" : "Eliminar"}</button></div></section></div> : null}
    </section>
  );
}
