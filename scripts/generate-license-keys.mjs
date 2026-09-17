#!/usr/bin/env node
/**
 * Generates license keys for Español Real Premium.
 *
 * The validation logic mirrors `src/lib/license.ts`:
 *   key = 12 chars from ALPHABET, groups of 4, checksum must be ≡ 0 (mod 7)
 *
 * Usage:
 *   node scripts/generate-license-keys.mjs 20
 *   node scripts/generate-license-keys.mjs 5 --prefix ESPA
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KEY_LENGTH = 12;

function checksum(clean) {
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    sum += (i + 1) * (ALPHABET.indexOf(clean[i]) + 1);
  }
  return sum % 7;
}

function pickRandom(index) {
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
}

function generateKey(prefix = "") {
  const wanted = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .split("")
    .filter((char) => ALPHABET.includes(char))
    .slice(0, KEY_LENGTH - 1);

  const clean = [];
  for (let i = 0; i < KEY_LENGTH - 1; i++) {
    clean.push(wanted[i] ?? pickRandom(i));
  }

  let last = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  for (let attempt = 0; attempt < 400; attempt++) {
    const candidate = [...clean, last].join("");
    if (checksum(candidate) === 0) return candidate;
    last = ALPHABET[(ALPHABET.indexOf(last) + 1) % ALPHABET.length];
  }
  throw new Error("could not build a valid key");
}

function format(clean) {
  return (clean.match(/.{1,4}/g) ?? []).join("-");
}

const args = process.argv.slice(2);
const count = Number(args.find((arg) => /^\d+$/.test(arg)) ?? 10);
const prefixArg = args.find((arg) => arg.startsWith("--prefix="));
const prefix = prefixArg ? prefixArg.split("=")[1] : "";

console.log(`# Español Real — ${count} Premium key(s)`);
for (let i = 0; i < count; i++) {
  const key = generateKey(prefix);
  console.log(`${format(key)}\t(valid: ${checksum(key) === 0})`);
}
