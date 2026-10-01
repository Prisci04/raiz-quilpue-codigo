import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export const metadata = { title: "Nueva actividad — Admin Raíz Quilpué" };

export default function AdminNuevaActividadPage() {
  return (
    <AdminPlaceholder
      eyebrow="Actividades"
      title="Nueva actividad"
      description="El formulario para crear una actividad y abrir inscripciones estará en el siguiente paso."
    />
  );
}
