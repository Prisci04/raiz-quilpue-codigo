import { getContenidosFromDb } from "@/lib/contenido-db";
import {
  buildContentSlices,
  DEFAULT_CONTENT_SLICES,
  formatDashboardDate,
} from "@/lib/admin-dashboard";
import AdminDashboardView from "./dashboard-view";

export default async function AdminDashboardPage() {
  let contents = [];

  try {
    contents = await getContenidosFromDb();
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
