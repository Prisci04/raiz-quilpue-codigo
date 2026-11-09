import "server-only";
import { AIError } from "@/lib/ai/contracts.mjs";
import { isTrustedOrigin } from "@/lib/auth/origin.mjs";
import { jsonSuccess } from "@/lib/http";
import { getAIConfig, getAIRepository } from "@/services/ai/repository";
import { searchPublicContext } from "@/services/ai/public-context";
import { answerChat } from "./chat.mjs";
import { limitChat, readAIBody } from "@/lib/ai/http";

export async function handleChatRequest(request) {
  if (!isTrustedOrigin(request)) throw new AIError(403, "FORBIDDEN_ORIGIN", "Origen no permitido.");
  const release = limitChat(request);
  try {
    const result = await answerChat(await readAIBody(request, 20000), {
      getConfig: getAIConfig,
      knowledge: () => getAIRepository().listKnowledge(),
      searchPublic: searchPublicContext,
      signal: request.signal,
    });
    return jsonSuccess(result);
  } finally { release(); }
}
