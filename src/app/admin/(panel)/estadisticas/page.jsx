import { redirect } from "next/navigation";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { getCurrentUser } from "@/lib/auth/session";
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

  return (
    <AdminPlaceholder
      eyebrow="Reportes"
      title="Estadísticas"
      description="Los indicadores ampliados de visitas, inscripciones y museo se concentrarán en esta página."
    />
  );
}
