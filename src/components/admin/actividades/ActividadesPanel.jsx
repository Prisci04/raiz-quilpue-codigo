"use client";

import AdminDialog from "@/components/admin/AdminDialog";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarCheck, CalendarDays, CircleCheck, Clock3, Eye, ImageIcon, MoreHorizontal, Pencil, Plus } from "lucide-react";
import AdminBadge from "@/components/admin/AdminBadge";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import { deleteActividad, saveActividadEstado } from "@/lib/api/community";
import {
  esEstadoBorrador,
  esEstadoPublicada,
  isActividadPasada,
  labelLugarActividad,
  labelModalidad,
} from "@/lib/actividades";
import { NOMBRE_ESTADO_BORRADOR, NOMBRE_ESTADO_PUBLICADA } from "@/lib/catalogos.mjs";

const dateLabel = (value) => {
  if (!value) return "Fecha pendiente";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function isFinalizada(activity) {
  return isActividadPasada(activity.fecha);
}

function matchesFilter(activity, filter) {
  if (filter === "todas") return true;
  if (filter === "finalizada") return isFinalizada(activity);
  if (filter === "publicada") {
    return esEstadoPublicada(activity.estado) && !isActividadPasada(activity.fecha);
  }
  if (filter === "borrador") return esEstadoBorrador(activity.estado);
  return false;
}

function Status({ value, pasada }) {
  if (pasada && esEstadoPublicada(value)) {
    return <AdminBadge tone="neutral">Finalizada</AdminBadge>;
  }
  const published = esEstadoPublicada(value);
  return <AdminBadge tone={published ? "success" : "warning"}>{published ? "Publicada" : "Borrador"}</AdminBadge>;
}

function RowActions({ activity, busy, onEstado, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link
        href={`/admin/actividades/${activity.id}/editar`}
        title="Editar"
        aria-label={`Editar ${activity.titulo}`}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#7c6756] hover:bg-[#efe6dc]"
      >
        <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
      </Link>
      {esEstadoPublicada(activity.estado) ? (
        <Link
          href={`/actividades/${activity.id}`}
          target="_blank"
          title="Ver actividad"
          aria-label={`Ver ${activity.titulo} en el portal`}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#7c6756] hover:bg-[#efe6dc]"
        >
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      ) : (
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-[#d3c4b4]"
          title="El borrador no está publicado"
        >
          <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
        </span>
      )}
      <div
        ref={menuRef}
        className="relative"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setOpen(false);
            menuRef.current?.querySelector("button")?.focus();
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#7c6756] transition-colors hover:bg-[#efe6dc] disabled:opacity-40"
          aria-label={`Más acciones de ${activity.titulo}`}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <MoreHorizontal size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
        {open ? (
          <div className="absolute right-0 bottom-full z-20 mb-1 min-w-44 border border-[#e4ddd4] bg-white py-1 shadow-lg">
            <button
              type="button"
              className="block min-h-10 w-full px-3 py-2 text-left text-[13px] text-[#2c1810] hover:bg-[#faf7f4]"
              onClick={() => {
                setOpen(false);
                onEstado(activity);
              }}
            >
              {esEstadoPublicada(activity.estado) ? "Pasar a borrador" : "Publicar"}
            </button>
            <button
              type="button"
              className="block min-h-10 w-full px-3 py-2 text-left text-[13px] text-[#8d3b28] hover:bg-[#faf7f4]"
              onClick={() => {
                menuRef.current?.querySelector("button")?.focus();
                setOpen(false);
                onDelete(activity);
              }}
            >
              Eliminar
            </button>
          </div>
        ) : null}
      </div>
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

  useEffect(() => {
    if (!notice || typeof window === "undefined") return;
    window.history.replaceState({}, "", "/admin/actividades");
  }, [notice]);

  const visible = useMemo(() => activities.filter((activity) => {
    const term = query.trim().toLocaleLowerCase("es-CL");
    const matchesQuery = !term || `${activity.titulo} ${activity.descripcion} ${labelLugarActividad(activity, "")}`.toLocaleLowerCase("es-CL").includes(term);
    return matchesQuery && matchesFilter(activity, filter);
  }), [activities, filter, query]);

  async function toggleStatus(activity) {
    setBusyId(activity.id);
    setActionError("");
    try {
      const next = esEstadoPublicada(activity.estado) ? NOMBRE_ESTADO_BORRADOR : NOMBRE_ESTADO_PUBLICADA;
      await saveActividadEstado(activity.id, next);
      setNoticeText(esEstadoPublicada(next) ? "Actividad publicada correctamente." : "Actividad guardada como borrador.");
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

  const cards = [
    { label: "Total actividades", value: activities.length, icon: CalendarDays, id: "todas" },
    { label: "Publicadas", value: activities.filter((item) => esEstadoPublicada(item.estado) && !isActividadPasada(item.fecha)).length, icon: CircleCheck, id: "publicada" },
    { label: "Borradores", value: activities.filter((item) => esEstadoBorrador(item.estado)).length, icon: Clock3, id: "borrador" },
    { label: "Finalizadas", value: activities.filter(isFinalizada).length, icon: CalendarCheck, id: "finalizada" },
  ];

  return (
    <section className="admin-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-[#8d7b6d]"><Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link><span className="px-1.5" aria-hidden="true">›</span>Actividades</p>
          <h1 className="mt-2 font-serif text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium tracking-tight text-[#2c1810]">Actividades</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#7c6a5c]">Administra la programación y consulta desde cada actividad a las personas inscritas.</p>
        </div>
      </div>
      {noticeText ? <AdminNotice onDismiss={() => setNoticeText("")}>{noticeText}</AdminNotice> : null}
      {error || actionError ? (
        <AdminNotice tone="error" onDismiss={() => setActionError("")}>
          {error || actionError}
        </AdminNotice>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, id }) => <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={`flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left ${filter === id ? "border-[#1e4536]" : "border-[#efe6dc]"}`}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3eee8] text-[#5c4636]"><Icon size={15} /></span><span><span className="block text-[11px] leading-4 text-[#8a7968]">{label}</span><span className="block text-sm leading-5 font-medium text-[#2c1810]">{value}</span></span></button>)}
      </div>

      <div className="admin-card mt-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex gap-2 overflow-x-auto">{[["todas", "Todas"], ["publicada", "Publicadas"], ["borrador", "Borradores"], ["finalizada", "Finalizadas"]].map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={`min-h-11 shrink-0 rounded-sm px-4 text-[13px] ${filter === id ? "bg-[#1e4536] font-medium text-white" : "border border-[#eadfd4] text-[#3d342c] hover:bg-[#faf6f1]"}`}>{label}</button>)}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row xl:ml-auto xl:max-w-md"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar actividades..." aria-label="Buscar actividades" className="min-h-11 min-w-0 flex-1 rounded-sm border border-[#eadfd4] bg-[#fbf8f5] px-3 text-sm outline-none focus:border-[#c4a484]" /><Link href="/admin/actividades/nueva" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm bg-[#c45c38] px-4 text-sm font-medium text-white hover:bg-[#a84c2c]"><Plus size={15} />Nueva actividad</Link></div>
        </div>
        {visible.length ? (
          <>
            <ul className="mt-4 space-y-3 lg:hidden">
              {visible.map((activity) => (
                <li key={activity.id} className="border-b border-[#efe6dc] py-3 last:border-b-0">
                  <Link
                    href={`/admin/actividades/${activity.id}`}
                    title={activity.titulo}
                    className="flex items-center gap-3 text-[#2c1810]"
                  >
                    {activity.imagen_url ? (
                      <Image src={activity.imagen_url} alt="" width={64} height={48} className="h-12 w-16 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="inline-flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-[#f3eee8] text-[#b7a394]">
                        <ImageIcon size={16} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{activity.titulo}</span>
                      <span className="mt-1 block text-[13px] text-[#7c6a5c]">{dateLabel(activity.fecha)} · {labelModalidad(activity.modalidad)}</span>
                    </span>
                  </Link>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Status value={activity.estado} pasada={isActividadPasada(activity.fecha)} />
                    <Link href={`/admin/actividades/${activity.id}/participantes`} className="inline-flex min-h-10 items-center rounded-md px-2 text-[13px] whitespace-nowrap text-[#1e4536]">
                      Participantes
                    </Link>
                  </div>
                  <div className="mt-2 border-t border-[#f4eee8] pt-2">
                    <RowActions activity={activity} busy={busyId === activity.id} onEstado={toggleStatus} onDelete={setDeleteTarget} />
                  </div>
                </li>
              ))}
            </ul>
            <div tabIndex={0} role="region" aria-label="Listado de actividades" className="admin-table-scroll mt-4 hidden lg:block">
            <table className="admin-table w-full table-fixed border-collapse text-left text-sm">
              <thead>
                <tr className="border-y border-[#efe6dc] text-xs uppercase tracking-wide text-[#8d7b6d]">
                  <th className="w-[26%] px-3 py-3">Actividad</th>
                  <th className="w-[19%] px-3 py-3">Fecha y lugar</th>
                  <th className="w-[12%] px-3 py-3">Modalidad</th>
                  <th className="w-[11%] px-3 py-3">Estado</th>
                  <th className="w-[16%] px-3 py-3 text-right">Participantes</th>
                  <th className="w-[16%] px-3 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((activity) => (
                  <tr key={activity.id} className="border-b border-[#f3eee8]">
                    <td className="px-3 py-4">
                      <Link
                        href={`/admin/actividades/${activity.id}`}
                        title={activity.titulo}
                        className="flex min-w-0 items-center gap-3 text-[#2c1810] hover:text-[#704a31]"
                      >
                        {activity.imagen_url ? (
                          <Image
                            src={activity.imagen_url}
                            alt=""
                            width={64}
                            height={48}
                            className="h-12 w-16 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <span className="inline-flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-[#f3eee8] text-[#b7a394]">
                            <ImageIcon size={16} strokeWidth={1.8} aria-hidden="true" />
                          </span>
                        )}
                        <span className="truncate font-medium">{activity.titulo}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-[#5c4d42]">
                      {dateLabel(activity.fecha)}
                      <p className="mt-1 text-xs text-[#8d7b6d]">{labelLugarActividad(activity)}</p>
                    </td>
                    <td className="px-3 py-4 text-[#5c4d42]">
                      {labelModalidad(activity.modalidad)}
                    </td>
                    <td className="px-3 py-4">
                      <Status value={activity.estado} pasada={isActividadPasada(activity.fecha)} />
                    </td>
                    <td className="px-3 py-4 text-right">
                      <Link
                        href={`/admin/actividades/${activity.id}/participantes`}
                        title="Ver participantes"
                        aria-label={`Ver participantes de ${activity.titulo}`}
                        className="inline-flex min-h-10 items-center justify-end rounded-md px-2 whitespace-nowrap text-[#1e4536] hover:bg-[#e5f6ea]"
                      >
                        Participantes
                      </Link>
                    </td>
                    <td className="px-3 py-4">
                      <RowActions
                        activity={activity}
                        busy={busyId === activity.id}
                        onEstado={toggleStatus}
                        onDelete={setDeleteTarget}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <p className="admin-empty px-3 py-12 text-center text-sm text-[#7c5c47]">No hay actividades con ese criterio.</p>
        )}
      </div>
      {deleteTarget ? <AdminDialog onClose={() => setDeleteTarget(null)} busy={busyId === deleteTarget.id} role="alertdialog" aria-modal="true" aria-labelledby="delete-activity-title" aria-describedby="delete-activity-description" className="w-full max-w-md rounded-xl border border-[#efe6dc] bg-white p-6 shadow-2xl"><h2 id="delete-activity-title" className="font-serif text-lg font-medium text-[#2c1810]">¿Eliminar actividad?</h2><p id="delete-activity-description" className="mt-2 text-sm leading-relaxed text-[#7c6a5c]">Se eliminará “{deleteTarget.titulo}” y su listado de participantes. Esta acción no se puede deshacer.</p>{actionError ? <p role="alert" className="mt-3 text-sm text-[#8d3b28]">{actionError}</p> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busyId === deleteTarget.id} onClick={() => setDeleteTarget(null)} className="min-h-10 rounded-sm border border-[#e6ddd4] px-4 text-sm">Cancelar</button><button type="button" disabled={busyId === deleteTarget.id} onClick={removeActivity} className="min-h-10 rounded-sm bg-[#a5452d] px-4 text-sm font-medium text-white disabled:opacity-50">{busyId === deleteTarget.id ? "Eliminando…" : "Eliminar"}</button></div></AdminDialog> : null}
    </section>
  );
}
