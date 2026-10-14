"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  ImageIcon,
  ListFilter,
  MapPin,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import { cuposDisponibles, todayISO } from "@/lib/actividades";
import { deleteParticipante } from "@/lib/api/community";

const PAGE_SIZE = 10;
const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "hoy", label: "Inscritos hoy" },
  { id: "semana", label: "Últimos 7 días" },
];
const AVATARS = [
  "bg-[#f3d4c8] text-[#a5452d]",
  "bg-[#f3e6c4] text-[#8a6a20]",
  "bg-[#dce4f5] text-[#4a5d8a]",
  "bg-[#dceee0] text-[#1e6b3f]",
];
const PARTICIPACION = {
  inscripcion: "Con inscripción",
  abierta: "Abierta",
  pendiente: "Pendiente",
};
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

function Status({ value }) {
  const published = value === "publicada";
  const cancelled = value === "cancelada";
  const label = published ? "Publicada" : cancelled ? "Cancelada" : "Borrador";
  const style = published
    ? "bg-[#e5f6ea] text-[#1c7a42]"
    : cancelled
      ? "bg-[#fde8e2] text-[#a5452d]"
      : "bg-[#fff3d6] text-[#9a6708]";
  return (
    <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

function activityDateLabel(value) {
  if (!value) return "Fecha pendiente";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "Fecha pendiente";
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

function clock(value) {
  return value ? String(value).slice(0, 5) : "";
}

function horarioLabel(inicio, fin) {
  const from = clock(inicio);
  const to = clock(fin);
  if (from && to) return `${from} – ${to}`;
  if (from) return from;
  return "Hora pendiente";
}

function inscriptionDay(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function inscriptionDateTime(value) {
  if (!value) return { date: "—", time: "" };
  const parts = {};
  for (const part of new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value))) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const month = MONTHS_SHORT[Number(parts.month) - 1] ?? "";
  return {
    date: `${Number(parts.day)} ${month} ${parts.year}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function initials(person) {
  const first = (person.nombre ?? "").trim().charAt(0);
  const last = (person.apellido ?? "").trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "?";
}

function avatarClass(person) {
  return AVATARS[Math.abs(Number(person.id) || 0) % AVATARS.length];
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function daysAgo(isoDay, amount) {
  const [year, month, day] = isoDay.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - amount);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function SortHead({ label, active, direction, onClick, className = "" }) {
  return (
    <th className={`px-3 py-3 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-[#2c1810]"
      >
        {label}
        <span className={`text-[10px] ${active ? "text-[#2c1810]" : "text-[#c4b6a8]"}`} aria-hidden="true">
          {active && direction === "asc" ? "↑" : active && direction === "desc" ? "↓" : "↕"}
        </span>
      </button>
    </th>
  );
}

export default function ParticipantesPanel({
  activity,
  initialParticipants = [],
  error = "",
}) {
  const router = useRouter();
  const menuRef = useRef(null);
  const [removedIds, setRemovedIds] = useState(() => new Set());
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [sort, setSort] = useState({ key: "fecha_creacion", direction: "desc" });
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState(null);

  const participants = useMemo(
    () => initialParticipants.filter((item) => !removedIds.has(item.id)),
    [initialParticipants, removedIds],
  );

  useEffect(() => {
    if (!menu) return undefined;
    function onPointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenu(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menu]);

  const cupos = Number.isInteger(activity.cupos) ? activity.cupos : null;
  const remaining = cuposDisponibles(activity.cupos, participants.length);
  const filledPct = cupos ? Math.min(100, Math.round((participants.length / cupos) * 100)) : 0;
  const fechaActividad = activityDateLabel(activity.fecha);
  const horario = horarioLabel(activity.hora_inicio, activity.hora_fin);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es-CL");
    const today = todayISO();
    const weekStart = daysAgo(today, 6);

    const rows = participants.filter((person) => {
      const haystack = `${person.nombre} ${person.apellido} ${person.email} ${person.telefono}`
        .toLocaleLowerCase("es-CL");
      if (term && !haystack.includes(term)) return false;
      const day = inscriptionDay(person.fecha_creacion);
      if (filter === "hoy") return day === today;
      if (filter === "semana") return day >= weekStart && day <= today;
      return true;
    });

    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => {
      const value = (person) => {
        if (sort.key === "nombre") {
          return `${person.nombre} ${person.apellido}`.toLocaleLowerCase("es-CL");
        }
        if (sort.key === "email") return person.email ?? "";
        if (sort.key === "telefono") return person.telefono ?? "";
        return person.fecha_creacion ?? "";
      };
      return value(left).localeCompare(value(right), "es") * factor;
    });
  }, [participants, query, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(key) {
    setSort((current) => (
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "fecha_creacion" ? "desc" : "asc" }
    ));
  }

  function exportCsv(rows) {
    if (!rows.length) return;
    const header = ["Nombre", "Apellido", "Correo", "Teléfono", "Fecha de inscripción"];
    const body = rows.map((person) => {
      const when = inscriptionDateTime(person.fecha_creacion);
      return [
        csvCell(person.nombre),
        csvCell(person.apellido),
        csvCell(person.email),
        csvCell(person.telefono),
        csvCell(`${when.date} ${when.time}`.trim()),
      ].join(",");
    });
    const blob = new Blob([`\uFEFF${[header.join(","), ...body].join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `participantes-${activity.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMenu(null);
  }

  async function removeParticipant(person) {
    setBusyId(person.id);
    setActionError("");
    try {
      await deleteParticipante(activity.id, person.id);
      setRemovedIds((current) => {
        const next = new Set(current);
        next.add(person.id);
        return next;
      });
      router.refresh();
    } catch (removeError) {
      setActionError(removeError.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <p className="text-[13px] text-[#8d7b6d]">
        <Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link>
        <span className="px-1.5" aria-hidden="true">›</span>
        <Link href="/admin/actividades" className="hover:text-[#2c1810]">Actividades</Link>
        <span className="px-1.5" aria-hidden="true">›</span>
        Participantes
      </p>

      <Link
        href="/admin/actividades"
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#eadfd4] bg-white px-3.5 text-sm text-[#5c4636] hover:bg-[#faf6f1]"
      >
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        Volver a actividades
      </Link>

      {error || actionError ? <AdminNotice tone="error">{error || actionError}</AdminNotice> : null}

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-2xl bg-[#eee4da]">
          {activity.imagen_url ? (
            <Image
              src={activity.imagen_url}
              alt=""
              fill
              sizes="176px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#b7a394]">
              <ImageIcon size={28} strokeWidth={1.6} aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#c45c38] uppercase">Actividad</p>
            <Status value={activity.estado} />
          </div>
          <h1 className="mt-1 max-w-3xl font-serif text-[clamp(1.7rem,3vw,2.35rem)] leading-tight font-semibold tracking-tight text-[#2c1810]">
            {activity.titulo}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#8d7b6d]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} strokeWidth={1.8} aria-hidden="true" />
              {fechaActividad}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
              {horario}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} strokeWidth={1.8} aria-hidden="true" />
              {activity.lugar || "Lugar pendiente"}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#efe6dc] bg-white px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8ebe6] text-[#c45c38]">
              <Users size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-[#8a7968]">Participantes registrados</p>
              <p className="mt-0.5 text-2xl font-semibold text-[#2c1810]">
                {participants.length}
                {cupos !== null ? (
                  <span className="ml-1.5 text-sm font-normal text-[#8d7b6d]">de {cupos} cupos</span>
                ) : null}
              </p>
            </div>
          </div>
          {cupos !== null ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#efe6dc]" aria-hidden="true">
              <div className="h-full rounded-full bg-[#c45c38]" style={{ width: `${filledPct}%` }} />
            </div>
          ) : null}
        </article>
        <article className="rounded-2xl border border-[#efe6dc] bg-white px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8ebe6] text-[#c45c38]">
              <Users size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] text-[#8a7968]">Cupos disponibles</p>
              <p className="mt-0.5 text-2xl font-semibold text-[#2c1810]">
                {remaining === null ? "Sin límite" : remaining}
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-[#efe6dc] bg-white px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8ebe6] text-[#c45c38]">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] text-[#8a7968]">Fecha de la actividad</p>
              <p className="mt-0.5 text-lg leading-6 font-semibold text-[#2c1810]">{fechaActividad}</p>
              <p className="text-sm text-[#8d7b6d]">{horario}</p>
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-[#efe6dc] bg-white px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8ebe6] text-[#c45c38]">
              <FileText size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] text-[#8a7968]">Tipo de participación</p>
              <p className="mt-0.5 text-lg leading-6 font-semibold text-[#2c1810]">
                {PARTICIPACION[activity.tipo_participacion] ?? "Por confirmar"}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-6 rounded-2xl border border-[#efe6dc] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#2c1810]">
              {`Participantes (${filtered.length})`}
            </h2>
            <p className="mt-1 text-sm text-[#8d7b6d]">Lista de personas inscritas en esta actividad.</p>
          </div>
          <div ref={menuRef} className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 min-w-[14rem] flex-1 items-center gap-2 rounded-xl border border-[#eadfd4] bg-[#fbf8f5] px-3 lg:max-w-xs">
              <Search size={16} className="shrink-0 text-[#a4846c]" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre, correo o teléfono..."
                aria-label="Buscar participantes"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#2c1810] outline-none placeholder:text-[#b5a394]"
              />
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu((current) => (current === "filter" ? null : "filter"))}
                aria-expanded={menu === "filter"}
                className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm ${
                  filter === "todos"
                    ? "border-[#eadfd4] bg-white text-[#5c4636] hover:bg-[#faf6f1]"
                    : "border-[#1e4536] bg-[#1e4536] text-white"
                }`}
              >
                <ListFilter size={15} aria-hidden="true" />
                Filtrar
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {menu === "filter" ? (
                <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[#efe6dc] bg-white py-1 shadow-lg">
                  {FILTERS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setFilter(option.id);
                        setPage(1);
                        setMenu(null);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm ${
                        filter === option.id ? "bg-[#faf6f1] font-medium text-[#2c1810]" : "text-[#4d4036] hover:bg-[#faf6f1]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => exportCsv(filtered)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#2c1810] px-3.5 text-sm font-medium text-[#f4ebe3] hover:bg-[#3d2418]"
            >
              <Download size={15} aria-hidden="true" />
              Exportar
            </button>
          </div>
        </div>

        {pageRows.length ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-y border-[#efe6dc] text-xs text-[#8d7b6d]">
                    <SortHead label="Nombre" active={sort.key === "nombre"} direction={sort.direction} onClick={() => toggleSort("nombre")} />
                    <SortHead label="Correo" active={sort.key === "email"} direction={sort.direction} onClick={() => toggleSort("email")} />
                    <SortHead label="Teléfono" active={sort.key === "telefono"} direction={sort.direction} onClick={() => toggleSort("telefono")} />
                    <SortHead label="Fecha de inscripción" active={sort.key === "fecha_creacion"} direction={sort.direction} onClick={() => toggleSort("fecha_creacion")} />
                    <th className="px-3 py-3 text-right uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((person) => {
                    const when = inscriptionDateTime(person.fecha_creacion);
                    return (
                      <tr key={person.id} className="border-b border-[#f3eee8] text-[#4d4036]">
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-2.5">
                            <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarClass(person)}`}>
                              {initials(person)}
                            </span>
                            <span className="font-medium text-[#2c1810]">{person.nombre} {person.apellido}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3">{person.email}</td>
                        <td className="px-3 py-3">{person.telefono}</td>
                        <td className="px-3 py-3">
                          {when.date}
                          {when.time ? <span className="text-[#8d7b6d]"> · {when.time}</span> : null}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            disabled={busyId === person.id}
                            onClick={() => removeParticipant(person)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#a5452d] hover:bg-[#fff3f0] disabled:opacity-50"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            {busyId === person.id ? "Quitando…" : "Quitar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8d7b6d]">
              <p>
                {`Mostrando ${pageRows.length} de ${filtered.length} ${filtered.length === 1 ? "participante" : "participantes"}`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  aria-label="Página anterior"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7c6756] hover:bg-[#efe6dc] disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#2c1810] px-2 text-xs font-medium text-white">
                  {currentPage}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  aria-label="Página siguiente"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7c6756] hover:bg-[#efe6dc] disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="px-3 py-12 text-center text-sm text-[#7c5c47]">
            {participants.length
              ? "Ningún participante coincide con la búsqueda o el filtro."
              : "Esta actividad todavía no tiene inscripciones."}
          </p>
        )}
      </div>
    </section>
  );
}
