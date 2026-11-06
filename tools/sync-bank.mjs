#!/usr/bin/env node
/**
 * Apply edits made in the admin panel back to content/bank/*.json.
 *   node tools/sync-bank.mjs edits.json
 * edits.json = array of documents from the admin panel's `edits` collection
 * (each doc: {id, category, d, ages, ht, fr, opts, optsFr, a, ex, exFr, topic, status, note, deleted?}).
 * Then run tools/build-bank.mjs.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const DIR = join(ROOT, 'content/bank');
const file = process.argv[2];
if (!file) { console.error('usage: sync-bank.mjs edits.json'); process.exit(1); }
const edits = JSON.parse(readFileSync(file, 'utf8'));
import { readdirSync } from 'node:fs';
// Each id lives in exactly one file; new ids go to <category>.json.
const byCat = new Map(); // file stem -> array
const where = new Map(); // id -> file stem
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const stem = f.slice(0, -5);
  const arr = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  byCat.set(stem, arr);
  for (const q of arr) where.set(q.id, stem);
}
const load = (cat, id) => {
  const stem = where.get(id) ?? cat;
  if (!byCat.has(stem)) byCat.set(stem, []);
  return byCat.get(stem);
};
const FIELDS = ['d', 'ages', 'ht', 'fr', 'opts', 'optsFr', 'a', 'ex', 'exFr', 'topic', 'status', 'note'];
let applied = 0, added = 0, removed = 0;
for (const e of edits) {
  if (!e?.id || !e.category) continue;
  const arr = load(e.category, e.id);
  const i = arr.findIndex((q) => q.id === e.id);
  if (e.deleted) { if (i >= 0) { arr.splice(i, 1); removed++; } continue; }
  const q = i >= 0 ? arr[i] : { id: e.id };
  for (const k of FIELDS) if (e[k] !== undefined) q[k] = e[k];
  if (!q.note) delete q.note;
  if (q.status === 'review') delete q.status; // review is the default
  if (i >= 0) applied++; else { arr.push(q); added++; }
}
for (const [cat, arr] of byCat) {
  arr.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(join(DIR, cat + '.json'), '[\n' + arr.map((q) => JSON.stringify(q)).join(',\n') + '\n]\n');
}
console.log(`synced: ${applied} updated, ${added} added, ${removed} removed`);
