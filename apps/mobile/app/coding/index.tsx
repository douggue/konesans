import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LEVELS } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Stars, Icon, Mascot, FadeIn } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';

const CONCEPT_ICON = { avanse: 'avanse', vire: 'vire_dwat', repete: 'repete', si_mi: 'simi', jiska: 'zetwal_gri' } as const;

export default function Coding() {
  const t = useT();
  const fr = useStore((s) => s.profile.lang) === 'fr';
  const coding = useStore((s) => s.coding);
  const firstOpen = LEVELS.findIndex((l) => !coding[l.id]);
  return (
    <Screen bottom={<BottomNav />}>
      <Row>
        <View style={{ flex: 1 }}><T v="display">{t('coding_title')}</T><T v="body" color={colors.muted}>{t('coding_sub')}</T></View>
        <Mascot size={72} mood="think" />
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {LEVELS.map((lv, i) => {
          const stars = coding[lv.id] ?? 0;
          const locked = i > (firstOpen === -1 ? LEVELS.length : firstOpen);
          return (
            <FadeIn key={lv.id} delay={80 + Math.min(i, 10) * 40} style={{ width: '47.5%' }}><Card onPress={locked ? undefined : () => router.push(`/coding/${lv.id}`)} style={{ gap: 6, opacity: locked ? 0.5 : 1 }} edge={!locked && !stars ? colors.blue : colors.line}>
              <Row>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: stars ? colors.greenSoft : colors.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
                  {locked ? <Icon name="femen_kle" size={22} /> : <Icon name={CONCEPT_ICON[lv.concept]} size={26} />}
                </View>
                <T v="h2" color={colors.muted}>{lv.id}</T>
              </Row>
              <T v="h3">{fr ? lv.titleFr : lv.title}</T>
              {stars ? <Stars n={stars} size={14} /> : <T v="small" color={colors.muted}>{lv.maze.rows}×{lv.maze.cols} · {t('par', { n: lv.par })}</T>}
            </Card></FadeIn>
          );
        })}
      </View>
    </Screen>
  );
}
