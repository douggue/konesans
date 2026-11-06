import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { REGIONS, REGION_LABEL, countryPool, type CountryMode, type CountryLevel, type WorldRegion } from '@konesans/core';
import { Screen, T, Button, TopBar, Icon, Row } from '@/ui';
import { colors, radius } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';

const MODES: { id: CountryMode; icon: 'drapo' | 'kapital' | 'fom'; ht: string; fr: string }[] = [
  { id: 'drapo', icon: 'drapo', ht: 'Drapo', fr: 'Drapeaux' }, { id: 'kapital', icon: 'kapital', ht: 'Kapital', fr: 'Capitales' }, { id: 'fom', icon: 'fom', ht: 'Fòm', fr: 'Formes' },
];
const LEVELS: { id: CountryLevel; ht: string; fr: string; sub: string; color: string }[] = [
  { id: 1, ht: 'Fasil', fr: 'Facile', sub: 'Peyi tout moun konnen', color: colors.green },
  { id: 2, ht: 'Mwayen', fr: 'Moyen', sub: 'Peyi nan liv lekòl', color: colors.orange },
  { id: 3, ht: 'Difisil', fr: 'Difficile', sub: 'Tout peyi, kesyon alanvè', color: colors.red },
];

/** Peyi: pick a mode (flags / capitals / shapes), a level and a region, then play. */
export default function Peyi() {
  const t = useT();
  const { profile, peyi, setPeyi } = useStore();
  const lang = profile.lang;
  const pool = countryPool(peyi).length;
  const seg = (on: boolean, color = colors.blue) => ({ borderRadius: radius.md, backgroundColor: on ? color : colors.card, borderWidth: 2, borderColor: on ? color : colors.line, borderBottomWidth: on ? 2 : 5, alignItems: 'center' as const, justifyContent: 'center' as const });

  return (
    <Screen>
      <TopBar title="Peyi" sub={lang === 'fr' ? 'Drapeaux · Capitales · Formes' : 'Drapo · Kapital · Fòm'} onBack={() => router.back()} />

      <T v="label" color={colors.muted}>{lang === 'fr' ? 'MODE' : 'MÒD'}</T>
      <Row gap={10}>
        {MODES.map((m) => {
          const on = peyi.mode === m.id;
          return (
            <Pressable key={m.id} role="button" onPress={() => { tap(); setPeyi({ mode: m.id }); }} style={[{ flex: 1, minHeight: 92, gap: 6, paddingVertical: 10 }, seg(on)]}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: on ? 'rgba(255,255,255,0.2)' : colors.yellowSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={m.icon} size={32} /></View>
              <T v="h3" color={on ? '#fff' : colors.ink}>{lang === 'fr' ? m.fr : m.ht}</T>
            </Pressable>
          );
        })}
      </Row>

      <T v="label" color={colors.muted}>{lang === 'fr' ? 'NIVEAU' : 'NIVO'}</T>
      <Row gap={10}>
        {LEVELS.map((l) => {
          const on = peyi.level === l.id;
          return (
            <Pressable key={l.id} role="button" onPress={() => { tap(); setPeyi({ level: l.id }); }} style={[{ flex: 1, minHeight: 72, gap: 2, paddingHorizontal: 6 }, seg(on, l.color)]}>
              <T v="h3" color={on ? '#fff' : colors.ink}>{'★'.repeat(l.id)}</T>
              <T v="bold" color={on ? '#fff' : colors.ink}>{lang === 'fr' ? l.fr : l.ht}</T>
            </Pressable>
          );
        })}
      </Row>
      <T v="small" color={colors.muted}>{LEVELS.find((l) => l.id === peyi.level)!.sub}</T>

      <T v="label" color={colors.muted}>{lang === 'fr' ? 'RÉGION' : 'REJYON'}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['mond', ...REGIONS] as (WorldRegion | 'mond')[]).map((r) => {
          const on = peyi.region === r; const lab = REGION_LABEL[r];
          return (
            <Pressable key={r} role="button" onPress={() => { tap(); setPeyi({ region: r }); }} style={[{ minHeight: 46, paddingHorizontal: 12, flexDirection: 'row', gap: 6, width: r === 'mond' ? '100%' : '48%' }, seg(on, colors.teal)]}>
              <T style={{ fontSize: 18, lineHeight: 24 }}>{lab.emoji}</T>
              <T v="bold" color={on ? '#fff' : colors.ink}>{lang === 'fr' ? lab.fr : lab.ht}</T>
            </Pressable>
          );
        })}
      </View>

      <T v="small" center color={colors.muted}>{pool} {lang === 'fr' ? 'pays dans ce jeu' : 'peyi nan jwèt sa a'}</T>
      <Button title={t('play_now')} color={colors.yellowDark} onPress={() => router.push(`/quiz/peyi?mode=${peyi.mode}&level=${peyi.level}&region=${encodeURIComponent(peyi.region)}`)} />
    </Screen>
  );
}
