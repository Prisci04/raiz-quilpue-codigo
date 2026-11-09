import { jsonSuccess } from "@/lib/http";
import { parseKnowledge, validKnowledgeId } from "@/lib/ai/contracts.mjs";
import { runAdminAI, readAIBody } from "@/lib/ai/http";
import { getAIRepository } from "@/services/ai/repository";
export const runtime = "nodejs";
export async function PUT(request, context) {
  return runAdminAI(request, async () => {
    const id = validKnowledgeId((await context.params).id);
    return jsonSuccess(await getAIRepository().saveKnowledge(id, parseKnowledge(await readAIBody(request, 40000))));
  });
}
export async function DELETE(request, context) {
  return runAdminAI(request, async () => {
    await getAIRepository().deleteKnowledge(validKnowledgeId((await context.params).id));
    return jsonSuccess({ deleted: true });
  });
}
