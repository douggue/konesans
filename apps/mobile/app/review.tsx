/**
 * "Revize erè m" — today's mistakes come back (up to 10), same quiz screen + feedback, no clock (it's practice).
 * A question leaves the list after two right answers on different days (core progress/srs.ts).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { startSolo, answerSolo, soloSummary, type SoloSession } from '@konesans/core';
import { Screen, T, Button, Progress, Sheet, TopBar, Mascot, Pill, SlideSwap, Pop, FadeIn } from '@/ui';
import { QuestionView } from '@/ui/QuestionView';
import { AnswerFeedbackSheet, StreakLabel, trailingStreak } from '@/ui/feedback';
import { ResultScreen, tierFor, useStdStats } from '@/ui/ResultScreen';
import { useQuitGuard } from '@/ui/activity';
import { colors } from '@/lib/theme';
import { categoryInfo } from '@/lib/content';
import { useStore } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';
import { buildReviewSession } from '@/lib/review';
import { speak, tap, sfx, music, answerSfx } from '@/lib/audio';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

export default function Review() {
  const t = useT(); const l = useL();
  const { profile, settings } = useStore();
  const questions = useMemo(() => buildReviewSession(), []);
  const [s, setS] = useState<SoloSession>(() => startSolo(questions, Date.now()));
  const [chosen, setChosen] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [quitting, setQuitting] = useState(false);
  const [result, setResult] = useState<{ mastered: number; xp: number; again: number } | null>(null);
  const saved = useRef(false);
  const leave = useQuitGuard(!s.finished || reveal, () => setQuitting(true));
  const q = s.questions[s.index];

  useEffect(() => { music(null); }, []);
  useEffect(() => { if (q && settings.voice && profile.age === '6-8') speak(l(q.prompt), profile.lang); }, [s.index]);

  /** Record what was answered (all of it, or the part done before quitting). */
  const save = (sess: SoloSession) => {
    if (saved.current || !sess.answers.length) return null;
    saved.current = true;
    const answers = sess.answers.map((a, i) => ({ id: sess.questions[i].id, correct: a.correct }));
    const r = useStore.getState().recordReview(answers);
    return { mastered: r.mastered, xp: r.xp, again: answers.filter((a) => !a.correct).length };
  };

  function pick(i: number | null) {
    if (reveal || !q) return;
    setChosen(i); setReveal(true);
    // no clock here: the answer is scored as given right away (practice, not speed)
    const next = answerSolo(s, i, s.questionStartedAt);
    const ok = next.answers[next.answers.length - 1].correct;
    tap(ok ? 'success' : 'error');
    sfx(answerSfx(next.answers.map((x) => x.correct), false));
    setS(next);
  }
  useEffect(() => {
    if (!s.finished || reveal || result) return;
    const r = save(s);
    if (r) { setResult(r); sfx(r.mastered > 0 || s.answers.every((a) => a.correct) ? 'level' : 'correct'); setTimeout(() => sfx('coin'), 1150); }
  }, [s.finished, reveal]);

  // ─── nothing due ───
  if (!questions.length) {
    return (
      <Screen scroll={false}>
        <TopBar close title={t('rv_title')} onBack={goBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Pop><Mascot size={140} mood="cool" /></Pop>
          <T v="h1" center>{t('rv_none_title')}</T>
          <T v="body" center color={colors.muted}>{t('rv_none_sub')}</T>
        </View>
        <Button title={t('done')} onPress={goBack} />
      </Screen>
    );
  }

  // ─── result ───
  if (s.finished && !reveal && result) return <ReviewResult s={s} r={result} />;
  const last = s.answers[s.answers.length - 1];
  const shownQ = reveal ? s.questions[s.index - 1] ?? q : q;
  if (!shownQ) return <Screen><T>…</T></Screen>; // finished: the result is being saved
  const streak = trailingStreak(s.answers.map((a) => a.correct));
  const cat = shownQ ? categoryInfo(shownQ.category) : undefined;
  return (
    <Screen scroll bottom={reveal && last ? (
      <AnswerFeedbackSheet key={s.index} seed={`rv-${s.startedAt}-${s.index}`} correct={last.correct} streak={streak}
        answer={l(shownQ.options[shownQ.answer])} explain={shownQ.explain ? l(shownQ.explain) : undefined}
        onContinue={() => { setChosen(null); setReveal(false); }} />
    ) : undefined}>
      <TopBar close title={t('rv_title')} sub={`${t('question')} ${s.index + (reveal ? 0 : 1)} / ${s.questions.length}`} onBack={() => setQuitting(true)} />
      <View style={{ gap: 2 }}>
        <StreakLabel n={streak} />
        <Progress value={s.index / s.questions.length} color="#C99400" height={14} />
      </View>
      <FadeIn key={`tag-${shownQ.id}`}><View style={{ alignSelf: 'flex-start' }}>
        <Pill text={shownQ.topic?.startsWith('kou:') ? t('rv_from_lesson') : cat ? cat[profile.lang] : t('rv_title')} color={colors.ink} bg={cat?.soft ?? colors.yellowSoft} />
      </View></FadeIn>
      <SlideSwap id={reveal ? s.index - 1 : s.index}>
        <QuestionView q={shownQ} chosen={chosen} reveal={reveal} onPick={pick} />
      </SlideSwap>
      <Sheet open={quitting} title={t('quit_q')} onClose={() => setQuitting(false)}>
        <T v="small" center color={colors.muted}>{t('rv_quit_note')}</T>
        <Button title={t('stay')} onPress={() => setQuitting(false)} />
        <Button variant="secondary" color={colors.red} title={t('quit')} onPress={() => { setQuitting(false); save(s); leave(goBack); }} />
      </Sheet>
    </Screen>
  );
}

function ReviewResult({ s, r }: { s: SoloSession; r: { mastered: number; xp: number; again: number } }) {
  const t = useT();
  const sum = soloSummary(s);
  const ratio = sum.total ? sum.correct / sum.total : 0;
  const { items, a11y } = useStdStats({ xp: r.xp, correct: sum.correct, total: sum.total,
    third: { label: t('rv_mastered_label'), value: r.mastered, icon: 'twofe', color: '#C99400', ink: '#5C4600' } });
  const kept = sum.correct - r.mastered; // right today, comes back in 3 days for its last check
  return (
    <ResultScreen tier={tierFor(ratio)} sub={t('rv_sub', { c: sum.correct, n: sum.total })} stats={items} statsA11y={a11y} confetti={r.mastered > 0}
      headline={r.mastered > 0 ? t(r.mastered === 1 ? 'rv_mastered_one' : 'rv_mastered_n', { n: r.mastered }) : undefined}
      extras={<View style={{ gap: 8, alignItems: 'center' }}>
        {kept > 0 ? <T v="small" center color={colors.muted}>{t('rv_kept', { n: kept })}</T> : null}
        {r.again > 0 ? <T v="small" center color={colors.muted}>{t('rv_again', { n: r.again })}</T> : null}
      </View>}
      primary={{ title: t('done'), onPress: goBack }} />
  );
}
