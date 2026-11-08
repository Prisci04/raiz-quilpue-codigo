import {
  mismoNombreCatalogo,
  NOMBRE_CATEGORIA_CULTURA_COMUNIDAD,
  NOMBRE_CATEGORIA_DOCUMENTOS,
  NOMBRE_CATEGORIA_FOTOGRAFIAS,
  NOMBRE_CATEGORIA_LUGARES,
  NOMBRE_CATEGORIA_MEMORIAS,
  NOMBRE_CATEGORIA_OBJETOS,
  NOMBRE_REVISION_APROBADO,
  NOMBRE_REVISION_PENDIENTE,
  NOMBRE_REVISION_RECHAZADO,
} from "./catalogos.mjs";

const CATEGORIA_ALIAS = {
  fotografias: NOMBRE_CATEGORIA_FOTOGRAFIAS,
  documentos: NOMBRE_CATEGORIA_DOCUMENTOS,
  objetos_piezas: NOMBRE_CATEGORIA_OBJETOS,
  memorias_relatos: NOMBRE_CATEGORIA_MEMORIAS,
  lugares_memoria: NOMBRE_CATEGORIA_LUGARES,
  cultura_comunidad: NOMBRE_CATEGORIA_CULTURA_COMUNIDAD,
};

function nested(value) {
  return Array.isArray(value) ? value[0] : value;
}

export const MUSEO_CATEGORIES = [
  { id: NOMBRE_CATEGORIA_FOTOGRAFIAS, label: NOMBRE_CATEGORIA_FOTOGRAFIAS },
  { id: NOMBRE_CATEGORIA_DOCUMENTOS, label: NOMBRE_CATEGORIA_DOCUMENTOS },
  { id: NOMBRE_CATEGORIA_OBJETOS, label: NOMBRE_CATEGORIA_OBJETOS },
  { id: NOMBRE_CATEGORIA_MEMORIAS, label: NOMBRE_CATEGORIA_MEMORIAS },
  { id: NOMBRE_CATEGORIA_LUGARES, label: NOMBRE_CATEGORIA_LUGARES },
  { id: NOMBRE_CATEGORIA_CULTURA_COMUNIDAD, label: NOMBRE_CATEGORIA_CULTURA_COMUNIDAD },
];

export function categoriaMuseoDesdeFiltro(value) {
  if (!value || value === "todos") return "todos";
  const trimmed = String(value).trim();
  if (!trimmed) return "todos";
  return CATEGORIA_ALIAS[trimmed.toLowerCase()] ?? trimmed;
}

export function esRevisionPendiente(value) {
  return mismoNombreCatalogo(value, NOMBRE_REVISION_PENDIENTE);
}

export function esRevisionAprobado(value) {
  return mismoNombreCatalogo(value, NOMBRE_REVISION_APROBADO);
}

export function esRevisionRechazado(value) {
  return mismoNombreCatalogo(value, NOMBRE_REVISION_RECHAZADO);
}

export function mapAporteMuseo(row) {
  if (!row) return null;

  const categoria = nested(row.categoria_museo);
  const estado = nested(row.estado_revision);

  return {
    id: row.id_aporte ?? row.id,
    titulo: row.titulo ?? "",
    descripcion: row.descripcion ?? "",
    categoria: categoria?.nombre_categoria ?? row.categoria ?? "",
    fecha_aproximada: row.fecha_aproximada ?? "",
    lugar: row.lugar_referencia ?? row.lugar ?? "",
    imagen_url: row.imagen_url ?? null,
    estado_revision: estado?.nombre_estado_revision ?? row.estado_revision ?? "",
    nombre: row.nombre_aportante ?? row.nombre ?? "",
    correo: row.correo_aportante ?? row.correo ?? "",
    fecha_creacion: row.fec_creacion ?? row.fecha_creacion ?? null,
    fec_revision: row.fec_revision ?? null,
    id_categoria_museo: row.id_categoria_museo,
    id_estado_revision: row.id_estado_revision,
    id_usuario_revisor: row.id_usuario_revisor ?? null,
  };
}

export function mapAporteMuseoPublico(row) {
  const mapped = mapAporteMuseo(row);
  if (!mapped) return null;

  return {
    id: mapped.id,
    title: mapped.titulo,
    description: mapped.descripcion,
    content: [mapped.fecha_aproximada, mapped.lugar].filter(Boolean).join(" · "),
    tipo: mapped.categoria,
    image: mapped.imagen_url,
    date: mapped.fecha_aproximada,
  };
}

export function aportanteDesdeUsuario(user) {
  const nombre = [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim();
  return {
    nombre_aportante: nombre || "Raíz Quilpué",
    correo_aportante: String(user?.email ?? "").trim().toLowerCase(),
  };
}
