#!/usr/bin/env node
/**
 * Lint the authored question bank in content/bank/*.json.
 * Reports structural errors (exit 1) and orthography warnings (exit 0).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const DIR = new URL('../content/bank/', import.meta.url).pathname;
const PREFIX = { istwa: 'ist', jewografi: 'jeo', kilti: 'kil', syans: 'sya', matematik: 'mat', jeneral: 'jen', espo: 'esp', teknoloji: 'tek', peyi: 'pey' };
const AGES = new Set(['6-8', '9-11', '12-14']);

let errors = 0, warns = 0;
const ids = new Set(), prompts = new Map();
const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const spread = {};

for (const f of files) {
  const cat = basename(f, '.json');
  let arr;
  try { arr = JSON.parse(readFileSync(join(DIR, f), 'utf8')); } catch (e) { console.error(`✖ ${f}: invalid JSON — ${e.message}`); errors++; continue; }
  if (!Array.isArray(arr)) { console.error(`✖ ${f}: not an array`); errors++; continue; }
  const err = (q, m) => { console.error(`✖ ${f} ${q?.id ?? '?'}: ${m}`); errors++; };
  const warn = (q, m) => { console.warn(`△ ${f} ${q?.id ?? '?'}: ${m}`); warns++; };
  const counts = [0, 0, 0, 0];
  for (const q of arr) {
    if (!q.id) { err(q, 'missing id'); continue; }
    if (ids.has(q.id)) err(q, 'duplicate id'); ids.add(q.id);
    if (PREFIX[cat] && !q.id.startsWith(PREFIX[cat] + '-')) err(q, `id should start with ${PREFIX[cat]}-`);
    if (![1, 2, 3].includes(q.d)) err(q, 'd must be 1|2|3');
    if (!Array.isArray(q.ages) || !q.ages.length || q.ages.some((a) => !AGES.has(a))) err(q, 'bad ages');
    for (const k of ['ht', 'fr', 'ex', 'exFr']) if (typeof q[k] !== 'string' || !q[k].trim()) err(q, `missing ${k}`);
    if (!Array.isArray(q.opts) || q.opts.length < 3 || q.opts.length > 4) err(q, 'opts must have 3–4 entries');
    if (!Array.isArray(q.optsFr) || q.optsFr.length !== q.opts?.length) err(q, 'optsFr length must match opts');
    if (typeof q.a !== 'number' || q.a < 0 || q.a >= (q.opts?.length ?? 0)) err(q, 'a out of range'); else counts[q.a]++;
    if (q.opts && new Set(q.opts.map((s) => String(s).trim().toLowerCase())).size !== q.opts.length) err(q, 'duplicate options');
    if (q.ht && !q.ht.trim().endsWith('?')) warn(q, 'ht prompt should end with ?');
    if (q.fr && !/ \?$/.test(q.fr.trim())) warn(q, 'fr prompt should end with " ?"');
    const key = (q.ht ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (prompts.has(key)) warn(q, `same prompt as ${prompts.get(key)}`); else prompts.set(key, q.id);
    // orthography: letters that do not exist in Kreyòl (c outside ch, q, x), apostrophe short forms
    const ht = [q.ht, q.ex, ...(q.opts ?? [])].join(' ');
    const bad = ht.match(/\b[a-zàèòù]*(?:c(?!h)|q|x)[a-zàèòù]*\b/gi);
    if (bad) warn(q, `non-Kreyòl letters: ${[...new Set(bad)].join(', ')}`);
    if (/\b(m|l|n|w|y|t)'/i.test(ht)) warn(q, 'apostrophe short form (write "m ap", "pa t")');
    if (/\b(tout repons|okenn repons)/i.test(ht)) err(q, '"all/none of the above" options are not allowed');
  }
  spread[cat] = { n: arr.length, a: counts.slice(0, 4).join('/') , d1: arr.filter((q) => q.d === 1).length, d2: arr.filter((q) => q.d === 2).length, d3: arr.filter((q) => q.d === 3).length };
}
console.table(spread);
console.log(`${ids.size} questions, ${errors} errors, ${warns} warnings`);
process.exit(errors ? 1 : 0);
