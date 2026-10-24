import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { usuarioEsGestorContenido } from "@/services/usuarios.service";

export async function requireInternalPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function requireGestorContenidoPage() {
  const user = await requireInternalPage();

  if (!(await usuarioEsGestorContenido(user.id))) {
    // Perfil only needs an internal session; avoid a redirect loop via Dashboard.
    redirect("/admin/perfil");
  }

  return user;
}
