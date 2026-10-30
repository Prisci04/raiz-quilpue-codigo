import assert from "node:assert/strict";
import test from "node:test";
import { mountGooglePlaceMap } from "../src/lib/google-maps-client.js";
import { googleMapsRenderer } from "../src/lib/actividad-ubicacion.mjs";

globalThis.fetch = async () => { throw new Error("External network disabled"); };
const physical = { modalidad: "presencial", google_place_id: "test-place" };
test("renderer: Embed wins, JavaScript works without Embed, missing keys/ID use text", () => {
  assert.equal(googleMapsRenderer(physical, { embedKey: "test-only", mapsKey: "test-only" }), "embed");
  assert.equal(googleMapsRenderer(physical, { embedKey: "test-only" }), "embed");
  assert.equal(googleMapsRenderer(physical, { mapsKey: "test-only" }), "javascript");
  for (const credentials of [{}, { embedKey: "", mapsKey: "" }, { mapsKey: "YOUR_KEY" }]) {
    assert.equal(googleMapsRenderer(physical, credentials), null);
  }
  for (const modalidad of ["presencial", "hibrida"]) {
    assert.equal(googleMapsRenderer({ ...physical, modalidad }, { mapsKey: "test-only" }), "javascript");
  }
  for (const activity of [{ ...physical, modalidad: "virtual" }, { lugar: "Histórico", modalidad: "presencial" }, { direccion: "Calle", modalidad: "hibrida" }]) {
    assert.equal(googleMapsRenderer(activity, { mapsKey: "test-only", embedKey: "test-only" }), null);
  }
});

function setup(fetchFields = async function () { this.location = { lat: -33.05, lng: -71.45 }; }) {
  const instances = [], markers = [], cleared = [], requests = [], ready = [], errors = [];
  const container = { replaceChildren() { this.cleared = (this.cleared ?? 0) + 1; } };
  const libraries = {
    maps: { Map: class { constructor(node, options) { this.node = node; this.options = options; instances.push(this); } } },
    core: { event: {
      clearInstanceListeners: (instance) => cleared.push(instance),
      addListenerOnce: (_instance, event, callback) => { assert.equal(event, "tilesloaded"); queueMicrotask(callback); },
    } },
    marker: { AdvancedMarkerElement: class { constructor(options) { Object.assign(this, options); markers.push(this); } } },
    places: { Place: class { constructor(options) { this.id = options.id; } async fetchFields(options) { requests.push(options); await fetchFields.call(this, options); } } },
  };
  const controller = mountGooglePlaceMap(container, libraries, { onReady: () => ready.push(true), onError: () => errors.push(true) });
  return { controller, instances, markers, cleared, requests, ready, errors, container };
}

test("map renders modern marker from ephemeral location without another Places request", async () => {
  const c = setup();
  const location = { lat: -33.05, lng: -71.45 };
  await c.controller.update({ placeId: "test-place", location });
  assert.equal(c.instances.length, 1);
  assert.equal(c.instances[0].options.center, location);
  assert.equal(c.instances[0].options.mapId, "DEMO_MAP_ID");
  assert.equal(c.instances[0].options.gestureHandling, "cooperative");
  assert.equal(c.markers[0].map, c.instances[0]);
  assert.equal(c.markers[0].position, location);
  assert.equal(c.requests.length, 0);
  c.controller.destroy();
  assert.equal(c.markers[0].map, null);
  assert.equal(c.cleared.length, 2);
});

test("stored Place IDs request only location; new selection replaces map and marker", async () => {
  const c = setup();
  await c.controller.update({ placeId: "one" });
  await c.controller.update({ placeId: "two" });
  assert.deepEqual(c.requests, [{ fields: ["location"] }, { fields: ["location"] }]);
  assert.equal(c.markers[0].map, null);
  assert.equal(c.markers[1].map, c.instances[1]);
  assert.equal(c.ready.length, 2);
  c.controller.destroy();
});

test("late map details never overwrite a new selection or resurrect an unmounted map", async () => {
  let finish;
  const c = setup(async function () { if (this.id === "old") await new Promise((done) => { finish = done; }); this.location = {}; });
  const old = c.controller.update({ placeId: "old" });
  await c.controller.update({ placeId: "new", location: { lat: -33, lng: -71 } });
  finish(); await old;
  assert.equal(c.instances.length, 1);
  const last = c.controller.update({ placeId: "old" });
  c.controller.destroy(); finish(); await last;
  assert.equal(c.instances.length, 1);
});

test("place lookup errors and missing locations show a controlled failure; empty reference draws nothing", async () => {
  for (const fetchFields of [async () => { throw Error("Simulated"); }, async () => {}]) {
    const c = setup(fetchFields);
    await c.controller.update({ placeId: "test-place" });
    assert.equal(c.instances.length, 0);
    assert.equal(c.errors.length, 1);
    c.controller.destroy();
  }
  const c = setup();
  await c.controller.update({ placeId: null });
  assert.equal(c.instances.length, 0);
  assert.equal(c.requests.length, 0);
  c.controller.destroy();
});
