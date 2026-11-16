/**
 * Defi Jodi a — today's challenge (src/lib/daily.ts, server daily.ts).
 * intro (the day's count + rule, or today's result and ranking) → play → result with the ranking.
 * The first finished run of the day is the scored one (sent to the server, XP once); every replay is practice.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { startSolo, answerSolo, soloSummary, quizXp, type SoloSession, type AvatarConfig } from '@konesans/core';
import { Screen, T, Button, Card, Row, Progress, Sheet, Mascot, TopBar, Pill, CountPill, FadeIn, Pop, SlideSwap, Confetti, Avatar, Motif, useCountUp, avatarFromSeed, Loader, SkeletonRow, IconButton, EmptyState } from '@/ui';
import { HAIRS, EXTRAS } from '@/ui/avatar';
import { QuestionView } from '@/ui/QuestionView';
import { AnswerFeedbackSheet, StreakLabel, trailingStreak } from '@/ui/feedback';
import { ResultHero, StatCards, ResultScreen, tierFor, useStdStats } from '@/ui/ResultScreen';
import { RankUpListener } from '@/ui/RankUp';
import { useQuitGuard, useQuestionClock, questionTimeMs, scoredNow } from '@/ui/activity';
import { colors } from '@/lib/theme';
import { useStore, useAvatar } from '@/lib/store';
import { useT, useL, formatDate } from '@/lib/i18n';
import { loadDaily, submitDaily, refreshTop, markRewarded, type DailyDay, type DailyRow } from '@/lib/daily';
import { speak, tap, sfx, music, answerSfx } from '@/lib/audio';

const AGE_KEY = { '6-8': 'age_6_8', '9-11': 'age_9_11', '12-14': 'age_12_14' } as const;
type Phase = 'loading' | 'intro' | 'play' | 'result';

export default function Daily() {
  const t = useT();
  const { profile } = useStore();
  const avatar = useAvatar();
  const who = { name: profile.username, avatar };
  const [phase, setPhase] = useState<Phase>('loading');
  const [d, setD] = useState<DailyDay | null>(null);
  const [online, setOnline] = useState(false);
  const [practice, setPractice] = useState(false);
  const [sending, setSending] = useState(false);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => { music(null); }, []);
  useEffect(() => {
    let alive = true;
    loadDaily(profile.age, who).then((r) => { if (!alive) return; setD(r.day); setOnline(r.online); setPhase('intro'); });
    return () => { alive = false; };
  }, [profile.age]);

  const exit = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  if (phase === 'loading' || !d) {
    return (
      <Screen scroll={false}>
        <TopBar close title={t('dl_label')} onBack={exit} />
        <Loader label={t('dl_loading')} />
      </Screen>
    );
  }

  const start = (asPractice: boolean) => { tap(); setPractice(asPractice); setRunKey((k) => k + 1); setPhase('play'); };

  if (phase === 'play') {
    return (
      <Play key={runKey} d={d} practice={practice} onQuit={() => setPhase('intro')} onDone={async (answers, sum) => {
        // a scored run that is left half way still counts (unanswered = wrong): the day has one chance
        if (practice) { setPhase('result'); return; }
        setSending(true); setPhase('result');
        let next = await submitDaily(d, answers, false, who);
        if (!next.result?.rewarded) {
          // the scored run gives the normal quiz rewards, once a day
          useStore.getState().recordQuiz({ category: 'mix', correct: sum.correct, total: sum.total, score: sum.score, wrongIds: sum.wrongIds, ids: d.questions.map((q) => q.id) });
          next = markRewarded(next);
        }
        setD(next); setSending(false);
      }} lastPractice={(s) => { lastRun.current = s; }} />
    );
  }

  // a practice run ends on the shared result screen (no XP, no ranking change)
  if (phase === 'result' && practice && lastRun.current) return <PracticeResult onAgain={() => start(true)} onDone={exit} />;

  return (
    <Screen scroll>
      <TopBar close title={t('dl_label')} sub={formatDate(`${d.day}T12:00:00`, profile.lang)} onBack={exit} />
      {d.questions.length === 0 ? (
        <EmptyState fill={false} mood="sleepy" badge="kalandriye" title={t('dl_label')} sub={t('dl_empty')} />
      ) : d.result && !(phase === 'result' && practice) ? (
        <ScoredView d={d} online={online} sending={sending} fresh={phase === 'result'} onRefresh={async () => setD(await refreshTop(d))} />
      ) : !d.result ? (
        <FadeIn><View style={{ backgroundColor: colors.blue, borderRadius: 24, padding: 20, gap: 8, borderBottomWidth: 5, borderBottomColor: '#14307D', overflow: 'hidden' }}>
          <Motif kind="drapo" opacity={0.2} height={170} />
          <T v="label" color="#E6ECFB">{t('dl_label')}</T>
          <T v="display" color="#fff">{t('dl_title', { n: d.questions.length })}</T>
          <T v="body" color="#E6ECFB">{t('dl_same', { age: t(AGE_KEY[d.age]) })}</T>
          <T v="small" color="#E6ECFB">{t('dl_rule')}</T>
          <View style={{ alignItems: 'center', marginTop: 4 }}><Mascot size={120} mood="happy" /></View>
        </View></FadeIn>
      ) : null}
      {!online && d.questions.length > 0 && !d.result ? <OfflineNote /> : null}
      <View style={{ gap: 10, marginTop: 8 }}>
        {d.questions.length > 0 && (d.result
          ? <Button title={t('dl_practice')} onPress={() => start(true)} />
          : <Button title={t('dl_start')} color={colors.green} onPress={() => start(false)} />)}
        <Button variant="secondary" title={t('done')} onPress={exit} />
      </View>
      <RankUpListener delayMs={1800} />
    </Screen>
  );
}

/** The last practice run (shown on the result screen). */
const lastRun: { current: SoloSession | null } = { current: null };

