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
const byCat = new Map();
const load = (cat) => {
  if (!byCat.has(cat)) {
    const p = join(DIR, cat + '.json');
    byCat.set(cat, existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : []);
  }
  return byCat.get(cat);
};
const FIELDS = ['d', 'ages', 'ht', 'fr', 'opts', 'optsFr', 'a', 'ex', 'exFr', 'topic', 'status', 'note'];
let applied = 0, added = 0, removed = 0;
for (const e of edits) {
  if (!e?.id || !e.category) continue;
  const arr = load(e.category);
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
