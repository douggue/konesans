import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LESSON_PASS_STARS, startLesson, answerLesson, finishLesson, currentExercise, lessonProgressPct, UNITS, type CourseId, type Exercise, type LessonSession, type Response, type Grade } from '@konesans/core';
import { Screen, T, Button, Card, Row, Progress, Sheet, Icon, OptionButton, Pill, PressScale, SlideSwap, Pop, Shake, Bounce } from '@/ui';
import { AnswerFeedbackSheet, ActionFooter, StreakLabel, trailingStreak } from '@/ui/feedback';
import { ResultScreen, tierFor, useStdStats } from '@/ui/ResultScreen';
import { Illustration, hasIllustration } from '@/ui/Illustration';
import { colors, radius } from '@/lib/theme';
import { useStore, LESSON_RESUME_KEY } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';
import { speak, tap, sfx, music, answerSfx } from '@/lib/audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuitGuard } from '@/ui/activity';

/** The lesson in progress is saved after every answer, so back / the OS closing the app never loses it. */
const RESUME_KEY = LESSON_RESUME_KEY; // also cleared by "Rekòmanse a zewo" (store.resetAll)
type Snap = Omit<LessonSession, 'requeued'> & { requeued: string[] };
const saveSnap = (s: LessonSession) => AsyncStorage.setItem(RESUME_KEY, JSON.stringify({ ...s, requeued: [...s.requeued] } satisfies Snap)).catch(() => {});
const clearSnap = () => AsyncStorage.removeItem(RESUME_KEY).catch(() => {});

const TITLE: Record<Exercise['kind'], 'ex_pick_meaning' | 'ex_pick_word' | 'ex_listen' | 'ex_match' | 'ex_translate' | 'ex_build' | 'ex_fill'> = {
  pick_meaning: 'ex_pick_meaning', pick_word: 'ex_pick_word', listen_pick: 'ex_listen', match_pairs: 'ex_match', translate_pick: 'ex_translate', build_sentence: 'ex_build', fill_blank: 'ex_fill',
};

