import { redirect } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = {
  title: "Administración — Raíz Quilpué",
};

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const displayName =
    [user.nombre, user.apellido].filter(Boolean).join(" ") || user.email;

  return (
    <div className="admin-shell min-h-full">
      <AdminSidebar displayName={displayName} />
      <div className="lg:pl-64">
        <div className="print-dashboard mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-9 lg:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
