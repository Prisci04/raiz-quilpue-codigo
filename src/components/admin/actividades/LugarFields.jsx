"use client";

import { useEffect, useState } from "react";
import { createLugar, getUbicaciones } from "@/lib/api/ubicaciones";

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

export default function LugarFields({ value, onChange, disabled }) {
  const [regiones, setRegiones] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [mode, setMode] = useState("existente");
  const [nuevo, setNuevo] = useState({ nombre_lugar: "", direccion: "" });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const idRegion = value.id_region ?? "";
  const idComuna = value.id_comuna ?? "";

  useEffect(() => {
    let active = true;

    getUbicaciones({
      idRegion: idRegion || undefined,
      idComuna: idComuna || undefined,
    })
      .then((data) => {
        if (!active) return;
        setRegiones(data.regiones ?? []);
        setComunas(data.comunas ?? []);
        setLugares(data.lugares ?? []);
        if (!idRegion && data.id_region) {
          onChange({
            id_region: data.id_region,
            id_comuna: data.id_comuna ?? "",
            id_lugar: "",
          });
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [idRegion, idComuna, onChange]);

  function handleRegion(nextRegion) {
    onChange({ id_region: nextRegion, id_comuna: "", id_lugar: "" });
  }

  function handleComuna(nextComuna) {
    onChange({ id_region: idRegion, id_comuna: nextComuna, id_lugar: "" });
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (!idComuna || !nuevo.nombre_lugar.trim() || !nuevo.direccion.trim()) {
      setError("Indica nombre, dirección y comuna para crear el lugar.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const created = await createLugar({
        nombre_lugar: nuevo.nombre_lugar,
        direccion: nuevo.direccion,
        id_comuna: Number(idComuna),
      });
      setLugares((current) => [...current, created]);
      setMode("existente");
      onChange({
        id_region: Number(idRegion),
        id_comuna: Number(idComuna),
        id_lugar: created.id,
        nombre_lugar: created.nombre,
        latitud: created.latitud,
        longitud: created.longitud,
      });
    } catch (createError) {
      setError(createError.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2">
      <Field label="Región *">
        <select
          required
          disabled={disabled}
          value={idRegion}
          onChange={(event) => handleRegion(event.target.value)}
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
          value={idComuna}
          onChange={(event) => handleComuna(event.target.value)}
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
      <Field label="Lugar *" className="lg:col-span-2">
        <select
          required={mode === "existente"}
          disabled={disabled}
          value={mode === "existente" ? (value.id_lugar ?? "") : "nuevo"}
          onChange={(event) => {
            if (event.target.value === "nuevo") {
              setMode("nuevo");
              onChange({ id_region: idRegion, id_comuna: idComuna, id_lugar: "" });
              return;
            }
            setMode("existente");
            const selected = lugares.find((lugar) => Number(lugar.id) === Number(event.target.value));
            onChange({
              id_region: idRegion,
              id_comuna: idComuna,
              id_lugar: Number(event.target.value),
              nombre_lugar: selected?.nombre,
              latitud: selected?.latitud,
              longitud: selected?.longitud,
            });
          }}
          className={inputClass}
        >
          <option value="">Seleccionar lugar</option>
          {lugares.map((lugar) => (
            <option key={lugar.id} value={lugar.id}>
              {lugar.nombre}
            </option>
          ))}
          <option value="nuevo">Crear un lugar nuevo</option>
        </select>
      </Field>
      {mode === "nuevo" ? (
        <div className="grid gap-3 lg:col-span-2">
          <Field label="Nombre del nuevo lugar *">
            <input
              value={nuevo.nombre_lugar}
              disabled={disabled || creating}
              onChange={(event) =>
                setNuevo((current) => ({ ...current, nombre_lugar: event.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Dirección *">
            <input
              value={nuevo.direccion}
              disabled={disabled || creating}
              onChange={(event) =>
                setNuevo((current) => ({ ...current, direccion: event.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <button
            type="button"
            disabled={disabled || creating}
            onClick={handleCreate}
            className="min-h-10 w-fit rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50"
          >
            {creating ? "Creando lugar…" : "Guardar lugar"}
          </button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-[#8d3b28] lg:col-span-2">{error}</p> : null}
    </div>
  );
}
