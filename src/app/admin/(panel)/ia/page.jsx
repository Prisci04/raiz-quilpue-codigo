import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import AIAdminPanel from "@/components/admin/ai/AIAdminPanel";
export const metadata = { title: "Administrar IA — Raíz Quilpué" };
export const dynamic = "force-dynamic";
export default async function AdminIAPage() { await requireGestorContenidoPage(); return <AIAdminPanel />; }
