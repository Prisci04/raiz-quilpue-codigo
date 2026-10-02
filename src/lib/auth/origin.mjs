const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function isMutatingMethod(method) {
  return MUTATING_METHODS.has(method);
}

export function isTrustedOrigin(request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  let originUrl;

  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const requestHost = (forwardedHost ?? hostHeader ?? "").split(",")[0].trim();

  if (!requestHost) {
    return false;
  }

  return originUrl.host === requestHost;
}
