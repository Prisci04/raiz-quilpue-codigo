"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Eye,
  FileText,
  ImageIcon,
  Landmark,
  MoreHorizontal,
  Newspaper,
  Palette,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Users,
} from "lucide-react";
import AdminBadge from "@/components/admin/AdminBadge";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import DeleteContenidoDialog from "@/components/admin/contenidos/DeleteContenidoDialog";
import { esEstadoBorrador, esEstadoPublicada } from "@/lib/actividades";
import { deleteContenido, setEstadoContenido } from "@/lib/api/contenidos";
import {
  NOMBRE_ESTADO_BORRADOR,
  NOMBRE_ESTADO_PUBLICADA,
  NOMBRE_TIPO_CAPSULA,
  NOMBRE_TIPO_COMUNIDAD,
  NOMBRE_TIPO_CULTURA,
  NOMBRE_TIPO_NOTICIA,
  NOMBRE_TIPO_PATRIMONIO,
} from "@/lib/catalogos.mjs";
import { TIPO_LABELS_ADMIN } from "@/lib/contenidos/documento.mjs";

const PAGE_SIZE = 8;

const TIPO_LABELS = TIPO_LABELS_ADMIN;

const TIPO_ICONS = {
  [NOMBRE_TIPO_NOTICIA]: Newspaper,
  [NOMBRE_TIPO_PATRIMONIO]: Landmark,
  [NOMBRE_TIPO_CAPSULA]: ScrollText,
  [NOMBRE_TIPO_CULTURA]: Palette,
  [NOMBRE_TIPO_COMUNIDAD]: Users,
};

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: NOMBRE_TIPO_NOTICIA, label: "Noticias" },
  { id: NOMBRE_TIPO_PATRIMONIO, label: "Patrimonio" },
  { id: NOMBRE_TIPO_CAPSULA, label: "Cápsulas" },
  { id: NOMBRE_TIPO_CULTURA, label: "Cultura" },
  { id: NOMBRE_TIPO_COMUNIDAD, label: "Comunidad" },
];

function matchesFilter(contenido, filterId) {
  if (filterId === "todos") return true;
  if (filterId === "publicada") return esEstadoPublicada(contenido.estado);
  if (filterId === "borrador") return esEstadoBorrador(contenido.estado);
  return contenido.tipo === filterId;
}