function PracticeResult({ onAgain, onDone }: { onAgain: () => void; onDone: () => void }) {
  const t = useT();
  const s = lastRun.current!;
  const sum = soloSummary(s);
  const ratio = sum.total ? sum.correct / sum.total : 0;
  const timeMs = s.answers.reduce((n, a) => n + (a.elapsedMs ?? 0), 0);
  const { items, a11y } = useStdStats({ xp: sum.score, xpLabel: t('points'), correct: sum.correct, total: sum.total, timeMs: timeMs > 0 ? timeMs : undefined });
  return (
    <ResultScreen tier={tierFor(ratio)} sub={t('rs_sub', { c: sum.correct, n: sum.total })} stats={items} statsA11y={a11y} confetti={ratio >= 0.7} rankUp={false}
      extras={<View style={{ alignItems: 'center', gap: 6 }}>
        <Pill text={t('dl_practice_tag')} color="#5C4600" bg={colors.yellowSoft} icon="pwen" />
        <T v="small" center color={colors.muted}>{t('dl_practice_note')}</T>
      </View>}
      primary={{ title: t('dl_practice'), onPress: onAgain, icon: 'repete' }} secondary={{ title: t('done'), onPress: onDone }} />
  );
}

function OfflineNote() {
  const t = useT();
  return <Card soft={colors.blueSoft} edge={colors.blueSoft}><T v="small" color={colors.blue}>{t('dl_no_rank_offline')}</T></Card>;
}

/** Today's scored result + the ranking (or why there is none). */
function ScoredView({ d, online, sending, fresh, onRefresh }: { d: DailyDay; online: boolean; sending: boolean; fresh: boolean; onRefresh: () => void }) {
  const t = useT();
  const r = d.result!;
  const ratio = r.total ? r.correct / r.total : 0;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
  const ranked = r.synced && d.allowed === true;
  const base = fresh ? 0 : -400; // less waiting when the kid only comes back to look
  const { items, a11y } = useStdStats({ xp: quizXp(r.score), correct: r.correct, total: r.total, timeMs: r.ms > 0 ? r.ms : undefined });
  return (
    <View style={{ gap: 14 }}>
      {fresh && ratio >= 0.7 && <Confetti />}
      <ResultHero tier={tierFor(ratio)} compact={!fresh} headline={fresh ? undefined : t('dl_your_score')} sub={t('rs_sub', { c: r.correct, n: r.total })} stars={stars} />
      <StatCards items={items} a11y={a11y} delay={base + 900} />
      <Pop delay={base + 1000} style={{ alignSelf: 'center' }}><CountPill value={r.score} k={`daily-${d.day}`} suffix={` ${t('points')}`} color="#5C4600" bg={colors.yellowSoft} icon="pwen" /></Pop>
      {sending ? <View style={{ gap: 10 }}><SkeletonRow /><SkeletonRow /><SkeletonRow /></View> : ranked ? (
        <Ranking d={d} delay={base + 1300} onRefresh={onRefresh} />
      ) : (
        <FadeIn delay={base + 1300}><Card soft={colors.blueSoft} edge={colors.blueSoft} style={{ gap: 4 }}>
          <T v="small" color={colors.blue}>{!online || !r.synced ? t('dl_no_rank_offline') : t('dl_no_rank_parent', { x: t('online_duels') })}</T>
        </Card></FadeIn>
      )}
      <FadeIn delay={base + 1600}><T v="small" center color={colors.muted}>{t('dl_tomorrow')}</T></FadeIn>
    </View>
  );
}

