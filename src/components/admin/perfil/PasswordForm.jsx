"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { updatePassword } from "@/lib/api/perfil";
import { parsePasswordChange } from "@/lib/usuarios/validation.mjs";

function SecretField({ id, label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium text-[#2c1810]">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-sm border border-transparent bg-[#f4efe9] pr-11 pl-3.5 text-sm text-[#2c1810] outline-none transition focus:border-[#eadfd4] focus:bg-white focus:ring-4 focus:ring-[#feca2b]/30"
        />
        <button
          type="button"
          className="absolute top-1/2 right-2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-[#7c5c47] hover:bg-white hover:text-[#2c1810]"
          aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff size={15} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function PasswordForm() {
  const baseId = useId();
  const [form, setForm] = useState({
    passwordActual: "",
    passwordNueva: "",
    passwordConfirmacion: "",
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

    const parsed = parsePasswordChange(form);

    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setSaving(true);

    try {
      await updatePassword(form);
      setForm({
        passwordActual: "",
        passwordNueva: "",
        passwordConfirmacion: "",
      });
      setSuccess("Contraseña actualizada correctamente.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-sm border border-[#2c1810]/6 bg-white p-5 shadow-[0_10px_30px_rgba(44,24,16,0.04)] sm:p-6">
      <h2 className="text-lg font-semibold text-[#2c1810]">Seguridad</h2>
      <p className="mt-1 text-sm text-[#7c5c47]">
        Al cambiarla, se cierran las sesiones de tus otros dispositivos.
      </p>
      <div className="mt-5 space-y-4">
        <SecretField
          id={`${baseId}-actual`}
          label="Contraseña actual"
          autoComplete="current-password"
          value={form.passwordActual}
          onChange={(value) => updateField("passwordActual", value)}
        />
        <SecretField
          id={`${baseId}-nueva`}
          label="Nueva contraseña"
          autoComplete="new-password"
          value={form.passwordNueva}
          onChange={(value) => updateField("passwordNueva", value)}
        />
        <SecretField
          id={`${baseId}-confirmacion`}
          label="Confirmar nueva contraseña"
          autoComplete="new-password"
          value={form.passwordConfirmacion}
          onChange={(value) => updateField("passwordConfirmacion", value)}
        />
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-[#7c5c47]">
        Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.
      </p>
      {error ? (
        <p className="mt-3 text-sm text-[#8d3b28]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-sm text-[#3f4c28]" role="status">
          {success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="mt-5 inline-flex h-11 items-center rounded-sm bg-[#2c1810] px-5 text-sm font-medium text-[#f4ebe3] transition hover:bg-[#3d2418] disabled:opacity-60"
      >
        {saving ? "Actualizando…" : "Actualizar contraseña"}
      </button>
    </form>
  );
}
