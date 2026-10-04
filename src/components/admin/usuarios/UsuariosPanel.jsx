"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import UsuarioFormModal from "@/components/admin/usuarios/UsuarioFormModal";
import UsuariosTable from "@/components/admin/usuarios/UsuariosTable";
import {
  createUsuario,
  deleteUsuario,
  getSessionUser,
  listUsuariosPanel,
  setEstadoUsuario,
  updateUsuario,
} from "@/lib/api/usuarios";

const CONFIRM_COPY = {
  inactivo: {
    title: "Desactivar usuario",
    body: "El usuario dejará de poder entrar al portal y se cerrarán sus sesiones abiertas. ¿Deseas continuar?",
    action: "Desactivar",
  },
  activo: {
    title: "Activar usuario",
    body: "El usuario podrá volver a iniciar sesión con su contraseña actual. ¿Deseas continuar?",
    action: "Activar",
  },
  delete: {
    title: "Eliminar definitivamente",
    body: "Esta acción eliminará definitivamente al usuario. ¿Deseas continuar?",
    action: "Eliminar definitivamente",
  },
};

function isActiveAdmin(usuario) {
  return (
    usuario.estado === "activo" &&
    usuario.roles.some((rol) => rol.codigo === "administrador")
  );
}

export default function UsuariosPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [formMode, setFormMode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setForbidden(false);

    try {
      const [panel, sessionUser] = await Promise.all([
        listUsuariosPanel(),
        getSessionUser(),
      ]);
      setUsuarios(panel.usuarios ?? []);
      setRoles(panel.roles ?? []);
      setCurrentUserId(sessionUser?.id ?? null);
    } catch (loadError) {
      if (loadError.status === 403) {
        setForbidden(true);
      } else {
        setError(loadError.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    load().catch(() => {
      if (active) {
        setError("No fue posible cargar los usuarios.");
      }
    });

    return () => {
      active = false;
    };
  }, [load]);

  const activeAdminCount = usuarios.filter(isActiveAdmin).length;
  const lockAdminRole = Boolean(
    editing &&
      isActiveAdmin(editing) &&
      activeAdminCount <= 1,
  );

  function openCreate() {
    setFormError("");
    setEditing(null);
    setFormMode("create");
  }

  function openEdit(usuario) {
    setFormError("");
    setEditing(usuario);
    setFormMode("edit");
  }

  function closeForm() {
    if (submitting) {
      return;
    }

    setFormMode(null);
    setEditing(null);
    setFormError("");
  }

  async function handleSubmit(payload) {
    setSubmitting(true);
    setFormError("");

    try {
      if (formMode === "create") {
        await createUsuario(payload);
      } else {
        await updateUsuario(editing.id, payload);
      }

      setFormMode(null);
      setEditing(null);
      await load();
    } catch (submitError) {
      setFormError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function runConfirm() {
    if (!confirm) {
      return;
    }

    setBusyId(confirm.usuario.id);
    setError("");

    try {
      if (confirm.type === "delete") {
        await deleteUsuario(confirm.usuario.id);
      } else {
        await setEstadoUsuario(confirm.usuario.id, confirm.type);
      }

      setConfirm(null);
      await load();
    } catch (actionError) {
      setError(actionError.message);
      setConfirm(null);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <section className="border border-[#bb9c82]/70 bg-[#fffdf9] px-6 py-10 text-sm text-[#7c5c47]">
        Cargando usuarios…
      </section>
    );
  }

  if (forbidden) {
    return (
      <section className="max-w-2xl border border-[#bb9c82]/70 bg-[#fffdf9] px-6 py-8">
        <h1 className="text-lg font-semibold text-[#2c1810]">Usuarios del panel</h1>
        <p className="mt-2 text-sm text-[#7c5c47]">
          Solo un administrador puede gestionar las personas con acceso al portal.
        </p>
      </section>
    );
  }

  const confirmCopy = confirm ? CONFIRM_COPY[confirm.type] : null;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium tracking-[0.2em] text-[#db700f] uppercase">
            Configuración
          </p>
          <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.15rem)] font-semibold tracking-tight text-[#2c1810]">
            Usuarios del panel
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#7c5c47]">
            Gestiona las personas que tienen acceso al portal administrativo.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-10 items-center gap-2 bg-[#2c1810] px-4 text-[12px] font-medium tracking-[0.08em] text-[#f4ebe3] uppercase transition-colors hover:bg-[#3d2418]"
        >
          <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
          Crear usuario
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[#8d3b28]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        <UsuariosTable
          usuarios={usuarios}
          currentUserId={currentUserId}
          activeAdminCount={activeAdminCount}
          busyId={busyId}
          onEdit={openEdit}
          onEstado={(usuario, estado) => setConfirm({ type: estado, usuario })}
          onDelete={(usuario) => setConfirm({ type: "delete", usuario })}
        />
      </div>

      {formMode ? (
        <UsuarioFormModal
          mode={formMode}
          usuario={editing}
          roles={roles}
          lockAdminRole={lockAdminRole}
          submitting={submitting}
          serverError={formError}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      ) : null}

      {confirm && confirmCopy ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2c1810]/40 p-3 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="usuario-confirm-title"
            className="w-full max-w-md border border-[#bb9c82]/70 border-t-2 border-t-[#db700f] bg-[#fffdf9] p-5 sm:p-6"
          >
            <h2 id="usuario-confirm-title" className="text-lg font-semibold text-[#2c1810]">
              {confirmCopy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#7c5c47]">{confirmCopy.body}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={busyId !== null}
                className="inline-flex min-h-10 items-center border border-[#bb9c82]/80 px-4 text-[12px] font-medium tracking-[0.08em] text-[#704a31] uppercase disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={runConfirm}
                disabled={busyId !== null}
                className={`inline-flex min-h-10 items-center px-4 text-[12px] font-medium tracking-[0.08em] text-[#f4ebe3] uppercase disabled:opacity-60 ${
                  confirm.type === "delete"
                    ? "bg-[#8d3b28] hover:bg-[#742f20]"
                    : "bg-[#2c1810] hover:bg-[#3d2418]"
                }`}
              >
                {busyId !== null ? "Procesando…" : confirmCopy.action}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
