import "server-only";

import { cookies } from "next/headers";

import {
  clearSessionCookieOptions,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/cookie";
import { logInternalError } from "@/lib/http";
import {
  expirationFrom,
  sessionAccess,
  sessionStatus,
  shouldTouchActivity,
} from "@/lib/auth/policy";
import {
  generateSessionToken,
  hashSessionToken,
  isSessionTokenShape,
} from "@/lib/auth/token";
import { toPublicUser } from "@/lib/auth/user";
import {
  deleteSesionByTokenHash,
  findSesionByTokenHash,
  findUsuarioById,
  insertSesion,
  touchSesion,
} from "@/services/auth.service";

async function readSessionToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!isSessionTokenShape(token)) {
    return null;
  }

  return token;
}

async function writeSessionCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", clearSessionCookieOptions());
}

export async function createSession(usuarioId) {
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);

  await insertSesion({
    usuario_id: usuarioId,
    token_hash: tokenHash,
    fecha_creacion: createdAt,
    ultima_actividad: createdAt,
    fecha_expiracion: expirationFrom(now).toISOString(),
  });

  await writeSessionCookie(token);
}

export async function validateSession() {
  const token = await readSessionToken();

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await findSesionByTokenHash(tokenHash);

  if (!session) {
    return null;
  }

  const now = Date.now();
  const status = sessionStatus(session, now);

  if (status !== "valid") {
    await deleteSesionByTokenHash(tokenHash);
    return null;
  }

  const user = await findUsuarioById(session.usuario_id);
  const access = sessionAccess(user);

  if (access === "unauthenticated") {
    await deleteSesionByTokenHash(tokenHash);
    return null;
  }

  if (access === "forbidden") {
    return { forbidden: true, user: toPublicUser(user) };
  }

  if (shouldTouchActivity(session, now)) {
    try {
      await touchSesion(session.id, new Date(now).toISOString());
    } catch {
      logInternalError("session touch");
    }
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
  const token = await readSessionToken();

  if (token) {
    try {
      await deleteSesionByTokenHash(hashSessionToken(token));
    } catch {
      logInternalError("DELETE session");
    }
  }

  await clearSessionCookie();
}
