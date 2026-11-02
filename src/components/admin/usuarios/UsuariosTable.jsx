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
  isLastAdmin,
  busy,
  onEdit,
  onDelete,
  align = "end",
}) {
  return (
    <div className={`flex flex-wrap gap-1 ${align === "end" ? "justify-end" : "justify-start"}`}>
      <ActionButton onClick={() => onEdit(usuario)} disabled={busy}>
        Editar
      </ActionButton>
      {!isSelf ? (
        <ActionButton
          tone="danger"
          onClick={() => onDelete(usuario)}
          disabled={busy || isLastAdmin}
          title={
            isLastAdmin
              ? "Debe quedar al menos un administrador."
              : undefined
          }
        >
          Eliminar
        </ActionButton>
      ) : null}
    </div>
  );
}

export default function UsuariosTable({
  usuarios,
  currentUserId,
  adminCount,
  busyId,
  onEdit,
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
        const isLastAdmin =
          usuario.roles.some((rol) => rol.codigo === "administrador") &&
          adminCount <= 1;

        return (
          <li
            key={usuario.id}
            className="rounded-md border border-[#bb9c82]/70 border-t-2 border-t-[#db700f] bg-[#fffdf9] p-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-[#2c1810]">{nombreVisible(usuario)}</p>
              <p className="mt-1 truncate text-sm text-[#7c5c47]">{usuario.email}</p>
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-[#946541] uppercase">
              {rolVisible(usuario)}
            </p>
            <div className="mt-3 border-t border-[#bb9c82]/40 pt-3">
              <UsuarioActions
                usuario={usuario}
                isSelf={isSelf}
                isLastAdmin={isLastAdmin}
                busy={busyId === usuario.id}
                onEdit={onEdit}
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
            <th className="px-4 py-3 text-right font-medium sm:px-5">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => {
            const isSelf = Number(usuario.id) === Number(currentUserId);
            const isLastAdmin =
              usuario.roles.some((rol) => rol.codigo === "administrador") &&
              adminCount <= 1;

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
                  <UsuarioActions
                    usuario={usuario}
                    isSelf={isSelf}
                    isLastAdmin={isLastAdmin}
                    busy={busyId === usuario.id}
                    onEdit={onEdit}
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