export default function Lesson() {
  const { lang, lesson } = useLocalSearchParams<{ lang: CourseId; lesson: string }>();
  const t = useT();
  const { profile, recordLessonDone } = useStore();
  const fr = profile.lang === 'fr';
  const title = useMemo(() => { const d = UNITS.flatMap((u) => u.lessons).find((x) => x.id === lesson); return d ? (fr ? d.titleFr : d.title) : ''; }, [lesson, fr]);
  const [s, setS] = useState<LessonSession>(() => startLesson(lang!, lesson!, profile.age));
  const [resp, setResp] = useState<Response | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [done, setDone] = useState(false);
  const [quitting, setQuitting] = useState(false);
  const results = useRef<boolean[]>([]);
  const [resumed, setResumed] = useState(false);
  const recorded = useRef(false);
  const sittingStart = useRef(Date.now()); // the result's "Tan": this sitting only (a resumed lesson may have started days ago)
  useEffect(() => { music(null); }, []);
  // pick up where the kid left this lesson (same lesson, same age band, not finished)
  useEffect(() => {
    AsyncStorage.getItem(RESUME_KEY).then((v) => {
      if (!v) return;
      const snap = JSON.parse(v) as Snap;
      if (snap.lang !== lang || snap.lessonId !== lesson || snap.age !== profile.age || !snap.queue?.[snap.i]) return;
      setS((cur) => (cur.i === 0 ? { ...snap, requeued: new Set(snap.requeued) } : cur));
      setResumed(true);
    }).catch(() => {});
  }, []);
  useEffect(() => { if (s.i > 0 && !done) saveSnap(s); }, [s.i]);
  // the lesson counts the moment it is finished (not on the result screen's button)
  useEffect(() => {
    if (!done || recorded.current) return;
    recorded.current = true;
    recordLessonDone(lang!, lesson!, finishLesson(s));
    clearSnap();
  }, [done]);
  const leave = useQuitGuard(!done, () => setQuitting(true));
  // while feedback is showing, the session has already advanced: keep the exercise that was just answered on screen
  const ex = grade ? s.queue[s.i - 1] : currentExercise(s);

  useEffect(() => { if (ex && (ex.kind === 'listen_pick' || ex.kind === 'pick_meaning' || ex.kind === 'translate_pick')) speak(ex.kind === 'listen_pick' ? ex.audio : ex.prompt.audio); }, [s.i]);

  const ready = resp !== null && (!Array.isArray(resp) || (ex?.kind === 'match_pairs' ? resp.length === ex.pairs.length && resp.every((x) => x >= 0) : resp.length > 0));

  function check() {
    if (!ex || resp === null) return;
    const r = answerLesson(s, resp);
    tap(r.grade.correct ? 'success' : 'error');
    results.current.push(r.grade.correct);
    sfx(answerSfx(results.current));
    setGrade(r.grade); setS(r.session); if (r.done) setDone(true);
  }
  function next() { setGrade(null); setResp(null); }

  if (done && !grade) {
    const r = finishLesson(s);
    return <LessonResult r={r} timeMs={Date.now() - sittingStart.current} onDone={() => router.replace('/course')} onRetry={() => {
      clearSnap(); results.current = []; recorded.current = false; setResumed(false);
      sittingStart.current = Date.now();
      setS(startLesson(lang!, lesson!, profile.age)); setGrade(null); setResp(null); setDone(false);
    }} />;
  }
  if (!ex) return null;

  const streak = trailingStreak(results.current);
  const expected = grade ? (fr ? grade.expectedFr ?? grade.expected : grade.expected) : '';
  return (
    <Screen bottom={grade ? (
      <AnswerFeedbackSheet key={s.i} seed={`${s.startedAt}-${s.i}`} correct={grade.correct} answer={expected} streak={streak} onContinue={next} />
    ) : (
      <ActionFooter><Button title={t('check')} color={colors.green} disabled={!ready} onPress={check} /></ActionFooter>
    )}>
      <Row gap={10} center={false}>
        <PressScale debounceMs={0} role="button" accessibilityLabel={t('lesson_quit_label')} onPress={() => setQuitting(true)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><Icon name="femen" size={22} /></PressScale>
        <View style={{ flex: 1, gap: 2, justifyContent: 'flex-end', minHeight: 44, paddingBottom: 7 }}>
          <StreakLabel n={streak} />
          <Progress value={lessonProgressPct(s) / 100} color={colors.green} height={14} />
        </View>
      </Row>
      <Row gap={8}><T v="small" color={colors.muted} style={{ flexShrink: 1 }}>{title}</T>{resumed ? <Pill text={t('lesson_resume')} color={colors.blue} bg={colors.blueSoft} /> : null}</Row>
      <SlideSwap id={grade ? s.i - 1 : s.i} style={{ gap: 14 }}>
        <T v="h1">{t(TITLE[ex.kind])}</T>
        <ExerciseView ex={ex} resp={resp} setResp={grade ? () => {} : setResp} reveal={!!grade} />
      </SlideSwap>
      <Sheet open={quitting} title={t('quit_q')} onClose={() => setQuitting(false)}>
        {s.i > 0 ? <T v="small" center color={colors.muted}>{t('quit_lesson_saved')}</T> : null}
        <Button title={t('stay')} onPress={() => setQuitting(false)} />
        <Button variant="secondary" color={colors.red} title={t('quit')} onPress={() => { setQuitting(false); leave(() => (router.canGoBack() ? router.back() : router.replace('/course'))); }} />
      </Sheet>
    </Screen>
  );
}

function Speaker({ audio, big }: { audio: string; big?: boolean }) {
  const t = useT();
  return (
    <PressScale debounceMs={0} role="button" accessibilityLabel={t('listen')} onPress={() => speak(audio)} style={{ width: big ? 88 : 44, height: big ? 88 : 44, borderRadius: big ? 28 : 14, backgroundColor: colors.blueLight, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderBottomWidth: big ? 6 : 2 }}>
      <Icon name="koute" size={big ? 48 : 26} />
    </PressScale>
  );
}

/** A 2-column picture answer (our drawings), with the word underneath. Same states as OptionButton. */
function PictureOption({ img, label, state, onPress }: { img: string; label: string; state: 'idle' | 'picked' | 'right' | 'wrong' | 'dim'; onPress: () => void }) {
  const m = {
    idle: { bg: colors.card, edge: colors.line, fg: colors.ink }, picked: { bg: colors.blueSoft, edge: colors.blue, fg: colors.blue },
    right: { bg: colors.greenSoft, edge: colors.green, fg: '#12632F' }, wrong: { bg: colors.redSoft, edge: colors.red, fg: '#8F0A22' },
    dim: { bg: colors.card, edge: colors.line, fg: colors.muted },
  }[state];
  return (
    <View style={{ width: '48%' }}>
      <Shake trigger={state === 'wrong' ? 'wrong' : null}><Bounce trigger={state === 'right' ? 'right' : null} amount={0.06}>
        <PressScale role="button" accessibilityLabel={label} scaleTo={0.95} onPress={() => { tap(); onPress(); }}
          style={{ backgroundColor: m.bg, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: m.edge, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 6, opacity: state === 'dim' ? 0.6 : 1 }}>
          <Illustration id={img} size={88} />
          <T v="h3" color={m.fg} center numberOfLines={2}>{label}</T>
        </PressScale>
      </Bounce></Shake>
    </View>
  );
}

function ExerciseView({ ex, resp, setResp, reveal }: { ex: Exercise; resp: Response | null; setResp: (r: Response) => void; reveal: boolean }) {
  const l = useL();
  const idx = typeof resp === 'number' ? resp : null;
  const st = (i: number, answer: number): 'idle' | 'picked' | 'right' | 'wrong' | 'dim' => (!reveal ? (idx === i ? 'picked' : 'idle') : i === answer ? 'right' : idx === i ? 'wrong' : 'dim');

  switch (ex.kind) {
    case 'pick_meaning':
      return (
        <View style={{ gap: 12 }}>
          <Row><Speaker audio={ex.prompt.audio} /><T v="display" style={{ flex: 1 }}>{ex.prompt.target}</T></Row>
          {ex.options.every((o) => hasIllustration(o.img))
            ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>{ex.options.map((o, i) => <PictureOption key={i} img={o.img!} label={l(o)} state={st(i, ex.answer)} onPress={() => setResp(i)} />)}</View>
            : <View style={{ gap: 10 }}>{ex.options.map((o, i) => <OptionButton key={i} label={l(o)} media={hasIllustration(o.img) ? <Illustration id={o.img} size={40} /> : undefined} state={st(i, ex.answer)} celebrate={idx === i} onPress={() => setResp(i)} />)}</View>}
        </View>
      );
    case 'pick_word':
      return (
        <View style={{ gap: 12 }}>
          {hasIllustration(ex.prompt.img) ? <Pop><View style={{ alignItems: 'center' }}><View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.line, padding: 10 }}><Illustration id={ex.prompt.img} size={132} /></View></View></Pop> : null}
          <T v="display" center={hasIllustration(ex.prompt.img)}>{l(ex.prompt)}</T>
          <View style={{ gap: 10 }}>{ex.options.map((o, i) => <OptionButton key={i} label={o.target} state={st(i, ex.answer)} celebrate={idx === i} onPress={() => { speak(o.audio); setResp(i); }} />)}</View>
        </View>
      );
    case 'listen_pick':
      return (
        <View style={{ gap: 12 }}>
          <View style={{ alignItems: 'center', paddingVertical: 10 }}><Speaker audio={ex.audio} big /></View>
          <View style={{ gap: 10 }}>{ex.options.map((o, i) => <OptionButton key={i} label={o.target} state={st(i, ex.answer)} celebrate={idx === i} onPress={() => setResp(i)} />)}</View>
        </View>
      );
    case 'translate_pick':
      return (
        <View style={{ gap: 12 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Speaker audio={ex.prompt.audio} /><T v="h2" style={{ flex: 1 }}>{ex.prompt.target}</T></Card>
          <View style={{ gap: 10 }}>{ex.options.map((o, i) => <OptionButton key={i} label={l(o)} state={st(i, ex.answer)} celebrate={idx === i} onPress={() => setResp(i)} />)}</View>
        </View>
      );
    case 'fill_blank':
      return (
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 6 }}>
            <Row><Speaker audio={ex.audio} /><T v="h2" style={{ flex: 1 }}>{typeof resp === 'number' ? ex.text.replace('____', ex.options[resp]) : ex.text}</T></Row>
            <T v="small" color={colors.muted}>{l(ex.translation)}</T>
          </Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{ex.options.map((o, i) => <View key={i} style={{ width: '47.5%' }}><OptionButton label={o} state={st(i, ex.answer)} celebrate={idx === i} onPress={() => setResp(i)} /></View>)}</View>
        </View>
      );
    case 'match_pairs': return <MatchPairs ex={ex} resp={resp} setResp={setResp} reveal={reveal} />;
    case 'build_sentence': return <BuildSentence ex={ex} resp={resp} setResp={setResp} reveal={reveal} />;
  }
}

