import assert from "node:assert/strict";
import test from "node:test";

globalThis.fetch = async () => { throw new Error("No external requests permitted"); };
let revision = 0;
const moduleForTest = () => import("../src/lib/google-maps-client.js?test=" + ++revision);

function browserDouble() {
  const scripts = [];
  const timers = new Map();
  let id = 0;
  const events = new EventTarget();
  globalThis.window = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    setTimeout(callback) { timers.set(++id, callback); return id; },
    clearTimeout(key) { timers.delete(key); },
  };
  globalThis.document = {
    createElement() { return { remove() { this.removed = true; } }; },
    head: { appendChild(script) { scripts.push(script); } },
  };
  return { scripts, timers };
}
test("loader without credentials never creates a script or request", async () => {
  const { scripts } = browserDouble();
  const { loadGooglePlaces } = await moduleForTest();
  for (const key of [undefined, "", " ", "YOUR_KEY"]) assert.equal(await loadGooglePlaces(key), null);
  assert.equal(scripts.length, 0);
});
test("loader shares one SDK request and library between concurrent consumers", async () => {
  const { scripts, timers } = browserDouble();
  const { loadGooglePlaces } = await moduleForTest();
  const first = loadGooglePlaces("test-only");
  const second = loadGooglePlaces("test-only");
  assert.equal(first, second);
  assert.equal(scripts.length, 1);
  const url = new URL(scripts[0].src);
  assert.equal(url.origin, "https://maps.googleapis.com");
  assert.equal(url.searchParams.has("libraries"), false); // Libraries load on demand.
  const library = { PlaceAutocompleteElement: class {} };
  window.google = { maps: { importLibrary: async (name) => { assert.equal(name, "places"); return library; } } };
  await window[url.searchParams.get("callback")]();
  assert.equal(await first, library);
  assert.equal(await second, library);
  assert.equal(timers.size, 0);
});
test("failed/timeout loads reject controllably and permit an explicit retry", async () => {
  for (const failure of ["network", "timeout"]) {
    const { scripts, timers } = browserDouble();
    const { loadGooglePlaces } = await moduleForTest();
    const pending = loadGooglePlaces("test-only");
    if (failure === "network") scripts[0].onerror();
    else [...timers.values()][0]();
    await assert.rejects(() => pending, /manualmente/);
    assert.equal(scripts[0].removed, true);
    const retry = loadGooglePlaces("test-only");
    assert.equal(scripts.length, 2);
    scripts[1].onerror();
    await assert.rejects(() => retry);
  }
});

