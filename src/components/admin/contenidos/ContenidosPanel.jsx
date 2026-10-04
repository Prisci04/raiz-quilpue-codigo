"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ImageIcon, MoreHorizontal, Plus, Search } from "lucide-react";
import DeleteContenidoDialog from "@/components/admin/contenidos/DeleteContenidoDialog";
import { deleteContenido, setEstadoContenido } from "@/lib/api/contenidos";

const PAGE_SIZE = 8;

const TIPO_LABELS = {
  noticia: "Noticias",
  patrimonio: "Patrimonio",
  capsula_historica: "Cápsulas",
};

const TIPO_TONES = {
  noticia: "bg-[#e7f0fb] text-[#2457a6]",
  patrimonio: "bg-[#e5f6ea] text-[#1f7a45]",
  capsula_historica: "bg-[#f3e8fb] text-[#7a3eaa]",
};

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "publicada", label: "Publicados" },
  { id: "borrador", label: "Borradores" },
  { id: "patrimonio", label: "Patrimonio" },
  { id: "noticia", label: "Noticias" },
  { id: "capsula_historica", label: "Cápsulas" },
];

function matchesFilter(contenido, filterId) {
  if (filterId === "todos") return true;
  if (filterId === "publicada" || filterId === "borrador") return contenido.estado === filterId;
  return contenido.tipo === filterId;
}

