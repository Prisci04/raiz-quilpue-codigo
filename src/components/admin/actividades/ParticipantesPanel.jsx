"use client";

import AdminDialog from "@/components/admin/AdminDialog";
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
  Hourglass,
  ImageIcon,
  ListFilter,
  MapPin,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import AdminBadge from "@/components/admin/AdminBadge";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import {
  cuposDisponibles,
  esEstadoPublicada,
  labelParticipacion,
  listaEsperaDisponibles,
  mostrarComoFinalizada,
  todayISO,
} from "@/lib/actividades";
import { deleteParticipante } from "@/lib/api/community";

const PAGE_SIZE = 10;
const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "confirmados", label: "Con cupo" },
  { id: "espera", label: "Lista de espera" },
  { id: "hoy", label: "Inscritos hoy" },
  { id: "semana", label: "Últimos 7 días" },
];
const AVATARS = [
  "bg-[#f3d4c8] text-[#a5452d]",
  "bg-[#f3e6c4] text-[#8a6a20]",
  "bg-[#dce4f5] text-[#4a5d8a]",
  "bg-[#dceee0] text-[#1e6b3f]",
];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

function Status({ value, pasada }) {
  if (mostrarComoFinalizada(value, pasada)) {
    return <AdminBadge tone="neutral">Finalizada</AdminBadge>;
  }
  const published = esEstadoPublicada(value);
  return <AdminBadge tone={published ? "success" : "warning"}>{published ? "Publicada" : "Borrador"}</AdminBadge>;
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
    <th aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined} className={`px-3 py-3 ${className}`}>
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
  const [removeTarget, setRemoveTarget] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [sort, setSort] = useState({ key: "fecha_creacion", direction: "asc" });
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState(null);

  const participants = useMemo(
    () =>
      initialParticipants
        .filter((item) => !removedIds.has(item.id))
        .map((person) => ({
          ...person,
          lista_espera: Boolean(person.lista_espera),
        })),
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
  const waitlistCount = participants.filter((person) => person.lista_espera).length;
  const confirmedCount = participants.length - waitlistCount;
  const remaining = cuposDisponibles(activity.cupos, confirmedCount);
  const waitlistRemaining = listaEsperaDisponibles(
    activity.cupos,
    activity.cupos_espera,
    waitlistCount,
  );
  const filledPct = cupos ? Math.min(100, Math.round((confirmedCount / cupos) * 100)) : 0;
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
      if (filter === "espera") return person.lista_espera;
      if (filter === "confirmados") return !person.lista_espera;
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
        : { key, direction: "asc" }
    ));
  }

  async function exportPdf(rows) {
    if (!rows.length) return;
    setActionError("");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const tableWidth = pageWidth - margin * 2;
      const columns = [
        { label: "NOMBRE", width: 52 },
        { label: "CORREO", width: 86 },
        { label: "TELÉFONO", width: 38 },
        { label: "ESTADO", width: 40 },
        { label: "INSCRIPCIÓN", width: tableWidth - 216 },
      ];
      let y = 41;

      function drawPageHeading() {
        pdf.setFillColor(241, 234, 226);
        pdf.rect(0, 0, pageWidth, 36, "F");
        pdf.setTextColor(107, 122, 66);
        pdf.setFont("times", "bold");
        pdf.setFontSize(19);
        pdf.text("Raíz Quilpué · Participantes", margin, 13);
        pdf.setTextColor(148, 102, 64);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(
          `${activity.titulo} · ${fechaActividad} · ${rows.length} ${
            rows.length === 1 ? "participante" : "participantes"
          }`,
          margin,
          22,
          { maxWidth: tableWidth },
        );
        pdf.setFillColor(219, 112, 15);
        pdf.rect(margin, 30, tableWidth, 1, "F");
      }

      function drawTableHeading() {
        pdf.setFillColor(249, 245, 240);
        pdf.rect(margin, y, tableWidth, 10, "F");
        pdf.setTextColor(64, 56, 49);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        let x = margin + 3;
        for (const column of columns) {
          pdf.text(column.label, x, y + 6.5);
          x += column.width;
        }
        y += 10;
      }

      function wrappedCell(value, width) {
        const lines = pdf.splitTextToSize(String(value || "—"), width - 6);
        if (lines.length > 3) {
          return [...lines.slice(0, 2), `${lines[2].slice(0, 36)}…`];
        }
        return lines;
      }

      drawPageHeading();
      drawTableHeading();
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);

      rows.forEach((person, index) => {
        const when = inscriptionDateTime(person.fecha_creacion);
        const values = [
          `${person.nombre ?? ""} ${person.apellido ?? ""}`.trim() || "—",
          person.email,
          person.telefono,
          person.lista_espera ? `Espera${person.cupo ? ` · ${person.cupo}` : ""}` : "Cupo",
          `${when.date}${when.time ? ` · ${when.time}` : ""}`,
        ];
        const cells = values.map((value, cellIndex) =>
          wrappedCell(value, columns[cellIndex].width),
        );
        const rowHeight = Math.max(10, ...cells.map((lines) => lines.length * 4 + 4));

        if (y + rowHeight > pageHeight - 16) {
          pdf.addPage();
          drawPageHeading();
          y = 41;
          drawTableHeading();
        }

        if (index % 2 === 0) {
          pdf.setFillColor(249, 245, 240);
          pdf.rect(margin, y, tableWidth, rowHeight, "F");
        }
        pdf.setTextColor(64, 56, 49);
        let x = margin + 3;
        cells.forEach((lines, cellIndex) => {
          pdf.text(lines, x, y + 5.5);
          x += columns[cellIndex].width;
        });
        y += rowHeight;
      });

      const pageCount = pdf.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        pdf.setPage(pageNumber);
        pdf.setTextColor(148, 102, 64);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(
          `Raíz Quilpué · ${new Intl.DateTimeFormat("es-CL").format(new Date())}`,
          margin,
          pageHeight - 7,
        );
        pdf.text(`${pageNumber} / ${pageCount}`, pageWidth - margin, pageHeight - 7, {
          align: "right",
        });
      }

      pdf.save(`participantes-${activity.id}.pdf`);
      setMenu(null);
    } catch (exportError) {
      console.error("[ParticipantesPanel] No fue posible generar el PDF:", exportError);
      setActionError("No fue posible generar el PDF de participantes. Inténtalo nuevamente.");
    }
  }

  async function removeParticipant(person) {
    setBusyId(person.id);
    setActionError("");
    try {
      await deleteParticipante(activity.id, person.id);
      setRemoveTarget(null);
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
    <section className="admin-page">
      <p className="text-[13px] text-[#8d7b6d]">
        <Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link>
        <span className="px-1.5" aria-hidden="true">›</span>
        <Link href="/admin/actividades" className="hover:text-[#2c1810]">Actividades</Link>
        <span className="px-1.5" aria-hidden="true">›</span>
        <Link href={`/admin/actividades/${activity.id}`} className="hover:text-[#2c1810]">{activity.titulo}</Link>
        <span className="px-1.5" aria-hidden="true">›</span>
        Participantes
      </p>

      <Link
        href={`/admin/actividades/${activity.id}`}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#eadfd4] bg-white px-3.5 text-sm text-[#5c4636] hover:bg-[#faf6f1]"
      >
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        Volver a la actividad
      </Link>

      {error || actionError ? (
        <AdminNotice tone="error" onDismiss={() => setActionError("")}>
          {error || actionError}
        </AdminNotice>
      ) : null}

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
            <p className="text-[11px] font-medium tracking-[0.16em] text-[#c45c38] uppercase">Actividad</p>
            <Status value={activity.estado} pasada={activity.pasada} />
          </div>
          <h1 className="mt-1 max-w-3xl font-serif text-[clamp(1.5rem,2.4vw,1.95rem)] leading-tight font-medium tracking-tight text-[#2c1810]">
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

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[#efe6dc] bg-white px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8ebe6] text-[#c45c38]">
              <Users size={15} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] leading-4 text-[#8a7968]">Con cupo</p>
              <p className="text-sm leading-5 font-medium text-[#2c1810]">
                {confirmedCount}
                {cupos !== null ? (
                  <span className="ml-1.5 text-[13px] font-normal text-[#8d7b6d]">de {cupos} cupos</span>
                ) : null}
              </p>
            </div>
          </div>
          {cupos !== null ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#efe6dc]" aria-hidden="true">
              <div className="h-full rounded-full bg-[#c45c38]" style={{ width: `${filledPct}%` }} />
            </div>
          ) : null}
        </article>
        <article className="rounded-xl border border-[#efe6dc] bg-white px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8ebe6] text-[#c45c38]">
              <Users size={15} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] leading-4 text-[#8a7968]">Cupos disponibles</p>
              <p className="text-sm leading-5 font-medium text-[#2c1810]">
                {remaining === null ? "Sin límite" : remaining}
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-[#efe6dc] bg-white px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8ebe6] text-[#c45c38]">
              <CalendarDays size={15} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] leading-4 text-[#8a7968]">Fecha de la actividad</p>
              <p className="text-sm leading-5 font-medium text-[#2c1810]">{fechaActividad}</p>
              <p className="text-[12px] text-[#8d7b6d]">{horario}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-[#efe6dc] bg-white px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8ebe6] text-[#c45c38]">
              {cupos !== null ? <Hourglass size={15} aria-hidden="true" /> : <FileText size={15} aria-hidden="true" />}
            </span>
            <div>
              <p className="text-[11px] leading-4 text-[#8a7968]">
                {cupos !== null ? "Lista de espera" : "Tipo de participación"}
              </p>
              <p className="text-sm leading-5 font-medium text-[#2c1810]">
                {cupos !== null
                  ? `${waitlistCount} de ${Number.isInteger(activity.cupos_espera) ? activity.cupos_espera : 0}`
                  : labelParticipacion(activity.tipo_participacion, { corta: true })}
              </p>
              {cupos !== null && waitlistRemaining !== null ? (
                <p className="text-[12px] text-[#8d7b6d]">{waitlistRemaining} disponibles</p>
              ) : null}
            </div>
          </div>
        </article>
      </div>

      <div className="mt-6 rounded-2xl border border-[#efe6dc] bg-white p-4 sm:p-5">
        <h2 className="font-serif text-lg font-medium text-[#2c1810]">
          {`Participantes (${filtered.length})`}
        </h2>
        <div
          ref={menuRef}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setMenu(null);
              menuRef.current?.querySelector("button")?.focus();
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenu(null);
          }}
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-sm border border-[#eadfd4] bg-[#fbf8f5] px-3">
            <Search size={15} strokeWidth={1.8} className="shrink-0 text-[#a89888]" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar participantes..."
              aria-label="Buscar participantes"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#2c1810] outline-none placeholder:text-[#b3a496]"
            />
          </label>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenu((current) => (current === "filter" ? null : "filter"))}
              aria-expanded={menu === "filter"}
              className={`inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-sm border px-4 text-sm sm:w-auto ${
                filter === "todos"
                  ? "border-[#eadfd4] bg-white text-[#3d342c] hover:bg-[#faf6f1]"
                  : "border-[#1e4536] bg-[#1e4536] font-medium text-white"
              }`}
            >
              <ListFilter size={15} strokeWidth={1.8} aria-hidden="true" />
              Filtrar
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {menu === "filter" ? (
              <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-sm border border-[#e4ddd4] bg-white py-1 shadow-lg">
                {FILTERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setFilter(option.id);
                      setPage(1);
                      setMenu(null);
                    }}
                    className={`block min-h-10 w-full px-3 py-2 text-left text-[13px] ${
                      filter === option.id ? "bg-[#faf7f4] font-medium text-[#2c1810]" : "text-[#2c1810] hover:bg-[#faf7f4]"
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
            onClick={() => exportPdf(filtered)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] hover:bg-[#faf6f1]"
          >
            <Download size={15} strokeWidth={1.8} aria-hidden="true" />
            Descargar
          </button>
        </div>

        {pageRows.length ? (
          <>
            <div tabIndex={0} role="region" aria-label="Listado de participantes" className="admin-table-scroll mt-4 overflow-x-auto">
              <table className="admin-table w-full min-w-[780px] border-collapse text-left text-sm">
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
                            <span className="min-w-0">
                              <span className="font-medium text-[#2c1810]">{person.nombre} {person.apellido}</span>
                              {person.lista_espera ? (
                                <span className="mt-0.5 block">
                                  <AdminBadge tone="warning">Lista de espera{person.cupo ? ` · ${person.cupo}` : ""}</AdminBadge>
                                </span>
                              ) : null}
                            </span>
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
                            onClick={() => { setActionError(""); setRemoveTarget(person); }}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-[#a5452d] hover:bg-[#fff3f0] disabled:opacity-50"
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
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#7c6756] hover:bg-[#efe6dc] disabled:opacity-40"
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
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#7c6756] hover:bg-[#efe6dc] disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="admin-empty px-3 py-12 text-center text-sm text-[#7c5c47]">
            {participants.length
              ? "Ningún participante coincide con la búsqueda o el filtro."
              : "Esta actividad todavía no tiene inscripciones."}
          </p>
        )}
      </div>
      {removeTarget ? (
        <AdminDialog onClose={() => setRemoveTarget(null)} busy={busyId !== null} role="alertdialog"
          aria-labelledby="remove-participant-title" aria-describedby="remove-participant-description"
          className="max-w-md rounded-md border border-[#e6ddd4] bg-white p-6">
          <h2 id="remove-participant-title" className="font-serif text-lg font-medium">Eliminar inscripción</h2>
          <p id="remove-participant-description" className="mt-3 text-sm text-[#7c5c47]">
            Se eliminará la inscripción de {removeTarget.nombre} {removeTarget.apellido}. Esta acción no se puede deshacer.
          </p>
          {actionError ? <p role="alert" className="mt-3 text-sm text-[#8d3b28]">{actionError}</p> : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" disabled={busyId !== null} onClick={() => setRemoveTarget(null)} className="min-h-11 rounded-sm border border-[#e6ddd4] px-4 text-sm">Cancelar</button>
            <button type="button" disabled={busyId !== null} onClick={() => removeParticipant(removeTarget)} className="min-h-11 rounded-sm bg-[#8d3b28] px-4 text-sm text-white">{busyId !== null ? "Eliminando…" : "Eliminar"}</button>
          </div>
        </AdminDialog>
      ) : null}
    </section>
  );
}
