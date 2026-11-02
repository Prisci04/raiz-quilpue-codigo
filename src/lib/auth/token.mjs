import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function sessionSecret(env = process.env) {
  const secret = env.SESSION_SECRET || env.SUPABASE_SECRET_KEY;

  if (!secret) {
    throw new Error("Missing required server configuration");
  }

  return secret;
}

function sign(encoded, secret) {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

function equalSignature(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordFingerprint(passwordHash) {
  return createHash("sha256")
    .update(String(passwordHash ?? ""))
    .digest("hex")
    .slice(0, 16);
}

export function isSessionTokenShape(token) {
  return typeof token === "string" && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

export function createSessionValue(
  { userId, issuedAt, lastActivity, passwordFingerprint: fingerprint },
  secret = sessionSecret(),
) {
  const payload = Buffer.from(
    JSON.stringify({
      uid: Number(userId),
      iat: issuedAt,
      lat: lastActivity,
      pv: fingerprint,
    }),
    "utf8",
  ).toString("base64url");

  return `${payload}.${sign(payload, secret)}`;
}

export function parseSessionValue(token, secret = sessionSecret()) {
  if (!isSessionTokenShape(token)) {
    return null;
  }

  const separator = token.indexOf(".");
  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  if (!equalSignature(signature, sign(encoded, secret))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    const userId = Number(payload.uid);
    const issuedAt = Number(payload.iat);
    const lastActivity = Number(payload.lat);

    if (!Number.isInteger(userId) || userId < 1) {
      return null;
    }

    if (!Number.isFinite(issuedAt) || !Number.isFinite(lastActivity)) {
      return null;
    }

    if (typeof payload.pv !== "string" || payload.pv.length === 0) {
      return null;
    }

    return {
      userId,
      issuedAt,
      lastActivity,
      passwordFingerprint: payload.pv,
    };
  } catch {
    return null;
  }
}
