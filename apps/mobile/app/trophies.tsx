import React, { useEffect } from 'react';
import { View } from 'react-native';
import { BADGES, courseSummary } from '@konesans/core';
import { Screen, T, Row, TopBar, Icon, Progress, FadeIn, Pop } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT, formatDate, type StrKey } from '@/lib/i18n';
import { RankUpListener } from '@/ui/RankUp';

const TIER: Record<string, { bg: string; ring: string; ink: string; key: StrKey }> = {
  bronz: { bg: '#FFE8DC', ring: '#E0915F', ink: '#8A3B12', key: 'tier_bronz' },
  ajan: { bg: '#EEF1F6', ring: '#A9B4C8', ink: '#4A5570', key: 'tier_ajan' },
  lo: { bg: colors.yellowSoft, ring: colors.yellowDark, ink: '#5C4600', key: 'tier_lo' },
};

export default function Trophies() {
  const t = useT();
  const { profile, progress, stats, courses, newBadges, clearNewBadges, coding } = useStore();
  const fr = profile.lang === 'fr';
  useEffect(() => { useStore.getState().awardBadges(); return () => clearNewBadges(); }, []);
  const words = courseSummary('en', courses.en).wordsLearned + courseSummary('es', courses.es).wordsLearned;
  /** How far along each trophy is (null when there is nothing to count). */
  const goal: Record<string, [number, number] | null> = {
    premye: [stats.lessons, 1], seri7: [progress.streak.count, 7], seri30: [progress.streak.count, 30], mo100: [words, 100],
    duel1: [stats.duelWins, 1], duel10: [stats.duelWins, 10], kod5: [Object.keys(coding).length, 5], vwayaj3: null, vetye: null, drapo: null,
  };
  const earned = BADGES.filter((b) => progress.badges[b.id]);
  const locked = BADGES.filter((b) => !progress.badges[b.id]);
  const date = (iso: string) => formatDate(iso, profile.lang);

  const Tile = ({ id, i, on }: { id: string; i: number; on: boolean }) => {
    const b = BADGES.find((x) => x.id === id)!;
    const tier = TIER[b.tier];
    const g = goal[id];
    const name = fr ? b.nameFr : b.name;
    const how = fr ? b.howFr : b.how;
    const body = (
      <View style={{ width: '100%', backgroundColor: on ? tier.bg : colors.card, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: on ? tier.ring : colors.line, padding: 14, alignItems: 'center', gap: 6, opacity: on ? 1 : 0.85 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: on ? '#FFFFFF' : colors.bg, borderWidth: 3, borderColor: on ? tier.ring : colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ opacity: on ? 1 : 0.35 }}><Icon name="twofe" size={38} /></View>
          {!on && <View style={{ position: 'absolute', right: -4, bottom: -4, backgroundColor: colors.card, borderRadius: 12, padding: 2 }}><Icon name="femen_kle" size={20} /></View>}
        </View>
        <T v="h3" center numberOfLines={2}>{name}</T>
        <T v="small" color={colors.muted} center numberOfLines={2}>{how}</T>
        {on
          ? <T v="label" color={tier.ink} center>{t(tier.key).toUpperCase()} · {date(progress.badges[id])}</T>
          : g ? <View style={{ width: '100%', gap: 4 }}><Progress value={Math.min(1, g[0] / g[1])} color={tier.ring} height={8} /><T v="small" color={colors.muted} center>{Math.min(g[0], g[1])} / {g[1]}</T></View>
          : <T v="label" color={colors.muted} center>{t(tier.key).toUpperCase()}</T>}
      </View>
    );
    const isNew = newBadges.includes(id);
    return <FadeIn delay={80 + i * 50} style={{ width: '48%' }}>{isNew ? <Pop>{body}</Pop> : body}</FadeIn>;
  };

  return (
    <Screen>
      <TopBar title={t('trophies')} sub={`${earned.length} / ${BADGES.length}`} />
      <T v="body" color={colors.muted}>{t('trophies_sub')}</T>
      {earned.length > 0 && <>
        <T v="h2">{t('earned')}</T>
        <Row gap={10} style={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'stretch' }}>{earned.map((b, i) => <Tile key={b.id} id={b.id} i={i} on />)}</Row>
      </>}
      {locked.length > 0 && <>
        <T v="h2">{t('to_earn')}</T>
        <Row gap={10} style={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'stretch' }}>{locked.map((b, i) => <Tile key={b.id} id={b.id} i={i + earned.length} on={false} />)}</Row>
      </>}
      <RankUpListener />
    </Screen>
  );
}
