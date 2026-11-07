import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { createDuel, reduce, planBotAnswer, planBotReaction, BOT_PROFILES, BOT_NAMES, rng, type DuelState, type ReactionId, type AvatarConfig, type Question } from '@konesans/core';
import { Screen, T, Button, Card, Row, Progress, Sheet, Mascot, TopBar, Pill, Avatar, avatarFromSeed, Bounce, Drop, FadeIn, Pop, Confetti, SlideSwap, useCountUp } from '@/ui';
import { Matchmaking } from '@/ui/Matchmaking';
import { QuestionView } from '@/ui/QuestionView';
import { CardReveal } from '@/ui/CardReveal';
import { ReactionTray, ReactionBubble, isReaction, reactionSfx } from '@/ui/Reactions';
import { colors } from '@/lib/theme';
import { useStore, useAvatar } from '@/lib/store';
import { useT, type StrKey } from '@/lib/i18n';
import { buildQuestions } from '@/lib/content';
import { tap, sfx, music, musicIntensity, answerSfx } from '@/lib/audio';
import { serverConfigured } from '@/lib/remote';
import { findDuel, setProfile, lastOnlineError, type OnlineDuel as OnlineCtl, type OnlineView } from '@/lib/online';

const ME = 'me';

/**
 * 1v1 duel.
 * - Online (a parent turned on "Defi sou entènèt" in Settings): the server pairs kids of the same age; after
 *   10 s alone it sends Robo. The server runs the game; the phone only shows it and sends answers.
 * - Otherwise, or when there is no internet: against Robo, on the device, with the same rules.
 */
export default function Duel() {
  const allowed = useStore((s) => s.kidSettings.randomDuelsAllowed);
  const online = allowed && serverConfigured();
  const [fallback, setFallback] = useState<StrKey | null>(null);
  if (online && !fallback) return <OnlineDuel onFallback={setFallback} />;
  return <LocalDuel note={fallback ?? (serverConfigured() && !allowed ? 'robo_parent' : null)} />;
}

// ─── shared pieces ────────────────────────────────────────────────────────────

interface Side { name: string; avatar: AvatarConfig; score: number; isBot?: boolean }
interface GameVM {
  index: number; total: number; questionMs: number;
  /** time left in ms, or null while waiting for the first question */
  left: number | null;
  question?: Question; reveal: boolean;
  me: Side & { chosen: number | null };
  /** reaction = the opponent's last sticker this question; reactSeq counts their stickers (tells a repeat from an old one) */
  op: Side & { answered: boolean; chosen?: number; reaction?: string; reactSeq?: number };
}

