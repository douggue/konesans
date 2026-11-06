import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { startMath, answerMath, skipMath, mathXp, weakKinds, allowsNegative, KIND_LABEL, type MathRun } from '@konesans/core';
import { Screen, T, Button, Card, Row, Progress, Mascot, TopBar, Pill, Sheet, PressScale, Shake, Bounce, Burst, Pop, Drop, FadeIn, Confetti, SlideSwap, useCountUp } from '@/ui';
import { colors, radius } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';
import { tap } from '@/lib/audio';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '−', '0', '⌫'];

/** Kalkil Mantal: 60 seconds of generated arithmetic for the kid's age band. */
export default function MathRapid() {
  const t = useT(); const l = useL();
  const { profile, recordMath } = useStore();
  const neg = allowsNegative(profile.age);
  const [run, setRun] = useState<MathRun | null>(null);
  const [typed, setTyped] = useState('');
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [left, setLeft] = useState(60_000);
  const [quitting, setQuitting] = useState(false);
  const saved = useRef(false);
  const over = !!run && left <= 0;
  const good = run ? run.history.filter((h) => h.ok).length : 0;

  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setLeft(Math.max(0, run.endsAt - Date.now())), 100);
    return () => clearInterval(id);
  }, [run]);
  useEffect(() => { if (over && !saved.current && run) { saved.current = true; recordMath(run.score, mathXp(run)); tap('success'); } }, [over]);

  const start = () => { setHits(0); setMisses(0); saved.current = false; setTyped(''); setLeft(60_000); setRun(startMath(profile.age, Date.now() % 1e9, Date.now())); };
  const press = (k: string) => {
    if (!run || over) return;
    tap();
    if (k === '⌫') return setTyped((s) => s.slice(0, -1));
    if (k === '−') { if (neg) setTyped((s) => (s.startsWith('-') ? s.slice(1) : '-' + s)); return; }
    if (typed.replace('-', '').length < 5) setTyped((s) => s + k);
  };
  const submit = () => {
    if (!run || typed === '' || typed === '-') return;
    const next = answerMath(run, Number(typed), Date.now());
    const ok = next.i > run.i;
    setFlash(ok ? 'ok' : 'no'); setTimeout(() => setFlash(null), 350);
    if (ok) setHits((h) => h + 1); else setMisses((m) => m + 1);
    tap(ok ? 'success' : 'error');
    setRun(next); setTyped('');
  };
  useEffect(() => { if (run && typed !== '' && typed !== '-' && String(run.current.answer).length === typed.length && Number(typed) === run.current.answer) submit(); }, [typed]);
  const skip = () => { if (!run || over) return; tap('error'); setRun(skipMath(run, Date.now())); setTyped(''); };

  if (!run) {
    return (
      <Screen scroll={false}>
        <TopBar title={t('math_title')} sub={`${profile.age} ${t('years')}`} onBack={() => router.back()} />
        <View style={{ alignItems: 'center', gap: 12, marginTop: 'auto', marginBottom: 'auto' }}>
          <Drop><Mascot size={140} mood="cheer" /></Drop>
          <Pop delay={350}><T v="display" center>{t('math_60s_dot')}</T></Pop>
          <T v="h1" center>{t('math_how_many')}</T>
          <T v="body" center color={colors.muted}>{t(profile.age === '12-14' ? 'math_intro_12' : profile.age === '9-11' ? 'math_intro_9' : 'math_intro_6')}</T>
          <T v="small" center color={colors.muted}>{t('math_combo')}</T>
        </View>
        <Button title={t('math_go')} color={colors.orange} onPress={start} />
      </Screen>
    );
  }

  if (over) {
    return (
      <Screen scroll={false}>
        {run.score >= 15 && <Confetti />}
        <View style={{ alignItems: 'center', gap: 10, marginTop: 'auto' }}>
          <Drop><Mascot size={140} mood={run.score >= 15 ? 'cheer' : 'happy'} /></Drop>
          <Pop delay={450}><BigScore n={run.score} /></Pop>
          <T v="body" center color={colors.muted}>{t('math_summary', { good, miss: run.misses, best: run.best })}</T>
          <Pop delay={900}><Pill text={`+${mathXp(run)} XP`} color="#5C4600" bg={colors.yellowSoft} icon="pwen" /></Pop>
          {weakKinds(run).length > 0 && <Card soft={colors.yellowSoft} edge={colors.yellowDark} style={{ paddingVertical: 10 }}><T v="small" color="#5C4600">{t('math_practice', { x: weakKinds(run).map((k) => l(KIND_LABEL[k])).join(' · ') })}</T></Card>}
        </View>
        <View style={{ marginTop: 'auto', gap: 10 }}>
          <Button title={t('again')} color={colors.orange} onPress={start} />
          <Button variant="secondary" title={t('done')} onPress={() => router.replace('/home')} />
        </View>
      </Screen>
    );
  }

  const p = run.current;
  const fr = profile.lang === 'fr';
  const ptext = fr ? p.textFr : p.text;
  return (
    <Screen scroll={false}>
      <TopBar close title={t('math_title')} sub={t('math_live', { good, x2: run.combo >= 5 ? 'x2 ' : '', combo: run.combo })} onBack={() => setQuitting(true)}
        right={<Bounce trigger={left < 10_000 ? Math.ceil(left / 1000) : null} amount={0.15}><View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: left < 10_000 ? colors.redSoft : colors.yellowSoft, alignItems: 'center', justifyContent: 'center' }}><T v="h2" color={left < 10_000 ? colors.red : '#5C4600'}>{Math.ceil(left / 1000)}</T></View></Bounce>} />
      <Progress linear value={left / run.durationMs} color={left < 10_000 ? colors.red : colors.orange} />
      <Shake trigger={misses || null}><Bounce trigger={hits || null} amount={0.04}><Card edge={flash === 'ok' ? colors.green : flash === 'no' ? colors.red : colors.line} soft={flash === 'ok' ? colors.greenSoft : flash === 'no' ? colors.redSoft : colors.card} style={{ alignItems: 'center', paddingVertical: 22, gap: 6 }}>
        <SlideSwap id={run.i + '-' + run.history.length}><T style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: ptext.length > 14 ? 32 : 44, lineHeight: ptext.length > 14 ? 40 : 52 }} center>{p.ask ? ptext : `${ptext} = ?`}</T></SlideSwap>
        {p.ask && <T v="h3" color={colors.muted}>{fr ? p.askFr ?? p.ask : p.ask}</T>}
        {p.points === 2 && <Pill text={t('two_points')} color="#5C4600" bg={colors.yellowSoft} />}
        <View style={{ minWidth: 120, minHeight: 56, borderBottomWidth: 4, borderBottomColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: 40, lineHeight: 48 }} color={colors.blue}>{typed || ' '}</T>
        </View>
      </Card><Burst trigger={hits || null} count={8} radius={110} shapes="stars" /></Bounce></Shake>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 'auto' }}>
        {KEYS.map((k) => {
          const off = k === '−' && !neg;
          return (
            <PressScale key={k} role="button" disabled={off} debounceMs={0} scaleTo={0.9} onPress={() => press(k)} style={({ pressed }) => [{ width: '31%', minHeight: 60, borderRadius: radius.md, backgroundColor: k === '⌫' ? colors.redSoft : colors.card, borderWidth: 2, borderColor: colors.line, borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.25 : 1 }, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 3 }]}>
              <T v="h1" color={k === '⌫' ? colors.red : colors.ink}>{k}</T>
            </PressScale>
          );
        })}
        <Button small variant="secondary" color={colors.muted} title={t('skip')} onPress={skip} style={{ width: '31%' }} />
        <Button small title="OK" color={colors.green} onPress={submit} style={{ flex: 1 }} />
      </View>
      <Sheet open={quitting} title={t('quit_q')}>
        <Button title={t('stay')} onPress={() => setQuitting(false)} />
        <Button variant="secondary" color={colors.red} title={t('quit')} onPress={() => { setQuitting(false); router.replace('/home'); }} />
      </Sheet>
    </Screen>
  );
}

function BigScore({ n }: { n: number }) {
  const v = useCountUp(n, undefined, 900);
  const t = useT();
  return <T v="display" center>{t('score_points', { n: v })}</T>;
}
