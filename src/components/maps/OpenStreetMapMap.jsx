"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { coordenadasValidas } from "@/lib/actividad-ubicacion.mjs";
import { mountOpenStreetMap } from "@/lib/maps/leaflet-client";
import "leaflet/dist/leaflet.css";
import "./openstreetmap.css";

export default function OpenStreetMapMap({ latitud = null, longitud = null, editable = false, onSelect, disabled = false }) {
  const container = useRef(null), controller = useRef(null);
  const [status, setStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  const selected = coordenadasValidas(latitud, longitud);
  const canRender = editable || selected;
  const select = useEffectEvent((point) => { if (!disabled) onSelect?.(point); });
  const update = useEffectEvent(() => controller.current?.update(latitud, longitud));
  useEffect(() => {
    if (!canRender) return undefined;
    let active = true;
    import("leaflet").then((library) => {
      if (!active) return;
      controller.current = mountOpenStreetMap(container.current, library.default ?? library, {
        editable, onSelect: select, onError: () => { if (active) setStatus("tiles-error"); },
        tileUrl: process.env.NEXT_PUBLIC_OSM_TILE_URL || undefined,
      });
      update();
      setStatus("ready");
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; controller.current?.destroy(); controller.current = null; };
  }, [editable, retry, canRender]);
  useEffect(() => { controller.current?.update(latitud, longitud); }, [latitud, longitud]);

  if (!editable && !selected) return null;
  return (
    <div className="min-w-0 space-y-2">
      <div ref={container} role="region" aria-label={editable ? "Seleccionar ubicación en OpenStreetMap" : "Ubicación de la actividad en OpenStreetMap"}
        className="rq-location-map h-72 min-w-0 w-full rounded-sm" />
      {status === "loading" ? <p role="status" className="text-sm text-[#7c5c47]">Cargando mapa…</p> : null}
      {status === "error" || status === "tiles-error" ? <div role="status" className="text-sm text-[#7c5c47]">
        <p>No se pudo cargar {status === "error" ? "el mapa" : "el fondo del mapa"}. Los datos y enlaces siguen disponibles.</p>
        <button type="button" disabled={disabled} className="mt-2 min-h-11 rounded-sm border border-[#bb9c82] px-4"
          onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}>Reintentar mapa</button>
      </div> : null}
      {editable ? <>
        <p className="text-xs text-[#7c5c47]">Haz clic para colocar el punto. Con teclado, enfoca el mapa y usa las flechas para desplazarlo.</p>
        <button type="button" disabled={disabled || status === "loading" || status === "error"}
          className="min-h-11 rounded-sm border border-[#bb9c82] px-4 text-sm"
          onClick={() => controller.current?.selectCenter()}>Seleccionar centro del mapa</button>
      </> : null}
    </div>
  );
}