class Widget extends EventTarget {
  constructor(options) { super(); this.options = options; this.style = {}; this.attributes = {}; }
  setAttribute(name, value) { this.attributes[name] = value; }
  remove() { this.removed = true; }
}
async function controller() {
  const { mountGooglePlaceAutocomplete } = await moduleForTest();
  let widget;
  const selected = [], invalidated = [], errors = [], pending = [];
  const mounted = mountGooglePlaceAutocomplete({ appendChild(value) { widget = value; } }, { PlaceAutocompleteElement: Widget }, {
    onSelect: (value) => selected.push(value), onInput: () => invalidated.push(true),
    onError: (value) => errors.push(value), onPending: (value) => pending.push(value),
  });
  return { mounted, widget, selected, invalidated, errors, pending };
}
function selection(widget, place) {
  const event = new Event("gmp-select");
  event.placePrediction = { toPlace: () => place };
  widget.dispatchEvent(event);
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
test("modern widget selects only needed fields, restricts Chile and keeps Google text separate", async () => {
  const c = await controller();
  assert.deepEqual(c.widget.options.includedRegionCodes, ["cl"]);
  assert.ok(c.widget.options.locationBias);
  selection(c.widget, { id: "reference", formattedAddress: "Google address", fetchFields: async ({ fields }) => {
    assert.deepEqual(fields, ["id", "formattedAddress", "location"]);
  } });
  await flush();
  assert.deepEqual(c.selected, [{ google_place_id: "reference", googleAddress: "Google address", location: null }]);
  assert.equal(Object.hasOwn(c.selected[0], "direccion"), false);
  c.widget.dispatchEvent(new Event("input"));
  assert.ok(c.invalidated.length >= 1);
  c.mounted.destroy();
  assert.equal(c.widget.removed, true);
});
test("late selection responses never overwrite a newer selection or update an unmounted field", async () => {
  const c = await controller();
  let resolveOld;
  selection(c.widget, { id: "old", fetchFields: () => new Promise((done) => { resolveOld = done; }) });
  selection(c.widget, { id: "new", fetchFields: async () => {} });
  await flush();
  resolveOld();
  await flush();
  assert.deepEqual(c.selected.map((value) => value.google_place_id), ["new"]);
  let resolveLast;
  selection(c.widget, { id: "unmounted", fetchFields: () => new Promise((done) => { resolveLast = done; }) });
  c.mounted.destroy();
  resolveLast();
  await flush();
  assert.equal(c.selected.length, 1);
});
test("widget request failures leave manual entry available", async () => {
  const c = await controller();
  selection(c.widget, { fetchFields: async () => { throw new Error("Local simulated failure"); } });
  await flush();
  assert.equal(c.selected.length, 0);
  assert.equal(c.errors.length, 1);
  c.widget.dispatchEvent(new Event("gmp-error"));
  assert.equal(c.errors.length, 2);
  c.mounted.destroy();
});

test("maps, marker and places consumers share the SDK and cache only their own library", async () => {
  const { scripts } = browserDouble();
  const { loadGooglePlaces, loadGoogleMapsLibrary } = await moduleForTest();
  const calls = [];
  const results = { maps: {}, places: {}, marker: {} };
  const places = loadGooglePlaces("test-only");
  const maps = loadGoogleMapsLibrary("maps", "test-only");
  const marker = loadGoogleMapsLibrary("marker", "test-only");
  assert.equal(scripts.length, 1);
  window.google = { maps: { importLibrary: async (name) => { calls.push(name); return results[name]; } } };
  window[new URL(scripts[0].src).searchParams.get("callback")]();
  assert.deepEqual(await Promise.all([places, maps, marker]), [results.places, results.maps, results.marker]);
  assert.equal(loadGoogleMapsLibrary("maps", "test-only"), maps);
  assert.deepEqual(calls.sort(), ["maps", "marker", "places"].sort());
});

test("an already loaded modern SDK is reused without adding a script; failed libraries can retry", async () => {
  const { scripts } = browserDouble();
  const { loadGooglePlaces } = await moduleForTest();
  let failed = true;
  window.google = { maps: { importLibrary: async () => { if (failed) throw Error("Simulated"); return {}; } } };
  await assert.rejects(loadGooglePlaces("test-only"));
  failed = false;
  assert.deepEqual(await loadGooglePlaces("test-only"), {});
  assert.equal(scripts.length, 0);
});

test("auth failures reject without exposing credentials and late script callbacks are harmless", async () => {
  const { scripts } = browserDouble();
  const { loadGooglePlaces } = await moduleForTest();
  const first = loadGooglePlaces("test-only");
  const callback = new URL(scripts[0].src).searchParams.get("callback");
  window.gm_authFailure();
  await assert.rejects(first, /manualmente/);
  assert.equal(scripts[0].removed, true);
  assert.doesNotThrow(() => window[callback]());
});

test("new input cancels pending selection; Google coordinates remain transient", async () => {
  const c = await controller();
  let resolve;
  selection(c.widget, { id: "old", fetchFields: () => new Promise((done) => { resolve = done; }) });
  c.widget.dispatchEvent(new Event("input"));
  resolve();
  await flush();
  assert.equal(c.selected.length, 0);
  selection(c.widget, { id: "new", location: { lat: -33.05, lng: -71.45 }, fetchFields: async () => {} });
  await flush();
  assert.deepEqual(c.selected[0].location, { lat: -33.05, lng: -71.45 });
  assert.equal(Object.hasOwn(c.selected[0], "direccion"), false);
  c.mounted.destroy();
});

test("library timeout permits a retry and does not reuse a stalled promise", async () => {
  const { timers } = browserDouble();
  const { loadGooglePlaces } = await moduleForTest();
  let stalled = true;
  window.google = { maps: { importLibrary: () => stalled ? new Promise(() => {}) : Promise.resolve({}) } };
  const first = loadGooglePlaces("test-only");
  await flush();
  [...timers.values()][0]();
  await assert.rejects(first);
  stalled = false;
  assert.deepEqual(await loadGooglePlaces("test-only"), {});
});

test("late auth failures notify mounted maps and the subscription cleans up", async () => {
  browserDouble();
  const { loadGooglePlaces, watchGoogleMapsErrors } = await moduleForTest();
  window.google = { maps: { importLibrary: async () => ({}) } };
  await loadGooglePlaces("test-only");
  let errors = 0;
  const cleanup = watchGoogleMapsErrors(() => { errors++; });
  window.gm_authFailure();
  assert.equal(errors, 1);
  cleanup();
  window.gm_authFailure();
  assert.equal(errors, 1);
});
test.after(() => { delete globalThis.window; delete globalThis.document; });
