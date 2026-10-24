import { requireInternalPage } from "@/lib/auth/page-guard";
import PerfilPanel from "@/components/admin/perfil/PerfilPanel";

export const metadata = { title: "Perfil — Admin Raíz Quilpué" };

export default async function AdminPerfilPage() {
  await requireInternalPage();

  return <PerfilPanel />;
}