function timestamp(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function TipoCell({ tipo }) {
  const Icon = TIPO_ICONS[tipo] ?? Newspaper;

  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-[#5c4d42]">
      <Icon size={15} strokeWidth={1.7} className="shrink-0 text-[#8a7968]" aria-hidden="true" />
      {TIPO_LABELS[tipo] ?? tipo}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const published = esEstadoPublicada(estado);

  return <AdminBadge tone={published ? "success" : "warning"}>{published ? "Publicado" : "Borrador"}</AdminBadge>;
}

function SummaryCard({ icon: Icon, iconClass, label, value, valueClass = "text-[#2c1810]", active = false, onClick }) {
  const className = `flex w-full items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left ${
    active ? "border-[#1e4536]" : "border-[#efe6dc]"
  } ${onClick ? "transition-colors hover:border-[#e0d4c6]" : ""}`;
  const body = (
    <>
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] leading-4 text-[#8a7968]">{label}</span>
        <span className={`block truncate text-sm leading-5 font-medium ${valueClass}`}>
          {value}
        </span>
      </span>
    </>
  );

  if (!onClick) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      {body}
    </button>
  );
}

function Thumb({ contenido }) {
  if (contenido.imagen_url) {
    return (
      <Image
        src={contenido.imagen_url}
        alt=""
        width={72}
        height={56}
        className="h-14 w-[4.5rem] shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <span className="inline-flex h-14 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-[#f3eee8] text-[#b7a394]">
      <ImageIcon size={16} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

function RowActions({ contenido, busy, onEstado, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link
        href={`/admin/contenidos/${contenido.id}/editar`}
        aria-label={`Editar ${contenido.titulo}`}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#7c6756] transition-colors hover:bg-[#efe6dc]"
      >
        <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
      </Link>
      {esEstadoPublicada(contenido.estado) ? (
        <Link
          href={`/contenido/${contenido.id}`}
          aria-label={`Ver ${contenido.titulo} en el portal`}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#7c6756] transition-colors hover:bg-[#efe6dc]"
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
      <div className="relative" ref={menuRef}
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
          aria-label={`Más acciones de ${contenido.titulo}`}
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
                onEstado(contenido);
              }}
            >
              {esEstadoPublicada(contenido.estado) ? "Pasar a borrador" : "Publicar"}
            </button>
            <button
              type="button"
              className="block min-h-10 w-full px-3 py-2 text-left text-[13px] text-[#8d3b28] hover:bg-[#faf7f4]"
              onClick={() => {
                menuRef.current?.querySelector("button")?.focus();
                setOpen(false);
                onDelete(contenido);
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

export default function ContenidosPanel({ contenidos, error, notice = "" }) {
  const router = useRouter();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [filterId, setFilterId] = useState("todos");
  const [sort, setSort] = useState("recientes");
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState(notice);
  const [trackedNotice, setTrackedNotice] = useState(notice);
  const [actionError, setActionError] = useState("");

  if (notice !== trackedNotice) {
    setTrackedNotice(notice);
    setBanner(notice);
  }
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  async function changeEstado(contenido) {
    setBusyId(contenido.id);
    setActionError("");

    try {
      const next = esEstadoPublicada(contenido.estado)
        ? NOMBRE_ESTADO_BORRADOR
        : NOMBRE_ESTADO_PUBLICADA;
      await setEstadoContenido(contenido.id, next);
      setBanner(
        esEstadoPublicada(next)
          ? "Contenido publicado correctamente."
          : "El contenido volvió a borrador.",
      );
      router.refresh();
    } catch (actionError) {
      setActionError(actionError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setBusyId(pendingDelete.id);
    setActionError("");

    try {
      await deleteContenido(pendingDelete.id);
      setPendingDelete(null);
      setBanner("Contenido eliminado correctamente.");
      router.refresh();
    } catch (actionError) {
      setActionError(actionError.message);
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    const latest = contenidos.reduce((best, item) => {
      const time = timestamp(item.fecha_publicacion);
      if (time === null) return best;
      if (!best || time > best.time) return { time, item };
      return best;
    }, null);

    return {
      total: contenidos.length,
      publicados: contenidos.filter((item) => esEstadoPublicada(item.estado)).length,
      borradores: contenidos.filter((item) => esEstadoBorrador(item.estado)).length,
      ultima: latest?.item?.fecha_texto && latest.item.fecha_texto !== "Sin fecha"
        ? latest.item.fecha_texto
        : "Sin fecha",
    };
  }, [contenidos]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = contenidos.filter((contenido) => {
      const haystack = `${contenido.titulo} ${contenido.descripcion} ${TIPO_LABELS[contenido.tipo] ?? ""}`.toLowerCase();
      return matchesFilter(contenido, filterId) && (!term || haystack.includes(term));
    });

    return filtered.sort((left, right) => {
      const leftTime = timestamp(left.fecha_publicacion);
      const rightTime = timestamp(right.fecha_publicacion);

      if (leftTime === null && rightTime === null) return right.id - left.id;
      if (leftTime === null) return 1;
      if (rightTime === null) return -1;

      return sort === "antiguos" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [contenidos, filterId, query, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(start, start + PAGE_SIZE);
  const from = visible.length === 0 ? 0 : start + 1;
  const to = start + pageItems.length;

  function changeFilter(nextFilter) {
    setFilterId(nextFilter);
    setPage(1);
  }

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
            Contenidos
          </p>
          <h1 className="mt-2 font-serif text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium tracking-tight text-[#2c1810]">
            Contenidos
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#7c6a5c]">
            Aquí podrás crear, editar y publicar noticias, patrimonio, historias y el resto del archivo cultural de Raíz Quilpué.
          </p>
        </div>
      </div>

      {banner ? <AdminNotice onDismiss={() => setBanner("")}>{banner}</AdminNotice> : null}
      {error || actionError ? (
        <AdminNotice tone="error" onDismiss={() => setActionError("")}>
          {error || actionError}
        </AdminNotice>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={FileText}
          iconClass="bg-[#f3eee8] text-[#5c4636]"
          label="Total contenidos"
          value={stats.total}
          active={filterId === "todos"}
          onClick={() => changeFilter("todos")}
        />
        <SummaryCard
          icon={CircleCheck}
          iconClass="bg-[#e5f6ea] text-[#1f7a45]"
          label="Publicados"
          value={stats.publicados}
          valueClass="text-[#1f7a45]"
          active={filterId === "publicada"}
          onClick={() => changeFilter("publicada")}
        />
        <SummaryCard
          icon={FileText}
          iconClass="bg-[#fde8e2] text-[#c45c38]"
          label="Borradores"
          value={stats.borradores}
          valueClass="text-[#c45c38]"
          active={filterId === "borrador"}
          onClick={() => changeFilter("borrador")}
        />
        <SummaryCard
          icon={Clock}
          iconClass="bg-[#f6efe4] text-[#8a5a32]"
          label="Última actualización"
          value={stats.ultima}
        />
      </div>

      <div className="admin-card mt-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto">
            {FILTERS.map((filter) => {
              const active = filter.id === filterId;

              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changeFilter(filter.id)}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-sm px-4 text-[13px] transition-colors ${
                    active
                      ? "bg-[#1e4536] font-medium text-white"
                      : "border border-[#eadfd4] bg-white text-[#3d342c] hover:bg-[#faf6f1]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
            <label htmlFor={searchId} className="sr-only">
              Buscar contenidos
            </label>
            <div className="flex w-full min-w-0 flex-1 items-center gap-2 rounded-sm border border-[#eadfd4] bg-[#fbf8f5] px-3">
              <Search size={15} strokeWidth={1.8} className="shrink-0 text-[#a89888]" aria-hidden="true" />
              <input
                id={searchId}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar contenidos..."
                className="min-h-11 w-full bg-transparent text-sm text-[#2c1810] outline-none placeholder:text-[#b3a496]"
              />
            </div>
            <Link
              href="/admin/contenidos/nuevo"
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm bg-[#c45c38] px-4 text-sm font-medium text-white transition-colors hover:bg-[#a84c2c]"
            >
              <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
              Nuevo contenido
            </Link>
          </div>
        </div>

        {pageItems.length === 0 ? (
          <p className="mt-3 admin-empty px-3 py-12 text-center text-sm text-[#7c5c47]">
            No hay contenidos con ese criterio.
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-3 md:hidden">
              {pageItems.map((contenido) => (
                <li key={contenido.id} className="border-b border-[#e8dfd4] py-3">
                  <Link
                    href={`/admin/contenidos/${contenido.id}`}
                    title={contenido.titulo}
                    className="flex items-start gap-3 text-[#2c1810] hover:text-[#704a31]"
                  >
                    <Thumb contenido={contenido} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{contenido.titulo}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-[#8d7b6d]">
                        {contenido.descripcion}
                      </p>
                    </div>
                  </Link>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <TipoCell tipo={contenido.tipo} />
                    <EstadoBadge estado={contenido.estado} />
                    <span className="text-[13px] text-[#8d7b6d]">
                      {contenido.fecha_texto}
                      {contenido.hora_texto ? ` · ${contenido.hora_texto}` : ""}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-[#f4eee8] pt-3">
                    <RowActions
                      contenido={contenido}
                      busy={busyId === contenido.id}
                      onEstado={changeEstado}
                      onDelete={setPendingDelete}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div tabIndex={0} role="region" aria-label="Listado de contenidos" className="admin-table-scroll mt-2 hidden overflow-x-auto md:block">
              <table className="admin-table w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e6dcd0] text-[13px] text-[#8a7968]">
                    <th className="min-w-72 px-2 py-3 font-medium">Título</th>
                    <th className="hidden w-44 min-w-44 px-2 py-3 font-medium lg:table-cell">Tipo</th>
                    <th className="w-32 min-w-32 px-2 py-3 font-medium">Estado</th>
                    <th className="hidden w-40 min-w-40 px-2 py-3 font-medium lg:table-cell">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => {
                          setSort((current) => (current === "recientes" ? "antiguos" : "recientes"));
                          setPage(1);
                        }}
                      >
                        Fecha de publicación
                        <ChevronDown
                          size={13}
                          strokeWidth={1.8}
                          className={sort === "antiguos" ? "rotate-180" : ""}
                          aria-hidden="true"
                        />
                      </button>
                    </th>
                    <th className="w-40 min-w-40 px-2 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((contenido) => (
                    <tr key={contenido.id} className="border-b border-[#efe6db] last:border-b-0">
                      <td className="px-2 py-3.5">
                        <Link
                          href={`/admin/contenidos/${contenido.id}`}
                          title={contenido.titulo}
                          className="flex items-center gap-3 text-[#2c1810] hover:text-[#704a31]"
                        >
                          <Thumb contenido={contenido} />
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-medium">
                              {contenido.titulo}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#8d7b6d]">
                              {contenido.descripcion}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="hidden px-2 py-3.5 lg:table-cell">
                        <TipoCell tipo={contenido.tipo} />
                      </td>
                      <td className="px-2 py-3.5">
                        <EstadoBadge estado={contenido.estado} />
                      </td>
                      <td className="hidden px-2 py-3.5 whitespace-nowrap lg:table-cell">
                        <p className="text-[#3d342c]">{contenido.fecha_texto || "—"}</p>
                        {contenido.hora_texto ? (
                          <p className="text-[12px] text-[#8a7968]">{contenido.hora_texto}</p>
                        ) : null}
                      </td>
                      <td className="px-2 py-3.5">
                        <RowActions
                          contenido={contenido}
                          busy={busyId === contenido.id}
                          onEstado={changeEstado}
                          onDelete={setPendingDelete}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3">
          <p className="text-[13px] text-[#8a7968]">
            Mostrando {from} a {to} de {visible.length} contenidos
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#7c6756] hover:bg-[#efe6dc] disabled:opacity-40"
              aria-label="Página anterior"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                aria-current={pageNumber === currentPage ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-[13px] ${
                  pageNumber === currentPage
                    ? "bg-[#1e4536] font-medium text-white"
                    : "text-[#4a3f36] hover:bg-[#efe6dc]"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#7c6756] hover:bg-[#efe6dc] disabled:opacity-40"
              aria-label="Página siguiente"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      {pendingDelete ? (
        <DeleteContenidoDialog
          titulo={pendingDelete.titulo}
          error={actionError}
          busy={busyId === pendingDelete.id}
          onCancel={() => {
            if (busyId !== pendingDelete.id) setPendingDelete(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </section>
  );
}
