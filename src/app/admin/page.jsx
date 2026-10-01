import {
  buildContentSlices,
  DEFAULT_CONTENT_SLICES,
  formatDashboardDate,
} from "@/lib/admin-dashboard";
import { mapContenidoVista } from "@/lib/contenido";
import { MAX_LIMIT } from "@/lib/http";
import { getContenidos } from "@/services/contenido.service";
import AdminDashboardView from "./dashboard-view";

export default async function AdminDashboardPage() {
  let contents = [];

  try {
    const result = await getContenidos({ page: 1, limit: MAX_LIMIT });
    contents = result.data.map(mapContenidoVista).filter(Boolean);
  } catch {
    contents = [];
  }

  const publishedContents = contents.length;
  const contentSlices = publishedContents > 0 ? buildContentSlices(contents) : DEFAULT_CONTENT_SLICES;

  return (
    <AdminDashboardView
      dateLabel={formatDashboardDate()}
      uniqueVisitors="1.2K"
      enrollments="161"
      publishedContents={publishedContents || 6}
      totalContents={publishedContents || 93}
      museumReactions="775"
      contentSlices={contentSlices}
    />
  );
}
