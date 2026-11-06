import React, { useState } from 'react';
import { View, Switch } from 'react-native';
import { router } from 'expo-router';
import type { Lang } from '@konesans/core';
import { Screen, T, Card, Row, TopBar, Button, Sheet, PressScale } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';

export default function Settings() {
  const t = useT();
  const { settings, setSettings, profile, setLang, resetAll } = useStore();
  const [confirm, setConfirm] = useState(false);
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
            <Switch value={!!settings[x.key]} disabled={x.locked} onValueChange={(v) => { tap(); setSettings({ [x.key]: v }); }} trackColor={{ true: colors.green, false: '#B9C2D6' }} thumbColor="#fff" />
          </Row>
        ))}
      </Card>
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
        <Button variant="secondary" color={colors.red} title={t('reset')} onPress={() => setConfirm(true)} />
      </Card>
      <T v="small" center color={colors.muted}>{t('app_version', { v: '0.1' })}</T>
      <Sheet open={confirm} title={t('reset') + '?'}>
        <T v="body" center color={colors.muted}>{t('parent_gate')}</T>
        <Row>
          {[36, 42, 48].map((n) => <Button key={n} variant="secondary" title={String(n)} style={{ flex: 1 }} onPress={() => { if (n === 42) { resetAll(); setConfirm(false); router.replace('/onboarding'); } else setConfirm(false); }} />)}
        </Row>
        <Button variant="ghost" title={t('stay')} onPress={() => setConfirm(false)} />
      </Sheet>
    </Screen>
  );
}