function Tile({ label, onPress, state = 'idle', audio }: { label: string; onPress?: () => void; state?: 'idle' | 'picked' | 'right' | 'wrong' | 'dim' | 'used'; audio?: string }) {
  const map: Record<string, { bg: string; edge: string; fg: string }> = {
    idle: { bg: colors.card, edge: colors.line, fg: colors.ink }, picked: { bg: colors.blueSoft, edge: colors.blue, fg: colors.blue },
    right: { bg: colors.greenSoft, edge: colors.green, fg: '#12632F' }, wrong: { bg: colors.redSoft, edge: colors.red, fg: '#8F0A22' },
    dim: { bg: colors.card, edge: colors.line, fg: colors.muted }, used: { bg: colors.line, edge: colors.line, fg: colors.line },
  };
  const m = map[state];
  return (
    <PressScale debounceMs={0} role="button" disabled={!onPress || state === 'used'} onPress={() => { tap(); if (audio) speak(audio); onPress?.(); }} style={({ pressed }) => [{ minHeight: 48, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 2, borderColor: m.edge, borderBottomWidth: 4, backgroundColor: m.bg, justifyContent: 'center' }, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
      <T v="h3" color={m.fg}>{label}</T>
    </PressScale>
  );
}

function MatchPairs({ ex, resp, setResp, reveal }: { ex: Extract<Exercise, { kind: 'match_pairs' }>; resp: Response | null; setResp: (r: Response) => void; reveal: boolean }) {
  const l = useL();
  const pairs = (Array.isArray(resp) ? resp : []) as number[]; // pairs[i] = right index for left i (-1 = none)
  const filled = ex.left.map((_, i) => pairs[i] ?? -1);
  const [sel, setSel] = useState<number | null>(null);
  const usedRight = new Set(filled.filter((r) => r >= 0));
  const pickLeft = (i: number) => { if (filled[i] >= 0) { const n = filled.slice(); n[i] = -1; setResp(n.filter((x) => x >= 0).length ? n : []); } setSel(i); };
  const pickRight = (r: number) => { if (sel === null || usedRight.has(r)) return; const n = filled.slice(); n[sel] = r; setResp(n); setSel(null); };
  const stateL = (i: number) => (reveal ? (filled[i] === ex.pairs[i] ? 'right' : 'wrong') : sel === i ? 'picked' : filled[i] >= 0 ? 'dim' : 'idle');
  const stateR = (r: number) => { const li = filled.indexOf(r); return reveal ? (li >= 0 && ex.pairs[li] === r ? 'right' : 'wrong') : li >= 0 ? 'dim' : 'idle'; };
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, gap: 10 }}>{ex.left.map((x, i) => <Tile key={i} label={l(x)} state={stateL(i)} onPress={() => pickLeft(i)} />)}</View>
      <View style={{ flex: 1, gap: 10 }}>{ex.right.map((r, i) => <Tile key={i} label={r.target} audio={r.audio} state={stateR(i)} onPress={() => pickRight(i)} />)}</View>
    </View>
  );
}

