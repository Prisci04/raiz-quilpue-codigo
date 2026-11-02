import { ABSOLUTE_SECONDS, SESSION_COOKIE } from "./constants.mjs";

export function sessionTokenFromRequest(request) {
  const fromStore = request?.cookies?.get?.(SESSION_COOKIE)?.value;
  if (fromStore) return fromStore;

  const header = request?.headers?.get?.("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return part.slice(separator + 1).trim();
    }
  }

  return null;
}

export function sessionCookieOptions(
  env = process.env.NODE_ENV,
  maxAge = ABSOLUTE_SECONDS,
) {
  return {
    httpOnly: true,
    secure: env === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function clearSessionCookieOptions(env = process.env.NODE_ENV) {
  return {
    ...sessionCookieOptions(env),
    maxAge: 0,
  };
}

export { SESSION_COOKIE };
