import { requireInternalPage } from "@/lib/auth/page-guard";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

export const metadata = { title: "Market — Admin Raíz Quilpué" };

export default async function AdminMarketPage() {
  await requireInternalPage();

  return (
    <AdminPlaceholder
      eyebrow="Tienda"
      title="Market"
      description="La gestión de productos y pedidos del market quedará en esta sección."
    />
  );
}