function BuildSentence({ ex, resp, setResp, reveal }: { ex: Extract<Exercise, { kind: 'build_sentence' }>; resp: Response | null; setResp: (r: Response) => void; reveal: boolean }) {
  const l = useL(); const t = useT();
  const picked = (Array.isArray(resp) ? resp : []) as number[];
  const ok = reveal && picked.map((i) => ex.tiles[i]).join(' ') === ex.answer.map((i) => ex.tiles[i]).join(' ');
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 4 }}><T v="small" color={colors.muted}>{t('in_my_lang')}</T><T v="h2">{l(ex.prompt)}</T></Card>
      <View style={{ minHeight: 64, borderBottomWidth: 2, borderBottomColor: colors.line, flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 }}>
        {picked.map((ti, k) => <Tile key={k} label={ex.tiles[ti]} state={reveal ? (ok ? 'right' : 'wrong') : 'picked'} onPress={reveal ? undefined : () => setResp(picked.filter((_, j) => j !== k))} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ex.tiles.map((w, i) => <Tile key={i} label={w} state={picked.includes(i) ? 'used' : 'idle'} onPress={reveal ? undefined : () => setResp([...picked, i])} />)}
      </View>
    </View>
  );
}

function LessonResult({ r, timeMs, onDone, onRetry }: { r: ReturnType<typeof finishLesson>; timeMs: number; onDone: () => void; onRetry: () => void }) {
  const t = useT();
  // 1 star: not passed — the next lesson stays locked until this one gets 2 stars (LESSON_PASS_STARS)
  const passed = r.stars >= LESSON_PASS_STARS;
  useEffect(() => { sfx(r.stars >= LESSON_PASS_STARS ? 'level' : 'draw'); const k = setTimeout(() => sfx('coin'), 1200); return () => clearTimeout(k); }, []);
  const ratio = r.total ? r.firstTryCorrect / r.total : 0;
  const { items, a11y } = useStdStats({ xp: r.xp, correct: r.firstTryCorrect, total: r.total, timeMs });
  const tier = r.perfect ? 'perfect' : passed ? (tierFor(ratio) === 'low' ? 'good' : tierFor(ratio)) : 'low';
  return (
    <ResultScreen tier={tier} mood={r.perfect ? 'cheer' : passed ? undefined : 'think'} stars={r.stars} stats={items} statsA11y={a11y} confetti={r.stars >= 2}
      headline={passed ? (r.perfect ? undefined : t('lesson_done')) : t('lesson_retry_title')}
      sub={r.perfect ? t('perfect') : `${r.firstTryCorrect} / ${r.total} ${t('first_try')}`}
      extras={<>
        {!passed && <T v="body" center color={colors.muted}>{t('lesson_retry_sub')}</T>}
        <Pop delay={1200}><Pill text={t('pf_coins_chip', { n: r.coins }).replace(/^/, '+')} color="#5C4600" bg={colors.yellowSoft} icon="kob" /></Pop>
      </>}
      primary={passed ? { title: t('continue'), color: colors.green, onPress: onDone } : { title: t('lesson_retry_btn'), color: colors.orange, icon: 'chanje', onPress: onRetry }}
      secondary={passed ? undefined : { title: t('continue'), onPress: onDone }} />
  );
}
