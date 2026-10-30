"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsLibrary, mountGooglePlaceMap, watchGoogleMapsErrors } from "@/lib/google-maps-client";
import { googleMapsKey, normalizeLocationText } from "@/lib/actividad-ubicacion.mjs";

export default function GoogleMapsJavaScriptMap({ placeId, location = null, direccion, apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY }) {
  const container = useRef(null);
  const [status, setStatus] = useState("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!googleMapsKey(apiKey) || !normalizeLocationText(placeId)) return undefined;
    let active = true;
    let controller;
    let timeout;
    const fail = () => {
      if (!active) return;
      active = false;
      window.clearTimeout(timeout);
      controller?.destroy();
      setStatus("error");
    };
    const unwatch = watchGoogleMapsErrors(fail);
    // Includes stalled library/detail requests, not only loading the SDK script.
    timeout = window.setTimeout(fail, 20000);
    Promise.all(["maps", "places", "marker", "core"].map((name) => loadGoogleMapsLibrary(name, apiKey)))
      .then(([maps, places, marker, core]) => {
        if (!active || !maps || !places || !marker || !core) return;
        controller = mountGooglePlaceMap(container.current, { maps, places, marker, core }, {
          onReady: () => { if (active) { window.clearTimeout(timeout); setStatus("ready"); } },
          onError: fail,
        });
        return controller.update({ placeId, location });
      }).catch(fail);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      unwatch();
      controller?.destroy();
    };
  }, [placeId, location, apiKey, retry]);

  if (!googleMapsKey(apiKey) || !normalizeLocationText(placeId)) return null;
  return (
    <div className="min-w-0 space-y-2">
      <div ref={container} role="region" aria-label={direccion ? "Mapa de ubicación: " + direccion : "Ubicación de la actividad en Google Maps"}
        className={"h-64 min-w-0 w-full rounded-sm " + (status === "error" ? "hidden" : "")} />
      {status === "loading" ? <p role="status" className="text-sm text-[#7c5c47]">Cargando mapa…</p> : null}
      {status === "error" ? <div role="status" className="text-sm text-[#7c5c47]">
        <p>No se pudo mostrar el mapa. La ubicación y los enlaces siguen disponibles.</p>
        <button type="button" className="mt-2 min-h-11 rounded-sm border border-[#bb9c82] px-4"
          onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}>Reintentar mapa</button>
      </div> : null}
    </div>
  );
}
