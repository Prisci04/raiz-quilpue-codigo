import { runAdminAI } from "@/lib/ai/http";
import { handleChatRequest } from "@/services/ai/endpoint";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request) { return runAdminAI(request, () => handleChatRequest(request)); }
