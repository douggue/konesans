import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { REGIONS, REGION_LABEL, countryPool, type CountryMode, type CountryLevel, type WorldRegion } from '@konesans/core';
import { Screen, T, Button, Icon, IconTile, Row, Sheet, Pill, HeroHeader, SectionLabel, SelectTile, ListRow, Chevron, StarIcons, type IconName } from '@/ui';
import { LevelPicker } from '@/ui/LevelPicker';
import { usePrefs } from '@/lib/prefs';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';

const MODES: { id: CountryMode; icon: 'drapo' | 'kapital' | 'fom'; key: 'peyi_mode_drapo' | 'peyi_mode_kapital' | 'peyi_mode_fom' }[] = [
  { id: 'drapo', icon: 'drapo', key: 'peyi_mode_drapo' }, { id: 'kapital', icon: 'kapital', key: 'peyi_mode_kapital' }, { id: 'fom', icon: 'fom', key: 'peyi_mode_fom' },
];
const LEVELS: { id: CountryLevel; key: 'peyi_lv1' | 'peyi_lv2' | 'peyi_lv3'; sub: 'peyi_lv1_sub' | 'peyi_lv2_sub' | 'peyi_lv3_sub' }[] = [
  { id: 1, key: 'peyi_lv1', sub: 'peyi_lv1_sub' },
  { id: 2, key: 'peyi_lv2', sub: 'peyi_lv2_sub' },
  { id: 3, key: 'peyi_lv3', sub: 'peyi_lv3_sub' },
];

/** Our drawn region pictures (no emoji). */
const REGION_ICON: Record<WorldRegion | 'mond', IconName> = { mond: 'jewo', 'Karayib': 'zile', 'Amerik di Nò': 'amerik', 'Amerik di Sid': 'jako', 'Ewòp': 'chato', 'Afrik': 'lyon', 'Azi': 'panda', 'Oseyani': 'koala' };

/** Peyi: pick a mode (flags / capitals / shapes), a level and a region, then play. */
export default function Peyi() {
  const t = useT();
  const { profile, peyi, setPeyi } = useStore();
  const level = usePrefs((s) => s.difficulty) as CountryLevel;
  const setDifficulty = usePrefs((s) => s.setDifficulty);
  const [levelSheet, setLevelSheet] = useState(false);
  const lang = profile.lang;
  // the count must use the same level as the game (the Defi difficulty), not the old per-Peyi level
  const pool = countryPool({ ...peyi, level }).length;

  return (
    <Screen bleed>
      <HeroHeader color={colors.yellowDark} title={t('peyi_title')} sub={t('peyi_sub')} onBack={() => router.back()} motif="drapo" mascot mood="wave">
        <View style={{ alignSelf: 'flex-start' }}><Pill text={t('peyi_pool', { n: pool })} color="#5C4600" bg="#FFFFFF" icon="drapo" /></View>
      </HeroHeader>

      <SectionLabel>{t('mode')}</SectionLabel>
      <Row gap={10} style={{ alignItems: 'stretch' }}>
        {MODES.map((m) => {
          const on = peyi.mode === m.id;
          return (
            <SelectTile key={m.id} on={on} onPress={() => setPeyi({ mode: m.id })} style={{ flex: 1, minHeight: 96 }}>
              <IconTile name={m.icon} bg={on ? '#FFFFFF' : colors.yellowSoft} size={48} />
              <T v="h3" center color={on ? colors.blue : colors.ink}>{t(m.key)}</T>
            </SelectTile>
          );
        })}
      </Row>

      {/* level = the difficulty chosen on Defi (one setting for everything); tap to change it here too */}
      <SectionLabel>{t('level_caps')}</SectionLabel>
      <ListRow title={t(LEVELS.find((l) => l.id === level)!.key)} sub={t(LEVELS.find((l) => l.id === level)!.sub)} a11y={`${t('diff_label')} · ${t('diff_change')}`}
        onPress={() => setLevelSheet(true)} right={<Row gap={6}><StarIcons n={level} of={level} size={18} gap={0} /><Chevron /></Row>} />

      <SectionLabel>{t('region_caps')}</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
        {(['mond', ...REGIONS] as (WorldRegion | 'mond')[]).map((r) => {
          const on = peyi.region === r; const lab = REGION_LABEL[r];
          return (
            <SelectTile key={r} on={on} color={colors.teal} soft="#DDF3F4" onPress={() => setPeyi({ region: r })}
              style={{ width: r === 'mond' ? '100%' : '48%', flexDirection: 'row', justifyContent: 'flex-start', gap: 8, minHeight: 56 }}>
              <Icon name={REGION_ICON[r]} size={32} />
              <T v="bold" color={on ? '#0A5A61' : colors.ink} style={{ flexShrink: 1 }}>{lang === 'fr' ? lab.fr : lab.ht}</T>
            </SelectTile>
          );
        })}
      </View>

      <Sheet open={levelSheet} title={t('diff_peyi_sheet')} onClose={() => setLevelSheet(false)}>
        <LevelPicker value={level} onChange={(v) => { setDifficulty(v); }} labels={[t('diff_easy'), t('diff_mid'), t('diff_hard')]} />
        <T v="small" center color={colors.muted}>{t(LEVELS.find((l) => l.id === level)!.sub)} · {t('peyi_pool', { n: pool })}</T>
        <Button title={t('continue')} onPress={() => setLevelSheet(false)} />
      </Sheet>
      <Button title={t('play_now')} color={colors.yellowDark} icon="jwe" onPress={() => router.push(`/quiz/peyi?mode=${peyi.mode}&level=${level}&region=${encodeURIComponent(peyi.region)}`)} style={{ marginTop: 4 }} />
    </Screen>
  );
}
