/**
 * Checks for "Tèks app la" overrides (same rules as the web admin, apps/admin-web/index.html `checkText`).
 * The kids' app replaces {n}, {name}, {x}… in its texts: an override that drops one would show a sentence with a hole
 * ("Ou genyen  pwen"), one with an unknown {y} would show the braces. Too long texts break buttons and cards.
 *  - errors block saving; warnings are only shown.
 */
export interface TextCheck { errors: string[]; warnings: string[] }

const PH = /\{[A-Za-z_][A-Za-z0-9_]*\}/g;
export const placeholders = (s: string): string[] => [...new Set(s.match(PH) ?? [])].sort();
/** Longest an override may be: twice the original, at least 60 characters. */
export const maxTextLength = (def: string) => Math.max(60, def.length * 2);

function side(def: string, v: string, lang: string): string[] {
  const e: string[] = [];
  const want = placeholders(def), got = placeholders(v);
  const missing = want.filter((p) => !got.includes(p)), extra = got.filter((p) => !want.includes(p));
  if (missing.length) e.push(`${lang}: kenbe ${missing.join(' ')} (app la mete yon valè la a)`);
  if (extra.length) e.push(`${lang}: ${extra.join(' ')} pa egziste pou tèks sa a`);
  if (v.length > maxTextLength(def)) e.push(`${lang}: twò long (${v.length}/${maxTextLength(def)} karaktè)`);
  if ((v.match(/\{/g) ?? []).length !== (v.match(/\}/g) ?? []).length) e.push(`${lang}: yon { oswa } pa fèmen`);
  return e;
}

/** `def` = [Kreyòl, French] original; `val` = the override being typed ([ht, fr], '' = keep the original). */
export function checkText(def: [string, string], val: [string, string]): TextCheck {
  const ht = (val[0] ?? '').trim(), fr = (val[1] ?? '').trim();
  const errors: string[] = [], warnings: string[] = [];
  if (!ht && !fr) return { errors, warnings };
  if (ht) errors.push(...side(def[0], ht, 'Kreyòl')); else warnings.push('Kreyòl vid: app la ap montre tèks orijinal la.');
  if (fr) errors.push(...side(def[1], fr, 'Français')); else warnings.push('Français vide : l’app montrera le texte d’origine.');
  if (ht && ht === def[0] && (!fr || fr === def[1])) warnings.push('Menm jan ak tèks orijinal la.');
  return { errors, warnings };
}

/** All overrides with an error (key → problems), to block saving. */
export function textErrors(defaults: Record<string, [string, string]>, draft: Record<string, [string, string]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const k of Object.keys(draft)) { const d = defaults[k]; if (!d) continue; const c = checkText(d, draft[k]); if (c.errors.length) out[k] = c.errors; }
  return out;
}
