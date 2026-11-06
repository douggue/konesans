import { rng } from '../quiz/engine.js';
import { kreyolNumber } from '../modules/math.js';

/**
 * Parent gate + consent record (COPPA / Google Play Families).
 * The gate is a math question written in words — hard for a 7-year-old,
 * trivial for an adult. Consent itself must be confirmed via a link sent to
 * the parent's contact (verifiable consent); `confirmedAt` is set by the server.
 */
export interface GateChallenge { prompt: string; options: string[]; answer: number }

const NUMS = [36, 39, 42, 45, 48, 51, 54, 56, 63, 66, 69, 72, 81, 84];
const WORDS: Record<number, string> = Object.fromEntries(NUMS.map((n) => [n, kreyolNumber(n)]));
const PRODUCTS: [number, number][] = [[6, 6], [13, 3], [7, 6], [9, 5], [8, 6], [17, 3], [18, 3], [7, 8], [21, 3], [11, 6], [23, 3], [12, 6], [27, 3], [28, 3]];

export function makeGate(seed: number): GateChallenge {
  const rand = rng(seed);
  const [a, b] = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
  const correct = a * b;
  const others = Object.keys(WORDS).map(Number).filter((n) => n !== correct);
  const wrong1 = others[Math.floor(rand() * others.length)];
  const wrong2 = others.filter((n) => n !== wrong1)[Math.floor(rand() * (others.length - 1))];
  const opts = [correct, wrong1, wrong2].sort(() => rand() - 0.5);
  return { prompt: `Ekri an lèt: ${a} × ${b} = ?`, options: opts.map((n) => WORDS[n]), answer: opts.indexOf(correct) };
}

export interface ConsentRecord {
  kidId: string;
  parentContact: string;         // WhatsApp number or email, parent's only
  method: 'whatsapp' | 'email';
  acceptedAt: string;            // when parent ticked the boxes in-app
  confirmedAt?: string;          // when parent clicked the confirmation link (server sets)
  policyVersion: string;
  dataCollected: readonly string[];
}

export const DATA_COLLECTED = ['generated_username', 'avatar', 'age_band', 'language', 'learning_progress'] as const;
export const DATA_NEVER = ['real_name', 'exact_birthdate', 'photo', 'voice', 'location', 'contacts'] as const;

export function newConsent(kidId: string, parentContact: string, nowIso: string, policyVersion = '2026-11'): ConsentRecord {
  const method = parentContact.includes('@') ? 'email' : 'whatsapp';
  return { kidId, parentContact, method, acceptedAt: nowIso, policyVersion, dataCollected: DATA_COLLECTED };
}

/** Online features (duels, class, leaderboards) require confirmed consent. Offline solo play does not. */
export const canUseOnline = (c?: ConsentRecord) => !!c?.confirmedAt;
