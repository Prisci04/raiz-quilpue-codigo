import "server-only";

// Only official Model Studio HTTPS hosts; no redirects or arbitrary proxy hosts.
export function readQwenServerConfig(env = process.env) {
  const apiKey = (env.QWEN_API_KEY || "").trim();
  const model = (env.QWEN_MODEL || "").trim();
  let baseUrl = "";
  try {
    const url = new URL(env.QWEN_BASE_URL || "");
    const official = /^(?:dashscope(?:-intl|-us)?\.aliyuncs\.com|cn-hongkong\.dashscope\.aliyuncs\.com|[a-z0-9-]+\.(?:ap-southeast-1|us-east-1|cn-beijing|cn-hongkong|eu-central-1|ap-northeast-1)\.maas\.aliyuncs\.com)$/.test(url.hostname);
    if (official && url.protocol === "https:" && !url.port && !url.username && !url.password && !url.search && !url.hash && /^\/compatible-mode\/v1\/?$/.test(url.pathname)) baseUrl = url.href.replace(/\/$/, "");
  } catch { /* Incomplete/invalid configuration cannot enable external requests. */ }
  return { apiKey, baseUrl, model, configured: Boolean(apiKey && !/[\r\n]/.test(apiKey) && baseUrl && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/.test(model)) };
}
