"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { updatePerfil } from "@/lib/api/perfil";
import { parsePerfilUpdate } from "@/lib/usuarios/validation.mjs";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-sm border border-transparent bg-[#f4efe9] px-3.5 text-sm text-[#2c1810] outline-none transition focus:border-[#eadfd4] focus:bg-white focus:ring-4 focus:ring-[#feca2b]/30";

export default function PerfilForm({ perfil, onUpdated }) {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: perfil.nombre ?? "",
    apellido: perfil.apellido ?? "",
    telefono: perfil.telefono ?? "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const parsed = parsePerfilUpdate(form);

    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setSaving(true);

    try {
      const updated = await updatePerfil(parsed.value);
      onUpdated(updated);
      setSuccess("Perfil actualizado correctamente.");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-sm border border-[#2c1810]/6 bg-white p-5 shadow-[0_10px_30px_rgba(44,24,16,0.04)] sm:p-6">
      <h2 className="text-lg font-semibold text-[#2c1810]">Información personal</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="perfil-nombre" className="text-[13px] font-medium text-[#2c1810]">
            Nombre
          </label>
          <input
            id="perfil-nombre"
            value={form.nombre}
            onChange={(event) => updateField("nombre", event.target.value)}
            className={fieldClass}
            required
          />
        </div>
        <div>
          <label htmlFor="perfil-apellido" className="text-[13px] font-medium text-[#2c1810]">
            Apellido
          </label>
          <input
            id="perfil-apellido"
            value={form.apellido}
            onChange={(event) => updateField("apellido", event.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="perfil-email" className="text-[13px] font-medium text-[#2c1810]">
            Correo
          </label>
          <div className="relative">
            <input
              id="perfil-email"
              value={perfil.email}
              readOnly
              className={`${fieldClass} cursor-not-allowed pr-10 text-[#7c5c47]`}
            />
            <Lock
              size={15}
              strokeWidth={1.8}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#a4846c]"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="perfil-telefono" className="text-[13px] font-medium text-[#2c1810]">
            Teléfono
          </label>
          <input
            id="perfil-telefono"
            value={form.telefono}
            onChange={(event) => updateField("telefono", event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-sm bg-[#f6f1eb] px-4 py-3">
          <dt className="text-[12px] text-[#7c5c47]">Rol</dt>
          <dd className="mt-1 text-sm font-medium text-[#2c1810]">
            {perfil.rol?.nombre ?? "Sin rol"}
          </dd>
        </div>
        <div className="rounded-sm bg-[#f6f1eb] px-4 py-3">
          <dt className="text-[12px] text-[#7c5c47]">Estado</dt>
          <dd className="mt-1 text-sm font-medium text-[#2c1810]">
            {perfil.estado === "activo" ? "Activo" : "Inactivo"}
          </dd>
        </div>
      </dl>

      {error ? (
        <p className="mt-4 text-sm text-[#8d3b28]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 text-sm text-[#3f4c28]" role="status">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="mt-5 inline-flex h-11 items-center rounded-sm bg-[#2c1810] px-5 text-sm font-medium text-[#f4ebe3] transition hover:bg-[#3d2418] disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
