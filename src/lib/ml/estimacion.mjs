/**
 * Validación de la estimación de inscripciones (servidor).
 * 7 variables del modelo: mes/día ← fecha; hora ← hora_inicio; cupos_max; modalidad; público; costo.
 * cupos_espera no es predictora: solo define el techo (cupos_max + cupos_espera).
 */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export const VARIABLES_ESTIMACION = [
  "fecha",
  "hora_inicio",
  "cupos_max",
  "id_modalidad",
  "id_publico",
  "id_costo",
];

function parseIdPositivo(value, etiqueta) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, error: `${etiqueta} no es válido.` };
  }
  return { ok: true, value: n };
}

/**
 * Cupos opcionales: vacío/null → null. Si viene valor, entero >= 1.
 */
export function parseCuposMax(value) {
  if (value == null || value === "") {
    return { ok: true, value: null };
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, error: "Los cupos máximos no son válidos." };
  }
  return { ok: true, value: n };
}

/** Lista de espera: vacío → 0. Entero >= 0. */
export function parseCuposEspera(value) {
  if (value == null || value === "") {
    return { ok: true, value: 0 };
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0) {
    return { ok: false, error: "Los cupos de espera no son válidos." };
  }
  return { ok: true, value: n };
}

/** Lee cupos del formulario admin (`form.cupos`) sin inventar 0. */
export function cuposMaxDesdeFormulario(form) {
  if (!form) return null;
  const raw = form.cupos;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/** Lee cupos de espera del formulario (`form.cupos_espera`). */
export function cuposEsperaDesdeFormulario(form) {
  if (!form) return 0;
  const raw = form.cupos_espera;
  if (raw == null || String(raw).trim() === "") return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return 0;
  return n;
}

export function parseEstimacionPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Solicitud inválida." };
  }

  const fecha = typeof body.fecha === "string" ? body.fecha.trim() : "";
  if (!FECHA.test(fecha)) {
    return { ok: false, error: "Indica una fecha válida." };
  }

  let hora_inicio = null;
  if (body.hora_inicio != null && String(body.hora_inicio).trim() !== "") {
    const raw = String(body.hora_inicio).trim();
    if (!HORA.test(raw)) {
      return { ok: false, error: "Indica una hora de inicio válida." };
    }
    hora_inicio = raw.length === 5 ? `${raw}:00` : raw;
  } else {
    return { ok: false, error: "Indica la hora de inicio." };
  }

  const cupos = parseCuposMax(body.cupos_max);
  if (!cupos.ok) return cupos;
  const espera = parseCuposEspera(body.cupos_espera);
  if (!espera.ok) return espera;

  const modalidad = parseIdPositivo(body.id_modalidad, "La modalidad");
  if (!modalidad.ok) return modalidad;
  const publico = parseIdPositivo(body.id_publico, "El público");
  if (!publico.ok) return publico;
  const costo = parseIdPositivo(body.id_costo, "El costo");
  if (!costo.ok) return costo;

  return {
    ok: true,
    value: {
      fecha,
      hora_inicio,
      cupos_max: cupos.value,
      cupos_espera: espera.value,
      id_modalidad: modalidad.value,
      id_publico: publico.value,
      id_costo: costo.value,
    },
  };
}

export function estimacionListaParaCalcular(form) {
  if (!form) return false;
  if (!FECHA.test(String(form.fecha ?? "").trim())) return false;
  if (!HORA.test(String(form.hora_inicio ?? "").trim())) return false;
  if (!Number(form.id_modalidad) || Number(form.id_modalidad) < 1) return false;
  if (!Number(form.id_publico) || Number(form.id_publico) < 1) return false;
  if (!Number(form.id_costo) || Number(form.id_costo) < 1) return false;
  const rawCupos = form.cupos;
  if (rawCupos != null && String(rawCupos).trim() !== "") {
    const n = Number(rawCupos);
    if (!Number.isInteger(n) || n < 1) return false;
  }
  const rawEspera = form.cupos_espera;
  if (rawEspera != null && String(rawEspera).trim() !== "") {
    const n = Number(rawEspera);
    if (!Number.isInteger(n) || n < 0) return false;
  }
  return true;
}
