import { redirect } from "next/navigation";

import EstadisticasPanel from "@/components/admin/estadisticas/EstadisticasPanel";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminEstadisticas } from "@/services/admin-estadisticas.service";
import { usuarioTieneRol } from "@/services/usuarios.service";

export const metadata = { title: "Estadísticas — Admin Raíz Quilpué" };

export const dynamic = "force-dynamic";

export default async function AdminEstadisticasPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const isAdministrador = await usuarioTieneRol(user.id, "administrador");

  if (!isAdministrador) {
    redirect("/admin");
  }

  let stats = null;
  let error = "";

  try {
    stats = await getAdminEstadisticas();
  } catch (loadError) {
    console.error("[admin/estadisticas]", loadError);
    error = "No se pudieron cargar las estadísticas. Intenta nuevamente más tarde.";
  }

  return (
    <EstadisticasPanel
      error={error}
      actividadesRealizadas={stats?.actividadesRealizadas ?? 0}
      totalConfirmadas={stats?.totalConfirmadas ?? 0}
      topActividades={stats?.topActividades ?? []}
      mensualConfirmadas={stats?.mensualConfirmadas ?? []}
      distribucionEstados={stats?.distribucionEstados ?? []}
    />
  );
}
