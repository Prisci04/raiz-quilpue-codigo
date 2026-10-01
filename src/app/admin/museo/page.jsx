import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export const metadata = { title: "Museo Digital — Admin Raíz Quilpué" };

export default function AdminMuseoPage() {
  return (
    <AdminPlaceholder
      eyebrow="Colección"
      title="Museo Digital"
      description="Este espacio servirá para cargar, clasificar y publicar las piezas del museo digital."
      actionHref="/admin/museo/nueva"
      actionLabel="Nueva pieza"
    />
  );
}
