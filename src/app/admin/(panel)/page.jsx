import {
  buildContentSlices,
  formatDashboardDate,
} from "@/lib/admin-dashboard";
import { mapContenidoVista } from "@/lib/contenido";
import { MAX_LIMIT } from "@/lib/http";
import { getContenidos } from "@/services/contenido.service";
import AdminDashboardView from "./dashboard-view";

export default async function AdminDashboardPage() {
  let contents = [];
  let publishedContents = null;
  let contentError = "";

  try {
    const result = await getContenidos({ page: 1, limit: MAX_LIMIT });
    contents = result.data.map(mapContenidoVista).filter(Boolean);
    publishedContents = result.pagination.total;
  } catch {
    contentError = "No fue posible cargar los contenidos publicados.";
  }

  const contentSlices = buildContentSlices(contents);

  return (
    <AdminDashboardView
      dateLabel={formatDashboardDate()}
      publishedContents={publishedContents}
      contentError={contentError}
      contentSlices={contentSlices}
    />
  );
}
