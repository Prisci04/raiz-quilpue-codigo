import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import { SITE_PAGE_DEFAULTS } from "@/lib/site-page-content.mjs";
import SitePagesEditor from "@/components/admin/SitePagesEditor";

export const metadata = { title: "Páginas del sitio — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminPaginasPage() {
  await requireGestorContenidoPage();

  return <SitePagesEditor initialPages={SITE_PAGE_DEFAULTS} />;
}
