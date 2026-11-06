/** Reports and blocks between players. There is no free text anywhere, so reports are reason codes. */
export type ReportReason = 'name' | 'quitting' | 'other';

export interface Report { reporterId: string; targetId: string; reason: ReportReason; matchId?: string; at: string }

export interface ModerationState { blocked: Record<string, string[]>; reports: Report[] }

export function block(m: ModerationState, byId: string, targetId: string): ModerationState {
  const list = new Set(m.blocked[byId] ?? []); list.add(targetId);
  return { ...m, blocked: { ...m.blocked, [byId]: [...list] } };
}

export const isBlocked = (m: ModerationState, a: string, b: string) =>
  (m.blocked[a] ?? []).includes(b) || (m.blocked[b] ?? []).includes(a);

/** Reporting always blocks immediately; a human reviews within 24h; the parent gets a copy. */
export function report(m: ModerationState, r: Report): ModerationState {
  return block({ ...m, reports: [...m.reports, r] }, r.reporterId, r.targetId);
}

/** Matchmaking filter: same age band, not blocked, parent allows random duels. */
export interface Candidate { id: string; age: string; randomDuelsAllowed: boolean; consentConfirmed: boolean }
export function canMatch(m: ModerationState, a: Candidate, b: Candidate): boolean {
  return a.id !== b.id && a.age === b.age && a.randomDuelsAllowed && b.randomDuelsAllowed &&
    a.consentConfirmed && b.consentConfirmed && !isBlocked(m, a.id, b.id);
}
