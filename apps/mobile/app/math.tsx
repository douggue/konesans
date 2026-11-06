import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { startMath, answerMath, skipMath, mathXp, weakKinds, allowsNegative, KIND_LABEL, type MathRun } from '@konesans/core';
import { Screen, T, Button, Card, Row, Progress, Mascot, TopBar, Pill, Sheet } from '@/ui';
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

  const start = () => { saved.current = false; setTyped(''); setLeft(60_000); setRun(startMath(profile.age, Date.now() % 1e9, Date.now())); };
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
    tap(ok ? 'success' : 'error');
    setRun(next); setTyped('');
  };
  useEffect(() => { if (run && typed !== '' && typed !== '-' && String(run.current.answer).length === typed.length && Number(typed) === run.current.answer) submit(); }, [typed]);
  const skip = () => { if (!run || over) return; tap('error'); setRun(skipMath(run, Date.now())); setTyped(''); };

  if (!run) {
    return (
      <Screen scroll={false}>
        <TopBar title="Kalkil Mantal" sub={`${profile.age} an`} onBack={() => router.back()} />
        <View style={{ alignItems: 'center', gap: 12, marginTop: 'auto', marginBottom: 'auto' }}>
          <Mascot size={140} mood="cheer" />
          <T v="display" center>60 segonn.</T>
          <T v="h1" center>Konbyen w ka fè?</T>
          <T v="body" center color={colors.muted}>{profile.age === '12-14' ? 'Ekwasyon, pousantaj, pisans, nimewo negatif… Kesyon difisil yo vo 2 pwen.' : profile.age === '9-11' ? 'Tab miltiplikasyon, nimewo ki manke, pousantaj… Kesyon difisil yo vo 2 pwen.' : 'Adisyon, soustraksyon, doub, sekans. Chak bon repons = 1 pwen.'}</T>
          <T v="small" center color={colors.muted}>Yon seri 5 bon repons = pwen yo doub.</T>
        </View>
        <Button title="ALE!" color={colors.orange} onPress={start} />
      </Screen>
    );
  }

  if (over) {
    return (
      <Screen scroll={false}>
        <View style={{ alignItems: 'center', gap: 10, marginTop: 'auto' }}>
          <Mascot size={140} mood={run.score >= 15 ? 'cheer' : 'happy'} />
          <T v="display" center>{run.score} pwen!</T>
          <T v="body" center color={colors.muted}>{good} bon repons · {run.misses} erè · pi gwo seri {run.best}</T>
          <Pill text={`+${mathXp(run)} XP`} color="#5C4600" bg={colors.yellowSoft} icon="pwen" />
          {weakKinds(run).length > 0 && <Card soft={colors.yellowSoft} edge={colors.yellowDark} style={{ paddingVertical: 10 }}><T v="small" color="#5C4600">Pratike: {weakKinds(run).map((k) => l(KIND_LABEL[k])).join(' · ')}</T></Card>}
        </View>
        <View style={{ marginTop: 'auto', gap: 10 }}>
          <Button title={t('again')} color={colors.orange} onPress={start} />
          <Button variant="secondary" title={t('done')} onPress={() => router.replace('/home')} />
        </View>
      </Screen>
    );
  }

  const p = run.current;
  return (
    <Screen scroll={false}>
      <TopBar close title="Kalkil Mantal" sub={`${good} bon · ${run.combo >= 5 ? 'x2 ' : ''}seri ${run.combo}`} onBack={() => setQuitting(true)}
        right={<View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: left < 10_000 ? colors.redSoft : colors.yellowSoft, alignItems: 'center', justifyContent: 'center' }}><T v="h2" color={left < 10_000 ? colors.red : '#5C4600'}>{Math.ceil(left / 1000)}</T></View>} />
      <Progress value={left / run.durationMs} color={left < 10_000 ? colors.red : colors.orange} />
      <Card edge={flash === 'ok' ? colors.green : flash === 'no' ? colors.red : colors.line} soft={flash === 'ok' ? colors.greenSoft : flash === 'no' ? colors.redSoft : colors.card} style={{ alignItems: 'center', paddingVertical: 22, gap: 6 }}>
        <T style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: p.text.length > 14 ? 32 : 44, lineHeight: p.text.length > 14 ? 40 : 52 }} center>{p.ask ? p.text : `${p.text} = ?`}</T>
        {p.ask && <T v="h3" color={colors.muted}>{p.ask}</T>}
        {p.points === 2 && <Pill text="2 pwen" color="#5C4600" bg={colors.yellowSoft} />}
        <View style={{ minWidth: 120, minHeight: 56, borderBottomWidth: 4, borderBottomColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: 40, lineHeight: 48 }} color={colors.blue}>{typed || ' '}</T>
        </View>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 'auto' }}>
        {KEYS.map((k) => {
          const off = k === '−' && !neg;
          return (
            <Pressable key={k} role="button" disabled={off} onPress={() => press(k)} style={({ pressed }) => [{ width: '31%', minHeight: 60, borderRadius: radius.md, backgroundColor: k === '⌫' ? colors.redSoft : colors.card, borderWidth: 2, borderColor: colors.line, borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.25 : 1 }, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 3 }]}>
              <T v="h1" color={k === '⌫' ? colors.red : colors.ink}>{k}</T>
            </Pressable>
          );
        })}
        <Button small variant="secondary" color={colors.muted} title="Sote →" onPress={skip} style={{ width: '31%' }} />
        <Button small title="OK" color={colors.green} onPress={submit} style={{ flex: 1 }} />
      </View>
      <Sheet open={quitting} title={t('quit_q')}>
        <Button title={t('stay')} onPress={() => setQuitting(false)} />
        <Button variant="secondary" color={colors.red} title={t('quit')} onPress={() => { setQuitting(false); router.replace('/home'); }} />
      </Sheet>
    </Screen>
  );
}
