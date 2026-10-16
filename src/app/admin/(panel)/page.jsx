import { formatDashboardDate } from "@/lib/admin-dashboard";
import { getAdminDashboardData } from "@/services/admin-dashboard.service";
import AdminDashboardView from "./dashboard-view";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboardData();

  return (
    <AdminDashboardView
      dateLabel={formatDashboardDate()}
      {...dashboard}
    />
  );
}
