import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export const metadata = { title: "Comentarios — Admin Raíz Quilpué" };

export default function AdminComentariosPage() {
  return (
    <AdminPlaceholder
      eyebrow="Moderación"
      title="Comentarios"
      description="Desde esta vista se podrán revisar y moderar los comentarios del portal público."
    />
  );
}
