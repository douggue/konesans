import React, { useState } from 'react';
import { View, Switch, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import type { Lang } from '@konesans/core';
import { Screen, T, Card, Row, TopBar, Button, Sheet, PressScale } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { tap, sfx, audioError, audioTest } from '@/lib/audio';
import { setOnlineAllowed, lastOnlineError } from '@/lib/online';
import { serverConfigured } from '@/lib/remote';

export default function Settings() {
  const t = useT();
  const { settings, setSettings, profile, setLang, resetAll, kidSettings, setKidSettings } = useStore();
  const [gate, setGate] = useState<null | 'reset' | 'online'>(null);
  const [audioInfo, setAudioInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  /** Tell the server (it refuses duels against strangers without this), then remember it on the phone. */
  const applyOnline = async (on: boolean) => {
    setBusy(true); setErr(false);
    try { await setOnlineAllowed(on, profile.age); setKidSettings({ randomDuelsAllowed: on }); }
    catch { if (on) setErr(true); else setKidSettings({ randomDuelsAllowed: false }); }
    finally { setBusy(false); }
  };
  const toggles: { key: keyof typeof settings; label: string; locked?: boolean }[] = [
    { key: 'sfx', label: t('sfx') }, { key: 'music', label: t('music') }, { key: 'voice', label: t('voice'), locked: profile.age === '6-8' }, { key: 'haptic', label: t('haptic') },
  ];
  const seg = (on: boolean) => ({ flex: 1, minHeight: 60, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.card, borderWidth: on ? 3 : 2, borderColor: on ? colors.blue : colors.lineStrong, borderBottomWidth: on ? 3 : 5 });
  return (
    <Screen>
      <TopBar title={t('settings')} onBack={() => router.back()} />
      <T v="label" color={colors.muted}>{t('sound').toUpperCase()}</T>
      <Card style={{ paddingVertical: 4 }}>
        {toggles.map((x, i) => (
          <Row key={x.key} style={{ minHeight: 56, borderBottomWidth: i < toggles.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
            <T v="bold" style={{ flex: 1 }}>{x.label}</T>
            <Switch value={!!settings[x.key]} disabled={x.locked} onValueChange={(v) => { tap(); setSettings({ [x.key]: v }); if (v && x.key === 'sfx') setTimeout(() => sfx('correct'), 50); }} trackColor={{ true: colors.green, false: '#B9C2D6' }} thumbColor="#fff" />
          </Row>
        ))}
      </Card>
      <Button small variant="secondary" title={t('sound_test')} onPress={async () => setAudioInfo(await audioTest())} />
      {audioInfo || audioError ? <T v="small" color={colors.muted} style={{ fontSize: 11 }}>{audioInfo || audioError}</T> : null}
      <T v="label" color={colors.muted}>{t('app_lang').toUpperCase()}</T>
      <Row>
        {/* i18n-ok: each language named in its own words */ ([['ht', 'KR', 'Kreyòl ayisyen'], ['fr', 'FR', 'Français']] as [Lang, string, string][]).map(([id, code, label]) => ( // i18n-ok
          <PressScale debounceMs={0} role="button" key={id} onPress={() => { tap(); setLang(id); }} style={seg(profile.lang === id)}><T v="h2">{code}</T><T v="small">{label}</T></PressScale>
        ))}
      </Row>
      <T v="label" color={colors.muted}>{t('text_size').toUpperCase()}</T>
      <Row>
        {([t('small'), t('normal'), t('big')]).map((label, i) => (
          <PressScale debounceMs={0} role="button" key={label} onPress={() => { tap(); setSettings({ textSize: i as 0 | 1 | 2 }); }} style={seg(settings.textSize === i)}><T style={{ fontSize: [14, 18, 24][i], lineHeight: [16, 20, 28][i], fontFamily: 'Baloo2_800ExtraBold' }}>{'Aa' /* i18n-ok: font size sample */}</T><T v="small">{label}</T></PressScale>
        ))}
      </Row>
      <Card><T v="bold">{t('sample_question')}</T></Card>
      <T v="label" color={colors.muted}>{t('parent').toUpperCase()}</T>
      <Card style={{ gap: 6 }}>
        <T v="small" color={colors.muted}>{t('parent_only')}</T>
        {serverConfigured() && <>
          <Row style={{ minHeight: 56 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="bold">{t('online_duels')}</T>
              <T v="small" color={colors.muted}>{t('online_duels_sub')}</T>
            </View>
            {busy ? <ActivityIndicator color={colors.blue} /> : <Switch value={!!kidSettings.randomDuelsAllowed} onValueChange={(v) => { tap(); if (v) setGate('online'); else applyOnline(false); }} trackColor={{ true: colors.green, false: '#B9C2D6' }} thumbColor="#fff" />}
          </Row>
          {err && <><T v="small" color={colors.red}>{t('online_err')}</T>{lastOnlineError ? <T v="small" color={colors.muted} style={{ fontSize: 11, opacity: 0.7 }}>{lastOnlineError}</T> : null}</>}
        </>}
        <Button variant="secondary" color={colors.red} title={t('reset')} onPress={() => setGate('reset')} />
      </Card>
      <T v="small" center color={colors.muted}>{t('app_version', { v: '0.1' })}</T>
      <Sheet open={!!gate} title={gate === 'online' ? t('online_duels') : t('reset') + '?'}>
        {gate === 'online' && <T v="small" center color={colors.muted}>{t('online_on_gate')}</T>}
        <T v="body" center color={colors.muted}>{t('parent_gate')}</T>
        <Row>
          {[36, 42, 48].map((n) => <Button key={n} variant="secondary" title={String(n)} style={{ flex: 1 }} onPress={() => {
            const g = gate; setGate(null);
            if (n !== 42) return;
            if (g === 'reset') { resetAll(); router.replace('/onboarding'); } else if (g === 'online') applyOnline(true);
          }} />)}
        </Row>
        <Button variant="ghost" title={t('stay')} onPress={() => setGate(null)} />
      </Sheet>
    </Screen>
  );
}
