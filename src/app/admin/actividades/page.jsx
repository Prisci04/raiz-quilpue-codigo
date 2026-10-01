import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export const metadata = { title: "Actividades — Admin Raíz Quilpué" };

export default function AdminActividadesPage() {
  return (
    <AdminPlaceholder
      eyebrow="Gestión"
      title="Actividades"
      description="Desde aquí se administrarán visitas, talleres, conferencias y el resto de la programación de Raíz Quilpué."
      actionHref="/admin/actividades/nueva"
      actionLabel="Nueva actividad"
    />
  );
}
