import { createHash, randomBytes } from "node:crypto";

import { SESSION_TOKEN_LENGTH } from "./constants.mjs";

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function isSessionTokenShape(token) {
  return (
    typeof token === "string" &&
    token.length === SESSION_TOKEN_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(token)
  );
}
