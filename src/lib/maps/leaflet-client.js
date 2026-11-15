"use client";

import { coordenadasValidas } from "../actividad-ubicacion.mjs";
import { DEFAULT_TILE_URL, OSM_ATTRIBUTION, QUILPUE_CENTER } from "./openstreetmap.mjs";

export function mountOpenStreetMap(container, L, { editable = false, onSelect, onError, tileUrl = DEFAULT_TILE_URL } = {}) {
  // Immediate zoom avoids Leaflet transition callbacks after React removes a preview.
  const map = L.map(container, { scrollWheelZoom: false, keyboard: true, zoomAnimation: false, markerZoomAnimation: false }).setView(QUILPUE_CENTER, 13);
  let tiles, icon;
  try {
    tiles = L.tileLayer(tileUrl, { attribution: OSM_ATTRIBUTION, maxZoom: 19, keepBuffer: 0,
      updateWhenIdle: true, updateWhenZooming: false, referrerPolicy: "strict-origin-when-cross-origin" }).addTo(map);
    icon = L.divIcon({ className: "rq-location-marker", html: '<span aria-hidden="true">●</span>', iconSize: [26, 26], iconAnchor: [13, 13] });
  } catch (error) { map.remove(); throw error; }
  let marker;
  let disposed = false;
  const choose = ({ latlng }) => { if (!disposed && editable && coordenadasValidas(latlng.lat, latlng.lng)) onSelect?.({ latitud: latlng.lat, longitud: latlng.lng }); };
  const error = () => onError?.();
  if (editable) map.on("click", choose);
  tiles.on("tileerror", error);
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => { if (!disposed) map.invalidateSize({ pan: false }); });
  observer?.observe(container);
  return {
    update(latitud, longitud) {
      if (disposed) return;
      if (!coordenadasValidas(latitud, longitud)) { marker?.remove(); marker = null; return; }
      const point = [latitud, longitud];
      if (marker) marker.setLatLng(point);
      else marker = L.marker(point, { icon, title: "Ubicación de la actividad", alt: "Ubicación de la actividad", keyboard: true }).addTo(map);
      map.setView(point, 16, { animate: false });
    },
    selectCenter() { choose({ latlng: map.getCenter() }); },
    destroy() { if (disposed) return; disposed = true; observer?.disconnect(); tiles.off("tileerror", error); map.off("click", choose); map.remove(); },
  };
}
