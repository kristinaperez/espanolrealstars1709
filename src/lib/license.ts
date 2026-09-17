const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KEY_LENGTH = 12;
const GROUP = 4;

export function normalizeKey(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, KEY_LENGTH);
}

export function formatKey(input: string): string {
  const clean = normalizeKey(input);
  return (clean.match(new RegExp(`.{1,${GROUP}}`, "g")) ?? []).join("-");
}

function checksum(clean: string): number {
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    const index = ALPHABET.indexOf(clean[i]);
    if (index < 0) return -1;
    sum += (i + 1) * (index + 1);
  }
  return sum % 7;
}

/**
 * Offline license validation.
 *
 * The whole flow lives behind a single adapter so that Stripe (or any other
 * provider) can replace it later without touching the UI: swap this module for
 * a server-side verification call and the rest of the app keeps working.
 */
export function validateKey(input: string): { valid: boolean; normalized: string } {
  const clean = normalizeKey(input);
  const master = process.env.NEXT_PUBLIC_MASTER_LICENSE_KEY;
  if (master && clean === normalizeKey(master)) {
    return { valid: true, normalized: clean };
  }
  if (clean.length !== KEY_LENGTH) return { valid: false, normalized: clean };
  return { valid: checksum(clean) === 0, normalized: clean };
}

export function isValidKey(input: string): boolean {
  return validateKey(input).valid;
}
