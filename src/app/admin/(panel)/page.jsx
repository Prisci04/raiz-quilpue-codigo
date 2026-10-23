import { formatDashboardDate } from "@/lib/admin-dashboard";
import { getAdminDashboardData } from "@/services/admin-dashboard.service";
import AdminDashboardView from "./dashboard-view";

export default async function AdminDashboardPage() {
  let dashboard = {};
  let contentError = "";

  try {
    dashboard = await getAdminDashboardData();
  } catch {
    contentError = "No fue posible cargar los datos del panel. Intenta nuevamente más tarde.";
  }

  return (
    <AdminDashboardView
      dateLabel={formatDashboardDate()}
      {...dashboard}
      contentError={contentError}
    />
  );
}
