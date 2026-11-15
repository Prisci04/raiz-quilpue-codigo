import { jsonSuccess } from "@/lib/http";
import { runAdminAI } from "@/lib/ai/http";
import { getAIProviderStatus } from "@/services/ai/providers.mjs";
import { getAIStorageMode } from "@/services/ai/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request) {
  return runAdminAI(request, async () => jsonSuccess({ ...getAIProviderStatus(), storage: getAIStorageMode() }));
}
