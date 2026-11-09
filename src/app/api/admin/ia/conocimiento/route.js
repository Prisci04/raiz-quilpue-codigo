import { jsonSuccess } from "@/lib/http";
import { parseKnowledge } from "@/lib/ai/contracts.mjs";
import { runAdminAI, readAIBody } from "@/lib/ai/http";
import { getAIRepository } from "@/services/ai/repository";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request) { return runAdminAI(request, async () => jsonSuccess(await getAIRepository().listKnowledge())); }
export async function POST(request) {
  return runAdminAI(request, async () => jsonSuccess(await getAIRepository().saveKnowledge(null, parseKnowledge(await readAIBody(request, 40000))), {}, 201));
}
