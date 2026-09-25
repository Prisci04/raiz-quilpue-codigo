import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export const metadata = { title: "Nuevo contenido — Admin Raíz Quilpué" };

export default function AdminNuevoContenidoPage() {
  return (
    <AdminPlaceholder
      eyebrow="Contenidos"
      title="Nuevo contenido"
      description="El formulario para crear publicaciones estará disponible en el siguiente paso del portal administrativo."
    />
  );
}
