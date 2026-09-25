import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export const metadata = { title: "Contenidos — Admin Raíz Quilpué" };

export default function AdminContenidosPage() {
  return (
    <AdminPlaceholder
      eyebrow="Gestión"
      title="Contenidos"
      description="Aquí podrás crear, editar y publicar noticias, patrimonio, historias y el resto del archivo cultural."
      actionHref="/admin/contenidos/nuevo"
      actionLabel="Nuevo contenido"
    />
  );
}
