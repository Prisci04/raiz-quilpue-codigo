import ActividadForm from "@/components/admin/actividades/ActividadForm";

export const metadata = { title: "Editar actividad — Admin Raíz Quilpué" };

export default async function AdminEditarActividadPage({ params }) {
  const { id } = await params;
  return <ActividadForm activityId={id} />;
}
