"use client";

import AdminDialog from "@/components/admin/AdminDialog";
import { useId, useState } from "react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import PasswordField from "@/components/admin/usuarios/PasswordField";
import {
  parseCreateUsuario,
  parseUpdateUsuario,
} from "@/lib/usuarios/validation.mjs";

function usuarioFormState(usuario, roles) {
  return {
    nombre: usuario?.nombre ?? "",
    apellido: usuario?.apellido ?? "",
    email: usuario?.email ?? "",
    telefono: usuario?.telefono ?? "",
    rolCodigo: usuario?.roles?.[0]?.codigo ?? roles[0]?.codigo ?? "",
    password: "",
  };
}

function formSource(mode, usuario, roles) {
  const roleKey = (roles ?? []).map((rol) => rol.codigo).join(",");
  return `${mode}:${usuario?.id ?? "nuevo"}:${roleKey}`;
}

function fieldClassName() {
  return "mt-1.5 w-full rounded-md border border-[#bb9c82]/80 bg-white px-3 py-2.5 text-sm text-[#2c1810] outline-none transition-colors focus:border-[#704a31]";
}

export default function UsuarioFormModal({
  mode,
  usuario,
  roles,
  lockAdminRole,
  submitting,
  serverError,
  onClose,
  onSubmit,
}) {
  const titleId = useId();
  const source = formSource(mode, usuario, roles);
  const [formSourceKey, setFormSourceKey] = useState(source);
  const [form, setForm] = useState(() => usuarioFormState(usuario, roles));
  const [error, setError] = useState("");

  if (source !== formSourceKey) {
    setFormSourceKey(source);
    setForm(usuarioFormState(usuario, roles));
    setError("");
  }


  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const parsed =
      mode === "create" ? parseCreateUsuario(form) : parseUpdateUsuario(form);

    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    onSubmit(parsed.value);
  }

  const title = mode === "create" ? "Crear usuario" : "Editar usuario";

  return (
      <AdminDialog onClose={onClose} busy={submitting}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-description`}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-md border border-[#bb9c82]/70 border-t-2 border-t-[#db700f] bg-[#fffdf9] p-5 sm:p-6"
      >
        <h2 id={titleId} className="text-lg font-medium text-[#2c1810]">
          {title}
        </h2>
        <p id={`${titleId}-description`} className="mt-1 text-sm text-[#7c5c47]">
          {mode === "create"
            ? "La persona quedará como usuaria interna del portal."
            : "La contraseña no se modifica desde esta pantalla."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="usuario-nombre" className="text-[13px] font-medium text-[#2c1810]">
              Nombre *
            </label>
            <input
              id="usuario-nombre"
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              className={fieldClassName()}
              required
            />
          </div>

          <div>
            <label htmlFor="usuario-apellido" className="text-[13px] font-medium text-[#2c1810]">
              Apellido
            </label>
            <input
              id="usuario-apellido"
              value={form.apellido}
              onChange={(event) => updateField("apellido", event.target.value)}
              className={fieldClassName()}
            />
          </div>
          </div>

          <div>
            <label htmlFor="usuario-email" className="text-[13px] font-medium text-[#2c1810]">
              Correo *
            </label>
            <input
              id="usuario-email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={fieldClassName()}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="usuario-telefono" className="text-[13px] font-medium text-[#2c1810]">
              Teléfono
            </label>
            <input
              id="usuario-telefono"
              value={form.telefono}
              onChange={(event) => updateField("telefono", event.target.value)}
              className={fieldClassName()}
            />
          </div>

          <div>
            <label htmlFor="usuario-rol" className="text-[13px] font-medium text-[#2c1810]">
              Rol *
            </label>
            <select
              id="usuario-rol"
              value={form.rolCodigo}
              onChange={(event) => updateField("rolCodigo", event.target.value)}
              className={fieldClassName()}
              required
            >
              {roles.map((rol) => (
                <option
                  key={rol.codigo}
                  value={rol.codigo}
                  disabled={lockAdminRole && rol.codigo !== "administrador"}
                >
                  {rol.nombre}
                </option>
              ))}
            </select>
            {lockAdminRole ? (
              <p className="mt-1.5 text-[12px] text-[#7c5c47]">
                Debe quedar al menos un administrador activo.
              </p>
            ) : null}
          </div>
          </div>

          {mode === "create" ? (
            <PasswordField
              value={form.password}
              onChange={(password) => updateField("password", password)}
            />
          ) : null}

          {error || serverError ? (
            <AdminNotice tone="error" sticky={false} onDismiss={() => setError("")}>
              {error || serverError}
            </AdminNotice>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex min-h-10 items-center rounded-md border border-[#bb9c82]/80 px-4 text-[12px] font-medium tracking-[0.08em] text-[#704a31] uppercase transition-colors hover:bg-[#f7f1ea] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-10 items-center rounded-md bg-[#2c1810] px-4 text-[12px] font-medium tracking-[0.08em] text-[#f4ebe3] uppercase transition-colors hover:bg-[#3d2418] disabled:opacity-60"
            >
              {submitting ? "Guardando…" : mode === "create" ? "Crear usuario" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </AdminDialog>
  );
}
