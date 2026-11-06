/** Hooks and pure helpers shared by the screens. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from './session';
import { errText, type AdminQuestion, type Category } from './api';

/** Load data once, reload on demand (pull-to-refresh) and after `bump()`. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const version = useSession((s) => s.dataVersion);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const run = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { const d = await fn(); if (alive.current) setData(d); }
    catch (e) { if (alive.current) setError(errText(e)); }
    finally { if (alive.current) { setLoading(false); setRefreshing(false); } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run, version]);
  return { data, setData, error, loading, refreshing, reload: () => run(false), refresh: () => run(true) };
}

/** Same rules as the web admin preview and tools/check-bank.mjs. */
export function lintQuestion(q: AdminQuestion): string[] {
  const p: string[] = [];
  if (!q.ht?.trim()) p.push('Kesyon Kreyòl la vid');
  if (!q.fr?.trim()) p.push('Kesyon fransè a vid');
  if (q.opts.length < 3) p.push('Fòk gen omwen 3 opsyon');
  if (q.opts.some((o) => !o?.trim())) p.push('Gen yon opsyon Kreyòl ki vid');
  if (q.optsFr.some((o) => !o?.trim())) p.push('Gen yon opsyon fransè ki vid');
  if (new Set(q.opts.map((o) => o.trim().toLowerCase())).size !== q.opts.length) p.push('De opsyon ki menm');
  if (q.a == null || q.a < 0 || q.a >= q.opts.length) p.push('Chwazi bon repons lan');
  if (!q.ages.length) p.push('Chwazi omwen yon laj');
  if (!q.ex?.trim()) p.push('Esplikasyon Kreyòl la vid');
  const bad = [q.ht, q.ex, ...q.opts].join(' ').match(/\b[a-zàèòù]*(?:c(?!h)|q|x)[a-zàèòù]*\b/gi);
  if (bad) p.push('Lèt ki pa Kreyòl: ' + [...new Set(bad)].slice(0, 4).join(', '));
  if (/\b(m|l|n|w|y|t)'/i.test([q.ht, q.ex, ...q.opts].join(' '))) p.push('Ekri "m ap", "pa t" san apòstwòf');
  return p;
}

/** Problems that block approval (orthography warnings do not block: proper nouns contain c/q/x). */
export const blocking = (q: AdminQuestion) => lintQuestion(q).filter((m) => !m.startsWith('Lèt ki pa Kreyòl') && !m.startsWith('Ekri "m ap"'));

export const blankQuestion = (id: string, category: string): AdminQuestion => ({
  id, category, d: 1, ages: ['6-8', '9-11', '12-14'], ht: '', fr: '', opts: ['', '', '', ''], optsFr: ['', '', '', ''], a: 0, ex: '', exFr: '', topic: '', note: '', status: 'review',
});

/** Fallback names before the categories call returns. */
export const DEFAULT_CATS: Pick<Category, 'id' | 'name' | 'icon' | 'color'>[] = [
  { id: 'istwa', name: { ht: 'Istwa', fr: 'Histoire' }, icon: 'istwa', color: '#FF9F43' },
  { id: 'jewografi', name: { ht: 'Jewografi', fr: 'Géographie' }, icon: 'jewo', color: '#4D7CFE' },
  { id: 'kilti', name: { ht: 'Kilti', fr: 'Culture' }, icon: 'kilti', color: '#FF5A6E' },
  { id: 'syans', name: { ht: 'Syans', fr: 'Sciences' }, icon: 'syans', color: '#B197FC' },
  { id: 'matematik', name: { ht: 'Matematik', fr: 'Mathématiques' }, icon: 'kalkil', color: '#51CF66' },
  { id: 'jeneral', name: { ht: 'Jeneral', fr: 'Culture générale' }, icon: 'kesyon', color: '#FFD43B' },
  { id: 'espo', name: { ht: 'Espò', fr: 'Sport' }, icon: 'espo', color: '#2F9E44' },
  { id: 'teknoloji', name: { ht: 'Teknoloji', fr: 'Technologie' }, icon: 'robo', color: '#1F47B5' },
  { id: 'peyi', name: { ht: 'Peyi', fr: 'Pays' }, icon: 'drapo', color: '#F5B700' },
];

export function timeAgo(iso?: string | null): string {
  if (!iso) return 'janm';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'kounye a';
  if (s < 3600) return `${Math.floor(s / 60)} min de sa`;
  if (s < 86400) return `${Math.floor(s / 3600)} è de sa`;
  return `${Math.floor(s / 86400)} jou de sa`;
}
