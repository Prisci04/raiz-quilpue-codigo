import UsuarioStatusBadge from "@/components/admin/usuarios/UsuarioStatusBadge";

function nombreVisible(usuario) {
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ");
}

function rolVisible(usuario) {
  return usuario.roles[0]?.nombre ?? "Sin rol";
}

function ActionButton({ children, onClick, tone = "default", disabled, title }) {
  const tones = {
    default: "text-[#704a31] hover:border-[#bb9c82] hover:bg-[#f7f1ea]",
    danger: "text-[#8d3b28] hover:border-[#e0b2a4] hover:bg-[#f6e4dc]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-8 items-center rounded-md border border-transparent px-2 text-[12px] font-medium tracking-wide transition-colors disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function UsuarioActions({
  usuario,
  isSelf,
  isLastActiveAdmin,
  busy,
  onEdit,
  onEstado,
  onDelete,
  align = "end",
}) {
  const active = usuario.estado === "activo";

  return (
    <div className={`flex flex-wrap gap-1 ${align === "end" ? "justify-end" : "justify-start"}`}>
      <ActionButton onClick={() => onEdit(usuario)} disabled={busy}>
        Editar
      </ActionButton>
      {active ? (
        <ActionButton
          onClick={() => onEstado(usuario, "inactivo")}
          disabled={busy || isSelf || isLastActiveAdmin}
          title={
            isSelf
              ? "No puedes desactivar tu propia cuenta."
              : isLastActiveAdmin
                ? "Debe quedar al menos un administrador activo."
                : undefined
          }
        >
          Desactivar
        </ActionButton>
      ) : (
        <ActionButton onClick={() => onEstado(usuario, "activo")} disabled={busy}>
          Activar
        </ActionButton>
      )}
      {!active && !isSelf ? (
        <ActionButton tone="danger" onClick={() => onDelete(usuario)} disabled={busy}>
          Eliminar definitivamente
        </ActionButton>
      ) : null}
    </div>
  );
}

export default function UsuariosTable({
  usuarios,
  currentUserId,
  activeAdminCount,
  busyId,
  onEdit,
  onEstado,
  onDelete,
}) {
  if (usuarios.length === 0) {
    return (
      <div className="rounded-md border border-[#bb9c82]/70 bg-[#fffdf9] px-6 py-12 text-sm text-[#7c5c47]">
        Todavía no hay usuarios internos.
      </div>
    );
  }

  return (
    <>
    <ul className="space-y-3 md:hidden">
      {usuarios.map((usuario) => {
        const isSelf = Number(usuario.id) === Number(currentUserId);
        const isLastActiveAdmin =
          usuario.estado === "activo" &&
          usuario.roles.some((rol) => rol.codigo === "administrador") &&
          activeAdminCount <= 1;

        return (
          <li
            key={usuario.id}
            className="rounded-md border border-[#bb9c82]/70 border-t-2 border-t-[#db700f] bg-[#fffdf9] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[#2c1810]">{nombreVisible(usuario)}</p>
                <p className="mt-1 truncate text-sm text-[#7c5c47]">{usuario.email}</p>
              </div>
              <UsuarioStatusBadge estado={usuario.estado} />
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-[#946541] uppercase">
              {rolVisible(usuario)}
            </p>
            <div className="mt-3 border-t border-[#bb9c82]/40 pt-3">
              <UsuarioActions
                usuario={usuario}
                isSelf={isSelf}
                isLastActiveAdmin={isLastActiveAdmin}
                busy={busyId === usuario.id}
                onEdit={onEdit}
                onEstado={onEstado}
                onDelete={onDelete}
                align="start"
              />
            </div>
          </li>
        );
      })}
    </ul>
    <div className="hidden overflow-x-auto rounded-md border border-[#bb9c82]/70 bg-[#fffdf9] md:block">
      <table className="min-w-full border-t-2 border-[#db700f] text-left text-sm">
        <thead className="bg-[#f7f1ea] font-mono text-[10px] tracking-[0.16em] text-[#946541] uppercase">
          <tr>
            <th className="px-4 py-3 font-medium sm:px-5">Nombre</th>
            <th className="px-4 py-3 font-medium sm:px-5">Correo</th>
            <th className="px-4 py-3 font-medium sm:px-5">Rol</th>
            <th className="px-4 py-3 font-medium sm:px-5">Estado</th>
            <th className="px-4 py-3 text-right font-medium sm:px-5">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => {
            const isSelf = Number(usuario.id) === Number(currentUserId);
            const isLastActiveAdmin =
              usuario.estado === "activo" &&
              usuario.roles.some((rol) => rol.codigo === "administrador") &&
              activeAdminCount <= 1;

            return (
              <tr
                key={usuario.id}
                className="border-t border-[#bb9c82]/35 transition-colors hover:bg-[#faf6f1]"
              >
                <td className="px-4 py-3 font-medium text-[#2c1810] sm:px-5">
                  {nombreVisible(usuario)}
                </td>
                <td className="px-4 py-3 text-[#7c5c47] sm:px-5">{usuario.email}</td>
                <td className="px-4 py-3 text-[#2c1810] sm:px-5">{rolVisible(usuario)}</td>
                <td className="px-4 py-3 sm:px-5">
                  <UsuarioStatusBadge estado={usuario.estado} />
                </td>
                <td className="px-4 py-3 sm:px-5">
                  <UsuarioActions
                    usuario={usuario}
                    isSelf={isSelf}
                    isLastActiveAdmin={isLastActiveAdmin}
                    busy={busyId === usuario.id}
                    onEdit={onEdit}
                    onEstado={onEstado}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