function DuelGame({ vm, onPick, onReact, onQuit }: { vm: GameVM; onPick: (i: number) => void; onReact: (r: string) => void; onQuit: () => void }) {
  const t = useT();
  const [quitting, setQuitting] = useState(false);
  const { me, op, reveal } = vm;
  const waiting = vm.left === null;
  // ── sound: battle loop, hurry + ticks in the last seconds, pings, answer feedback ──
  const results = useRef<boolean[]>([]);
  const lastTick = useRef<number | null>(null);
  useEffect(() => { music('duel_battle'); }, []);
  useEffect(() => { musicIntensity('normal'); lastTick.current = null; }, [vm.index]);
  const secs = vm.left === null || reveal ? null : Math.ceil(vm.left / 1000);
  useEffect(() => {
    if (secs === null) return;
    if (secs <= 4) musicIntensity('hurry');
    if (secs >= 1 && secs <= 3 && lastTick.current !== secs) { lastTick.current = secs; sfx('tick'); }
  }, [secs]);
  useEffect(() => { if (op.answered && !reveal) sfx('ping'); }, [op.answered]);
  // ── reactions: a bubble pops under the sender's avatar (+ the sticker's sound) ──
  const [bubbles, setBubbles] = useState<{ me?: { id: ReactionId; k: number }; op?: { id: ReactionId; k: number } }>({});
  const bubbleKey = useRef(0);
  const show = (side: 'me' | 'op', id: ReactionId) => { reactionSfx(id); setBubbles((b) => ({ ...b, [side]: { id, k: ++bubbleKey.current } })); };
  const opReact = op.reaction && isReaction(op.reaction) ? `${op.reaction}|${op.reactSeq ?? ''}` : null;
  useEffect(() => { if (opReact) show('op', op.reaction as ReactionId); }, [opReact]);
  useEffect(() => {
    if (!reveal || !vm.question) return;
    musicIntensity('normal');
    const timedOut = me.chosen === null;
    results.current.push(!timedOut && me.chosen === vm.question.answer);
    sfx(answerSfx(results.current, timedOut));
  }, [reveal, vm.index]);
  return (
    <Screen>
      <TopBar close title={`${t('question')} ${vm.index + 1} / ${vm.total}`} onBack={() => setQuitting(true)} />
      <FadeIn from={-12} style={{ zIndex: 10 }}><Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}>
        <Bounce trigger={me.score || null} amount={0.12}><Avatar a={me.avatar} size={42} /></Bounce>
        <View style={{ flex: 1 }}><T v="small" color={colors.muted}>{t('you')}</T><T v="bold" numberOfLines={1}>{me.name}</T></View>
        <Bounce trigger={me.score || null} amount={0.25}><ScoreNum n={me.score} color={colors.blue} small /></Bounce>
        <T v="small" color={colors.muted}>{t('vs')}</T>
        <Bounce trigger={op.score || null} amount={0.25}><ScoreNum n={op.score} color={colors.red} small /></Bounce>
        <View style={{ flex: 1, alignItems: 'flex-end' }}><T v="small" color={colors.muted}>{op.isBot ? t('robot') : t('opponent')}</T><T v="bold" numberOfLines={1}>{op.name}</T></View>
        <Bounce trigger={op.score || null} amount={0.12}><Avatar a={op.avatar} size={42} /></Bounce>
      </Card>
        {/* reaction bubbles, hanging under each player's avatar (over the timer / question for ~2 s) */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            {bubbles.me && <ReactionBubble key={bubbles.me.k} id={bubbles.me.id} side="me" who={t('you')} onDone={() => setBubbles((b) => ({ ...b, me: undefined }))} />}
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {bubbles.op && <ReactionBubble key={bubbles.op.k} id={bubbles.op.id} side="op" who={op.name} onDone={() => setBubbles((b) => ({ ...b, op: undefined }))} />}
          </View>
        </View>
      </FadeIn>
      <Row>
        <Progress style={{ flex: 1 }} linear value={reveal || waiting ? (waiting ? 1 : 0) : (vm.left ?? 0) / vm.questionMs} color={(vm.left ?? vm.questionMs) < 4000 ? colors.red : colors.yellowDark} />
        <T v="small" color={colors.muted} style={{ width: 44, textAlign: 'right' }}>{waiting ? t('get_set') : reveal ? '' : Math.ceil((vm.left ?? 0) / 1000) + ' s'}</T>
      </Row>
      {op.answered && !reveal && <Pop><Pill text={t('already_answered', { name: op.name })} color={colors.muted} bg={colors.line} /></Pop>}
      {vm.question && <SlideSwap id={vm.index}><QuestionView q={vm.question} chosen={me.chosen} reveal={reveal} otherChosen={reveal ? op.chosen : undefined} otherAvatar={op.avatar} onPick={waiting ? undefined : (i) => { tap(); onPick(i); }} /></SlideSwap>}
      <ReactionTray onSend={(id) => { show('me', id); onReact(id); }} />
      <Sheet open={quitting} title={t('quit_q')}>
        <Button title={t('stay')} onPress={() => setQuitting(false)} />
        <Button variant="secondary" color={colors.red} title={t('quit')} onPress={() => { setQuitting(false); onQuit(); router.replace('/home'); }} />
      </Sheet>
    </Screen>
  );
}

