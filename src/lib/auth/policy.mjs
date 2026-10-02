import { ABSOLUTE_MS, IDLE_MS, TOUCH_MS } from "./constants.mjs";

export function sessionStatus(session, now) {
  const expiresAt = new Date(session.fecha_expiracion).getTime();
  const lastActivity = new Date(session.ultima_actividad).getTime();

  if (!Number.isFinite(expiresAt) || !Number.isFinite(lastActivity)) {
    return "expired";
  }

  if (now >= expiresAt) {
    return "expired";
  }

  if (now - lastActivity > IDLE_MS) {
    return "idle";
  }

  return "valid";
}

export function shouldTouchActivity(session, now) {
  const lastActivity = new Date(session.ultima_actividad).getTime();

  if (!Number.isFinite(lastActivity)) {
    return false;
  }

  return now - lastActivity >= TOUCH_MS;
}

export function expirationFrom(now) {
  return new Date(now + ABSOLUTE_MS);
}

export function loginAllowed(user, passwordOk) {
  return Boolean(
    user &&
      passwordOk &&
      user.estado === "activo" &&
      user.tipo_usuario === "interno",
  );
}

export function sessionAccess(user) {
  if (!user || user.estado !== "activo") {
    return "unauthenticated";
  }

  if (user.tipo_usuario !== "interno") {
    return "forbidden";
  }

  return "ok";
}
