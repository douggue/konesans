import type { CategoryId, Question } from '../types.js';

/**
 * Content packs are the unit of offline download. Each pack is a JSON file
 * (questions + media refs) with a manifest entry. The app downloads on WiFi,
 * stores locally, and only serves `approved` questions.
 */
export interface PackManifestEntry {
  id: string;              // 'istwa-v3'
  category: CategoryId;
  version: number;
  bytes: number;
  sha256: string;
  url: string;             // CDN or server path
  questionCount: number;
  minAppVersion: string;
}

export interface InstalledPack { id: string; version: number; installedAt: string }

/** Which packs need download or update, given what is installed. */
export function packsToUpdate(manifest: PackManifestEntry[], installed: InstalledPack[]): PackManifestEntry[] {
  const have = new Map(installed.map((p) => [p.id, p.version]));
  return manifest.filter((m) => (have.get(m.id) ?? -1) < m.version);
}

/** Total bytes for a set of packs (shown to parents before download). */
export const packBytes = (packs: PackManifestEntry[]) => packs.reduce((a, p) => a + p.bytes, 0);

/** Validate a loaded pack before it is used. Returns problems (empty = ok). */
export function validatePack(questions: unknown): string[] {
  const errs: string[] = [];
  if (!Array.isArray(questions)) return ['pack is not an array'];
  const ids = new Set<string>();
  questions.forEach((q: Partial<Question>, i) => {
    const at = `q[${i}]${q?.id ? ' ' + q.id : ''}`;
    if (!q || typeof q !== 'object') { errs.push(`${at}: not an object`); return; }
    if (!q.id) errs.push(`${at}: missing id`);
    else if (ids.has(q.id)) errs.push(`${at}: duplicate id`); else ids.add(q.id);
    if (!q.prompt?.ht) errs.push(`${at}: missing Kreyòl prompt`);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) errs.push(`${at}: needs 2–4 options`);
    else if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) errs.push(`${at}: answer index out of range`);
    if (!Array.isArray(q.ages) || q.ages.length === 0) errs.push(`${at}: no age bands`);
    if (!['draft', 'review', 'approved'].includes(q.status as string)) errs.push(`${at}: bad status`);
  });
  return errs;
}