function DuelEnd({ won, draw, me, op, note, onReport }: { won: boolean; draw: boolean; me: Side; op: Side; note?: StrKey | null; onReport?: () => Promise<void> }) {
  const t = useT();
  const stats = useStore((s) => s.stats);
  const [reported, setReported] = useState(false);
  useEffect(() => {
    music(null);
    sfx(won ? 'win' : draw ? 'draw' : 'lose');
    const id = setTimeout(() => sfx('coin'), 1200); // with the XP pill
    return () => clearTimeout(id);
  }, []);
  return (
    <Screen scroll={false}>
      {won && <Confetti />}
      <CardReveal delay={2200} />
      <View style={{ alignItems: 'center', gap: 10, marginTop: 'auto' }}>
        <Drop><Mascot size={140} mood={won ? 'cool' : draw ? 'happy' : 'angry'} /></Drop>
        <Pop delay={450}><T v="display" center>{won ? t('you_win') : draw ? t('draw') : op.isBot ? t('you_lose') : t('they_win', { name: op.name })}</T></Pop>
        {note ? <FadeIn delay={500}><T v="small" center color={colors.muted}>{t(note)}</T></FadeIn> : null}
        <Row gap={16}>
          <FadeIn delay={650} x={-40} from={0} style={{ alignItems: 'center', gap: 4 }}><Avatar a={me.avatar} size={64} live={won} /><ScoreNum n={me.score} color={colors.blue} /><T v="small" color={colors.muted}>{me.name}</T></FadeIn>
          <T v="h2" color={colors.muted}>{t('vs')}</T>
          <FadeIn delay={650} x={40} from={0} style={{ alignItems: 'center', gap: 4 }}><Avatar a={op.avatar} size={64} /><ScoreNum n={op.score} color={colors.red} /><T v="small" color={colors.muted}>{op.isBot ? '🤖 ' : ''}{op.name}</T></FadeIn>
        </Row>
        <Pop delay={1100}><Pill text={`+${won ? 40 : draw ? 25 : 15} XP`} color="#5C4600" bg={colors.yellowSoft} icon="pwen" /></Pop>
        <FadeIn delay={1250}><T v="small" color={colors.muted}>{t('wins')}: {stats.duelWins} / {stats.duels}</T></FadeIn>
      </View>
      <View style={{ marginTop: 'auto', gap: 10 }}>
        <Button title={t('again')} onPress={() => router.replace('/duel')} />
        <Button variant="secondary" title={t('done')} onPress={() => router.replace('/home')} />
        {onReport && (reported
          ? <T v="small" center color={colors.muted}>{t('reported')}</T>
          : <Button variant="ghost" color={colors.muted} small title={t('report_player')} onPress={() => { setReported(true); onReport().catch(() => {}); }} />)}
      </View>
    </Screen>
  );
}

function ScoreNum({ n, color, small }: { n: number; color: string; small?: boolean }) {
  const v = useCountUp(n, undefined, 450);
  return <T v={small ? 'h1' : 'display'} color={color}>{v}</T>;
}

// ─── online ──────────────────────────────────────────────────────────────────

const HAIR = ['afro', 'braids', 'short', 'puffs', 'bun', 'mohawk', 'locs'] as const;
const EXTRA = ['none', 'glasses', 'cap', 'mask', 'uniform', 'headphones', 'strawhat', 'shades', 'crown', 'flower'] as const;
/** The other phone's avatar comes from the server: only keep values the avatar drawing knows. */
function safeAvatar(a: unknown, seed: string): AvatarConfig {
  const base = avatarFromSeed(seed);
  if (!a || typeof a !== 'object') return base;
  const o = a as Record<string, unknown>;
  const n = (k: keyof AvatarConfig) => (typeof o[k] === 'number' && Number.isInteger(o[k]) && (o[k] as number) >= 0 && (o[k] as number) < 32 ? (o[k] as number) : (base[k] as number));
  return {
    skin: n('skin'), hairColor: n('hairColor'), shirt: n('shirt'), bg: n('bg'),
    hair: HAIR.includes(o.hair as never) ? (o.hair as AvatarConfig['hair']) : base.hair,
    extra: EXTRA.includes(o.extra as never) ? (o.extra as AvatarConfig['extra']) : base.extra,
    ...(typeof o.frame === 'number' && Number.isInteger(o.frame) && o.frame >= 0 && o.frame < 8 ? { frame: o.frame } : {}),
  };
}

