import assert from "node:assert/strict";
import test from "node:test";
import {
  parseActividadUbicacion, buildActividadMapsLinks, buildGoogleMapsEmbedUrl,
  puedeMostrarMapa, googleMapsKey,
} from "../src/lib/actividad-ubicacion.mjs";
import { parseActividadInput } from "../src/lib/community-validation.mjs";

const base = { titulo: "Actividad", descripcion: "Descripción", publico_objetivo: "todas_edades", lugar: "Centro cultural" };
test("location: omission, explicit null, whitespace and own editorial text are distinct", () => {
  assert.deepEqual(parseActividadUbicacion({}).value, {});
  assert.deepEqual(parseActividadUbicacion({ direccion: null, google_place_id: " " }).value, { direccion: null, google_place_id: null });
  assert.deepEqual(parseActividadUbicacion({ direccion: " Calle 1, Quilpué ", google_place_id: "opaque-reference" }).value, { direccion: "Calle 1, Quilpué", google_place_id: "opaque-reference" });
  for (const input of [null, [], { direccion: 123 }, { google_place_id: {} }, { direccion: "a".repeat(501) }, { google_place_id: "a\u0000b" }]) {
    assert.equal(parseActividadUbicacion(input).ok, false);
  }
});
test("location remains optional and presencial still requires lugar, including draft", () => {
  assert.equal(parseActividadInput({ ...base, modalidad: "presencial", lugar: null }).ok, false);
  for (const modalidad of ["presencial", "hibrida", "virtual"]) {
    const parsed = parseActividadInput({ ...base, modalidad, direccion: "Calle propia", google_place_id: "reference" });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.value.direccion, "Calle propia");
    assert.equal(parsed.value.google_place_id, "reference");
  }
  assert.equal(parseActividadInput({ ...base, modalidad: "hibrida", lugar: null }).ok, true);
  assert.equal(parseActividadInput({ ...base, modalidad: "virtual", lugar: null }).ok, true);
});
test("Google keys are optional; blank and example values never create Embed URLs", () => {
  for (const key of [undefined, "", " ", "YOUR_KEY", "TU_CLAVE", "PLACEHOLDER"]) {
    assert.equal(googleMapsKey(key), null);
    assert.equal(buildGoogleMapsEmbedUrl("reference", key), null);
  }
  assert.equal(buildGoogleMapsEmbedUrl(null, "test-only"), null);
});
test("Embed and Maps links encode opaque IDs and addresses without changing host/path", () => {
  const activity = { modalidad: "presencial", lugar: "Recinto", direccion: "Av. A & B #12, Quilpué", google_place_id: "opaque/&?=ñ" };
  const embed = new URL(buildGoogleMapsEmbedUrl(activity.google_place_id, "test-only"));
  assert.equal(embed.origin, "https://www.google.com");
  assert.equal(embed.pathname, "/maps/embed/v1/place");
  assert.equal(embed.searchParams.get("q"), "place_id:" + activity.google_place_id);
  const links = buildActividadMapsLinks(activity);
  const directions = new URL(links.directions);
  assert.equal(directions.searchParams.get("api"), "1");
  assert.equal(directions.searchParams.get("destination"), activity.direccion);
  assert.equal(directions.searchParams.get("destination_place_id"), activity.google_place_id);
  assert.equal(new URL(links.map).searchParams.get("query_place_id"), activity.google_place_id);
});
test("virtual and unknown modalities never produce a map or physical links", () => {
  for (const modalidad of ["virtual", null, ""]) {
    const activity = { modalidad, direccion: "Texto histórico", google_place_id: "reference" };
    assert.equal(puedeMostrarMapa(activity, "test-only"), false);
    assert.deepEqual(buildActividadMapsLinks(activity), { directions: null, map: null });
  }
});
test("historical lugar and manual address work without a key or Place ID", () => {
  for (const fields of [{ lugar: "Recinto histórico" }, { direccion: "Dirección propia" }]) {
    const activity = { modalidad: "hibrida", ...fields };
    assert.equal(puedeMostrarMapa(activity, undefined), false);
    const links = buildActividadMapsLinks(activity);
    assert.ok(links.directions);
    assert.equal(new URL(links.map).searchParams.has("key"), false);
    assert.equal(new URL(links.map).searchParams.has("query_place_id"), false);
  }
  assert.deepEqual(buildActividadMapsLinks({ modalidad: "presencial" }), { directions: null, map: null });
  const activity = { modalidad: "hibrida", direccion: "Calle", google_place_id: "a".repeat(3000) };
  assert.equal(new URL(buildActividadMapsLinks(activity).map).searchParams.has("query_place_id"), false);
});
