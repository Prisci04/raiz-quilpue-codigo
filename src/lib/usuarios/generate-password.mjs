const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%&*?";
const ALL = `${UPPER}${LOWER}${DIGITS}${SPECIAL}`;

function randomIndex(length) {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.getRandomValues) {
    throw new Error("No hay un generador criptográfico disponible");
  }

  const limit = Math.floor(256 / length) * length;
  const buffer = new Uint8Array(1);

  let value = 0;

  do {
    cryptoApi.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return value % length;
}

function pick(chars) {
  return chars[randomIndex(chars.length)];
}

export function generatePassword() {
  const length = 12 + randomIndex(5);
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];

  while (chars.length < length) {
    chars.push(pick(ALL));
  }

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1);
    const current = chars[index];
    chars[index] = chars[swap];
    chars[swap] = current;
  }

  return chars.join("");
}
