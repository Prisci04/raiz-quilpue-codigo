import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export const metadata = { title: "Configuración — Admin Raíz Quilpué" };

export default function AdminConfiguracionPage() {
  return (
    <AdminPlaceholder
      eyebrow="Cuenta"
      title="Configuración"
      description="Aquí irán los datos de la corporación, usuarios del panel y preferencias del portal."
    />
  );
}
