"use client";

import { useEffect, useState } from "react";
import { getUbicaciones } from "@/lib/api/ubicaciones";

const inputClass =
  "mt-1.5 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] outline-none focus:border-[#c4a484]";

function Field({ label, children, className = "" }) {
  return (
    <label className={`admin-field block min-w-0 ${className}`}>
      <span className="text-[13px] font-medium text-[#2c1810]">{label}</span>
      {children}
    </label>
  );
}

function mapsEmbedSrc(query) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=es&z=16&output=embed`;
}

export default function LugarFields({ value, onChange, disabled }) {
  const [regiones, setRegiones] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [defaults, setDefaults] = useState({ id_region: "", id_comuna: "" });
  const [error, setError] = useState("");
  const [mapQuery, setMapQuery] = useState("");

  const resolvedRegion = value.id_region || defaults.id_region || "";
  const defaultComuna =
    Number(defaults.id_region) === Number(resolvedRegion) ? defaults.id_comuna : "";
  const resolvedComuna = value.id_comuna || defaultComuna || "";
  const direccion = value.lugar_direccion ?? "";

  const regionNombre = regiones.find((item) => Number(item.id) === Number(resolvedRegion))?.nombre;
  const comunaNombre = comunas.find((item) => Number(item.id) === Number(resolvedComuna))?.nombre;

  useEffect(() => {
    let active = true;

    getUbicaciones({
      idRegion: value.id_region || undefined,
    })
      .then((data) => {
        if (!active) return;
        setRegiones(data.regiones ?? []);
        setComunas(data.comunas ?? []);
        setDefaults({
          id_region: data.id_region ?? "",
          id_comuna: data.id_comuna ?? "",
        });
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [value.id_region]);

  useEffect(() => {
    const trimmed = direccion.trim();
    const query = trimmed
      ? [trimmed, comunaNombre, regionNombre, "Chile"].filter(Boolean).join(", ")
      : "";
    const handle = setTimeout(() => setMapQuery(query), query ? 400 : 0);
    return () => clearTimeout(handle);
  }, [direccion, comunaNombre, regionNombre]);

  function emit(patch) {
    onChange({
      id_region: resolvedRegion,
      id_comuna: resolvedComuna,
      lugar_direccion: direccion,
      ...patch,
    });
  }

  return (
    <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2">
      <Field label="Región *">
        <select
          required
          disabled={disabled}
          value={resolvedRegion}
          onChange={(event) =>
            onChange({
              id_region: event.target.value,
              id_comuna: "",
              lugar_direccion: direccion,
            })
          }
          className={inputClass}
        >
          <option value="">Seleccionar región</option>
          {regiones.map((region) => (
            <option key={region.id} value={region.id}>
              {region.nombre}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Comuna *">
        <select
          required
          disabled={disabled}
          value={resolvedComuna}
          onChange={(event) => emit({ id_comuna: event.target.value })}
          className={inputClass}
        >
          <option value="">Seleccionar comuna</option>
          {comunas.map((comuna) => (
            <option key={comuna.id} value={comuna.id}>
              {comuna.nombre}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Dirección *" className="lg:col-span-2">
        <input
          required
          maxLength={250}
          disabled={disabled}
          value={direccion}
          placeholder="Ej. Av. Diego Portales 1234"
          onChange={(event) => emit({ lugar_direccion: event.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="overflow-hidden rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] lg:col-span-2">
        {mapQuery ? (
          <iframe
            title="Mapa de la dirección"
            src={mapsEmbedSrc(mapQuery)}
            className="h-64 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <p className="px-4 py-16 text-center text-sm text-[#8d7b6d]">
            Escribe la dirección para verla en el mapa.
          </p>
        )}
      </div>
      {error ? <p className="text-sm text-[#8d3b28] lg:col-span-2">{error}</p> : null}
    </div>
  );
}
