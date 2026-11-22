"use client";

import AdminDialog from "@/components/admin/AdminDialog";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import ActividadUbicacionField from "@/components/admin/actividades/ActividadUbicacionField";
import ContenidoEditor from "@/components/admin/contenidos/ContenidoEditor";
import { esCostoPagada, todayISO } from "@/lib/actividades";
import {
  mismoNombreCatalogo,
  NOMBRE_COSTO_GRATUITA,
  NOMBRE_ESTADO_BORRADOR,
  NOMBRE_ESTADO_PUBLICADA,
  NOMBRE_MODALIDAD_PRESENCIAL,
  NOMBRE_PARTICIPACION_ABIERTA,
  NOMBRE_PARTICIPACION_INSCRIPCION,
} from "@/lib/catalogos.mjs";
import { getCatalogos } from "@/lib/api/catalogos";
import { deleteActividad, getActividadAdmin, saveActividad } from "@/lib/api/community";
import { getUbicaciones } from "@/lib/api/ubicaciones";
import { discardUploadedPortada, uploadPortada } from "@/lib/api/media";
import EstimacionInscripcionesCard from "@/components/admin/actividades/EstimacionInscripcionesCard";
import LugarFields from "@/components/admin/actividades/LugarFields";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
const PORTADA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const PORTADA_MAX_BYTES = 5 * 1024 * 1024;

const EMPTY = {
  titulo: "",
  descripcion: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  lugar_direccion: "",
  id_comuna: "",
  id_region: "",
  id_publico: "",
  id_modalidad: "",
  id_tipo_participacion: "",
  lugar: "",
  direccion: "",
  google_place_id: null,
  latitud: null,
  longitud: null,
  cupos: "",
  cupos_espera: "",
  id_costo: "",
  valor_monto: "",
  informacion_adicional: null,
  imagen_url: "",
  id_estado: "",
};

function catalogIdByNombre(items, nombre) {
  return items.find((item) => item.nombre?.toLowerCase() === nombre.toLowerCase())?.id ?? "";
}

function catalogNombre(items, id) {
  return items.find((item) => Number(item.id) === Number(id))?.nombre ?? "";
}

const inputClass = "mt-1.5 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] outline-none focus:border-[#c4a484]";

