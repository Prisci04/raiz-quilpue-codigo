const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function isMutatingMethod(method) {
  return MUTATING_METHODS.has(method);
}

function requestHost(request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  return (forwardedHost ?? hostHeader ?? "").split(",")[0].trim();
}

function hostMatches(url, host) {
  try {
    return new URL(url).host === host;
  } catch {
    return false;
  }
}

export function isTrustedOrigin(request) {
  const host = requestHost(request);

  if (!host) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return hostMatches(origin, host);
  }

  if (request.headers.get("sec-fetch-site") === "same-origin") {
    return true;
  }

  const referer = request.headers.get("referer");
  return Boolean(referer && hostMatches(referer, host));
}
