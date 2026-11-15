import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

// Real API handlers, validators, services and mappers; only auth/DB/Storage are local doubles.
globalThis.fetch = async () => { throw new Error("Network disabled"); };
const root = fileURLToPath(new URL("../", import.meta.url));
const catalogs = {
  modalidad: [{id:1,nombre:"Presencial"},{id:2,nombre:"Virtual"},{id:3,nombre:"Híbrida"}],
  tipo_participacion: [{id:1,nombre:"Abierta"},{id:2,nombre:"Inscripción"}],
  costo_actividad: [{id:1,nombre:"Gratuita"}],
  publico_objetivo: [{id:1,nombre:"Todas las edades"}],
  estado_publicacion: [{id:1,nombre:"Borrador"},{id:2,nombre:"Publicada"}],
  lugares: [{id:10,nombre:"Centro cultural"}],
};
globalThis.__hu23Catalogs = catalogs;
function joined(row) {
  const name = (key, id) => catalogs[key].find(item => item.id === id)?.nombre;
  return {...row,
    modalidad:{nombre_modalidad:name("modalidad",row.id_modalidad)},
    tipo_participacion:{nombre_tipo_participacion:name("tipo_participacion",row.id_tipo_participacion)},
    publico_objetivo:{nombre_publico:name("publico_objetivo",row.id_publico)},
    costo_actividad:{nombre_costo:name("costo_actividad",row.id_costo)},
    estado_publicacion:{nombre_estado:name("estado_publicacion",row.id_estado)},
    lugar:{id_lugar:10,nombre_lugar:"Centro cultural",direccion:"Dirección del recinto",id_comuna:20,
      comuna:{id_comuna:20,nombre_comuna:"Quilpué",id_region:30,region:{id_region:30,nombre_region:"Valparaíso"}}},
  };
}
// PostgREST projections may include nested joins with their own commas.
function topColumns(columns) {
  let depth=0,start=0; const fields=[];
  for(let i=0;i<columns.length;i++) {
    if(columns[i]==="(")depth++; if(columns[i]===")")depth--;
    if(columns[i]==="," && depth===0){fields.push(columns.slice(start,i).trim());start=i+1;}
  }
  return [...fields,columns.slice(start).trim()];
}
const fixture = {
  id_actividad: 1, titulo: "Encuentro", descripcion: "Actividad cultural", fecha: "2099-01-02",
  hora_inicio: "12:00", hora_fin: "13:00", id_lugar: 10,
  direccion: "Av. Los Carrera 100, Quilpué", google_place_id: "place-test",
  latitud: null, longitud: null,
  id_publico: 1, id_modalidad: 1, id_tipo_participacion: 2,
  cupos_max: 20, id_costo: 1, valor_monto: null,
  informacion_adicional: null, imagen_url: null, id_estado: 2,
};
const state = globalThis.__hu23Persistencia = {};
function reset(extra = {}) { Object.assign(state, { rows: [{ ...fixture }], writes: [], selects: [], reads: 0, missing: false, missingCoordinates: false, missingLegacyId: false, dbError: null, ...extra }); }
state.client = {
  from(table) {
    let columns = "", operation, payload, single = false;
    const filters = [];
    const query = {
      select(value) { columns = value; return query; },
      eq(key, value) { filters.push((row) => key.split(".").reduce((value, part) => value?.[part], joined(row)) === value); return query; },
      neq(key, value) { filters.push((row) => key.split(".").reduce((item, part) => item?.[part], joined(row)) !== value); return query; },
      in(key, values) {
        filters.push((row) => {
          const resolved = key.split(".").reduce((item, part) => item?.[part], joined(row));
          return values.includes(resolved);
        });
        return query;
      },
      lt(key, value) {
        filters.push((row) => {
          const resolved = key.split(".").reduce((item, part) => item?.[part], joined(row));
          return resolved != null && resolved < value;
        });
        return query;
      },
      lte(key, value) {
        filters.push((row) => {
          const resolved = key.split(".").reduce((item, part) => item?.[part], joined(row));
          return resolved != null && resolved <= value;
        });
        return query;
      },
      order() { return query; },
      maybeSingle() { single = true; return query; }, single() { single = true; return query; },
      insert(value) { operation = "insert"; payload = value; return query; },
      update(value) { operation = "update"; payload = value; return query; },
      then(done, fail) {
        state.reads++;
        state.selects.push({ table, columns });
        // A PostgREST statement failing on a missing column commits no mutation.
        let error = state.dbError;
        const absent = state.missing ? ["direccion", "google_place_id", "latitud", "longitud"]
          : state.missingCoordinates ? ["latitud", "longitud"] : state.missingLegacyId ? ["google_place_id"] : [];
        const missing = absent.find((key) => topColumns(columns).includes(key) || Object.hasOwn(payload ?? {}, key));
        if (!error && missing) error = { code: "42703", message: `column actividades.${missing} does not exist` };
        if (error) return Promise.resolve({ data: null, error }).then(done, fail);
        let rows = table === "actividades" ? state.rows.filter((row) => filters.every((filter) => filter(row))) : [];
        if (operation === "insert") {
          const row = { ...payload, id_actividad: 2 }; state.rows.push(row); rows = [row];
        } else if (operation === "update") rows.forEach((row) => Object.assign(row, payload));
        if (operation) state.writes.push({ operation, payload: { ...payload } });
        const selected = rows.map((row) => {
          const result=joined(row);
          for(const key of ["direccion","google_place_id","latitud","longitud"])
            if(!topColumns(columns).includes(key)) delete result[key];
          return result;
        });
        return Promise.resolve({ data: single ? selected[0] ?? null : selected, error: null }).then(done, fail);
      },
    };
    return query;
  },
};
const mocks = {
  "server-only": "export {};",
  "@/services/actividad-catalogos.service": "export async function listCatalogosParaActividad(){return globalThis.__hu23Catalogs;}",
  "@/lib/supabase/admin": "export function getSupabaseAdminClient(){return globalThis.__hu23Persistencia.client;}",
  "@/lib/supabase/server": "export function getSupabaseServerClient(){return globalThis.__hu23Persistencia.client;}",
  "@/lib/auth/guard": "export async function requireGestorContenido(){return {response:null,user:{id:1}};}",
  "@/services/storage.service": "export async function deleteImage(){throw new Error('Unexpected cleanup');} export async function deleteOwnedPortada(){throw new Error('Unexpected cover change');}",
};
const hooks = registerHooks({
  resolve(name, context, next) {
    if (Object.hasOwn(mocks, name)) return { url: "hu23-mock:" + name, shortCircuit: true };
    if (name.startsWith("@/")) {
      const base = resolve(root, "src", name.slice(2));
      return { url: pathToFileURL([base, base + ".js", base + ".mjs"].find(existsSync)).href, shortCircuit: true };
    }
    return next(name, context);
  },
  load(url, context, next) {
    if (url.startsWith("hu23-mock:")) return { format: "module", source: mocks[url.slice(10)], shortCircuit: true };
    return next(url, context);
  },
});
const route = await import("../src/app/api/admin/actividades/[id]/route.js");
const collection = await import("../src/app/api/admin/actividades/route.js");
const admin = await import("../src/services/admin-community.service.js");
const publicService = await import("../src/services/actividades.service.js");
const { mapActividadVista } = await import("../src/lib/actividades.js");
const context = { params: Promise.resolve({ id: "1" }) };
const request = (method, value) => new Request("http://localhost/api/admin/actividades/1", {
  method, ...(value === undefined ? {} : { body: JSON.stringify(value) }),
});
async function patch(value) { return route.PATCH(request("PATCH", value), context); }

