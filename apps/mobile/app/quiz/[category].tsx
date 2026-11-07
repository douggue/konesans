import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { startSolo, answerSolo, soloSummary, quizXp, generateCountryQuiz, peyiIso, REGION_LABEL, type SoloSession, type CountryQuizOptions } from '@konesans/core';
import { Screen, T, Button, Card, Row, Progress, Sheet, Mascot, TopBar, Pill, CountPill, Stars, FadeIn, Pop, Drop, SlideSwap, Confetti, Bounce, useCountUp } from '@/ui';
import { QuestionView } from '@/ui/QuestionView';
import { RankUpListener } from '@/ui/RankUp';
import { useQuitGuard, useQuestionClock, questionTimeMs, scoredNow, onboardingResume } from '@/ui/activity';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';
import { buildQuestions, categoryInfo, type CatId } from '@/lib/content';
import { usePrefs } from '@/lib/prefs';
import { useDailyCount } from '@/lib/remote';
import { speak, tap, sfx, music, answerSfx } from '@/lib/audio';

export default function Quiz() {
  const { category, count: countParam, trial, mode, level, region } = useLocalSearchParams<{ category: string; count?: string; trial?: string; mode?: string; level?: string; region?: string }>();
  const peyiOpts: CountryQuizOptions | null = category === 'peyi' && mode ? { mode: mode as CountryQuizOptions['mode'], level: Number(level ?? 1) as CountryQuizOptions['level'], region: (region ?? 'mond') as CountryQuizOptions['region'] } : null;
  const cat = (category ?? 'mix') as CatId | 'mix';
  const daily = useDailyCount();
  const count = Number(countParam ?? (category === 'mix' ? daily : 10));
  const t = useT(); const l = useL();
  const { profile, seen, recordQuiz, settings } = useStore();
  // Peyi: never the same country twice in a game; countries from the last games come last
  const build = (seed: number) => {
    // the daily mix is the same for everyone; categories follow the kid's chosen difficulty
    if (!peyiOpts) return buildQuestions(cat, profile.age, count, seed, useStore.getState().seen, cat === 'mix' ? undefined : usePrefs.getState().difficulty);
    const qs = generateCountryQuiz(peyiOpts, profile.age, count, seed, useStore.getState().recentPeyi);
    const isos = qs.map((x) => peyiIso(x.id)).filter((x): x is string => !!x);
    setTimeout(() => useStore.getState().notePeyi(isos), 0); // after render, not during it
    return qs;
  };
  const questions = useMemo(() => build(Date.now() % 1e9), [cat, profile.age, count, mode, level, region]);
  const [s, setS] = useState<SoloSession>(() => startSolo(questions, Date.now()));
  const [chosen, setChosen] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [quitting, setQuitting] = useState(false);
  const timeMs = questionTimeMs(profile.age);
  // the clock pauses behind the quit sheet and freezes during the feedback
  const clock = useQuestionClock({ timeMs, key: `${s.startedAt}-${s.index}`, running: !s.finished && !reveal, paused: quitting, onTimeout: () => pick(null) });
  const left = clock.left;
  // Android back / browser back → the same "Ou vle kite?" sheet as the ✕
  const leave = useQuitGuard(!s.finished || reveal, () => setQuitting(true));
  const back = () => leave(() => (router.canGoBack() ? router.back() : router.replace(trial ? '/onboarding' : '/home')));
  const q = s.questions[s.index];
  const title = trial ? t('trial_title') : cat === 'mix' ? t('daily_title') : peyiOpts ? `${t(`peyi_mode_${peyiOpts.mode}`)} · ${REGION_LABEL[peyiOpts.region][profile.lang]}` : categoryInfo(cat)[profile.lang];

  useEffect(() => { if (q && settings.voice && profile.age === '6-8') speak(l(q.prompt), profile.lang); }, [s.index]);
  useEffect(() => { music(null); }, []);

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
  }
  function finish() {
    const sum = soloSummary(s);
    sfx(sum.total && sum.correct / sum.total >= 0.5 ? 'level' : 'lose');
    if (!trial) setTimeout(() => sfx('coin'), 1150); // when the points pill pops
    if (!trial) recordQuiz({ category: cat, correct: sum.correct, total: sum.total, score: sum.score, wrongIds: sum.wrongIds, ids: s.questions.map((x) => x.id) });
  }
  useEffect(() => { if (s.finished && !reveal) finish(); }, [s.finished, reveal]);

  if (!q && !s.finished) return <Screen><T>…</T></Screen>;

  // ─── result ───
  if (s.finished && !reveal) {
    const sum = soloSummary(s);
    const ratio = sum.total ? sum.correct / sum.total : 0;
    const good = ratio >= 0.7;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
    return (
      <Screen scroll={false}>
        {good && <Confetti />}
        {!trial && <RankUpListener delayMs={2200} />}
        <View style={{ alignItems: 'center', gap: 10, marginTop: 'auto' }}>
          <Drop><Mascot size={150} mood={good ? 'cheer' : 'happy'} /></Drop>
          <FadeIn delay={500}><T v="display" center>{t('result')}</T></FadeIn>
          <Stars n={stars} size={44} pop />
          <FadeIn delay={900}><ResultLine correct={sum.correct} total={sum.total} label={t('correct_of')} /></FadeIn>
          {/* the trial records nothing, so it shows no XP */}
          <Pop delay={1150}><CountPill value={sum.score} k={`quiz-${s.startedAt}`} suffix={trial ? ` ${t('points')}` : ` ${t('points')}  ·  +${quizXp(sum.score)} XP`} color="#5C4600" bg={colors.yellowSoft} icon="pwen" /></Pop>
          {trial ? <FadeIn delay={1300}><T v="small" center color={colors.muted}>{t('trial_note')}</T></FadeIn> : null}
        </View>
        <View style={{ marginTop: 'auto', gap: 10 }}>
          {trial ? (
            <Button title={t('start')} color={colors.green} onPress={() => { onboardingResume.step = 1; if (router.canGoBack()) router.back(); else router.replace('/onboarding?step=1'); }} />
          ) : (
            <>
              <Button title={t('again')} onPress={() => setS(startSolo(build(Date.now() % 1e9), Date.now()))} />
              {/* back to where the quiz was started (Defi, Peyi, Lakay…) */}
              <Button variant="secondary" title={t('done')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
            </>
          )}
        </View>
      </Screen>
    );
  }

  const last = s.answers[s.answers.length - 1];
  return (
    <Screen scroll={true}>
      <TopBar close title={title} sub={`${t('question')} ${s.index + (reveal ? 0 : 1)} / ${s.questions.length}`} onBack={() => setQuitting(true)}
        right={<CountPill value={s.score} k={`score-${s.startedAt}`} icon="pwen" color="#5C4600" bg={colors.yellowSoft} />} />
      {/* frozen (and faded) while the feedback shows */}
      <Row style={{ opacity: reveal ? 0.35 : 1 }}>
        <Progress style={{ flex: 1 }} linear value={left / timeMs} color={left < 4000 ? colors.red : colors.yellowDark} />
        <T v="small" color={colors.muted} style={{ width: 32, textAlign: 'right' }}>{Math.ceil(left / 1000)} s</T>
      </Row>
      <Progress value={s.index / s.questions.length} color={colors.blueLight} height={6} />
      <SlideSwap id={reveal ? s.index - 1 : s.index}>
        <QuestionView q={reveal ? s.questions[s.index - 1] ?? q : q} chosen={chosen} reveal={reveal} onPick={pick} />
      </SlideSwap>
      {reveal && last && (
        <FadeIn from={40} duration={320}><Card edge={last.correct ? colors.green : colors.red} soft={last.correct ? colors.greenSoft : colors.redSoft} style={{ gap: 4 }}>
          <T v="h3" color={last.correct ? '#12632F' : '#8F0A22'}>{last.correct ? t('correct') : chosen === null ? t('timeout') : t('wrong')} {last.correct ? `+${last.points}` : ''}</T>
          {(() => { const qq = s.questions[s.index - 1] ?? q; return (
            <>
              {!last.correct && <T v="body">{t('answer_was')} <T v="bold">{l(qq.options[qq.answer])}</T></T>}
              {qq.explain && <T v="small" color={colors.muted}>{l(qq.explain)}</T>}
            </>
          ); })()}
          <Button small title={t('continue')} color={last.correct ? colors.green : colors.blue} onPress={go} style={{ marginTop: 6 }} />
        </Card></FadeIn>
      )}
      <Sheet open={quitting} title={t('quit_q')} onClose={() => setQuitting(false)}>
        <T v="small" center color={colors.muted}>{t('quit_paused')}</T>
        <Button title={t('stay')} onPress={() => setQuitting(false)} />
        <Button variant="secondary" color={colors.red} title={t('quit')} onPress={() => { setQuitting(false); back(); }} />
      </Sheet>
    </Screen>
  );
}

function ResultLine({ correct, total, label }: { correct: number; total: number; label: string }) {
  const n = useCountUp(correct, undefined, 600);
  return <T v="h1" center color={colors.blue}>{n} {label} {total}</T>;
}
