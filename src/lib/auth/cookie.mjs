import { ABSOLUTE_SECONDS, SESSION_COOKIE } from "./constants.mjs";

export function sessionCookieOptions(env = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    secure: env === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_SECONDS,
  };
}

export function clearSessionCookieOptions(env = process.env.NODE_ENV) {
  return {
    ...sessionCookieOptions(env),
    maxAge: 0,
  };
}

export { SESSION_COOKIE };
