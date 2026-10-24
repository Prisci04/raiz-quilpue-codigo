"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FileImage,
  FilePlus2,
  Inbox,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

import AdminBadge from "@/components/admin/AdminBadge";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";

import {
  convertirAporteEnBorrador,
  deleteAporteMuseo,
  deletePiezaMuseo,
  getAportesMuseo,
  rechazarAporteMuseo,
} from "@/lib/api/community";

import { MUSEO_CATEGORIES } from "@/lib/community-validation.mjs";

const categoryLabel = (id) =>
  MUSEO_CATEGORIES.find((item) => item.id === id)?.label ?? id;

function isPdf(entry) {
  return (
    entry.archivo_nombre?.toLowerCase().endsWith(".pdf") ||
    entry.archivo_url?.toLowerCase().includes(".pdf")
  );
}

function revisionLabel(estado) {
  if (estado === "convertido") return "Convertido";
  if (estado === "rechazado") return "Rechazado";

  return "Pendiente";
}


export default function MuseoPanel({
  pieces = [],
  contributionCount: initialContributionCount = null,
  error = "",
  notice = "",
}) {
  const router = useRouter();

  const [tab, setTab] = useState("piezas");
  const [query, setQuery] = useState("");

  const [contributions, setContributions] = useState([]);
  const [contributionsLoaded, setContributionsLoaded] = useState(false);
  const [loadingContributions, setLoadingContributions] = useState(false);

  const [actionError, setActionError] = useState("");
  const [noticeText, setNoticeText] = useState(notice);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const [convertingId, setConvertingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  async function openContributions() {
    setTab("aportes");

    if (contributionsLoaded) return;

    setLoadingContributions(true);
    setActionError("");

    try {
      const aportes = await getAportesMuseo();
      setContributions(aportes);
      setContributionsLoaded(true);
    } catch (loadError) {
      setActionError(loadError.message);
    } finally {
      setLoadingContributions(false);
    }
  }

  const visiblePieces = useMemo(() => {
    return pieces.filter((piece) => {
      const term = query.trim().toLocaleLowerCase("es-CL");

      return (
        !term ||
        `${piece.titulo} ${piece.descripcion} ${categoryLabel(
          piece.categoria,
        )}`
          .toLocaleLowerCase("es-CL")
          .includes(term)
      );
    });
  }, [pieces, query]);

  const visibleContributions = useMemo(() => {
    return contributions.filter((entry) => {
      const term = query.trim().toLocaleLowerCase("es-CL");

      return (
        !term ||
        `${entry.titulo} ${entry.nombre} ${entry.correo} ${categoryLabel(
          entry.categoria,
        )}`
          .toLocaleLowerCase("es-CL")
          .includes(term)
      );
    });
  }, [contributions, query]);

  async function createDraft(entry) {
    if (
      entry.estado_revision !== "pendiente" ||
      entry.pieza_id
    ) {
      return;
    }

    setConvertingId(entry.id);
    setActionError("");
    setNoticeText("");

    try {
      const result =
        await convertirAporteEnBorrador(entry.id);

      const pieza = result?.pieza;

      if (!pieza?.id) {
        throw new Error(
          "El borrador fue creado, pero no se recibió su identificador.",
        );
      }

      setContributions((current) =>
        current.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                estado_revision: "convertido",
                pieza_id: pieza.id,
              }
            : item,
        ),
      );

      setNoticeText(
        "El aporte fue convertido en borrador correctamente. Revísalo antes de publicarlo.",
      );

      router.refresh();
    } catch (convertError) {
      setActionError(convertError.message);
    } finally {
      setConvertingId(null);
    }
  }

  async function rejectContribution(entry) {
    if (
      entry.estado_revision !== "pendiente" ||
      entry.pieza_id
    ) {
      return;
    }

    setRejectingId(entry.id);
    setActionError("");
    setNoticeText("");

    try {
      await rechazarAporteMuseo(entry.id);

      setContributions((current) =>
        current.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                estado_revision: "rechazado",
                pieza_id: null,
              }
            : item,
        ),
      );

      setNoticeText(
        "El aporte fue rechazado correctamente.",
      );
    } catch (rejectError) {
      setActionError(rejectError.message);
    } finally {
      setRejectingId(null);
    }
  }

  async function remove() {
    if (!deleteTarget) return;

    setBusy(true);
    setActionError("");

    try {
      if (deleteTarget.kind === "pieza") {
        await deletePiezaMuseo(deleteTarget.entry.id);

        setContributions([]);
        setContributionsLoaded(false);
        router.refresh();
      } else {
        await deleteAporteMuseo(deleteTarget.entry.id);

        setContributions((current) =>
          current.filter(
            (item) =>
              item.id !== deleteTarget.entry.id,
          ),
        );
      }

      setNoticeText(
        deleteTarget.kind === "pieza"
          ? "Pieza eliminada correctamente."
          : "Aporte eliminado correctamente.",
      );

      setDeleteTarget(null);
    } catch (deleteError) {
      setActionError(deleteError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-[#8d7b6d]">
            <Link
              href="/admin"
              className="hover:text-[#2c1810]"
            >
              Gestión
            </Link>

            <span className="px-1.5" aria-hidden="true">
              ›
            </span>

            Museo Digital
          </p>

          <h1 className="mt-2 font-serif text-[clamp(2rem,3vw,2.6rem)] font-semibold tracking-tight text-[#2c1810]">
            Museo Digital
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#7c6a5c]">
            Administra las piezas del archivo y revisa los
            aportes enviados por la comunidad.
          </p>
        </div>

        {tab === "piezas" ? (
          <Link
            href="/admin/museo/nueva"
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#c45c38] px-4 text-sm font-medium text-white hover:bg-[#a84c2c]"
          >
            <Plus size={15} />
            Nueva pieza
          </Link>
        ) : null}
      </div>

      {noticeText ? (
        <AdminNotice>{noticeText}</AdminNotice>
      ) : null}

      {error || actionError ? (
        <AdminNotice tone="error">
          {error || actionError}
        </AdminNotice>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTab("piezas")}
          aria-pressed={tab === "piezas"}
          className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-4 text-left ${
            tab === "piezas"
              ? "border-[#1e4536]"
              : "border-[#efe6dc]"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#f3eee8] text-[#5c4636]">
            <FileImage size={18} />
          </span>

          <span>
            <span className="block text-[13px] text-[#8a7968]">
              Piezas del museo
            </span>

            <span className="mt-0.5 block text-2xl font-semibold text-[#2c1810]">
              {pieces.length}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={openContributions}
          aria-pressed={tab === "aportes"}
          className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-4 text-left ${
            tab === "aportes"
              ? "border-[#1e4536]"
              : "border-[#efe6dc]"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#fde8e2] text-[#a5452d]">
            <MessageSquareText size={18} />
          </span>

          <span>
            <span className="block text-[13px] text-[#8a7968]">
              Aportes recibidos
            </span>

            <span className="mt-0.5 block text-2xl font-semibold text-[#2c1810]">
              {contributionsLoaded
                ? contributions.length
                : initialContributionCount ?? "No disponible"}
            </span>
          </span>
        </button>
      </div>

      <div className="admin-card mt-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("piezas")}
              aria-pressed={tab === "piezas"}
              className={`min-h-11 rounded-sm px-4 text-[13px] ${
                tab === "piezas"
                  ? "bg-[#1e4536] text-white"
                  : "border border-[#eadfd4]"
              }`}
            >
              Piezas
            </button>

            <button
              type="button"
              onClick={openContributions}
              aria-pressed={tab === "aportes"}
              className={`min-h-11 rounded-sm px-4 text-[13px] ${
                tab === "aportes"
                  ? "bg-[#1e4536] text-white"
                  : "border border-[#eadfd4]"
              }`}
            >
              Aportes de la comunidad
            </button>
          </div>

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder={
              tab === "piezas"
                ? "Buscar piezas..."
                : "Buscar aportes..."
            }
            aria-label="Buscar en el museo digital"
            className="min-h-11 w-full rounded-sm border border-[#eadfd4] bg-[#fbf8f5] px-3 text-sm outline-none xl:ml-auto xl:max-w-md"
          />
        </div>

        {tab === "piezas" ? (
          visiblePieces.length ? (
            <div className="admin-table-scroll mt-4 overflow-x-auto">
              <table className="admin-table w-full min-w-[700px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-y border-[#efe6dc] text-xs uppercase tracking-wide text-[#8d7b6d]">
                    <th className="px-3 py-3">
                      Pieza
                    </th>

                    <th className="px-3 py-3">
                      Categoría
                    </th>

                    <th className="px-3 py-3">
                      Fecha / lugar
                    </th>

                    <th className="px-3 py-3">
                      Estado
                    </th>

                    <th className="px-3 py-3 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visiblePieces.map((piece) => (
                    <tr
                      key={piece.id}
                      className="border-b border-[#f3eee8]"
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          {piece.imagen_url ? (
                            // Miniatura de portada; puede ser Unsplash, /images/ o almacenamiento.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={piece.imagen_url}
                              alt=""
                              className="h-12 w-16 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span className="inline-flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-[#f3eee8] text-[#b7a394]">
                              <FileImage size={16} />
                            </span>
                          )}
                          <div className="min-w-0">
                        <p className="font-medium text-[#2c1810]">
                          {piece.titulo}
                        </p>

                        <p className="mt-1 max-w-xs truncate text-xs text-[#8d7b6d]">
                          {piece.descripcion}
                        </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-[#5c4d42]">
                        {categoryLabel(
                          piece.categoria,
                        )}
                      </td>

                      <td className="px-3 py-4 text-[#5c4d42]">
                        {piece.fecha_aproximada ||
                          "Sin fecha"}

                        <p className="mt-1 text-xs text-[#8d7b6d]">
                          {piece.lugar ||
                            "Sin lugar"}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <AdminBadge tone={piece.estado === "publicada" ? "success" : "warning"}>
                          {piece.estado === "publicada" ? "Publicada" : "Borrador"}
                        </AdminBadge>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/museo/${piece.id}/editar`}
                            aria-label={`Editar ${piece.titulo}`}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#7c6756] hover:bg-[#efe6dc]"
                          >
                            <Pencil size={15} />
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                kind: "pieza",
                                entry: piece,
                              })
                            }
                            aria-label={`Eliminar ${piece.titulo}`}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#a5452d] hover:bg-[#fff3f0]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-empty px-3 py-12 text-center text-sm text-[#7c5c47]">
              Aún no hay piezas para mostrar.
            </p>
          )
        ) : loadingContributions ? (
          <p className="py-12 text-center text-sm text-[#7c5c47]">
            Cargando aportes…
          </p>
        ) : visibleContributions.length ? (
          <div className="mt-4 space-y-3">
            {visibleContributions.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-[#efe6dc] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs uppercase tracking-wide text-[#a45b35]">
                        {categoryLabel(
                          entry.categoria,
                        )}{" "}
                        ·{" "}
                        {new Date(
                          entry.fecha_creacion,
                        ).toLocaleDateString(
                          "es-CL",
                        )}
                      </p>

                      <AdminBadge tone={entry.estado_revision === "convertido" ? "success" : entry.estado_revision === "rechazado" ? "danger" : "warning"}>
                        {revisionLabel(entry.estado_revision)}
                      </AdminBadge>
                    </div>

                    <h2 className="mt-1 font-serif text-xl font-semibold text-[#2c1810]">
                      {entry.titulo}
                    </h2>

                    <p className="mt-1 text-sm text-[#7c6a5c]">
                      {entry.nombre} ·{" "}
                      <a
                        href={`mailto:${entry.correo}`}
                        className="underline"
                      >
                        {entry.correo}
                      </a>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {entry.estado_revision === "pendiente" &&
                    !entry.pieza_id ? (
                      <>
                        <button
                          type="button"
                          disabled={
                            convertingId === entry.id ||
                            rejectingId === entry.id
                          }
                          onClick={() =>
                            createDraft(entry)
                          }
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-[#1e4536] px-3 text-sm font-medium text-white hover:bg-[#17382c] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FilePlus2 size={15} />

                          {convertingId === entry.id
                            ? "Creando…"
                            : "Aceptar aporte"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            rejectingId === entry.id ||
                            convertingId === entry.id
                          }
                          onClick={() =>
                            rejectContribution(entry)
                          }
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-[#e5b76a] bg-[#fff8e7] px-3 text-sm font-medium text-[#8a6400] hover:bg-[#fff1c7] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircle size={15} />

                          {rejectingId === entry.id
                            ? "Rechazando…"
                            : "Rechazar"}
                        </button>
                      </>
                    ) : null}

                    {entry.estado_revision === "convertido" &&
                    entry.pieza_id ? (
                      <Link
                        href={`/admin/museo/${entry.pieza_id}/editar`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-[#1e4536] px-3 text-sm font-medium text-white hover:bg-[#17382c]"
                      >
                        <Pencil size={15} />
                        Revisar borrador
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "aporte",
                          entry,
                        })
                      }
                      aria-label={`Eliminar aporte ${entry.titulo}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-3 text-sm text-[#8d3b28]"
                    >
                      <Trash2 size={15} />
                      Eliminar
                    </button>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#5c4d42]">
                  {entry.descripcion}
                </p>

                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-[#8d7b6d]">
                      Fecha aproximada
                    </dt>

                    <dd className="mt-1 text-[#4d4036]">
                      {entry.fecha_aproximada ||
                        "No indicada"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-[#8d7b6d]">
                      Lugar
                    </dt>

                    <dd className="mt-1 text-[#4d4036]">
                      {entry.lugar ||
                        "No indicado"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-[#8d7b6d]">
                      Archivo aportado
                    </dt>

                    <dd className="mt-2">
                      {entry.archivo_url ? (
                        <div className="space-y-2">
                          {!isPdf(entry) ? (
                            <a
                              href={entry.archivo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block w-fit"
                            >
                              {/* Miniatura de un archivo de la comunidad; puede ser almacenamiento externo. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={entry.archivo_url}
                                alt={`Archivo aportado: ${entry.titulo}`}
                                className="h-24 w-32 rounded-md border border-[#e6ddd4] object-cover"
                              />
                            </a>
                          ) : null}

                          <a
                            href={entry.archivo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#a5452d] underline underline-offset-2"
                          >
                            <Inbox size={14} />

                            {isPdf(entry)
                              ? "Abrir PDF"
                              : "Ver imagen"}
                          </a>

                          <p className="max-w-[220px] truncate text-xs text-[#8d7b6d]">
                            {entry.archivo_nombre}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="flex items-center gap-1 text-[#4d4036]">
                            <Inbox size={14} />
                            {entry.archivo_nombre}
                          </p>

                          <p className="mt-1 text-xs text-[#8d7b6d]">
                            Archivo anterior sin almacenamiento disponible.
                          </p>
                        </div>
                      )}
                    </dd>
                  </div>
                </dl>

                {entry.informacion_adicional ? (
                  <p className="mt-4 border-t border-[#f3eee8] pt-3 text-sm text-[#5c4d42]">
                    <strong>
                      Información adicional:
                    </strong>{" "}
                    {entry.informacion_adicional}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty px-3 py-12 text-center text-sm text-[#7c5c47]">
            No hay aportes recibidos todavía.
          </p>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#2c1810]/55 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-museum-title"
            className="w-full max-w-md rounded-xl border border-[#efe6dc] bg-white p-6 shadow-2xl"
          >
            <h2
              id="delete-museum-title"
              className="font-serif text-xl font-semibold text-[#2c1810]"
            >
              ¿Eliminar{" "}
              {deleteTarget.kind === "pieza"
                ? "pieza"
                : "aporte"}
              ?
            </h2>

            <p className="mt-2 text-sm text-[#7c6a5c]">
              “{deleteTarget.entry.titulo}” se eliminará de forma permanente.
            </p>

            {deleteTarget.kind === "aporte" && deleteTarget.entry.pieza_id ? (
              <p className="mt-2 text-sm text-[#7c6a5c]">
                Este aporte ya tiene una pieza asociada en el Museo. Se eliminará
                únicamente el aporte original; la pieza, su estado y su archivo
                se conservarán.
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={busy}
                className="min-h-10 border border-[#e6ddd4] px-4 text-sm disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="min-h-10 bg-[#a5452d] px-4 text-sm text-white disabled:opacity-50"
              >
                {busy
                  ? "Eliminando…"
                  : "Eliminar"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}