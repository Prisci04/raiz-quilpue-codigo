export const DEFAULT_AI_CONFIG = Object.freeze({
  activo: true,
  nombre: "Asistente Raíz",
  mensaje_inicial: "Hola, soy el asistente de Raíz Quilpué. ¿Qué te gustaría conocer sobre nuestro patrimonio y actividades?",
  mensaje_desconocido: "Todavía no tengo información suficiente para responder. Puedes explorar los contenidos y actividades de Raíz Quilpué.",
  instrucciones: "Responde brevemente en español. Usa solo la información disponible de Raíz Quilpué. No inventes datos; admite cuando no conoces una respuesta.",
});

export class AIError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const invalid = (message) => { throw new AIError(400, "VALIDATION", message); };
function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("La información enviada no es válida.");
}
function text(value, max, label) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) invalid(`${label}: completa el campo respetando el largo permitido.`);
  return value.trim();
}
export function parseAIConfig(value) {
  object(value);
  if (typeof value.activo !== "boolean") invalid("Indica si el asistente está activo.");
  return { activo: value.activo, nombre: text(value.nombre, 80, "Nombre"),
    mensaje_inicial: text(value.mensaje_inicial, 600, "Mensaje inicial"),
    mensaje_desconocido: text(value.mensaje_desconocido, 600, "Respuesta sin información"),
    instrucciones: text(value.instrucciones, 2000, "Comportamiento") };
}
export function parseKnowledge(value) {
  object(value);
  if (typeof value.activo !== "boolean" || !Number.isInteger(value.orden) || value.orden < 0 || value.orden > 9999) invalid("Revisa el estado y el orden (0 a 9999).");
  return { titulo: text(value.titulo, 160, "Título"), categoria: text(value.categoria, 80, "Categoría"),
    contenido: text(value.contenido, 8000, "Contenido"), orden: value.orden, activo: value.activo };
}
export function parseChat(value) {
  object(value);
  const message = text(value.message, 1200, "Mensaje");
  const history = value.history ?? [];
  if (!Array.isArray(history) || history.length > 12) invalid("La conversación es demasiado larga. Inicia una nueva.");
  const clean = history.map((item) => {
    object(item);
    if (!["user", "assistant"].includes(item.role)) invalid("La conversación no es válida.");
    return { role: item.role, content: text(item.content, 1800, "Mensaje anterior") };
  });
  if (clean.reduce((sum, item) => sum + item.content.length, 0) > 8000) invalid("La conversación es demasiado larga. Inicia una nueva.");
  return { message, history: clean };
}
export function publicAIConfig(config) {
  return { activo: config.activo, nombre: config.nombre, mensaje_inicial: config.mensaje_inicial };
}
export function validKnowledgeId(id) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) invalid("La sección no es válida.");
  return id;
}
