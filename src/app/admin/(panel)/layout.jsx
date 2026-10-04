import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import { getCurrentUser } from "@/lib/auth/session";
import { usuarioTieneRol } from "@/services/usuarios.service";

export const metadata = {
  title: "Administración — Raíz Quilpué",
};

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const displayName =
    [user.nombre, user.apellido].filter(Boolean).join(" ") || user.email;
  const isAdministrador = await usuarioTieneRol(user.id, "administrador");

  return (
    <AdminShell
      displayName={displayName}
      email={user.email}
      isAdministrador={isAdministrador}
    >
      {children}
    </AdminShell>
  );
}
