"use client";

import { useEffect, useId, useRef, useState } from "react";
import OpenStreetMapMap from "@/components/maps/OpenStreetMapMap";
import { actividadTieneUbicacionFisica, buildActividadMapsLinks, coordenadasValidas, DIRECCION_MAX_LENGTH } from "@/lib/actividad-ubicacion.mjs";
import { buscarUbicacion } from "@/lib/api/ubicacion";

function PhysicalLocation({ value, onChange, disabled, id }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const pending = useRef(null);
  const sequence = useRef(0);
  const searchInput = useRef(null);
  const selected = coordenadasValidas(value.latitud, value.longitud);
  const links = buildActividadMapsLinks(value);
  useEffect(() => () => { sequence.current++; pending.current?.abort(); }, []);

  async function search() {
    if (disabled || pending.current) return;
    const current = ++sequence.current;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError(""); setResults(null);
    try {
      const found = await buscarUbicacion(query || value.direccion || value.lugar, { signal: controller.signal });
      if (current === sequence.current && !controller.signal.aborted) setResults(found);
    } catch (failure) {
      if (current === sequence.current && failure.name !== "AbortError") setError(failure.message);
    } finally {
      if (current === sequence.current) { pending.current = null; setBusy(false); }
    }
  }
  function cancel() {
    sequence.current++; pending.current?.abort(); pending.current = null; setBusy(false);
  }
  function select(point) {
    if (disabled) return;
    onChange({ latitud: point.latitud, longitud: point.longitud });
    setMapOpen(true); setResults(null);
  }
  return (
    <div className="space-y-4 border-t border-[#e6ddd4] pt-4">
      <label htmlFor={id + "-query"} className="block text-sm font-medium">Buscar una dirección o recinto</label>
      <input ref={searchInput} id={id + "-query"} value={query} maxLength={300} disabled={disabled}
        placeholder={value.direccion || value.lugar || "Dirección, comuna, país"}
        aria-describedby={id + "-query-help"}
        className="min-h-11 w-full min-w-0 rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 text-sm"
        onChange={(event) => { cancel(); setQuery(event.target.value); setResults(null); setError(""); }}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} />
      <p id={id + "-query-help"} className="text-xs leading-relaxed text-[#7c5c47]">La búsqueda solo se envía al presionar el botón o Enter. Se prioriza el entorno de Quilpué sin limitar otras ubicaciones. El resultado no reemplaza tu dirección editorial.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy} onClick={search} className="min-h-11 rounded-sm border border-[#bb9c82] bg-white px-4 text-sm disabled:opacity-60">{busy ? "Buscando ubicación…" : "Buscar ubicación"}</button>
        {busy ? <button type="button" onClick={cancel} className="min-h-11 px-4 text-sm">Cancelar búsqueda</button> : null}
        <button type="button" disabled={disabled} className="min-h-11 rounded-sm border border-[#bb9c82] px-4 text-sm"
          onClick={() => setMapOpen(true)}>Seleccionar en el mapa</button>
      </div>
      {busy ? <p role="status" className="text-sm text-[#7c5c47]">Buscando ubicaciones…</p> : null}
      {error ? <p role="alert" className="text-sm text-[#8d3b28]">{error}</p> : null}
      {results?.length === 0 ? <p role="status" className="text-sm text-[#7c5c47]">No encontramos resultados. Prueba con otra dirección o selecciona el punto en el mapa.</p> : null}
      {results?.length ? <ul aria-label="Resultados de ubicación" className="space-y-2">
        {results.map((result) => <li key={result.id}>
          <button type="button" disabled={disabled} className="min-h-11 w-full rounded-sm border border-[#e6ddd4] bg-white p-3 text-left text-sm wrap-anywhere"
            onClick={() => select(result)}>{result.label}</button>
        </li>)}
      </ul> : null}
      <p className="text-xs text-[#7c5c47]">Búsqueda: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">© OpenStreetMap contributors</a> · Nominatim.</p>
      {selected ? <div role="status" className="space-y-1 text-sm text-[#5c4636]">
        <p>Ubicación seleccionada.</p>
        <p>Latitud: {value.latitud.toFixed(6)} · Longitud: {value.longitud.toFixed(6)}</p>
      </div> : null}
      {selected || mapOpen ? <OpenStreetMapMap editable disabled={disabled} latitud={value.latitud} longitud={value.longitud} onSelect={select} /> : null}
      {selected ? <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" disabled={disabled} className="min-h-11 rounded-sm border border-[#bb9c82] px-4"
          onClick={() => { searchInput.current?.focus(); searchInput.current?.scrollIntoView({ block: "nearest" }); }}>Cambiar ubicación</button>
        <button type="button" disabled={disabled} className="min-h-11 rounded-sm border border-[#bb9c82] px-4"
          onClick={() => { cancel(); onChange({ latitud: null, longitud: null }); setMapOpen(false); setResults(null); }}>Quitar coordenadas</button>
      </div> : null}
      <div className="flex flex-wrap gap-3 text-sm text-[#704a31]">
        {links.directions ? <a href={links.directions} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Cómo llegar</a> : null}
        {links.map ? <a href={links.map} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Abrir en Google Maps</a> : null}
      </div>
    </div>
  );
}

export default function ActividadUbicacionField({ value, onChange, disabled = false, catalogLugar = false }) {
  const id = useId();
  const physical = actividadTieneUbicacionFisica(value);
  const inputClass = "mt-1.5 min-h-11 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] disabled:opacity-60";
  return (
    <section className="admin-card space-y-5 p-4 sm:p-6" aria-labelledby={id + "-title"}>
      <h2 id={id + "-title"} className="font-serif text-lg font-medium text-[#2c1810]">Ubicación</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          {catalogLugar ? <>
            <p className="text-[13px] font-medium">Lugar seleccionado</p>
            <p className="mt-1.5 text-sm wrap-anywhere">{value.lugar || "Selecciona un lugar en los datos de la actividad."}</p>
          </> : <>
            <label htmlFor={id + "-lugar"} className="text-[13px] font-medium">Nombre del lugar o recinto{value.modalidad === "presencial" ? " *" : ""}</label>
            <input id={id + "-lugar"} name="lugar" required={value.modalidad === "presencial"} maxLength={250}
              value={value.lugar ?? ""} disabled={disabled} className={inputClass}
              onChange={(event) => onChange({ lugar: event.target.value })} />
          </>}
        </div>
        <div>
          <label htmlFor={id + "-direccion"} className="text-[13px] font-medium">Dirección del evento</label>
          <input id={id + "-direccion"} name="direccion" maxLength={DIRECCION_MAX_LENGTH} value={value.direccion ?? ""}
            disabled={disabled} className={inputClass} aria-describedby={id + "-direccion-help"}
            onChange={(event) => onChange({ direccion: event.target.value })} />
          <p id={id + "-direccion-help"} className="mt-1 text-xs leading-relaxed text-[#7c5c47]">Opcional. Conserva tus indicaciones propias. Seleccionar o mover el punto no cambia este texto.</p>
        </div>
      </div>
      {physical ? <PhysicalLocation value={value} onChange={onChange} disabled={disabled} id={id} />
        : <p className="text-sm text-[#7c5c47]">Las actividades virtuales no muestran búsqueda, mapa ni enlaces físicos. Los datos históricos se conservan.</p>}
    </section>
  );
}
