import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LEVELS } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Stars, Icon, Mascot, FadeIn, Motif, Progress, Pill, Pulse } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';

const CONCEPT_ICON = { avanse: 'avanse', vire: 'vire_dwat', repete: 'repete', si_mi: 'simi', jiska: 'zetwal_gri' } as const;

export default function Coding() {
  const t = useT();
  const fr = useStore((s) => s.profile.lang) === 'fr';
  const coding = useStore((s) => s.coding);
  const firstOpen = LEVELS.findIndex((l) => !coding[l.id]);
  const solved = LEVELS.filter((l) => coding[l.id]).length;
  const starsWon = LEVELS.reduce((n, l) => n + (coding[l.id] ?? 0), 0);
  return (
    <Screen bottom={<BottomNav />}>
      <View><T v="display" accessibilityRole="header">{t('coding_title')}</T><T v="body" color={colors.muted}>{t('coding_sub')}</T></View>
      {/* progress card: same blue hero card as the course path and the daily challenge */}
      <FadeIn delay={40}><View style={{ backgroundColor: colors.blue, borderRadius: 24, padding: 18, paddingRight: 110, gap: 8, borderBottomWidth: 5, borderBottomColor: '#14307D', overflow: 'hidden', minHeight: 124 }}>
        <Motif kind="sitadel" opacity={0.14} height={80} />
        <T v="label" color="#E6ECFB">{t('pl_code_progress')}</T>
        <T v="h1" color="#FFFFFF">{t('pl_code_levels', { n: solved, total: LEVELS.length })}</T>
        <Progress value={solved / LEVELS.length} color={colors.yellow} track="rgba(255,255,255,0.25)" height={10} />
        <Row gap={4}><Icon name="pwen" size={18} /><T v="small" color="#E6ECFB">{t('pl_code_stars', { n: starsWon, total: LEVELS.length * 3 })}</T></Row>
        <View style={{ position: 'absolute', right: 4, bottom: -4 }}><Mascot size={104} mood="think" /></View>
      </View></FadeIn>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
        {LEVELS.map((lv, i) => {
          const stars = coding[lv.id] ?? 0;
          const locked = i > (firstOpen === -1 ? LEVELS.length : firstOpen);
          const current = !locked && !stars;
          const title = fr ? lv.titleFr : lv.title;
          return (
            <FadeIn key={lv.id} delay={80 + Math.min(i, 10) * 40} style={{ width: '48%' }}>
              <Card onPress={locked ? undefined : () => router.push(`/coding/${lv.id}`)} soft={locked ? colors.bg : stars ? colors.greenSoft : colors.blueSoft} edge={locked ? colors.line : stars ? '#9ED9AE' : colors.blue}
                style={{ gap: 6, minHeight: 132 }}>
                <View accessible accessibilityLabel={`${lv.id}. ${title}. ${locked ? t('locked') : stars ? t('cp_done') : t('start_lesson')}`} style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: locked ? colors.card : '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: locked ? 0.6 : 1 }}>
                      <Icon name={CONCEPT_ICON[lv.concept]} size={30} />
                      {locked ? <View style={{ position: 'absolute', right: -6, bottom: -6, backgroundColor: colors.card, borderRadius: 12, padding: 2 }}><Icon name="femen_kle" size={18} /></View> : null}
                    </View>
                    <T v="h1" color={locked ? colors.lineStrong : stars ? '#12632F' : colors.blue}>{lv.id}</T>
                  </Row>
                  <T v="h3" color={locked ? colors.muted : colors.ink}>{title}</T>
                  {stars ? <Stars n={stars} size={16} />
                    : current ? <View style={{ alignSelf: 'flex-start' }}><Pulse amount={0.06}><Pill text={t('start_lesson')} color="#FFFFFF" bg={colors.blue} icon="jwe" /></Pulse></View>
                    : <T v="small" color={colors.muted}>{t('par_goal', { n: lv.par })}</T>}
                </View>
              </Card>
            </FadeIn>
          );
        })}
      </View>
    </Screen>
  );
}
