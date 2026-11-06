import type { Progress } from '../types.js';

export interface BadgeDef { id: string; name: string; how: string; tier: 'bronz' | 'ajan' | 'lo'; test: (ctx: BadgeCtx) => boolean }
export interface BadgeCtx { p: Progress; duelWins: number; lessonsDone: number; wordsLearned: number; departmentsUnlocked: number; eventsPlayed: string[] }

export const BADGES: BadgeDef[] = [
  { id: 'premye', name: 'Premye pa', how: 'Fini premye leson ou', tier: 'bronz', test: (c) => c.lessonsDone >= 1 },
  { id: 'seri7', name: 'Seri 7 jou', how: '7 jou san rete', tier: 'ajan', test: (c) => c.p.streak.count >= 7 },
  { id: 'seri30', name: 'Seri 30 jou', how: '30 jou san rete', tier: 'lo', test: (c) => c.p.streak.count >= 30 },
  { id: 'mo100', name: '100 mo', how: 'Aprann 100 mo angle', tier: 'ajan', test: (c) => c.wordsLearned >= 100 },
  { id: 'duel1', name: 'Premye viktwa', how: 'Genyen yon defi 1 kont 1', tier: 'bronz', test: (c) => c.duelWins >= 1 },
  { id: 'duel10', name: '10 viktwa', how: 'Genyen 10 defi', tier: 'ajan', test: (c) => c.duelWins >= 10 },
  { id: 'vwayaj3', name: '3 depatman', how: 'Debloke 3 depatman', tier: 'bronz', test: (c) => c.departmentsUnlocked >= 3 },
  { id: 'vetye', name: 'Vètyè', how: 'Jwe evènman 18 novanm', tier: 'lo', test: (c) => c.eventsPlayed.includes('vetye') },
  { id: 'drapo', name: '18 me', how: 'Jwe evènman Jou Drapo', tier: 'ajan', test: (c) => c.eventsPlayed.includes('jou-drapo') },
];

/** Award any newly earned badges. Returns new progress + ids awarded. */
export function checkBadges(ctx: BadgeCtx, nowIso: string): { progress: Progress; awarded: string[] } {
  const awarded = BADGES.filter((b) => !ctx.p.badges[b.id] && b.test(ctx)).map((b) => b.id);
  if (!awarded.length) return { progress: ctx.p, awarded };
  const badges = { ...ctx.p.badges };
  for (const id of awarded) badges[id] = nowIso;
  return { progress: { ...ctx.p, badges }, awarded };
}
