import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { REGIONS, REGION_LABEL, countryPool, type CountryMode, type CountryLevel, type WorldRegion } from '@konesans/core';
import { Screen, T, Button, TopBar, Icon, Row, PressScale } from '@/ui';
import { usePrefs } from '@/lib/prefs';
import { colors, radius } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';

const MODES: { id: CountryMode; icon: 'drapo' | 'kapital' | 'fom'; key: 'peyi_mode_drapo' | 'peyi_mode_kapital' | 'peyi_mode_fom' }[] = [
  { id: 'drapo', icon: 'drapo', key: 'peyi_mode_drapo' }, { id: 'kapital', icon: 'kapital', key: 'peyi_mode_kapital' }, { id: 'fom', icon: 'fom', key: 'peyi_mode_fom' },
];
const LEVELS: { id: CountryLevel; key: 'peyi_lv1' | 'peyi_lv2' | 'peyi_lv3'; sub: 'peyi_lv1_sub' | 'peyi_lv2_sub' | 'peyi_lv3_sub'; color: string }[] = [
  { id: 1, key: 'peyi_lv1', sub: 'peyi_lv1_sub', color: colors.green },
  { id: 2, key: 'peyi_lv2', sub: 'peyi_lv2_sub', color: colors.orange },
  { id: 3, key: 'peyi_lv3', sub: 'peyi_lv3_sub', color: colors.red },
];

/** Peyi: pick a mode (flags / capitals / shapes), a level and a region, then play. */
export default function Peyi() {
  const t = useT();
  const { profile, peyi, setPeyi } = useStore();
  const level = usePrefs((s) => s.difficulty) as CountryLevel;
  const lang = profile.lang;
  const pool = countryPool(peyi).length;
  const seg = (on: boolean, color = colors.blue) => ({ borderRadius: radius.md, backgroundColor: on ? color : colors.card, borderWidth: 2, borderColor: on ? color : colors.line, borderBottomWidth: on ? 2 : 5, alignItems: 'center' as const, justifyContent: 'center' as const });

  return (
    <Screen>
      <TopBar title={t('peyi_title')} sub={t('peyi_sub')} onBack={() => router.back()} />

      <T v="label" color={colors.muted}>{t('mode')}</T>
      <Row gap={10}>
        {MODES.map((m) => {
          const on = peyi.mode === m.id;
          return (
            <PressScale debounceMs={0} key={m.id} role="button" onPress={() => { tap(); setPeyi({ mode: m.id }); }} style={[{ flex: 1, minHeight: 92, gap: 6, paddingVertical: 10 }, seg(on)]}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: on ? 'rgba(255,255,255,0.2)' : colors.yellowSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={m.icon} size={32} /></View>
              <T v="h3" color={on ? '#fff' : colors.ink}>{t(m.key)}</T>
            </PressScale>
          );
        })}
      </Row>

      {/* level = the difficulty chosen on Defi (one setting for everything) */}
      <T v="small" color={colors.muted}>{t('level_caps')}: {'★'.repeat(level)} · {t(LEVELS.find((l) => l.id === level)!.sub)}</T>

      <T v="label" color={colors.muted}>{t('region_caps')}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['mond', ...REGIONS] as (WorldRegion | 'mond')[]).map((r) => {
          const on = peyi.region === r; const lab = REGION_LABEL[r];
          return (
            <PressScale debounceMs={0} key={r} role="button" onPress={() => { tap(); setPeyi({ region: r }); }} style={[{ minHeight: 46, paddingHorizontal: 12, flexDirection: 'row', gap: 6, width: r === 'mond' ? '100%' : '48%' }, seg(on, colors.teal)]}>
              <T style={{ fontSize: 18, lineHeight: 24 }}>{lab.emoji}</T>
              <T v="bold" color={on ? '#fff' : colors.ink}>{lang === 'fr' ? lab.fr : lab.ht}</T>
            </PressScale>
          );
        })}
      </View>

      <T v="small" center color={colors.muted}>{t('peyi_pool', { n: pool })}</T>
      <Button title={t('play_now')} color={colors.yellowDark} onPress={() => router.push(`/quiz/peyi?mode=${peyi.mode}&level=${level}&region=${encodeURIComponent(peyi.region)}`)} />
    </Screen>
  );
}