function timestamp(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function TipoBadge({ tipo }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${
        TIPO_TONES[tipo] ?? "bg-[#f4efe9] text-[#7c5c47]"
      }`}
    >
      {TIPO_LABELS[tipo] ?? tipo}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const published = estado === "publicada";

  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-[#3d342c]">
      <span
        className={`h-2 w-2 rounded-full ${published ? "bg-[#2f9e5a]" : "bg-[#e0a100]"}`}
        aria-hidden="true"
      />
      {published ? "Publicado" : "Borrador"}
    </span>
  );
}

function Thumb({ contenido }) {
  if (contenido.imagen_url) {
    return (
      <img
        src={contenido.imagen_url}
        alt=""
        className="h-11 w-11 rounded-lg object-cover"
      />
    );
  }

  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#f3eee8] text-[#b7a394]">
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
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/contenidos/${contenido.id}/editar`}
        className="inline-flex min-h-8 items-center rounded-lg border border-[#e4ddd4] bg-white px-3 text-[13px] font-medium text-[#2c1810] transition-colors hover:bg-[#faf7f4]"
      >
        Editar
      </Link>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7c5c47] hover:bg-[#f4efe9] disabled:opacity-40"
          aria-label={`Más acciones de ${contenido.titulo}`}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <MoreHorizontal size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
        {open ? (
          <div className="absolute right-0 z-20 mt-1 min-w-44 border border-[#e4ddd4] bg-white py-1 shadow-lg">
            <Link
              href={`/admin/contenidos/${contenido.id}/editar`}
              className="block px-3 py-2 text-left text-[13px] text-[#2c1810] hover:bg-[#faf7f4]"
              onClick={() => setOpen(false)}
            >
              Editar
            </Link>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#2c1810] hover:bg-[#faf7f4]"
              onClick={() => {
                setOpen(false);
                onEstado(contenido);
              }}
            >
              {contenido.estado === "publicada" ? "Pasar a borrador" : "Publicar"}
            </button>
            {contenido.estado === "publicada" ? (
              <Link
                href={`/contenido/${contenido.id}`}
                className="block px-3 py-2 text-left text-[13px] text-[#2c1810] hover:bg-[#faf7f4]"
                onClick={() => setOpen(false)}
              >
                Ver en el portal
              </Link>
            ) : null}
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#8d3b28] hover:bg-[#faf7f4]"
              onClick={() => {
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
  const sortId = useId();
  const [query, setQuery] = useState("");
  const [filterId, setFilterId] = useState("todos");
  const [sort, setSort] = useState("recientes");
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState(notice);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    setBanner(notice);
  }, [notice]);

  async function changeEstado(contenido) {
    setBusyId(contenido.id);
    setActionError("");

    try {
      const next = contenido.estado === "publicada" ? "borrador" : "publicada";
      await setEstadoContenido(contenido.id, next);
      setBanner(
        next === "publicada"
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

  const counts = useMemo(() => {
    return Object.fromEntries(
      FILTERS.map((filter) => [
        filter.id,
        contenidos.filter((contenido) => matchesFilter(contenido, filter.id)).length,
      ]),
    );
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
            Contenidos
          </p>
          <h1 className="mt-2 text-[clamp(1.8rem,3vw,2.2rem)] font-semibold tracking-tight text-[#2c1810]">
            Contenidos
          </h1>
          <p className="mt-1 text-sm text-[#7c6a5c]">
            Gestiona noticias, patrimonio, historias y archivo cultural.
          </p>
        </div>
        <Link
          href="/admin/contenidos/nuevo"
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#2c1810] px-4 text-sm font-medium text-white transition-colors hover:bg-[#3d2418]"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Nuevo contenido
        </Link>
      </div>

      {banner ? (
        <p className="mt-4 text-sm text-[#2d7a46]" role="status">
          {banner}
        </p>
      ) : null}
      {error || actionError ? (
        <p className="mt-4 text-sm text-[#8d3b28]" role="alert">
          {error || actionError}
        </p>
      ) : null}

      <div className="mt-5 rounded-2xl border border-[#e7dfd6] bg-white p-3 shadow-[0_8px_24px_rgba(44,24,16,0.04)] sm:p-4">
        <label htmlFor={searchId} className="sr-only">
          Buscar contenidos
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-[#ece4db] bg-[#fbfaf8] px-3">
          <Search size={16} strokeWidth={1.8} className="text-[#a89888]" aria-hidden="true" />
          <input
            id={searchId}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar contenidos por título o palabra clave..."
            className="h-11 w-full bg-transparent text-sm text-[#2c1810] outline-none placeholder:text-[#b3a496]"
          />
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const active = filter.id === filterId;

              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changeFilter(filter.id)}
                  className={`inline-flex min-h-8 items-center rounded-full px-3 text-[13px] transition-colors ${
                    active
                      ? "bg-[#2c1810] font-medium text-white"
                      : "border border-[#e6ddd4] bg-white text-[#4d4036] hover:bg-[#faf7f4]"
                  }`}
                >
                  {filter.label} ({counts[filter.id] ?? 0})
                </button>
              );
            })}
          </div>
          <label className="relative inline-flex items-center self-start" htmlFor={sortId}>
            <span className="sr-only">Ordenar contenidos</span>
            <select
              id={sortId}
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className="h-9 appearance-none rounded-lg border border-[#e6ddd4] bg-white pr-8 pl-3 text-[13px] text-[#2c1810] outline-none"
            >
              <option value="recientes">Más recientes</option>
              <option value="antiguos">Más antiguos</option>
            </select>
            <ChevronDown
              size={14}
              strokeWidth={1.8}
              className="pointer-events-none absolute right-2.5 text-[#7c5c47]"
              aria-hidden="true"
            />
          </label>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e8e0] text-[13px] text-[#8d7b6d]">
                <th className="px-3 py-3 font-medium">Título</th>
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">Fecha</th>
                <th className="px-3 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-sm text-[#7c5c47]">
                    No hay contenidos con ese criterio.
                  </td>
                </tr>
              ) : (
                pageItems.map((contenido) => {
                  return (
                    <tr key={contenido.id} className="border-b border-[#f4eee8] last:border-b-0">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Thumb contenido={contenido} />
                          <div className="min-w-0">
                            <p className="font-medium text-[#2c1810]">{contenido.titulo}</p>
                            <p className="mt-0.5 max-w-md truncate text-[13px] text-[#8d7b6d]">
                              {contenido.descripcion}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <TipoBadge tipo={contenido.tipo} />
                      </td>
                      <td className="px-3 py-3">
                        <EstadoBadge estado={contenido.estado} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-[#2c1810]">{contenido.fecha_texto}</p>
                        {contenido.hora_texto ? (
                          <p className="text-[12px] text-[#8d7b6d]">{contenido.hora_texto}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <RowActions
                          contenido={contenido}
                          busy={busyId === contenido.id}
                          onEstado={changeEstado}
                          onDelete={setPendingDelete}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0e8e0] px-3 pt-3">
          <p className="text-[13px] text-[#8d7b6d]">
            Mostrando {from} a {to} de {visible.length} contenidos
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7c5c47] hover:bg-[#f4efe9] disabled:opacity-40"
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
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[13px] ${
                  pageNumber === currentPage
                    ? "bg-[#2c1810] font-medium text-white"
                    : "text-[#4d4036] hover:bg-[#f4efe9]"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7c5c47] hover:bg-[#f4efe9] disabled:opacity-40"
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