test("POST and GET preserve editorial address and selected Place ID for every modality", async () => {
  for (const id_modalidad of [1, 3, 2]) {
    reset();
    const response = await collection.POST(request("POST", { ...fixture, id_modalidad, direccion: "  Dirección propia  " }));
    assert.equal(response.status, 201);
    const { data } = await response.json();
    assert.equal(data.direccion, "Dirección propia");
    assert.equal(data.google_place_id, fixture.google_place_id);
    assert.equal(state.rows[1].id_modalidad, id_modalidad);
    assert.equal((await (await route.GET(request("GET"), context)).json()).data.direccion, fixture.direccion);
  }
});
test("partial editing preserves omitted location and nullable business fields", async () => {
  reset();
  state.rows[0].informacion_adicional = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Traer materiales." }] }] };
  const before = structuredClone(state.rows[0]);
  assert.equal((await patch({ titulo: "Título editado" })).status, 200);
  for (const key of ["direccion", "google_place_id", "id_lugar", "informacion_adicional", "cupos_max"]) {
    assert.deepEqual(state.rows[0][key], before[key], key);
  }
  assert.equal((await patch({ direccion: "Calle nueva 10", google_place_id: "new-place" })).status, 200);
  assert.equal(state.rows[0].direccion, "Calle nueva 10");
  assert.equal(state.rows[0].google_place_id, "new-place");
});
test("explicit null clears a reference independently of editorial address and lugar", async () => {
  reset();
  assert.equal((await patch({ google_place_id: null })).status, 200);
  assert.equal(state.rows[0].google_place_id, null);
  assert.equal(state.rows[0].direccion, fixture.direccion);
  assert.equal(state.rows[0].id_lugar, fixture.id_lugar);
  assert.equal((await patch({ direccion: null })).status, 200);
  assert.equal(state.rows[0].direccion, null);
});
test("status-only PATCH changes only estado, including publication and nulls", async () => {
  reset();
  for (const estado of ["Borrador", "Publicada"]) {
    assert.equal((await patch({ estado })).status, 200);
    const id_estado=catalogs.estado_publicacion.find(item=>item.nombre===estado).id;
    const {fec_actualizacion,...payload}=state.writes.at(-1).payload;
    assert.ok(fec_actualizacion); assert.deepEqual(payload,{id_estado});
    const {fec_actualizacion: timestamp,...row}=state.rows[0];
    assert.ok(timestamp); assert.deepEqual(row,{...fixture,id_estado});
  }
});
test("switching to virtual preserves historical text/reference for an explicit future decision", async () => {
  reset();
  assert.equal((await patch({ id_modalidad: 2 })).status, 200);
  assert.equal(state.rows[0].id_modalidad,2);
  assert.equal((await patch({ google_place_id: null })).status, 200);
  assert.equal(state.rows[0].direccion, fixture.direccion);
});
test("malformed/null/array/empty JSON returns 400 before loading or mutating privileged data", async () => {
  for (const body of ["{", "null", "[]", "{}", "42", ""]) {
    reset();
    const response = await route.PATCH(new Request("http://localhost", { method: "PATCH", body }), context);
    assert.equal(response.status, 400, body);
    assert.equal(state.reads, 0);
    assert.deepEqual(state.writes, []);
  }
});
test("invalid location values fail validation without mutation", async () => {
  for (const value of [{ direccion: 3 }, { direccion: "x".repeat(501) }, { google_place_id: {} }]) {
    reset();
    assert.equal((await patch(value)).status, 400);
    assert.deepEqual(state.writes, []);
  }
});
test("public detail carries new fields through both mappers; lists keep their minimal projection", async () => {
  reset();
  const detail = await publicService.getActividadById(1);
  assert.equal(detail.direccion, fixture.direccion);
  assert.equal(detail.google_place_id, fixture.google_place_id);
  assert.equal(mapActividadVista(detail).google_place_id, fixture.google_place_id);
  state.selects = [];
  const list = await publicService.getActividades({ page: 1, limit: 10 });
  assert.equal(list.data[0].direccion, "Dirección del recinto");
  assert.ok(state.selects.filter((item) => item.table === "actividades").every((item) => !topColumns(item.columns).includes("direccion")));
  state.rows[0].id_estado = 1;
  assert.equal(await publicService.getActividadById(1), null);
});
test("before SQL 019: legacy reads, creates, edits and quick publication remain functional", async () => {
  reset({ missing: true });
  delete state.rows[0].direccion;
  delete state.rows[0].google_place_id;
  assert.equal((await publicService.getActividadById(1)).direccion, "Dirección del recinto");
  assert.equal((await admin.getActividadAdmin(1)).google_place_id, null);
  assert.equal((await patch({ titulo: "Histórica editada" })).status, 200);
  assert.equal((await patch({ estado: "borrador" })).status, 200);
  const legacy = { ...fixture }; delete legacy.direccion; delete legacy.google_place_id;
  assert.equal((await collection.POST(request("POST", legacy))).status, 201);
  assert.ok(state.writes.every(({ payload }) => !Object.hasOwn(payload, "direccion") && !Object.hasOwn(payload, "google_place_id")));
});
test("before SQL 019: new nonnull location fails with explicit 503 instead of losing input", async () => {
  for (const value of [{ direccion: "Dirección nueva" }, { google_place_id: "selected-place" }]) {
    reset({ missing: true });
    delete state.rows[0].direccion; delete state.rows[0].google_place_id;
    const response = await patch(value);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "ACTIVIDAD_UBICACION_UNAVAILABLE");
    assert.deepEqual(state.writes, []);
  }
});
test("schema fallback does not hide unrelated database errors or retry writes", async () => {
  reset({ dbError: { code: "42501", message: "permission denied" } });
  await assert.rejects(() => admin.saveActividadAdmin(null, fixture), /Failed to save actividad/);
  assert.equal(state.reads, 1);
  assert.deepEqual(state.writes, []);
});
test("coordinates survive create/read/public mappers and partial updates; explicit null clears only the pair", async () => {
  reset();
  assert.equal((await patch({ latitud: -33.05, longitud: -71.45 })).status, 200);
  assert.equal((await (await route.GET(request("GET"), context)).json()).data.latitud, -33.05);
  assert.equal(mapActividadVista(await publicService.getActividadById(1)).longitud, -71.45);
  assert.equal((await patch({ titulo: "Nuevo" })).status, 200);
  assert.equal(state.rows[0].latitud, -33.05);
  assert.equal((await patch({ latitud: -33.06 })).status, 200);
  assert.equal(state.rows[0].longitud, -71.45);
  assert.equal((await patch({ latitud: null })).status, 200);
  assert.equal(state.rows[0].latitud, null); assert.equal(state.rows[0].longitud, null);
  assert.equal(state.rows[0].direccion, fixture.direccion); assert.equal(state.rows[0].google_place_id, fixture.google_place_id);
  assert.equal((await collection.POST(request("POST", { ...fixture, latitud: 0, longitud: 0 }))).status, 201);
  assert.equal(state.rows.at(-1).latitud, 0);
});
test("invalid coordinates do not mutate; missing schema reports 503 for a selected point", async () => {
  for (const point of [{ latitud: 100, longitud: 0 }, { latitud: 0, longitud: 200 }, { latitud: "1", longitud: 2 }, { latitud: null, longitud: 2 }]) {
    reset(); assert.equal((await patch(point)).status, 400); assert.deepEqual(state.writes, []);
  }
  reset({ missing: true }); delete state.rows[0].direccion; delete state.rows[0].google_place_id;
  assert.equal((await patch({ latitud: -33, longitud: -71 })).status, 503);
  assert.deepEqual(state.writes, []);
});
test("partial schemas retain available editorial data and do not require the legacy Google column", async () => {
  reset({ missingCoordinates: true });
  assert.equal((await admin.getActividadAdmin(1)).direccion, fixture.direccion);
  assert.equal((await patch({ titulo: "Editada sin mapa" })).status, 200);
  assert.equal(state.rows[0].direccion, fixture.direccion);
  assert.equal((await patch({ latitud: -33, longitud: -71 })).status, 503);
  reset({ missingLegacyId: true }); delete state.rows[0].google_place_id;
  assert.equal((await patch({ latitud: -33, longitud: -71 })).status, 200);
  assert.equal((await admin.getActividadAdmin(1)).latitud, -33);
});
test("catalog joins do not silently persist the shared place address before SQL 019", async () => {
  reset({missing:true}); delete state.rows[0].direccion; delete state.rows[0].google_place_id;
  const current=await admin.getActividadAdmin(1);
  assert.equal(current.direccion_evento,null); assert.equal(current.direccion,"Dirección del recinto");
  assert.equal(mapActividadVista(current).direccion_evento,null);
  assert.equal(current.id_lugar,10); assert.equal(current.modalidad,"Presencial");
  assert.equal((await patch({descripcion:"Editada"})).status,200);
  assert.ok(state.writes.every(({payload})=>!Object.hasOwn(payload,"direccion")));
});
test.after(() => hooks.deregister());
