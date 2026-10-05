export const MUSEO_CATEGORIES = [
  { id: "fotografias", label: "Fotografías" },
  { id: "documentos", label: "Documentos" },
  { id: "objetos_piezas", label: "Objetos y piezas" },
  { id: "memorias_relatos", label: "Memorias y relatos" },
  { id: "lugares_memoria", label: "Lugares con memoria" },
  { id: "cultura_comunidad", label: "Cultura y comunidad" },
];

const MODALIDADES = ["presencial", "virtual", "hibrida"];
const PARTICIPACIONES = ["abierta", "inscripcion", "pendiente"];
const ESTADOS_ACTIVIDAD = ["borrador", "publicada", "cancelada"];
const ESTADOS_PIEZA = ["borrador", "publicada"];
const VALORES = ["gratuito", "pagado", "voluntario", "pendiente"];

function text(value, maxLength, { required = false } = {}) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  if ((required && !result) || result.length > maxLength) return null;
  return result || null;
}

function oneOf(value, values) {
  return typeof value === "string" && values.includes(value);
}

function nonNegativeInteger(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

function validDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value) {
  return !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function allowedImageUrl(value) {
  if (!value) return true;
  if (value.startsWith("/images/")) return true;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search) return false;
    if (url.hostname === "images.unsplash.com") return true;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";
    return url.hostname === hostname &&
      url.pathname.startsWith("/storage/v1/object/public/public-media/");
  } catch {
    return false;
  }
}

export function parseActividadInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const titulo = text(input.titulo, 180, { required: true });
  const descripcion = text(input.descripcion, 10000, { required: true });
  const cupos = nonNegativeInteger(input.cupos);
  const valorMonto = nonNegativeInteger(input.valor_monto);
  const modalidad = input.modalidad || "presencial";
  const participacion = input.tipo_participacion || "abierta";
  const tipoValor = input.tipo_valor || "gratuito";
  const estado = input.estado || "borrador";
  const fecha = text(input.fecha, 10);
  const horaInicio = text(input.hora_inicio, 8);
  const horaFin = text(input.hora_fin, 8);

  if (
    !titulo ||
    !descripcion ||
    cupos === undefined ||
    valorMonto === undefined ||
    !oneOf(modalidad, MODALIDADES) ||
    !oneOf(participacion, PARTICIPACIONES) ||
    !oneOf(tipoValor, VALORES) ||
    !oneOf(estado, ESTADOS_ACTIVIDAD) ||
    !validDate(fecha) ||
    !validTime(horaInicio) ||
    !validTime(horaFin) ||
    (horaInicio && horaFin && horaFin <= horaInicio)
  ) {
    return null;
  }

  const imagenUrl = text(input.imagen_url, 2000);
  if (input.imagen_url && (!imagenUrl || !allowedImageUrl(imagenUrl))) return null;

  return {
  titulo,
  descripcion,
  fecha,
  hora_inicio: horaInicio,
  hora_fin: horaFin,
  lugar: text(input.lugar, 250),
  publico_objetivo: text(input.publico_objetivo, 250),
  modalidad,
  tipo_participacion: participacion,
  cupos,
  tipo_valor: tipoValor,
  valor_monto: tipoValor === "pagado" ? valorMonto : null,
  forma_pago: text(input.forma_pago, 250),
  informacion_adicional:
    input.informacion_adicional &&
    typeof input.informacion_adicional === "object" &&
    !Array.isArray(input.informacion_adicional)
      ? input.informacion_adicional
      : null,
  imagen_url: imagenUrl,
  estado,
};
}

export function parsePiezaMuseoInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const titulo = text(input.titulo, 200, { required: true });
  const descripcion = text(input.descripcion, 10000, { required: true });
  const imagenUrl = text(input.imagen_url, 2000);
  if (
    !titulo ||
    !descripcion ||
    !MUSEO_CATEGORIES.some((category) => category.id === input.categoria) ||
    !oneOf(input.estado || "borrador", ESTADOS_PIEZA) ||
    (input.imagen_url && (!imagenUrl || !allowedImageUrl(imagenUrl)))
  ) {
    return null;
  }
  return {
    titulo,
    descripcion,
    categoria: input.categoria,
    fecha_aproximada: text(input.fecha_aproximada, 120),
    lugar: text(input.lugar, 250),
    imagen_url: imagenUrl,
    estado: input.estado || "borrador",
  };
}

export function parseInscripcionInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const nombre = text(input.nombre, 120, { required: true });
  const apellido = text(input.apellido, 120, { required: true });
  const email = text(input.email, 254, { required: true });
  const telefono = text(input.telefono, 40, { required: true });
  if (!nombre || !apellido || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !telefono) return null;
  return { nombre, apellido, email, telefono };
}

export function parseAporteMuseoInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const nombre = text(input.nombre, 160, { required: true });
  const correo = text(input.correo, 254, { required: true });
  const titulo = text(input.titulo, 200, { required: true });
  const descripcion = text(input.descripcion, 10000, { required: true });
  const archivoNombre = text(input.archivo_nombre, 255, { required: true });
  if (
    !nombre ||
    !correo ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    !titulo ||
    !descripcion ||
    !archivoNombre ||
    !MUSEO_CATEGORIES.some((category) => category.id === input.categoria)
  ) {
    return null;
  }
  return {
    nombre,
    correo,
    categoria: input.categoria,
    titulo,
    descripcion,
    fecha_aproximada: text(input.fecha_aproximada, 120),
    lugar: text(input.lugar, 250),
    archivo_nombre: archivoNombre,
    informacion_adicional: text(input.informacion_adicional, 3000),
  };
}
