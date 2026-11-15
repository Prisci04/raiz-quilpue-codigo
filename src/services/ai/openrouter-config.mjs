import "server-only";

export const OPENROUTER_MODEL = "google/gemma-4-31b-it:free";
export const OPENROUTER_FALLBACK_MODEL = "google/gemma-4-26b-a4b-it:free";
export const OPENROUTER_FALLBACK_2_MODEL = "nvidia/nemotron-3.5-lightning:free";
export function readOpenRouterServerConfig(env = process.env) {
  const apiKey = (env.OPENROUTER_API_KEY || "").trim();
  const baseUrl = (env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const model = env.OPENROUTER_MODEL || OPENROUTER_MODEL;
  const fallbackModel = env.OPENROUTER_FALLBACK_MODEL || OPENROUTER_FALLBACK_MODEL;
  const fallback2Model = env.OPENROUTER_FALLBACK_2_MODEL || OPENROUTER_FALLBACK_2_MODEL;
  return { apiKey, baseUrl, model, fallbackModel, fallback2Model, configured: Boolean(apiKey && !/[\s\u0000-\u001f\u007f]/.test(apiKey)
    && baseUrl === "https://openrouter.ai/api/v1" && model === OPENROUTER_MODEL
    && fallbackModel === OPENROUTER_FALLBACK_MODEL && fallback2Model === OPENROUTER_FALLBACK_2_MODEL) };
}
