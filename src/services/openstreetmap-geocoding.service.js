import "server-only";
import { GEOCODING_LIMIT, GeocodingError, NOMINATIM_SEARCH_URL, normalizeGeocodingQuery, parseGeocodingResults } from "@/lib/maps/openstreetmap.mjs";

// One coordinator per Node process. Public Nominatim is disabled on distributed Vercel.
export function createNominatimGeocoder({ fetchImpl = fetch, now = Date.now, searchUrl = NOMINATIM_SEARCH_URL, distributed = false } = {}) {
  const endpoint = new URL(searchUrl);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) throw new Error("Invalid geocoder configuration");
  const publicService = endpoint.hostname === "nominatim.openstreetmap.org";
  const cache = new Map();
  let active = false, nextRequestAt = 0;
  return async function search(query, { signal } = {}) {
    const normalized = normalizeGeocodingQuery(query);
    if (!normalized) throw new GeocodingError(400, "GEOCODING_QUERY", "Escribe una búsqueda de entre 3 y 300 caracteres.");
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    if (publicService && distributed) throw new GeocodingError(503, "GEOCODING_CONFIGURATION", "La búsqueda necesita un proveedor o una pasarela configurada. Puedes seleccionar el punto directamente en el mapa.");
    const key = normalized.toLocaleLowerCase("es-CL");
    const saved = cache.get(key);
    if (saved && saved.expires > now()) return structuredClone(saved.results);
    if (active || now() < nextRequestAt) throw new GeocodingError(429, "GEOCODING_RATE_LIMIT", "Espera un momento antes de realizar otra búsqueda.");
    active = true;
    nextRequestAt = now() + 1100;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    let timeout = false;
    const timer = setTimeout(() => { timeout = true; controller.abort(); }, 10000);
    try {
      const url = new URL(endpoint);
      for (const [name, value] of Object.entries({ q: normalized, format: "jsonv2", limit: String(GEOCODING_LIMIT),
        "accept-language": "es-CL,es", addressdetails: "0", viewbox: "-71.8,-32.7,-71.0,-33.5", bounded: "0" })) url.searchParams.set(name, value);
      const response = await fetchImpl(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "RaizQuilpue-HU23/1.0 (+https://github.com/Prisci04/raiz-quilpue-codigo)" },
      });
      if (!response.ok) {
        if (response.status === 429) {
          const seconds = Number(response.headers.get("Retry-After"));
          nextRequestAt = Math.max(nextRequestAt, now() + (Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 86400) : 60) * 1000);
        }
        throw new GeocodingError(response.status === 429 ? 429 : 502, "GEOCODING_PROVIDER", "El buscador de ubicaciones no está disponible. Puedes seleccionar el punto en el mapa.");
      }
      const text = await response.text();
      if (text.length > 200000) throw new Error("Unexpected response size");
      const results = parseGeocodingResults(JSON.parse(text));
      if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { results, expires: now() + 15 * 60 * 1000 });
      return structuredClone(results);
    } catch (error) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      if (error instanceof GeocodingError) throw error;
      throw new GeocodingError(timeout ? 504 : 502, "GEOCODING_UNAVAILABLE", timeout
        ? "La búsqueda tardó demasiado. Puedes volver a intentarlo o seleccionar el punto en el mapa."
        : "No fue posible buscar la ubicación. Puedes seleccionar el punto en el mapa.");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      active = false;
    }
  };
}

let geocoder;
export function searchOpenStreetMap(query, options) {
  geocoder ??= createNominatimGeocoder({
    searchUrl: process.env.NOMINATIM_SEARCH_URL || NOMINATIM_SEARCH_URL,
    distributed: Boolean(process.env.VERCEL)
      || (process.env.NODE_ENV === "production" && process.env.NOMINATIM_SINGLE_INSTANCE !== "1"),
  });
  return geocoder(query, options);
}
