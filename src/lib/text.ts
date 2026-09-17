/** Deterministic RNG so that a lesson always generates the same exercises. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function sampleN<T>(items: readonly T[], count: number, rng: Rng = Math.random): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, count));
}

const PUNCT = /[¡¿?!.,;:()"«»'’\-–—]/g;

/** Normalises an answer for comparison: case, accents (except ñ), punctuation, spacing. */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    // keep the combining tilde so ñ stays ñ
    .replace(/[\u0300-\u0302\u0304-\u036f]/g, "")
    .toLowerCase()
    .replace(PUNCT, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function answersMatch(given: string, expected: string): boolean {
  return normalizeAnswer(given) === normalizeAnswer(expected);
}

export function splitAlternatives(value: string): string[] {
  return value
    .split(/[/;]| o /i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Word tokens for the "build the sentence" exercise. */
export function tokenize(sentence: string): string[] {
  return sentence
    .replace(/[¡¿]/g, "")
    .split(/\s+/)
    .map((token) => token.replace(/^([^\wÁÉÍÓÚÜÑáéíóúüñ0-9]+)|([^\wÁÉÍÓÚÜÑáéíóúüñ0-9]+)$/g, ""))
    .filter((token) => token.length > 0);
}

export function pickBlankToken(sentence: string, rng: Rng): { blanked: string; answer: string } | null {
  const tokens = tokenize(sentence);
  if (tokens.length < 3) return null;
  const candidates = tokens
    .map((token, index) => ({ token, index }))
    .filter((item) => item.token.length > 2);
  if (candidates.length === 0) return null;
  const chosen = candidates[Math.floor(rng() * candidates.length)];
  const rendered = tokens
    .map((token, index) => (index === chosen.index ? "______" : token))
    .join(" ");
  return { blanked: rendered, answer: chosen.token };
}

export function truncate(value: string, max = 90): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
