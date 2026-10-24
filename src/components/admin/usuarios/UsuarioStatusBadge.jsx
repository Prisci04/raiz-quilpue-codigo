import AdminBadge from "@/components/admin/AdminBadge";

const LABELS = {
  activo: "Activo",
  inactivo: "Inactivo",
};

export default function UsuarioStatusBadge({ estado }) {
  const tone = estado === "activo" ? "success" : estado === "inactivo" ? "danger" : "neutral";
  const label = LABELS[estado] ?? estado;
  return <AdminBadge tone={tone}>{label}</AdminBadge>;
}
