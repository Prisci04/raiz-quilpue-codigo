import "server-only";

import { cookies } from "next/headers";

import {
  clearSessionCookieOptions,
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionTokenFromRequest,
} from "@/lib/auth/cookie";
import {
  remainingAbsoluteSeconds,
  sessionAccess,
  sessionStatus,
  shouldTouchActivity,
} from "@/lib/auth/policy";
import {
  createSessionValue,
  isSessionTokenShape,
  parseSessionValue,
  passwordFingerprint,
} from "@/lib/auth/token";
import { toPublicUser } from "@/lib/auth/user";
import { findUsuarioById } from "@/services/auth.service";

async function readSessionToken(request) {
  const fromRequest = sessionTokenFromRequest(request);
  if (isSessionTokenShape(fromRequest)) {
    return fromRequest;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!isSessionTokenShape(token)) {
    return null;
  }

  return token;
}

async function writeSessionCookie(token, maxAge) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(process.env.NODE_ENV, maxAge));
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", clearSessionCookieOptions());
}

function isReadonlyCookiesError(error) {
  return error?.__NEXT_ERROR_CODE === "E1180";
}

async function tryMutateSessionCookie(mutate) {
  try {
    await mutate();
    return true;
  } catch (error) {
    if (isReadonlyCookiesError(error)) {
      return false;
    }
    throw error;
  }
}

export async function createSession(usuarioId, passwordHash) {
  const now = Date.now();
  const token = createSessionValue({
    userId: usuarioId,
    issuedAt: now,
    lastActivity: now,
    passwordFingerprint: passwordFingerprint(passwordHash),
  });

  await writeSessionCookie(token, remainingAbsoluteSeconds(now, now));
}

export async function validateSession(request) {
  const token = await readSessionToken(request);

  if (!token) {
    return null;
  }

  const session = parseSessionValue(token);

  if (!session) {
    return null;
  }

  const now = Date.now();
  const status = sessionStatus(session, now);

  if (status !== "valid") {
    await tryMutateSessionCookie(clearSessionCookie);
    return null;
  }

  const user = await findUsuarioById(session.userId);

  if (sessionAccess(user) !== "ok") {
    await tryMutateSessionCookie(clearSessionCookie);
    return null;
  }

  if (session.passwordFingerprint !== passwordFingerprint(user.password)) {
    await tryMutateSessionCookie(clearSessionCookie);
    return null;
  }

  if (shouldTouchActivity(session, now)) {
    const next = createSessionValue({
      userId: session.userId,
      issuedAt: session.issuedAt,
      lastActivity: now,
      passwordFingerprint: session.passwordFingerprint,
    });
    await tryMutateSessionCookie(() =>
      writeSessionCookie(next, remainingAbsoluteSeconds(session.issuedAt, now)),
    );
  }

  return { forbidden: false, user: toPublicUser(user) };
}

export async function getCurrentUser() {
  const result = await validateSession();

  if (!result || result.forbidden) {
    return null;
  }

  return result.user;
}

export async function destroySession() {
  await clearSessionCookie();
}
