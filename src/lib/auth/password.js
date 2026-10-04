import "server-only";

import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const DUMMY_PASSWORD_HASH =
  "$2b$10$eLT88MSPtiqUoOGI5RC0a.cwSpkj4q4Gz2BmG3mdhMz02ex2CVdk2";

function isBcryptHash(hash) {
  return typeof hash === "string" && hash.startsWith("$2");
}

export async function verifyPassword(password, hash) {
  const candidate = isBcryptHash(hash) ? hash : DUMMY_PASSWORD_HASH;
  const matches = await bcrypt.compare(password, candidate);

  if (!isBcryptHash(hash)) {
    return false;
  }

  return matches;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
