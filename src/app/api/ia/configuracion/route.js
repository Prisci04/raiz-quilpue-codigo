import { jsonSuccess } from "@/lib/http";
import { publicAIConfig } from "@/lib/ai/contracts.mjs";
import { runAI } from "@/lib/ai/http";
import { getAIConfig } from "@/services/ai/repository";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() { return runAI(async () => jsonSuccess(publicAIConfig(await getAIConfig()))); }