function Field({ label, children, className = "" }) {
  return (
    <label className={`admin-field block min-w-0 ${className}`}>
      <span className="text-[13px] font-medium text-[#2c1810]">{label}</span>
      {children}
    </label>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clock(value) {
  return value ? String(value).slice(0, 5) : "";
}

function formFromActivity(activity) {
  return {
    titulo: activity.titulo ?? "",
    descripcion: activity.descripcion ?? "",
    fecha: activity.fecha ?? "",
    hora_inicio: clock(activity.hora_inicio),
    hora_fin: clock(activity.hora_fin),
    lugar_direccion: activity.lugar_direccion ?? "",
    id_comuna: activity.id_comuna ?? "",
    id_region: activity.id_region ?? "",
    id_publico: activity.id_publico ?? "",
    id_modalidad: activity.id_modalidad ?? "",
    id_tipo_participacion: activity.id_tipo_participacion ?? "",
    lugar: activity.lugar ?? "",
    direccion: Object.hasOwn(activity, "direccion_evento")
      ? activity.direccion_evento ?? ""
      : activity.direccion ?? "",
    google_place_id: activity.google_place_id ?? null,
    latitud: activity.latitud ?? null,
    longitud: activity.longitud ?? null,
    cupos: activity.cupos ?? "",
    cupos_espera: activity.cupos_espera ?? "",
    id_costo: activity.id_costo ?? "",
    valor_monto: activity.valor_monto == null ? "" : String(activity.valor_monto),
    informacion_adicional: activity.informacion_adicional ?? null,
    imagen_url: activity.imagen_url ?? "",
    id_estado: activity.id_estado ?? "",
  };
}

function activityPayload(form, idEstado) {
  return {
    titulo: form.titulo,
    descripcion: form.descripcion,
    fecha: form.fecha,
    hora_inicio: form.hora_inicio,
    hora_fin: form.hora_fin,
    lugar_direccion: form.lugar_direccion,
    id_comuna: form.id_comuna,
    id_publico: form.id_publico,
    id_modalidad: form.id_modalidad,
    id_tipo_participacion: form.id_tipo_participacion || null,
    cupos_max: form.cupos === "" ? null : Number(form.cupos),
    cupos_espera: form.cupos_espera === "" ? 0 : Number(form.cupos_espera),
    id_costo: form.id_costo || null,
    valor_monto: form.valor_monto === "" ? null : form.valor_monto,
    informacion_adicional: form.informacion_adicional,
    imagen_url: form.imagen_url || null,
    id_estado: idEstado,
    direccion: form.direccion || null,
    google_place_id: form.google_place_id,
    latitud: form.latitud,
    longitud: form.longitud,
  };
}

export default function ActividadForm({ activityId = null, initialActivity = null }) {
  const editing = Boolean(activityId);
  const router = useRouter();
  const fileRef = useRef(null);
  const [form, setForm] = useState(() => (initialActivity ? formFromActivity(initialActivity) : EMPTY));
  const [catalogos, setCatalogos] = useState(null);
  const [loading, setLoading] = useState(editing && !initialActivity);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [portadaFile, setPortadaFile] = useState(null);
  const [confirmPortada, setConfirmPortada] = useState(false);

  useEffect(() => {
    router.prefetch("/admin/actividades");
  }, [router]);

  useEffect(() => {
    let active = true;

    getCatalogos([
      "modalidad",
      "tipo_participacion",
      "costo_actividad",
      "publico_objetivo",
      "estado_publicacion",
    ])
      .then((data) => {
        if (!active) return;
        setCatalogos(data);
        setForm((current) => ({
          ...current,
          id_modalidad: current.id_modalidad || catalogIdByNombre(data.modalidad ?? [], NOMBRE_MODALIDAD_PRESENCIAL),
          id_tipo_participacion:
            current.id_tipo_participacion ||
            catalogIdByNombre(data.tipo_participacion ?? [], NOMBRE_PARTICIPACION_ABIERTA),
          id_costo: current.id_costo || catalogIdByNombre(data.costo_actividad ?? [], NOMBRE_COSTO_GRATUITA),
          id_estado: current.id_estado || catalogIdByNombre(data.estado_publicacion ?? [], NOMBRE_ESTADO_BORRADOR),
        }));
      })
      .catch((loadErrorCaught) => {
        if (active) setError(loadErrorCaught.message);
      });

    getUbicaciones()
      .then((data) => {
        if (!active) return;
        setForm((current) => ({
          ...current,
          id_region: current.id_region || data.id_region || "",
          id_comuna: current.id_comuna || data.id_comuna || "",
        }));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editing || initialActivity) return undefined;
    let active = true;
    getActividadAdmin(activityId)
      .then((activity) => {
        if (active) setForm(formFromActivity(activity));
      })
      .catch((loadErrorCaught) => {
        if (active) {
          setError(loadErrorCaught.message);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activityId, editing, initialActivity]);

  const portadaPreview = useMemo(() => {
    if (!portadaFile) return "";
    return URL.createObjectURL(portadaFile);
  }, [portadaFile]);

  useEffect(() => {
    if (!portadaPreview) return undefined;
    return () => URL.revokeObjectURL(portadaPreview);
  }, [portadaPreview]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  const handleLugarChange = useCallback((next) => {
    setForm((current) => ({
      ...current,
      lugar_direccion: next.lugar_direccion,
      id_comuna: next.id_comuna,
      id_region: next.id_region,
    }));
  }, []);

  function choosePortada(event) {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;

    if (!PORTADA_TYPES.includes(next.type)) {
      setError("El formato de imagen no está permitido.");
      return;
    }

    if (next.size === 0 || next.size > PORTADA_MAX_BYTES) {
      setError(next.size > PORTADA_MAX_BYTES ? "La imagen supera el máximo de 5 MB." : "El archivo no es válido.");
      return;
    }

    setError("");
    setConfirmPortada(false);
    setPortadaFile(next);
  }

  function validateLocal() {
    if (!form.fecha) return "La fecha es obligatoria.";
    if (!String(form.lugar_direccion ?? "").trim()) return "Indica la dirección de la actividad.";
    if (!form.id_comuna) return "Indica la comuna de la actividad.";
    if (!form.id_publico) return "Indica el público de la actividad.";
    if (!form.id_modalidad) return "Indica la modalidad de la actividad.";
    if (form.hora_inicio && form.hora_fin && form.hora_fin <= form.hora_inicio) {
      return "La hora de término debe ser posterior a la de inicio.";
    }
    if (esCostoPagada(catalogNombre(catalogos?.costo_actividad ?? [], form.id_costo))) {
      const monto = String(form.valor_monto ?? "");
      if (!monto) return "Indica el monto cuando la actividad es pagada.";
      if (!/^\d+$/.test(monto)) return "El monto solo puede contener números.";
    }
    return "";
  }

  async function persist(estado, payload) {
    let uploaded = null;
    const nextPayload = { ...payload };

    if (portadaFile) {
      if (!editing) {
        const created = await saveActividad({ ...nextPayload, imagen_url: null }, null);
        setUploading(true);
        try {
          uploaded = await uploadPortada(portadaFile, created.id, "actividades");
          await saveActividad({ ...nextPayload, imagen_url: uploaded.url }, created.id);
          router.replace("/admin/actividades?creado=1");
        } catch (imageError) {
          if (uploaded?.url) await discardUploadedPortada(uploaded.url).catch(() => {});
          router.replace(`/admin/actividades/${created.id}/editar`);
          throw new Error(imageError.message || "La actividad se creó, pero no se pudo subir la imagen.");
        }
        return true;
      }

      setUploading(true);
      uploaded = await uploadPortada(portadaFile, activityId, "actividades");
      nextPayload.imagen_url = uploaded.url;
    }

    try {
      await saveActividad(nextPayload, activityId);
      router.replace(editing ? "/admin/actividades?guardado=1" : "/admin/actividades?creado=1");
      return true;
    } catch (saveError) {
      if (uploaded?.url) await discardUploadedPortada(uploaded.url).catch(() => {});
      throw saveError;
    }
  }

  async function save(state) {
    const localError = validateLocal();
    if (localError) {
      setError(localError);
      return;
    }

    const idEstado =
      typeof state === "number" || /^\d+$/.test(String(state ?? ""))
        ? Number(state)
        : catalogIdByNombre(catalogos?.estado_publicacion ?? [], state);

    if (!idEstado) {
      setError("No se pudo determinar el estado de publicación.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    let left = false;
    try {
      left = await persist(state, activityPayload(form, idEstado));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      if (!left) {
        setSaving(false);
        setUploading(false);
      }
    }
  }

  async function removePortada() {
    setConfirmPortada(false);
    if (portadaFile) {
      setPortadaFile(null);
      return;
    }
    if (!editing || !form.imagen_url) return;

    setSaving(true);
    setError("");
    try {
      const saved = await saveActividad(activityPayload({ ...form, imagen_url: "" }, form.id_estado), activityId);
      setForm(formFromActivity(saved));
      setSuccess("La imagen se eliminó.");
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError("");
    try {
      await deleteActividad(activityId);
      router.replace("/admin/actividades?eliminado=1");
    } catch (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      setDeleteConfirm(false);
    }
  }

  const busy = saving || uploading;
  const portadaVisible = portadaPreview || form.imagen_url || "";
  const pastDate = Boolean(form.fecha && form.fecha < todayISO());
  const participacionNombre = catalogNombre(
    catalogos?.tipo_participacion ?? [],
    form.id_tipo_participacion,
  );
  const muestraEstimacion = mismoNombreCatalogo(
    participacionNombre,
    NOMBRE_PARTICIPACION_INSCRIPCION,
  );

  return (
    <section className="admin-page">
      <div>
        <p className="text-[13px] text-[#8d7b6d]">
          <Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link>
          <span className="px-1.5" aria-hidden="true">›</span>
          <Link href="/admin/actividades" className="hover:text-[#2c1810]">Actividades</Link>
          <span className="px-1.5" aria-hidden="true">›</span>
          {editing ? "Editar actividad" : "Nueva actividad"}
        </p>
        <h1 className="mt-2 font-serif text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium tracking-tight text-[#2c1810]">
          {editing ? "Editar actividad" : "Nueva actividad"}
        </h1>
        <p className="mt-1 text-sm text-[#7c6a5c]">Completa los datos que se mostrarán en la programación de Raíz Quilpué.</p>
      </div>
      {error ? <AdminNotice tone="error" onDismiss={() => setError("")}>{error}</AdminNotice> : null}
      {success ? <AdminNotice onDismiss={() => setSuccess("")}>{success}</AdminNotice> : null}
      {loading ? <p className="admin-empty mt-6 text-sm text-[#7c5c47]">Cargando actividad…</p> : !loadError ? (
        <form
          className="admin-form mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            save(editing ? form.id_estado : NOMBRE_ESTADO_PUBLICADA);
          }}
        >
          <p className="text-xs leading-relaxed text-[#7c5c47]">Los campos con * son obligatorios. Los demás son opcionales.</p>
          <div className="admin-card grid gap-5 p-4 sm:p-6 lg:grid-cols-2">
            <h2 className="font-serif text-lg font-medium text-[#2c1810] lg:col-span-2">Datos de la actividad</h2>
            <Field label="Nombre de la actividad *" className="lg:col-span-2">
              <input required maxLength={180} value={form.titulo} onChange={(event) => update("titulo", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Tipo de participación">
              <select value={form.id_tipo_participacion} onChange={(event) => update("id_tipo_participacion", event.target.value)} className={inputClass}>
                <option value="">Sin definir</option>
                {(catalogos?.tipo_participacion ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Modalidad *">
              <select required value={form.id_modalidad} onChange={(event) => update("id_modalidad", event.target.value)} className={inputClass}>
                <option value="">Seleccionar modalidad</option>
                {(catalogos?.modalidad ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre === "Virtual" ? "Online" : item.nombre}</option>
                ))}
              </select>
            </Field>
            {editing ? (
              <Field label="Estado de la actividad *">
                <select required value={form.id_estado} onChange={(event) => update("id_estado", event.target.value)} className={inputClass}>
                  <option value="">Seleccionar estado</option>
                  {(catalogos?.estado_publicacion ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Descripción *" className="lg:col-span-2">
              <textarea required rows={5} maxLength={10000} value={form.descripcion} onChange={(event) => update("descripcion", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Fecha *">
              <input required type="date" value={form.fecha ?? ""} onChange={(event) => update("fecha", event.target.value)} className={inputClass} />
              {pastDate ? <span className="mt-1 block text-xs text-[#9a6708]">La fecha ya pasó: en el portal quedará como actividad finalizada y no aceptará inscripciones.</span> : null}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora de inicio">
                <input type="time" value={form.hora_inicio ?? ""} onChange={(event) => update("hora_inicio", event.target.value)} className={inputClass} />
              </Field>
              <Field label="Hora de término">
                <input type="time" value={form.hora_fin ?? ""} onChange={(event) => update("hora_fin", event.target.value)} className={inputClass} />
              </Field>
            </div>
            <LugarFields
              value={form}
              disabled={busy}
              onChange={handleLugarChange}
            />
            <Field label="Cupos">
              <input type="number" min="1" step="1" value={form.cupos ?? ""} onChange={(event) => update("cupos", event.target.value)} className={inputClass} />
              <span className="mt-1 block text-xs text-[#8d7b6d]">Déjalo vacío si no hay límite. Obligatorio si publicas una actividad con inscripción.</span>
            </Field>
            <Field label="Cupos de espera">
              <input type="number" min="0" step="1" value={form.cupos_espera ?? ""} onChange={(event) => update("cupos_espera", event.target.value)} className={inputClass} />
              <span className="mt-1 block text-xs text-[#8d7b6d]">Cantidad extra que se acepta cuando los cupos están completos. Si lo dejas vacío, no hay lista de espera.</span>
            </Field>
            <Field label="Público *">
              <select
                required
                name="id_publico"
                value={form.id_publico}
                onChange={(event) => update("id_publico", event.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Seleccionar público
                </option>
                {(catalogos?.publico_objetivo ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4">
              <Field label="Valor">
                <select value={form.id_costo} onChange={(event) => update("id_costo", event.target.value)} className={inputClass}>
                  <option value="">Sin definir</option>
                  {(catalogos?.costo_actividad ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </Field>
              {esCostoPagada(catalogNombre(catalogos?.costo_actividad ?? [], form.id_costo)) ? (
                <Field label="Monto ($) *">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="[0-9]+"
                    required
                    value={form.valor_monto ?? ""}
                    onChange={(event) => update("valor_monto", event.target.value.replace(/\D/g, ""))}
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs text-[#8d7b6d]">Solo números, sin puntos, espacios ni símbolos.</span>
                </Field>
              ) : null}
            </div>

            <EstimacionInscripcionesCard form={form} visible={muestraEstimacion} />
          </div>

          <ActividadUbicacionField value={{ ...form, modalidad: catalogNombre(catalogos?.modalidad ?? [], form.id_modalidad) }} catalogLugar disabled={busy}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} />

          <div className="admin-card p-4 sm:p-6">
            <span className="text-[13px] font-medium text-[#2c1810]">Imagen de la actividad</span>
            <div className="mt-3 flex min-h-40 max-w-sm items-center justify-center overflow-hidden rounded-sm border border-dashed border-[#e6ddd4] bg-[#fbfaf8]">
              {portadaVisible ? (
                // La vista previa puede ser un archivo local (blob:) antes de subirlo.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portadaVisible} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-[#b7a394]">
                  <ImageIcon size={22} strokeWidth={1.6} aria-hidden="true" />
                  <p className="text-sm text-[#7c5c47]">{uploading ? "Subiendo imagen..." : "Selecciona una imagen"}</p>
                </div>
              )}
            </div>
            <input ref={fileRef} tabIndex={-1} aria-label="Imagen de portada" type="file" accept={PORTADA_TYPES.join(",")} className="sr-only" onChange={choosePortada} />
            {portadaFile ? (
              <p className="mt-3 text-sm text-[#4d4036]">
                {portadaFile.name}
                <span className="text-[#8d7b6d]"> · {formatFileSize(portadaFile.size)}</span>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex min-h-10 items-center rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50">
                {portadaVisible ? "Cambiar imagen" : "Seleccionar imagen"}
              </button>
              {portadaFile ? (
                <button type="button" disabled={busy} onClick={() => { setPortadaFile(null); setConfirmPortada(false); }} className="inline-flex min-h-10 items-center rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50">
                  Quitar
                </button>
              ) : null}
              {editing && form.imagen_url && !portadaFile ? (
                <button type="button" disabled={busy} onClick={() => setConfirmPortada(true)} className="inline-flex min-h-10 items-center rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28] disabled:opacity-50">
                  Eliminar imagen
                </button>
              ) : null}
            </div>
            {confirmPortada ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#4d4036]">
                <p>¿Quitar la imagen?</p>
                <button type="button" className="font-medium text-[#8d3b28]" onClick={removePortada}>Quitar</button>
                <button type="button" className="text-[#7c5c47]" onClick={() => setConfirmPortada(false)}>Cancelar</button>
              </div>
            ) : null}
            <p className="mt-2 text-[12px] text-[#8d7b6d]">JPEG, PNG, WebP o AVIF. Máximo 5 MB. Sube el archivo; no se aceptan URLs externas.</p>
          </div>

          <div className="admin-card p-4 sm:p-6">
            <span className="text-[13px] font-medium text-[#2c1810]">Información adicional</span>
            <p className="mt-1 text-[12px] text-[#8d7b6d]">Recomendaciones, programa u otros detalles que se muestran en la ficha pública.</p>
            <div className="mt-3">
              <ContenidoEditor
                label="Información adicional de la actividad"
                key={editing ? `edit-${activityId}` : "nueva"}
                initialContent={form.informacion_adicional ?? EMPTY_DOC}
                onChange={(documento) => update("informacion_adicional", documento)}
              />
            </div>
          </div>

          <div className="admin-form-actions flex flex-wrap items-center justify-end gap-3">
            {editing ? (
              <button type="button" onClick={() => setDeleteConfirm(true)} disabled={busy} className="min-h-10 rounded-sm border border-[#f0c7be] bg-[#fff6f3] px-4 text-sm font-medium text-[#8d3b28]">
                Eliminar actividad
              </button>
            ) : (
              <Link href="/admin/actividades" className="inline-flex min-h-11 items-center rounded-sm px-4 text-sm text-[#7c5c47]">Cancelar</Link>
            )}
            <button type="button" disabled={busy || !catalogos} onClick={() => save(NOMBRE_ESTADO_BORRADOR)} className="min-h-10 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50">
              Guardar borrador
            </button>
            <button type="submit" disabled={busy || !catalogos} className="min-h-10 rounded-sm bg-[#2c1810] px-4 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "Guardando…" : editing ? "Guardar cambios" : "Publicar actividad"}
            </button>
          </div>
        </form>
      ) : null}
      {deleteConfirm ? (
          <AdminDialog onClose={() => setDeleteConfirm(false)} busy={busy} role="alertdialog" aria-labelledby="delete-actividad-title" aria-describedby="delete-actividad-description" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="delete-actividad-title" className="font-serif text-lg font-medium text-[#2c1810]">¿Eliminar actividad?</h2>
            <p id="delete-actividad-description" className="mt-2 text-sm text-[#7c6a5c]">La lista de participantes también se eliminará.</p>
            {error ? <p role="alert" className="mt-3 text-sm text-[#8d3b28]">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setDeleteConfirm(false)} className="min-h-10 border border-[#e6ddd4] px-4 text-sm">Cancelar</button>
              <button type="button" disabled={busy} onClick={remove} className="min-h-10 bg-[#a5452d] px-4 text-sm text-white">Eliminar</button>
            </div>
          </AdminDialog>
      ) : null}
    </section>
  );
}
