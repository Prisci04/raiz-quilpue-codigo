import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export const metadata = { title: "Participantes — Admin Raíz Quilpué" };

export default function AdminParticipantesPage() {
  return (
    <AdminPlaceholder
      eyebrow="Comunidad"
      title="Participantes"
      description="Aquí aparecerán las personas inscritas en actividades y quienes participan del portal."
    />
  );
}