function OnlineDuel({ onFallback }: { onFallback: (note: StrKey) => void }) {
  const t = useT();
  const { profile, recordDuel } = useStore();
  const myAvatar = useAvatar();
  const [v, setV] = useState<OnlineView | null>(null);
  const [lost, setLost] = useState(false);       // connection dropped mid-game
  const [intro, setIntro] = useState(true);      // VS animation still playing
  const [now, setNow] = useState(Date.now());
  const ctl = useRef<OnlineCtl | null>(null);
  const offset = useRef(0);                      // server clock − phone clock
  const started = useRef(false);
  const recorded = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await setProfile(profile.username, myAvatar); } catch { /* findDuel reports the real problem */ }
      if (!alive) return;
      const c = await findDuel({
        age: profile.age,
        onView: (view) => {
          if (!alive) return;
          const sn = (view as OnlineView & { serverNow?: number }).serverNow;
          if (typeof sn === 'number') offset.current = sn - Date.now();
          if (view.players.length >= 2) started.current = true;
          setV(view);
        },
        onError: (e) => {
          if (!alive) return;
          if (started.current) setLost(true);
          else onFallback(e === 'not_allowed' ? 'robo_parent' : 'robo_offline');
        },
      });
      if (!alive) { c?.leave(); return; }
      ctl.current = c;
    })();
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => { alive = false; clearInterval(id); ctl.current?.leave(); ctl.current = null; };
  }, []);

  const myId = ctl.current?.myId;
  const meP = v?.players.find((p) => p.id === myId);
  const opP = myId ? v?.players.find((p) => p.id !== myId) : undefined; // until we know our own id, nobody is "the opponent"
  const opAvatar = useMemo(() => (opP ? safeAvatar(opP.avatar, opP.username) : null), [opP?.id]);

  useEffect(() => {
    if (v?.phase === 'ended' && !recorded.current && meP && opP) {
      recorded.current = true;
      recordDuel(v.winnerId === myId, v.winnerId === null, meP.score);
    }
  }, [v?.phase]);

  const me: Side = { name: profile.username, avatar: myAvatar, score: meP?.score ?? 0 };
  const op: Side | null = opP && opAvatar ? { name: opP.username, avatar: opAvatar, score: opP.score, isBot: opP.isBot } : null;

  if (intro || !v || !op || v.phase === 'lobby') {
    return (
      <Screen scroll={false}>
        <TopBar close title={t('duel_bot')} onBack={() => router.back()} />
        <Matchmaking me={{ name: profile.username, avatar: myAvatar, sub: `${profile.age} ${t('years')}` }}
          opponent={op ? { name: op.name, avatar: op.avatar, sub: op.isBot ? t('robot') : t('online_player') } : null}
          hint={t('robo_soon')} onDone={() => setIntro(false)} />
      </Screen>
    );
  }

  if (v.phase === 'ended' || lost) {
    const won = !lost && v.winnerId === myId; const draw = !lost && v.winnerId === null;
    const note: StrKey | null = lost ? 'online_err' : v.endReason === 'forfeit' && won ? 'player_left' : null;
    return <DuelEnd won={won} draw={draw} me={me} op={op} note={note}
      onReport={!op.isBot && opP ? () => ctl.current?.report(opP.id, 'name') ?? Promise.resolve() : undefined} />;
  }

  const serverNow = now + offset.current;
  const reveal = v.phase === 'reveal';
  const q = v.question ? ({ ...v.question, answer: v.question.answer ?? -1 } as unknown as Question) : undefined;
  const vm: GameVM = {
    index: v.index, total: v.total, questionMs: v.questionMs,
    left: serverNow < v.phaseStartedAt ? null : Math.max(0, v.questionMs - (serverNow - v.phaseStartedAt)),
    question: q, reveal,
    me: { ...me, chosen: meP?.chosen ?? null },
    op: { ...op, answered: !!opP?.answered, chosen: opP?.chosen, reaction: opP ? v.reactions[opP.id] : undefined,
      // newer servers also send how many stickers each player sent, so the same sticker twice shows twice
      reactSeq: opP ? (v as OnlineView & { reactSeq?: Record<string, number> }).reactSeq?.[opP.id] : undefined },
  };
  return <DuelGame vm={vm} onPick={(i) => ctl.current?.answer(i)} onReact={(r) => ctl.current?.react(r)} onQuit={() => ctl.current?.leave()} />;
}

// ─── local (Robo on the phone) ───────────────────────────────────────────────

