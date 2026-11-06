import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { courseSummary, BADGES } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Progress, IconTile, Icon } from '@/ui';
import { colors } from '@/lib/theme';
import { useStore, useLevel } from '@/lib/store';
import { useT } from '@/lib/i18n';

export default function Profile() {
  const t = useT();
  const { profile, progress, stats, courses } = useStore();
  const lvl = useLevel();
  const words = courseSummary('en', courses.en).wordsLearned + courseSummary('es', courses.es).wordsLearned;
  const badges = Object.keys(progress.badges).length;
  const rows: { icon: 'twofe' | 'ewo' | 'kouwòn' | 'klas' | 'fanmi' | 'paran'; bg: string; label: string; sub: string; href?: string }[] = [
    { icon: 'twofe', bg: colors.yellowSoft, label: t('trophies'), sub: `${badges} / ${BADGES.length}` },
    { icon: 'kouwòn', bg: colors.purpleSoft, label: 'Lig', sub: t('soon') },
    { icon: 'klas', bg: colors.greenSoft, label: t('my_class'), sub: t('soon') },
    { icon: 'fanmi', bg: colors.redSoft, label: t('family'), sub: t('soon') },
    { icon: 'paran', bg: colors.yellowSoft, label: t('parent'), sub: t('parent_only'), href: '/settings' },
  ];
  return (
    <Screen bottom={<BottomNav />}>
      <Row gap={14}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.blue, borderWidth: 3, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T v="display" color="#fff">{profile.username[0]}</T></View>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h1">{profile.username}</T>
          <T v="small" color={colors.muted}>{t('level')} {lvl.level} · {profile.age} an</T>
          <Row><Progress style={{ flex: 1 }} value={lvl.next ? lvl.into / lvl.next : 0} color={colors.blueLight} /><T v="small" color={colors.muted}>{lvl.into} / {lvl.next}</T></Row>
        </View>
      </Row>
      <Row gap={8}>
        {[[progress.streak.count, t('streak'), '#FFE8DC', '#A63A0A'], [progress.coins, t('coins'), colors.yellowSoft, '#5C4600'], [stats.duelWins, t('wins'), colors.greenSoft, '#12632F']].map(([n, l, bg, fg]) => (
          <View key={String(l)} style={{ flex: 1, backgroundColor: String(bg), borderRadius: 16, padding: 10, alignItems: 'center' }}><T v="h1" color={String(fg)}>{String(n)}</T><T v="small" color={String(fg)}>{String(l)}</T></View>
        ))}
      </Row>
      <Card style={{ gap: 4 }}>
        <T v="small" color={colors.muted}>{t('xp')}: {progress.xp} · {stats.correct} bon repons · {stats.lessons} leson · {words} mo</T>
      </Card>
      {rows.map((r) => (
        <Card key={r.label} onPress={r.href ? () => router.push(r.href as never) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: r.href || r.icon === 'twofe' ? 1 : 0.6 }}>
          <IconTile name={r.icon} bg={r.bg} size={44} />
          <View style={{ flex: 1 }}><T v="h3">{r.label}</T><T v="small" color={colors.muted}>{r.sub}</T></View>
          <Icon name="pwochen" size={20} />
        </Card>
      ))}
      <Card onPress={() => router.push('/settings')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
        <IconTile name="paramet" bg={colors.blueSoft} size={44} />
        <View style={{ flex: 1 }}><T v="h3">{t('settings')}</T><T v="small" color={colors.muted}>{t('sound')} · {t('app_lang')} · {t('text_size')}</T></View>
        <Icon name="pwochen" size={20} />
      </Card>
    </Screen>
  );
}
