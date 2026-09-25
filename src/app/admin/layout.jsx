import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Administración — Raíz Quilpué",
};

export default function AdminLayout({ children }) {
  return (
    <div className="admin-shell min-h-full">
      <AdminSidebar />
      <div className="lg:pl-64">
        <div className="print-dashboard mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-9 lg:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
