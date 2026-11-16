/**
 * Paramèt → "Rapèl chak jou": on/off + time (kids may change both). Turning it on first shows Ti Zwazo explaining
 * why, then the system permission question. Hidden when the notifications module isn't in this APK (or on the web).
 */
import React, { useEffect, useState } from 'react';
import { View, Switch, Linking } from 'react-native';
import { streakNudgeHour } from '@konesans/core';
import { T, Card, Row, Button, Sheet, PressScale, Mascot, SectionLabel, stripEmoji } from './index';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';
import { remindersAvailable, useReminders, permissionState, askPermission, type PermissionState } from '@/lib/reminders';

const STEP = 30;
const fmt = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;

export function ReminderSetting() {
  const t = useT();
  const { on, hour, minute, set } = useReminders();
  const bedtime = useStore((s) => s.kidSettings.bedtimeHour);
  const [why, setWhy] = useState(false);
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  useEffect(() => { permissionState().then(setPerm); }, []);
  if (!remindersAvailable()) return null;

  // between 8:00 and an hour before bedtime, in 30-minute steps
  const min = 8 * 60; const max = Math.max(min, (bedtime - 1) * 60 + 30);
  const cur = Math.min(max, Math.max(min, hour * 60 + minute));
  const move = (d: number) => { tap(); const v = Math.min(max, Math.max(min, cur + d)); set({ hour: Math.floor(v / 60), minute: v % 60 }); };
  const turnOn = async () => {
    const p = await permissionState(); setPerm(p);
    if (p === 'granted') { set({ on: true }); return; }
    setWhy(true);
  };
  const accept = async () => {
    setWhy(false); set({ explained: true });
    const ok = await askPermission();
    setPerm(ok ? 'granted' : await permissionState());
    if (ok) set({ on: true });
  };
  const nudge = streakNudgeHour(bedtime);
  return (
    <>
      <SectionLabel>{t('rem_section')}</SectionLabel>
      <Card style={{ gap: 8, paddingVertical: 10 }}>
        <Row style={{ minHeight: 56 }}>
          <Mascot size={44} mood={on ? 'happy' : 'think'} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="bold">{t('rem_row')}</T>
            <T v="small" color={colors.muted}>{t('rem_row_sub')}</T>
          </View>
          <Switch value={on} onValueChange={(v) => { tap(); if (v) turnOn(); else set({ on: false }); }} trackColor={{ true: colors.green, false: '#B9C2D6' }} thumbColor="#fff" />
        </Row>
        {on ? (
          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}>
            <Row>
              <T v="bold" style={{ flex: 1 }}>{t('rem_time')}</T>
              <PressScale role="button" accessibilityLabel={t('rem_earlier')} disabled={cur <= min} onPress={() => move(-STEP)} style={stepBtn(cur <= min)}><T v="h2" color={colors.blue}>{'−' /* i18n-ok */}</T></PressScale>
              <T v="h2" style={{ minWidth: 76, textAlign: 'center', fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">{fmt(Math.floor(cur / 60), cur % 60)}</T>
              <PressScale role="button" accessibilityLabel={t('rem_later')} disabled={cur >= max} onPress={() => move(STEP)} style={stepBtn(cur >= max)}><T v="h2" color={colors.blue}>{'+' /* i18n-ok */}</T></PressScale>
            </Row>
            <T v="small" color={colors.muted}>{t('rem_streak_note', { h: fmt(nudge, 0) })}</T>
          </View>
        ) : null}
        {perm === 'denied' && !on ? (
          <View style={{ gap: 6 }}>
            <T v="small" color={colors.red}>{t('rem_denied')}</T>
            <Button small variant="secondary" title={t('rem_open_phone')} onPress={() => Linking.openSettings().catch(() => {})} />
          </View>
        ) : null}
      </Card>
      <Sheet open={why} title={t('rem_why_title')} onClose={() => setWhy(false)}>
        <View style={{ alignItems: 'center' }}><Mascot size={110} mood="happy" /></View>
        <T v="body" center color={colors.ink}>{t('rem_why_body')}</T>
        <View style={{ backgroundColor: colors.blueSoft, borderRadius: 14, padding: 10 }}>
          <T v="bold" center color={colors.blue}>{stripEmoji(t('rem_daily_1'))}</T>
        </View>
        <Button title={t('rem_why_ok')} color={colors.green} onPress={accept} />
        <Button variant="ghost" title={t('rem_why_no')} onPress={() => { setWhy(false); set({ explained: true }); }} />
      </Sheet>
    </>
  );
}

const stepBtn = (off: boolean) => ({ width: 48, height: 48, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, borderColor: colors.lineStrong, backgroundColor: colors.card, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: off ? 0.4 : 1 });
