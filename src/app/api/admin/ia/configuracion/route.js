import { jsonSuccess } from "@/lib/http";
import { parseAIConfig } from "@/lib/ai/contracts.mjs";
import { runAdminAI, readAIBody } from "@/lib/ai/http";
import { getAIConfig, getAIRepository } from "@/services/ai/repository";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request) { return runAdminAI(request, async () => jsonSuccess(await getAIConfig())); }
export async function PUT(request) {
  return runAdminAI(request, async () => jsonSuccess(await getAIRepository().saveConfig(parseAIConfig(await readAIBody(request)))));
}
