import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  startSolo, answerSolo, soloSummary, pickDepartmentRun, departmentById, isUnlocked, pointsMultiplier, runStars,
  VWAYAJ_PASS, VWAYAJ_CLEAR_XP, DEPARTMENTS, type SoloSession, type DepartmentId, type VwayajRunResult,
} from '@konesans/core';
import { Screen, T, Button, Card, Row, Progress, Sheet, Mascot, TopBar, Pill, CountPill, Stars, FadeIn, Pop, Drop, SlideSwap, Confetti, Hop, Icon, useCountUp, type MascotMood } from '@/ui';
import { QuestionView } from '@/ui/QuestionView';
import { useQuitGuard, useQuestionClock, questionTimeMs, scoredNow } from '@/ui/activity';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';
import { useVwayaj, vwayajToday } from '@/lib/vwayaj';
import { speak, tap, sfx, music, answerSfx } from '@/lib/audio';

const isSpecial = (id: string) => id.startsWith('vw-ev-');

/** A department run: 10 questions in the quiz look, then the result (≥ 7/10 finishes the department). */
export default function VwayajRun() {
  const { dep: depParam } = useLocalSearchParams<{ dep: string }>();
  const t = useT(); const l = useL();
  const { profile, settings } = useStore();
  const dep = departmentById(depParam ?? '');
  const id = (dep?.id ?? 'lwes') as DepartmentId;
  const day = useMemo(() => vwayajToday(), []);
  const mult = pointsMultiplier(day);
  const build = (seed: number) => pickDepartmentRun(id, profile.age, seed, useVwayaj.getState().seen, day);
  const questions = useMemo(() => build(Date.now() % 1e9), [id, profile.age]);
  const [s, setS] = useState<SoloSession>(() => startSolo(questions, Date.now()));
  const [chosen, setChosen] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [quitting, setQuitting] = useState(false);
  const [result, setResult] = useState<VwayajRunResult | null>(null);
  const timeMs = questionTimeMs(profile.age);
  const clock = useQuestionClock({ timeMs, key: `${s.startedAt}-${s.index}`, running: !s.finished && !reveal, paused: quitting, onTimeout: () => pick(null) });
  const left = clock.left;
  const leave = useQuitGuard(!s.finished || reveal, () => setQuitting(true));
  const q = s.questions[s.index];

  // a locked (or unknown) department can't be played: back to the map
  useEffect(() => { if (!dep || !isUnlocked(useVwayaj.getState(), id)) leave(() => router.replace('/vwayaj')); }, []);
  useEffect(() => { music(null); }, []);

  useEffect(() => { if (q && settings.voice && profile.age === '6-8') speak(l(q.prompt), profile.lang); }, [s.index]);

  function pick(i: number | null) {
    if (reveal) return;
    setChosen(i); setReveal(true);
    const next = answerSolo(s, i, scoredNow(s, clock.elapsed(), timeMs));
    tap(next.answers[next.answers.length - 1].correct ? 'success' : 'error');
    sfx(answerSfx(next.answers.map((x) => x.correct), i === null));
    setS(next);
  }
  function go() { setChosen(null); setReveal(false); }
  function finish() {
    const sum = soloSummary(s);
    const r = useVwayaj.getState().finishRun({ dep: id, correct: sum.correct, total: sum.total, score: sum.score * mult, ids: s.questions.map((x) => x.id) });
    setResult(r);
    sfx(r.passed ? 'level' : 'lose');
    setTimeout(() => sfx('coin'), 1150); // when the points pill pops
  }
  useEffect(() => { if (s.finished && !reveal && !result) finish(); }, [s.finished, reveal]);
  function again() { setResult(null); setS(startSolo(build(Date.now() % 1e9), Date.now())); }

  if (!dep) return <Screen><T>…</T></Screen>;

  // ─── result ───
  if (s.finished && !reveal) {
    const sum = soloSummary(s);
    const passed = sum.correct >= VWAYAJ_PASS;
    const stars = runStars(sum.correct, sum.total);
    const mood: MascotMood = sum.correct === sum.total ? 'wow' : sum.correct >= 9 ? 'proud' : passed ? 'cheer' : sum.correct >= 5 ? 'think' : 'sad';
    const next = result?.unlocked ? DEPARTMENTS.find((d) => d.id === result.unlocked) : null;
    const xp = Math.round((sum.score * mult) / 4);
    return (
      <Screen scroll={false}>
        {passed && <Confetti />}
        <View style={{ alignItems: 'center', gap: 10, marginTop: 'auto' }}>
          <Drop>{passed ? <Hop height={10} duration={1100}><Mascot size={150} mood={mood} /></Hop> : <Mascot size={150} mood={mood} />}</Drop>
          <FadeIn delay={500}><T v="display" center>{passed ? t('vw_passed', { x: l(dep.name) }) : t('result')}</T></FadeIn>
          <Stars n={stars} size={44} pop />
          <FadeIn delay={900}><ResultLine correct={sum.correct} total={sum.total} label={t('correct_of')} /></FadeIn>
          <Pop delay={1150}><CountPill value={sum.score * mult} k={`vw-${s.startedAt}`} suffix={` ${t('points')}  ·  +${xp} XP`} color="#5C4600" bg={colors.yellowSoft} icon="pwen" /></Pop>
          {mult > 1 && <Pop delay={1300}><Pill text={`${t('vw_double')} ×${mult}`} color="#FFFFFF" bg={colors.red} icon="drapo" /></Pop>}
          {result?.firstClear && <Pop delay={1400}><Pill text={`${t('vw_bonus')} +${VWAYAJ_CLEAR_XP} XP`} color="#12632F" bg={colors.greenSoft} icon="vwayaj" /></Pop>}
          {!passed && <FadeIn delay={1300}><T v="bold" center color={colors.muted}>{t('vw_failed')}</T></FadeIn>}
          {next && (
            <Pop delay={1700}><Card soft={colors.blueSoft} edge={colors.blue} style={{ paddingVertical: 10 }}>
              <Row gap={8}><Icon name="pwen" size={24} /><T v="h3" color={colors.blue}>{t('vw_unlocked', { x: l(next.name) })}</T></Row>
            </Card></Pop>
          )}
        </View>
        <View style={{ marginTop: 'auto', gap: 10 }}>
          {passed ? (
            <>
              <Button title={t('vw_to_map')} color={colors.green} onPress={() => router.replace('/vwayaj')} />
              <Button variant="secondary" title={t('vw_again')} onPress={again} />
            </>
          ) : (
            <>
              <Button title={t('vw_try_again')} onPress={again} />
              <Button variant="secondary" title={t('vw_to_map')} onPress={() => router.replace('/vwayaj')} />
            </>
          )}
        </View>
      </Screen>
    );
  }

  const shown = reveal ? s.questions[s.index - 1] : q;
  if (!shown) return <Screen><T>…</T></Screen>;
  const last = s.answers[s.answers.length - 1];
  return (
    <Screen scroll={true}>
      <TopBar close title={l(dep.name)} sub={`${t('question')} ${s.index + (reveal ? 0 : 1)} / ${s.questions.length}`} onBack={() => setQuitting(true)}
        right={<CountPill value={s.score * mult} k={`vwscore-${s.startedAt}`} icon="pwen" color="#5C4600" bg={colors.yellowSoft} />} />
      <Row style={{ opacity: reveal ? 0.35 : 1 }}>
        <Progress style={{ flex: 1 }} linear value={left / timeMs} color={left < 4000 ? colors.red : colors.yellowDark} />
        <T v="small" color={colors.muted} style={{ width: 32, textAlign: 'right' }}>{Math.ceil(left / 1000)} s</T>
      </Row>
      <Progress value={s.index / s.questions.length} color={colors.green} height={6} />
      {(mult > 1 || isSpecial(shown.id)) && (
        <Row gap={8}>
          {isSpecial(shown.id) && <Pop key={shown.id}><Pill text={t('vw_special')} color="#FFFFFF" bg={colors.ink} icon="pwen" /></Pop>}
          {mult > 1 && <Pill text={`${t('vw_double')} ×${mult}`} color="#8F0A22" bg={colors.redSoft} icon="drapo" />}
        </Row>
      )}
      <SlideSwap id={reveal ? s.index - 1 : s.index}>
        <QuestionView q={shown} chosen={chosen} reveal={reveal} onPick={pick} />
      </SlideSwap>
      {reveal && last && (
        <FadeIn from={40} duration={320}><Card edge={last.correct ? colors.green : colors.red} soft={last.correct ? colors.greenSoft : colors.redSoft} style={{ gap: 4 }}>
          <T v="h3" color={last.correct ? '#12632F' : '#8F0A22'}>{last.correct ? t('correct') : chosen === null ? t('timeout') : t('wrong')} {last.correct ? `+${last.points * mult}` : ''}</T>
          {!last.correct && <T v="body">{t('answer_was')} <T v="bold">{l(shown.options[shown.answer])}</T></T>}
          {shown.explain && <T v="small" color={colors.muted}>{l(shown.explain)}</T>}
          <Button small title={t('continue')} color={last.correct ? colors.green : colors.blue} onPress={go} style={{ marginTop: 6 }} />
        </Card></FadeIn>
      )}
      <Sheet open={quitting} title={t('quit_q')} onClose={() => setQuitting(false)}>
        <T v="small" center color={colors.muted}>{t('quit_paused')}</T>
        <Button title={t('stay')} onPress={() => setQuitting(false)} />
        <Button variant="secondary" color={colors.red} title={t('quit')} onPress={() => { setQuitting(false); leave(() => router.replace('/vwayaj')); }} />
      </Sheet>
    </Screen>
  );
}

function ResultLine({ correct, total, label }: { correct: number; total: number; label: string }) {
  const n = useCountUp(correct, undefined, 600);
  return <T v="h1" center color={colors.blue}>{n} {label} {total}</T>;
}