const MEDAL = ['#F5B700', '#B8C2D6', '#D9895B'];

function Ranking({ d, delay, onRefresh }: { d: DailyDay; delay: number; onRefresh: () => void }) {
  const t = useT();
  const me = d.me;
  const inTop = d.top.some((x) => x.me);
  return (
    <View style={{ gap: 10 }}>
      {me ? (
        <Pop delay={delay} style={{ alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', backgroundColor: colors.blue, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 26, borderBottomWidth: 4, borderBottomColor: '#14307D' }}>
            <T v="label" color="#E6ECFB">{t('dl_place')}</T>
            <PlaceNumber rank={me.rank} />
          </View>
        </Pop>
      ) : null}
      <FadeIn delay={delay + 200}><Row style={{ justifyContent: 'space-between' }}>
        <T v="h2">{t('dl_top')}</T>
        <IconButton icon="chanje" label={t('pl_refresh')} onPress={onRefresh} />
      </Row></FadeIn>
      {d.top.length === 1 && d.top[0].me ? <FadeIn delay={delay + 300}><T v="small" color={colors.muted}>{t('dl_first')}</T></FadeIn> : null}
      {d.top.map((row, i) => <RankRow key={`${row.rank}-${row.name}`} row={row} delay={delay + 350 + i * 90} />)}
      {me && !inTop ? (
        <>
          <T v="h3" center color={colors.muted}>⋯</T>
          <RankRow row={me} delay={delay + 350 + d.top.length * 90} />
        </>
      ) : null}
    </View>
  );
}

function PlaceNumber({ rank }: { rank: number }) {
  const n = useCountUp(rank, `place-${rank}`, 900);
  return <T v="display" color="#fff">#{Math.max(1, n)}</T>;
}

/** Another kid's avatar comes from the server: keep only values the drawing knows (else one made from the name). */
function safeAvatar(v: unknown, seed: string): AvatarConfig {
  const base = avatarFromSeed(seed);
  if (!v || typeof v !== 'object') return base;
  const o = v as Record<string, unknown>;
  const n = (k: keyof AvatarConfig) => (typeof o[k] === 'number' && Number.isInteger(o[k]) && (o[k] as number) >= 0 && (o[k] as number) < 32 ? (o[k] as number) : (base[k] as number));
  return {
    skin: n('skin'), hairColor: n('hairColor'), shirt: n('shirt'), bg: n('bg'),
    hair: HAIRS.includes(o.hair as never) ? (o.hair as AvatarConfig['hair']) : base.hair,
    extra: EXTRAS.includes(o.extra as never) ? (o.extra as AvatarConfig['extra']) : base.extra,
    ...(typeof o.frame === 'number' && Number.isInteger(o.frame) && o.frame >= 0 && o.frame < 8 ? { frame: o.frame } : {}),
  };
}

/** One line of the ranking: place, avatar, kid-safe username, score. Nothing else about the kid. */
function RankRow({ row, delay }: { row: DailyRow; delay: number }) {
  const t = useT();
  const medal = row.rank <= 3 ? MEDAL[row.rank - 1] : null;
  const a = safeAvatar(row.avatar, row.name);
  return (
    <FadeIn delay={delay} x={row.me ? -24 : 24} from={0}>
      <Card edge={row.me ? colors.blue : undefined} soft={row.me ? colors.blueSoft : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: medal ?? colors.line }}>
          <T v="bold" color={medal ? '#3A2A00' : colors.ink}>{row.rank}</T>
        </View>
        <Avatar a={a} size={40} />
        <View style={{ flex: 1 }}>
          <T v="bold" numberOfLines={1}>{row.name}{row.me ? ` (${t('dl_you')})` : ''}</T>
          <Progress value={row.total ? row.correct / row.total : 0} color={row.me ? colors.blue : colors.green} height={6} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T v="bold" color={colors.blue}>{row.correct}/{row.total}</T>
          <T v="small" color={colors.muted}>{row.score} {t('points')}</T>
        </View>
      </Card>
    </FadeIn>
  );
}

/** One run of the day's questions (scored or practice). Same feel as a quiz: clock, feedback card, quit sheet. */
function Play({ d, practice, onQuit, onDone, lastPractice }: {
  d: DailyDay; practice: boolean; onQuit: () => void;
  onDone: (answers: { i: number | null; ms: number }[], sum: ReturnType<typeof soloSummary>) => void; lastPractice: (s: SoloSession) => void;
}) {
  const t = useT(); const l = useL();
  const { profile, settings } = useStore();
  const [s, setS] = useState<SoloSession>(() => startSolo(d.questions, Date.now()));
  const [chosen, setChosen] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [quitting, setQuitting] = useState(false);
  const done = useRef(false);
  const timeMs = questionTimeMs(profile.age);
  const clock = useQuestionClock({ timeMs, key: `${s.startedAt}-${s.index}`, running: !s.finished && !reveal, paused: quitting, onTimeout: () => pick(null) });
  const leave = useQuitGuard(!s.finished || reveal, () => setQuitting(true));
  const q = s.questions[s.index];

  useEffect(() => { if (q && settings.voice && profile.age === '6-8') speak(l(q.prompt), profile.lang); }, [s.index]);

  function pick(i: number | null) {
    if (reveal) return;
    setChosen(i); setReveal(true);
    const next = answerSolo(s, i, scoredNow(s, clock.elapsed(), timeMs));
    tap(next.answers[next.answers.length - 1].correct ? 'success' : 'error');
    sfx(answerSfx(next.answers.map((x) => x.correct), i === null));
    setS(next);
  }
  function go() {
    setChosen(null); setReveal(false);
    if (s.finished && !done.current) {
      done.current = true;
      const sum = soloSummary(s);
      sfx(sum.total && sum.correct / sum.total >= 0.5 ? 'level' : 'lose');
      if (practice) lastPractice(s);
      leave(() => onDone(s.answers.map((a) => ({ i: a.chosen, ms: a.elapsedMs })), sum));
    }
  }

  const last = s.answers[s.answers.length - 1];
  const shown = reveal ? s.questions[s.index - 1] ?? q : q;
  if (!shown) return <Screen><T>…</T></Screen>;
  const streak = trailingStreak(s.answers.map((a) => a.correct));
  return (
    <Screen scroll bottom={reveal && last ? (
      <AnswerFeedbackSheet key={s.index} seed={`${s.startedAt}-${s.index}`} correct={last.correct} timedOut={chosen === null} points={last.points} streak={streak}
        answer={l(shown.options[shown.answer])} explain={shown.explain ? l(shown.explain) : undefined} onContinue={go} />
    ) : undefined}>
      <TopBar close title={t('dl_title', { n: s.questions.length })} sub={`${t('question')} ${s.index + (reveal ? 0 : 1)} / ${s.questions.length}`} onBack={() => setQuitting(true)}
        right={practice ? <Pill text={t('dl_practice_tag')} color="#5C4600" bg={colors.yellowSoft} /> : <CountPill value={s.score} k={`dscore-${s.startedAt}`} icon="pwen" color="#5C4600" bg={colors.yellowSoft} />} />
      <View style={{ gap: 2 }}>
        <StreakLabel n={streak} />
        <Progress value={s.index / s.questions.length} color={colors.green} height={14} />
      </View>
      <Row style={{ opacity: reveal ? 0.35 : 1 }}>
        <Progress style={{ flex: 1 }} linear value={clock.left / timeMs} color={clock.left < 4000 ? colors.red : colors.yellowDark} height={8} />
        <T v="small" color={colors.muted} style={{ width: 32, textAlign: 'right' }}>{Math.ceil(clock.left / 1000)} s</T>
      </Row>
      <SlideSwap id={reveal ? s.index - 1 : s.index}>
        <QuestionView q={shown} chosen={chosen} reveal={reveal} onPick={pick} />
      </SlideSwap>
      <Sheet open={quitting} title={t('quit_q')} onClose={() => setQuitting(false)}>
        {!practice && s.answers.length > 0 && <T v="small" center color={colors.muted}>{t('dl_quit_scored')}</T>}
        <Button title={t('stay')} onPress={() => setQuitting(false)} />
        <Button variant="secondary" color={colors.red} title={t('quit')} onPress={() => {
          setQuitting(false);
          if (practice || done.current || s.answers.length === 0) { leave(onQuit); return; } // nothing answered yet: no attempt used
          done.current = true;
          const sum = soloSummary(s);
          leave(() => onDone(s.answers.map((a) => ({ i: a.chosen, ms: a.elapsedMs })), { ...sum, total: s.questions.length, wrongIds: [...sum.wrongIds, ...s.questions.slice(s.answers.length).map((x) => x.id)] }));
        }} />
      </Sheet>
    </Screen>
  );
}
