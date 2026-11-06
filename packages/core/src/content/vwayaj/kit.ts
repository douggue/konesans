/** Authoring kit for the Vwayaj Ayiti department pack: compact rows → Question objects, plus a few templates. */
import type { AgeBand, CategoryId, Difficulty, LocalizedText, Question } from '../../types.js';

export type DepartmentId = 'lwes' | 'sides' | 'sid' | 'grandans' | 'nip' | 'sant' | 'latibonit' | 'nodwes' | 'no' | 'nodes';

/** A = every band, B = 9-11 + 12-14, C = 12-14 only, Y = 6-8 + 9-11 */
export type Band = 'A' | 'B' | 'C' | 'Y';
export const BANDS: Record<Band, AgeBand[]> = { A: ['6-8', '9-11', '12-14'], B: ['9-11', '12-14'], C: ['12-14'], Y: ['6-8', '9-11'] };
export type Opt = string | [string, string];
/** [difficulty, ages, topic, prompt ht, prompt fr, options (ht or [ht, fr]), answer index, explanation ht, explanation fr] */
export type Raw = [d: Difficulty, ages: Band, topic: string, ht: string, fr: string, opts: Opt[], a: number, ex: string, exFr: string];

export interface DepSource { id: DepartmentId; prefix: string; name: LocalizedText; chefLieu: LocalizedText; facts: LocalizedText[]; rows: Raw[] }

export const T = (ht: string, fr: string): LocalizedText => ({ ht, fr });

const CAT: Record<string, CategoryId> = { istwa: 'istwa', moun: 'istwa', kilti: 'kilti', manje: 'kilti' };
const opt = (o: Opt): LocalizedText => (typeof o === 'string' ? { ht: o, fr: o } : { ht: o[0], fr: o[1] });

/** Rows → questions. Ids are `vw-<prefix>-NN` by position, so append new rows at the end to keep ids stable. */
export function build(prefix: string, rows: Raw[]): Question[] {
  return rows.map(([d, band, topic, ht, fr, opts, a, ex, exFr], i) => ({
    id: `vw-${prefix}-${String(i + 1).padStart(2, '0')}`,
    category: CAT[topic] ?? 'jewografi',
    difficulty: d,
    ages: BANDS[band],
    prompt: { ht, fr },
    options: opts.map(opt),
    answer: a,
    explain: { ht: ex, fr: exFr },
    status: 'review',
    topic: `vwayaj-${topic}`,
  }));
}

// ─── templates ───────────────────────────────────────────────────────────────
const ORDER: DepartmentId[] = ['lwes', 'sides', 'sid', 'grandans', 'nip', 'sant', 'latibonit', 'nodwes', 'no', 'nodes'];
export const DEP_NAME: Record<DepartmentId, [string, string]> = {
  lwes: ['Lwès', 'Ouest'], sides: ['Sidès', 'Sud-Est'], sid: ['Sid', 'Sud'], grandans: ['Grandans', "Grand'Anse"], nip: ['Nip', 'Nippes'],
  sant: ['Sant', 'Centre'], latibonit: ['Latibonit', 'Artibonite'], nodwes: ['Nòdwès', 'Nord-Ouest'], no: ['Nò', 'Nord'], nodes: ['Nòdès', 'Nord-Est'],
};
/** "du département de l'Ouest" */
const DE: Record<DepartmentId, string> = {
  lwes: "de l'Ouest", sides: 'du Sud-Est', sid: 'du Sud', grandans: "de la Grand'Anse", nip: 'des Nippes',
  sant: 'du Centre', latibonit: "de l'Artibonite", nodwes: 'du Nord-Ouest', no: 'du Nord', nodes: 'du Nord-Est',
};
const CHEF: Record<DepartmentId, [string, string]> = {
  lwes: ['Pòtoprens', 'Port-au-Prince'], sides: ['Jakmèl', 'Jacmel'], sid: ['Okay', 'Les Cayes'], grandans: ['Jeremi', 'Jérémie'], nip: ['Miragwàn', 'Miragoâne'],
  sant: ['Ench', 'Hinche'], latibonit: ['Gonayiv', 'Gonaïves'], nodwes: ['Pòdepè', 'Port-de-Paix'], no: ['Okap', 'Cap-Haïtien'], nodes: ['Fò Libète', 'Fort-Liberté'],
};
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** `n` distinct other departments, picked from the name so the set is stable. */
function others(dep: DepartmentId, key: string, n: number): DepartmentId[] {
  const pool = ORDER.filter((d) => d !== dep);
  const out: DepartmentId[] = [];
  let h = hash(key);
  while (out.length < n) { const d = pool[h % pool.length]; if (!out.includes(d)) out.push(d); h = (h * 1103515245 + 12345) >>> 0; }
  return out;
}
function withAnswer<X>(right: X, wrong: X[], key: string): { opts: X[]; a: number } {
  const a = hash(key + '#') % (wrong.length + 1);
  const opts = [...wrong];
  opts.splice(a, 0, right);
  return { opts, a };
}

/** "Nan ki depatman komin X ye?" — a commune and its department (administrative fact). */
export function where(d: Difficulty, band: Band, place: [string, string], dep: DepartmentId, note?: [string, string]): Raw {
  const { opts, a } = withAnswer(dep, others(dep, place[0], d === 1 ? 2 : 3), place[0]);
  return [d, band, 'komin', `Nan ki depatman komin ${place[0]} ye?`, `Dans quel département se trouve la commune de ${place[1]} ?`,
    opts.map((x) => DEP_NAME[x]), a,
    `${place[0]} se yon komin nan depatman ${DEP_NAME[dep][0]}.${note ? ' ' + note[0] : ''}`,
    `${place[1]} est une commune du département ${DE[dep]}.${note ? ' ' + note[1] : ''}`];
}

/** "Kijan yo rele depatman «Sud-Est» an Kreyòl?" — for the youngest. */
export function named(dep: DepartmentId, wrong: DepartmentId[]): Raw {
  const [ht, fr] = DEP_NAME[dep];
  const { opts, a } = withAnswer(dep, wrong, 'named-' + dep);
  return [1, 'A', 'non', `Kijan yo rele depatman "${fr}" an Kreyòl?`, `Comment dit-on « ${fr} » en créole ?`,
    opts.map((x) => DEP_NAME[x][0]), a, `An Kreyòl nou di ${ht} pou "${fr}".`, `En créole, on dit ${ht} pour « ${fr} ».`];
}

/** "Ki depatman ki gen Jakmèl kòm chèf-lye?" */
export function chefOf(dep: DepartmentId): Raw {
  const [c, cFr] = CHEF[dep];
  const { opts, a } = withAnswer(dep, others(dep, 'chef-' + dep, 3), 'chef-' + dep);
  return [2, 'A', 'kapital', `Ki depatman ki gen ${c} kòm chèf-lye?`, `Quel département a ${cFr} pour chef-lieu ?`,
    opts.map((x) => DEP_NAME[x]), a, `${c} se chèf-lye depatman ${DEP_NAME[dep][0]}.`, `${cFr} est le chef-lieu du département ${DE[dep]}.`];
}
