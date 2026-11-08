import { ABSOLUTE_MS, IDLE_MS, TOUCH_MS } from "./constants.mjs";

export function sessionStatus(session, now) {
  const issuedAt = Number(session.issuedAt);
  const lastActivity = Number(session.lastActivity);

  if (!Number.isFinite(issuedAt) || !Number.isFinite(lastActivity)) {
    return "expired";
  }

  if (now >= issuedAt + ABSOLUTE_MS) {
    return "expired";
  }

  if (now - lastActivity > IDLE_MS) {
    return "idle";
  }

  return "valid";
}

export function shouldTouchActivity(session, now) {
  const lastActivity = Number(session.lastActivity);

  if (!Number.isFinite(lastActivity)) {
    return false;
  }

  return now - lastActivity >= TOUCH_MS;
}

export function expirationFrom(now) {
  return new Date(now + ABSOLUTE_MS);
}

export function remainingAbsoluteSeconds(issuedAt, now = Date.now()) {
  return Math.max(0, Math.ceil((Number(issuedAt) + ABSOLUTE_MS - now) / 1000));
}

export function loginAllowed(user, passwordOk) {
  return Boolean(user && passwordOk);
}

export function sessionAccess(user) {
  return user ? "ok" : "unauthenticated";
}
