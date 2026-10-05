import { jsonSuccess } from "@/lib/http";
import { runAdminCommunity } from "@/lib/admin-community-http";
import { listAportesMuseoAdmin } from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return runAdminCommunity(request, "GET /api/admin/museo/aportes", async () =>
    jsonSuccess(await listAportesMuseoAdmin()),
  );
}
