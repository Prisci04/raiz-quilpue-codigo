import { redirect } from "next/navigation";
import UsuariosPanel from "@/components/admin/usuarios/UsuariosPanel";
import { getCurrentUser } from "@/lib/auth/session";
import { usuarioTieneRol } from "@/services/usuarios.service";

export const metadata = { title: "Usuarios del panel — Admin Raíz Quilpué" };

export const dynamic = "force-dynamic";

export default async function AdminConfiguracionPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const isAdministrador = await usuarioTieneRol(user.id, "administrador");

  if (!isAdministrador) {
    redirect("/admin");
  }

  return <UsuariosPanel />;
}
