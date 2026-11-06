import { rng } from '../quiz/engine.js';

/**
 * Kids never type a name. We generate "<Haitian animal/plant> <number>".
 * The list is curated (no words that can be read as insults, no real names).
 */
export const NAME_WORDS = [
  'Toti', 'Kolibri', 'Lanbi', 'Mango', 'Tanbou', 'Zandolit', 'Pèlikan', 'Kayiman',
  'Flanbwayan', 'Toro', 'Papiyon', 'Krab', 'Koukouy', 'Pentad', 'Zaboka', 'Kenèp',
  'Chadèk', 'Tòti', 'Zwazo', 'Woukou', 'Pwason', 'Kabrit', 'Rakoun', 'Lapen',
];

export function generateUsername(seed: number): string {
  const rand = rng(seed);
  const word = NAME_WORDS[Math.floor(rand() * NAME_WORDS.length)];
  const n = 1 + Math.floor(rand() * 99);
  return `${word} ${n}`;
}

/** Only generated names are valid; this rejects anything typed by hand. */
export function isValidUsername(name: string): boolean {
  const m = /^([A-Za-zÀ-ÿ]+) (\d{1,2})$/.exec(name);
  return !!m && NAME_WORDS.includes(m[1]) && Number(m[2]) >= 1 && Number(m[2]) <= 99;
}
