import "server-only";

// Server-only preparation. No default endpoint/model is assumed, and no request is made.
export function readQwenServerConfig(env = process.env) {
  const apiKey = (env.QWEN_API_KEY || "").trim();
  const model = (env.QWEN_MODEL || "").trim();
  let baseUrl = "";
  try {
    const url = new URL(env.QWEN_BASE_URL || "");
    if (url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash) baseUrl = url.href.replace(/\/$/, "");
  } catch { /* Missing settings keep the provider in mock mode. */ }
  return { apiKey, baseUrl, model, configured: Boolean(apiKey && baseUrl && model) };
}
