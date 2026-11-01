"use client";

import AdminDialog from "@/components/admin/AdminDialog";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import UsuarioFormModal from "@/components/admin/usuarios/UsuarioFormModal";
import UsuariosTable from "@/components/admin/usuarios/UsuariosTable";
import {
  createUsuario,
  deleteUsuario,
  getSessionUser,
  listUsuariosPanel,
  updateUsuario,
} from "@/lib/api/usuarios";

function isAdmin(usuario) {
  return usuario.roles.some((rol) => rol.codigo === "administrador");
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

    async function run() {
      try {
        const [panel, sessionUser] = await Promise.all([
          listUsuariosPanel(),
          getSessionUser(),
        ]);

        if (!active) return;

        setUsuarios(panel.usuarios ?? []);
        setRoles(panel.roles ?? []);
        setCurrentUserId(sessionUser?.id ?? null);
        setForbidden(false);
        setError("");
      } catch (loadError) {
        if (!active) return;

        if (loadError.status === 403) {
          setForbidden(true);
        } else {
          setError(loadError.message || "No fue posible cargar los usuarios.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, []);

  const adminCount = usuarios.filter(isAdmin).length;
  const lockAdminRole = Boolean(
    editing && isAdmin(editing) && adminCount <= 1,
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
      await deleteUsuario(confirm.usuario.id);
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
      <section className="rounded-md border border-[#bb9c82]/70 bg-[#fffdf9] px-6 py-10 text-sm text-[#7c5c47]">
        Cargando usuarios…
      </section>
    );
  }

  if (forbidden) {
    return (
      <section className="max-w-2xl rounded-md border border-[#bb9c82]/70 bg-[#fffdf9] px-6 py-8">
        <h1 className="text-lg font-medium text-[#2c1810]">Usuarios del panel</h1>
        <p className="mt-2 text-sm text-[#7c5c47]">
          Solo un administrador puede gestionar las personas con acceso al portal.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium tracking-[0.2em] text-[#db700f] uppercase">
            Configuración
          </p>
          <h1 className="mt-2 text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium tracking-tight text-[#2c1810]">
            Usuarios del panel
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#7c5c47]">
            Gestiona las personas que tienen acceso al portal administrativo.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#2c1810] px-4 text-[12px] font-medium tracking-[0.08em] text-[#f4ebe3] uppercase transition-colors hover:bg-[#3d2418]"
        >
          <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
          Crear usuario
        </button>
      </div>

      {error ? (
        <AdminNotice tone="error" onDismiss={() => setError("")}>
          {error}
        </AdminNotice>
      ) : null}

      <div className="mt-6">
        <UsuariosTable
          usuarios={usuarios}
          currentUserId={currentUserId}
          adminCount={adminCount}
          busyId={busyId}
          onEdit={openEdit}
          onDelete={(usuario) => setConfirm({ usuario })}
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

      {confirm ? (
          <AdminDialog onClose={() => setConfirm(null)} busy={busyId !== null}
            role="dialog"
            aria-modal="true"
            aria-labelledby="usuario-confirm-title"
            aria-describedby="usuario-confirm-description"
            className="w-full max-w-md rounded-md border border-[#bb9c82]/70 border-t-2 border-t-[#db700f] bg-[#fffdf9] p-5 sm:p-6"
          >
            <h2 id="usuario-confirm-title" className="text-lg font-medium text-[#2c1810]">
              Eliminar definitivamente
            </h2>
            <p id="usuario-confirm-description" className="mt-2 text-sm leading-relaxed text-[#7c5c47]">
              Esta acción eliminará definitivamente al usuario. ¿Deseas continuar?
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={busyId !== null}
                className="inline-flex min-h-10 items-center rounded-md border border-[#bb9c82]/80 px-4 text-[12px] font-medium tracking-[0.08em] text-[#704a31] uppercase disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={runConfirm}
                disabled={busyId !== null}
                className="inline-flex min-h-10 items-center rounded-md bg-[#8d3b28] px-4 text-[12px] font-medium tracking-[0.08em] text-[#f4ebe3] uppercase hover:bg-[#742f20] disabled:opacity-60"
              >
                {busyId !== null ? "Procesando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </AdminDialog>
      ) : null}
    </section>
  );
}
