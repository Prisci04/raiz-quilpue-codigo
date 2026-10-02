import {
  EMAIL_MAX_LENGTH,
  LOGIN_BODY_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "./constants.mjs";

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export async function readJsonObject(request) {
  let text;

  try {
    text = await request.text();
  } catch {
    return { ok: false };
  }

  if (!text || text.length > LOGIN_BODY_MAX_LENGTH) {
    return { ok: false };
  }

  try {
    const value = JSON.parse(text);

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false };
    }

    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

export function parseLoginBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false };
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return { ok: false };
  }

  if (
    body.email.length === 0 ||
    body.email.length > EMAIL_MAX_LENGTH ||
    body.password.length === 0 ||
    body.password.length > PASSWORD_MAX_LENGTH
  ) {
    return { ok: false };
  }

  const email = body.email.trim().toLowerCase();

  if (!email || email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { ok: false };
  }

  return {
    ok: true,
    email,
    password: body.password,
  };
}

export function toExactIlikePattern(value) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
