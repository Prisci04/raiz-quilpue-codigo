"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import GoogleMapsLocation from "@/components/maps/GoogleMapsLocation";
import { actividadTieneUbicacionFisica, buildActividadMapsLinks, DIRECCION_MAX_LENGTH, googleMapsKey } from "@/lib/actividad-ubicacion.mjs";
import { loadGooglePlaces, mountGooglePlaceAutocomplete } from "@/lib/google-maps-client";

function PlacesSearch({ disabled, onChange, onGoogleSelection }) {
  const container = useRef(null);
  const mounted = useRef(null);
  const [status, setStatus] = useState("Cargando búsqueda de Google Maps…");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const initialize = useEffectEvent((controller) => { controller.widget.disabled = disabled; });
  const select = useEffectEvent((selected) => {
    if (disabled) return;
    onChange({ google_place_id: selected.google_place_id });
    onGoogleSelection(selected);
    setError("");
    setStatus("Ubicación seleccionada.");
  });
  const input = useEffectEvent(() => {
    if (disabled) return;
    onChange({ google_place_id: null });
    onGoogleSelection(null);
    setError("");
    setStatus("Selecciona una sugerencia para confirmar el mapa.");
  });
  useEffect(() => {
    let active = true;
    loadGooglePlaces().then((places) => {
      if (!active) return;
      if (!places) throw new Error("Google Maps no está configurado. Puedes escribir la ubicación manualmente.");
      mounted.current = mountGooglePlaceAutocomplete(container.current, places, {
        onSelect: select, onInput: input,
        onError: (message) => { if (active) { setError(message); setStatus(""); } },
        onPending: (pending) => { if (active && pending) setStatus("Comprobando selección…"); },
      });
      initialize(mounted.current);
      setStatus("Busca y selecciona una sugerencia.");
    }).catch((loadError) => { if (active) { setError(loadError.message); setStatus(""); } });
    return () => {
      active = false;
      mounted.current?.destroy();
      mounted.current = null;
    };
  }, [retry]);
  useEffect(() => {
    if (mounted.current) mounted.current.widget.disabled = disabled;
  }, [disabled]);

  return (
    <div className="space-y-2">
      <div ref={container} className="min-h-11" onKeyDown={(event) => {
        // Keep Google's Enter/default selection behavior inside its shadow DOM.
        // Its internal input does not belong to the outer activity form.
        if (event.key === "Enter") event.stopPropagation();
      }} />
      {status ? <p role="status" className="text-xs leading-relaxed text-[#7c5c47]">{status}</p> : null}
      {error ? <div role="status" className="text-sm text-[#8d3b28]">
        <p>{error}</p>
        <button type="button" disabled={disabled} className="mt-2 min-h-10 rounded-sm border border-[#e6ddd4] px-3 text-sm"
          onClick={() => { setError(""); setStatus("Cargando búsqueda…"); setRetry((value) => value + 1); }}>Reintentar búsqueda</button>
      </div> : null}
    </div>
  );
}

export default function ActividadUbicacionField({ value, onChange, disabled = false }) {
  const id = useId();
  const [searchOpen, setSearchOpen] = useState(false);
  const [googleSelection, setGoogleSelection] = useState(null);
  const physical = actividadTieneUbicacionFisica(value);
  const configured = Boolean(googleMapsKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY));
  const reference = value.google_place_id;
  const selection = googleSelection?.google_place_id === reference ? googleSelection : null;
  const links = buildActividadMapsLinks(value);
  const inputClass = "mt-1.5 min-h-11 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] disabled:opacity-60";

  function removeReference() {
    onChange({ google_place_id: null });
    setGoogleSelection(null);
    setSearchOpen(false);
  }

  return (
    <section className="admin-card space-y-5 p-4 sm:p-6" aria-labelledby={id + "-title"}>
      <h2 id={id + "-title"} className="font-serif text-lg font-medium text-[#2c1810]">Ubicación</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <label htmlFor={id + "-lugar"} className="text-[13px] font-medium">Nombre del lugar o recinto{value.modalidad === "presencial" ? " *" : ""}</label>
          <input id={id + "-lugar"} name="lugar" required={value.modalidad === "presencial"} maxLength={250}
            value={value.lugar ?? ""} disabled={disabled} className={inputClass}
            aria-describedby={id + "-lugar-help"} onChange={(event) => onChange({ lugar: event.target.value })} />
          <p id={id + "-lugar-help"} className="mt-1 text-xs text-[#7c5c47]">Obligatorio para actividades presenciales. Puedes conservar las indicaciones existentes.</p>
        </div>
        <div>
          <label htmlFor={id + "-direccion"} className="text-[13px] font-medium">Dirección del evento</label>
          <input id={id + "-direccion"} name="direccion" maxLength={DIRECCION_MAX_LENGTH} value={value.direccion ?? ""}
            disabled={disabled} className={inputClass} aria-describedby={id + "-direccion-help"}
            onChange={(event) => onChange({ direccion: event.target.value })} />
          <p id={id + "-direccion-help"} className="mt-1 text-xs leading-relaxed text-[#7c5c47]">Opcional. Escribe la dirección propia del evento, incluyendo comuna y referencias útiles. Google no reemplaza este texto.</p>
        </div>
      </div>
      <div className="space-y-3 border-t border-[#e6ddd4] pt-4">
        <h3 className="text-sm font-medium">Buscar ubicación en Google Maps</h3>
        {!physical ? (
          <p className="text-sm leading-relaxed text-[#7c5c47]">Las actividades virtuales no muestran mapas ni enlaces de ubicación física.{reference ? " La referencia guardada se conserva hasta que la quites explícitamente." : ""}</p>
        ) : !configured ? (
          <p className="text-sm leading-relaxed text-[#7c5c47]">Google Maps todavía no está configurado. Puedes guardar la ubicación manualmente.</p>
        ) : (
          <>
            <button type="button" disabled={disabled} aria-expanded={searchOpen} aria-controls={id + "-search"}
              className="min-h-11 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm"
              onClick={() => setSearchOpen((current) => !current)}>
              {searchOpen ? "Cerrar búsqueda" : reference ? "Cambiar ubicación" : "Buscar en Google Maps"}
            </button>
            {searchOpen ? <div id={id + "-search"}>
              <PlacesSearch disabled={disabled} onChange={onChange} onGoogleSelection={setGoogleSelection} />
            </div> : null}
          </>
        )}
        {reference ? (
          <div className="space-y-3">
            <p className="text-sm text-[#5c4636]">Referencia Google seleccionada{physical ? "." : " (sin uso en esta modalidad)."}</p>
            {selection?.googleAddress && physical ? <p className="text-sm wrap-anywhere text-[#7c5c47]">
              Dirección de Google Maps, temporal: {selection.googleAddress}
              <span className="mt-1 block text-xs">Solo para esta selección; no se copia automáticamente a la dirección del evento.</span>
            </p> : null}
            {physical ? <>
              <GoogleMapsLocation activity={value} location={selection?.location ?? null} />
              <div className="flex flex-wrap gap-3 text-sm text-[#704a31]">
                {links.directions ? <a href={links.directions} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-2">Cómo llegar</a> : null}
                {links.map ? <a href={links.map} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-2">Abrir en Google Maps</a> : null}
              </div>
            </> : null}
            <button type="button" disabled={disabled} className="min-h-11 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm"
              onClick={removeReference}>Quitar referencia Google</button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
