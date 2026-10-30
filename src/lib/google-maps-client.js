"use client";

import { googleMapsKey, normalizeLocationText } from "./actividad-ubicacion.mjs";

let sdkPromise;
const libraries = new Map();
let attempt = 0;
const MAPS_ERROR_EVENT = "raiz:google-maps-error";

function loadGoogleMaps(apiKey) {
  const key = googleMapsKey(apiKey);
  if (!key || typeof window === "undefined") return Promise.resolve(null);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    let finished = false;
    const callback = "__raizGoogleMapsReady" + ++attempt;
    const script = document.createElement("script");
    const timer = window.setTimeout(() => fail(), 15000);
    const previousAuthFailure = window.gm_authFailure;
    const authFailure = () => {
      window.dispatchEvent?.(new Event(MAPS_ERROR_EVENT));
      fail();
      previousAuthFailure?.();
    };
    window.gm_authFailure = authFailure;
    function fail() {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      script.remove();
      if (window.gm_authFailure === authFailure) window.gm_authFailure = previousAuthFailure;
      window[callback] = () => {}; // A late SDK response remains harmless.
      reject(new Error("No fue posible cargar Google Maps. Puedes guardar la ubicación manualmente."));
    }
    function ready() {
      if (finished) return;
      if (!window.google?.maps?.importLibrary) { fail(); return; }
      finished = true;
      window.clearTimeout(timer);
      delete window[callback];
      resolve(window.google.maps);
    }
    if (window.google?.maps?.importLibrary) {
      void ready();
      return;
    }
    window[callback] = ready;
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    for (const [name, value] of Object.entries({
      key, loading: "async", callback, language: "es", region: "CL", v: "quarterly",
    })) url.searchParams.set(name, value);
    script.src = url.href;
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error) => {
    sdkPromise = undefined;
    throw error;
  });
  return sdkPromise;
}

export function loadGoogleMapsLibrary(name, apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
  if (!googleMapsKey(apiKey) || typeof window === "undefined") return Promise.resolve(null);
  if (libraries.has(name)) return libraries.get(name);
  const promise = loadGoogleMaps(apiKey).then((maps) => new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Google Maps library timeout")), 15000);
    Promise.resolve().then(() => maps.importLibrary(name)).then(resolve, reject)
      .finally(() => window.clearTimeout(timeout));
  })).catch(() => {
    libraries.delete(name);
    throw new Error("No fue posible cargar Google Maps. Puedes guardar la ubicación manualmente.");
  });
  libraries.set(name, promise);
  return promise;
}

export const loadGooglePlaces = (apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) =>
  loadGoogleMapsLibrary("places", apiKey);

export function watchGoogleMapsErrors(onError) {
  window.addEventListener(MAPS_ERROR_EVENT, onError);
  return () => window.removeEventListener(MAPS_ERROR_EVENT, onError);
}

export function mountGooglePlaceAutocomplete(container, places, { onSelect, onInput, onError, onPending }) {
  const widget = new places.PlaceAutocompleteElement({
    includedRegionCodes: ["cl"], requestedLanguage: "es", requestedRegion: "cl",
    // Approximate search bias, not a boundary or persisted event coordinates.
    locationBias: { center: { lat: -33.05, lng: -71.45 }, radius: 30000 },
  });
  widget.setAttribute("aria-label", "Buscar ubicación en Google Maps");
  widget.setAttribute("placeholder", "Busca una dirección o recinto en Chile");
  widget.style.width = "100%";
  widget.style.maxWidth = "100%";
  widget.style.minWidth = "0";
  let sequence = 0;
  let disposed = false;
  function input() {
    sequence++;
    onPending(false);
    onInput();
  }
  async function select({ placePrediction }) {
    const request = ++sequence;
    onInput();
    onPending(true);
    try {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ["id", "formattedAddress", "location"] });
      if (disposed || request !== sequence) return;
      const id = normalizeLocationText(place.id);
      if (!id) throw new Error("Missing place reference");
      onSelect({ google_place_id: id, googleAddress: place.formattedAddress ?? "", location: place.location ?? null });
    } catch {
      if (!disposed && request === sequence) onError("No se pudo seleccionar esa ubicación. Puedes intentarlo de nuevo o escribir la dirección manualmente.");
    } finally {
      if (!disposed && request === sequence) onPending(false);
    }
  }
  function error() {
    sequence++;
    onInput();
    onPending(false);
    onError("La búsqueda de Google Maps no está disponible. La ubicación manual sigue disponible.");
  }
  widget.addEventListener("input", input);
  widget.addEventListener("gmp-select", select);
  widget.addEventListener("gmp-error", error);
  container.appendChild(widget);
  return {
    widget,
    destroy() {
      disposed = true;
      sequence++;
      widget.removeEventListener("input", input);
      widget.removeEventListener("gmp-select", select);
      widget.removeEventListener("gmp-error", error);
      widget.remove();
    },
  };
}

// The controller owns only transient Google data and resources in its container.
export function mountGooglePlaceMap(container, { maps, places, marker, core }, { onReady, onError }) {
  let map;
  let pin;
  let sequence = 0;
  let disposed = false;
  function clear() {
    if (pin) { pin.map = null; core.event.clearInstanceListeners(pin); pin = null; }
    if (map) { core.event.clearInstanceListeners(map); map = null; }
    container.replaceChildren();
  }
  return {
    async update({ placeId, location }) {
      const request = ++sequence;
      clear();
      if (disposed || !normalizeLocationText(placeId)) return;
      try {
        let position = location;
        if (!position) {
          const place = new places.Place({ id: placeId, requestedLanguage: "es", requestedRegion: "cl" });
          await place.fetchFields({ fields: ["location"] });
          position = place.location;
        }
        if (disposed || request !== sequence) return;
        if (!position) throw new Error("Missing place location");
        map = new maps.Map(container, {
          center: position, zoom: 16, mapId: "DEMO_MAP_ID", gestureHandling: "cooperative",
          mapTypeControl: false, streetViewControl: false,
        });
        pin = new marker.AdvancedMarkerElement({ map, position, title: "Ubicación de la actividad" });
        core.event.addListenerOnce(map, "tilesloaded", () => {
          if (!disposed && request === sequence) onReady();
        });
      } catch {
        if (!disposed && request === sequence) { clear(); onError(); }
      }
    },
    destroy() { disposed = true; sequence++; clear(); },
  };
}
