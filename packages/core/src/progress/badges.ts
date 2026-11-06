import type { Progress } from '../types.js';

export interface BadgeDef { id: string; name: string; how: string; nameFr: string; howFr: string; tier: 'bronz' | 'ajan' | 'lo'; test: (ctx: BadgeCtx) => boolean }
export interface BadgeCtx { p: Progress; duelWins: number; lessonsDone: number; wordsLearned: number; departmentsUnlocked: number; eventsPlayed: string[] }

export const BADGES: BadgeDef[] = [
  { id: 'premye', name: 'Premye pa', how: 'Fini premye leson ou', nameFr: 'Premier pas', howFr: 'Finis ta première leçon', tier: 'bronz', test: (c) => c.lessonsDone >= 1 },
  { id: 'seri7', name: 'Seri 7 jou', how: '7 jou san rete', nameFr: 'Série de 7 jours', howFr: '7 jours sans t’arrêter', tier: 'ajan', test: (c) => c.p.streak.count >= 7 },
  { id: 'seri30', name: 'Seri 30 jou', how: '30 jou san rete', nameFr: 'Série de 30 jours', howFr: '30 jours sans t’arrêter', tier: 'lo', test: (c) => c.p.streak.count >= 30 },
  { id: 'mo100', name: '100 mo', how: 'Aprann 100 mo angle', nameFr: '100 mots', howFr: 'Apprends 100 mots', tier: 'ajan', test: (c) => c.wordsLearned >= 100 },
  { id: 'duel1', name: 'Premye viktwa', how: 'Genyen yon defi 1 kont 1', nameFr: 'Première victoire', howFr: 'Gagne un duel 1 contre 1', tier: 'bronz', test: (c) => c.duelWins >= 1 },
  { id: 'duel10', name: '10 viktwa', how: 'Genyen 10 defi', nameFr: '10 victoires', howFr: 'Gagne 10 duels', tier: 'ajan', test: (c) => c.duelWins >= 10 },
  { id: 'vwayaj3', name: '3 depatman', how: 'Debloke 3 depatman', nameFr: '3 départements', howFr: 'Débloque 3 départements', tier: 'bronz', test: (c) => c.departmentsUnlocked >= 3 },
  { id: 'vetye', name: 'Vètyè', how: 'Jwe evènman 18 novanm', nameFr: 'Vertières', howFr: 'Joue l’événement du 18 novembre', tier: 'lo', test: (c) => c.eventsPlayed.includes('vetye') },
  { id: 'drapo', name: '18 me', how: 'Jwe evènman Jou Drapo', nameFr: '18 mai', howFr: 'Joue l’événement de la Fête du Drapeau', tier: 'ajan', test: (c) => c.eventsPlayed.includes('jou-drapo') },
];

/** Award any newly earned badges. Returns new progress + ids awarded. */
export function checkBadges(ctx: BadgeCtx, nowIso: string): { progress: Progress; awarded: string[] } {
  const awarded = BADGES.filter((b) => !ctx.p.badges[b.id] && b.test(ctx)).map((b) => b.id);
  if (!awarded.length) return { progress: ctx.p, awarded };
  const badges = { ...ctx.p.badges };
  for (const id of awarded) badges[id] = nowIso;
  return { progress: { ...ctx.p, badges }, awarded };
}