function LocalDuel({ note }: { note: StrKey | null }) {
  const t = useT();
  const { profile, seen, recordDuel } = useStore();
  const myAvatar = useAvatar();
  const bot = useMemo(() => { const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]; return { id: 'bot', name, profile: BOT_PROFILES[profile.age], avatar: avatarFromSeed(name + Date.now()) }; }, []);
  const rand = useMemo(() => rng(Date.now() % 1e9), []);
  const [s, setS] = useState<DuelState>(() => {
    let d = createDuel('local-' + Date.now().toString(36), buildQuestions('mix', profile.age, 5, Date.now() % 1e9, seen), Date.now());
    d = reduce(d, { type: 'join', player: { id: ME, username: profile.username, isBot: false } }, Date.now());
    return d;
  });
  const [lobby, setLobby] = useState(true);
  const [now, setNow] = useState(Date.now());
  const botPlan = useRef<{ index: number; atMs: number; chosen: number } | null>(null);
  const recorded = useRef(false);
  const botTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => botTimers.current.forEach(clearTimeout), []);
  // Robo reacts now and then (a "good luck" at the start, cheers after the kid's good answers) with the same stickers
  useEffect(() => {
    const moment = s.phase === 'question' && s.index === 0 && s.players.length === 2 ? 'start' : s.phase === 'reveal' ? 'reveal' : null;
    const r = moment && planBotReaction(moment, s, bot.id, rand);
    if (r) botTimers.current.push(setTimeout(() => setS((x) => (x.phase === 'ended' ? x : reduce(x, { type: 'react', playerId: bot.id, reaction: r.reaction }, Date.now()))), r.delayMs));
  }, [s.phase, s.index]);

  // the matchmaking sequence ends → the opponent joins and the first question starts
  const startDuel = () => { setLobby(false); setS((d) => reduce(d, { type: 'join', player: { id: bot.id, username: bot.name, isBot: true } }, Date.now())); };

  // game clock
  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now(); setNow(n);
      setS((d) => {
        if (d.phase === 'question') {
          if (!botPlan.current || botPlan.current.index !== d.index) botPlan.current = { index: d.index, ...planBotAnswer(d, bot.profile, rand) };
          if (n - d.phaseStartedAt >= botPlan.current.atMs && !d.players.find((p) => p.id === bot.id)?.answer) d = reduce(d, { type: 'answer', playerId: bot.id, chosen: botPlan.current.chosen }, n);
        }
        return reduce(d, { type: 'tick' }, n);
      });
    }, 150);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (s.phase === 'ended' && !recorded.current) {
      recorded.current = true;
      const me = s.players.find((p) => p.id === ME)!;
      recordDuel(s.winnerId === ME, s.winnerId === null, me.score);
    }
  }, [s.phase]);

  const meP = s.players.find((p) => p.id === ME); const opP = s.players.find((p) => p.id === bot.id);
  const me: Side = { name: profile.username, avatar: myAvatar, score: meP?.score ?? 0 };

  if (lobby || !opP) {
    return (
      <Screen scroll={false}>
        <TopBar close title={t('duel_bot')} onBack={() => router.back()} />
        {note ? <FadeIn><T v="small" center color={colors.muted}>{t(note)}</T>{note === 'robo_offline' && lastOnlineError ? <T v="small" center color={colors.muted} style={{ opacity: 0.6, fontSize: 11 }}>{lastOnlineError}</T> : null}</FadeIn> : null}
        <Matchmaking me={{ name: profile.username, avatar: myAvatar, sub: `${profile.age} ${t('years')}` }} opponent={{ name: bot.name, avatar: bot.avatar, sub: t('robot') }} onDone={startDuel} />
      </Screen>
    );
  }
  const op: Side = { name: opP.username, avatar: bot.avatar, score: opP.score, isBot: true };

  if (s.phase === 'ended') return <DuelEnd won={s.winnerId === ME} draw={s.winnerId === null} me={me} op={op} />;

  const reveal = s.phase === 'reveal';
  const vm: GameVM = {
    index: s.index, total: s.questions.length, questionMs: s.questionMs,
    left: Math.max(0, s.questionMs - (now - s.phaseStartedAt)), question: s.questions[s.index], reveal,
    me: { ...me, chosen: meP?.answer?.chosen ?? null },
    op: { ...op, answered: !!opP.answer, chosen: opP.answer?.chosen, reaction: s.reactions[bot.id], reactSeq: s.reactSeq?.[bot.id] },
  };
  return <DuelGame vm={vm}
    onPick={(i) => setS((d) => reduce(d, { type: 'answer', playerId: ME, chosen: i }, Date.now()))}
    onReact={(r) => setS((d) => reduce(d, { type: 'react', playerId: ME, reaction: r }, Date.now()))}
    onQuit={() => setS((d) => reduce(d, { type: 'leave', playerId: ME }, Date.now()))} />;
}
