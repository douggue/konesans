import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { courseSummary, BADGES } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Progress, IconTile, Icon, Avatar, PressScale, FadeIn, Pulse, useCountUp } from '@/ui';
import { tap } from '@/lib/audio';
import { colors } from '@/lib/theme';
import { useStore, useLevel, useAvatar } from '@/lib/store';
import { useT } from '@/lib/i18n';

export default function Profile() {
  const t = useT();
  const { profile, progress, stats, courses } = useStore();
  const lvl = useLevel();
  const avatar = useAvatar();
  const words = courseSummary('en', courses.en).wordsLearned + courseSummary('es', courses.es).wordsLearned;
  const badges = Object.keys(progress.badges).length;
  const rows: { icon: 'twofe' | 'ewo' | 'kouwòn' | 'klas' | 'fanmi' | 'paran'; bg: string; label: string; sub: string; href?: string }[] = [
    { icon: 'twofe', bg: colors.yellowSoft, label: t('trophies'), sub: `${badges} / ${BADGES.length}`, href: '/trophies' },
    { icon: 'kouwòn', bg: colors.purpleSoft, label: 'Lig', sub: t('soon') },
    { icon: 'klas', bg: colors.greenSoft, label: t('my_class'), sub: t('soon') },
    { icon: 'fanmi', bg: colors.redSoft, label: t('family'), sub: t('soon') },
    { icon: 'paran', bg: colors.yellowSoft, label: t('parent'), sub: t('parent_only'), href: '/settings' },
  ];
  return (
    <Screen bottom={<BottomNav />}>
      <FadeIn><Row gap={14}>
        <PressScale accessibilityLabel={t('av_edit')} scaleTo={0.92} onPress={() => { tap(); router.push('/avatar'); }}>
          <Avatar a={avatar} size={88} live />
          <View style={{ position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><T v="small">✎</T></View>
        </PressScale>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h1">{profile.username}</T>
          <T v="small" color={colors.muted}>{t('level')} {lvl.level} · {profile.age} an</T>
          <Row><Progress style={{ flex: 1 }} value={lvl.next ? lvl.into / lvl.next : 0} color={colors.blueLight} /><T v="small" color={colors.muted}>{lvl.into} / {lvl.next}</T></Row>
        </View>
      </Row></FadeIn>
      <FadeIn delay={80}><Row gap={10} style={{ alignItems: 'stretch' }}>
        <StatTile n={progress.streak.count} k="p-streak" icon="seri" label={t('streak_short')} bg="#FFE8DC" edge="#F7C9B2" fg="#A63A0A" pulse={progress.streak.count > 0} />
        <StatTile n={progress.coins} k="p-coins" icon="kob" label={t('coins')} bg={colors.yellowSoft} edge="#F5DE96" fg="#5C4600" />
        <StatTile n={stats.duelWins} k="p-wins" icon="twofe" label={t('wins')} bg={colors.greenSoft} edge="#B9E3C6" fg="#12632F" />
      </Row></FadeIn>
      <Card style={{ gap: 4 }}>
        <T v="small" color={colors.muted}>{t('xp')}: {progress.xp} · {stats.correct} bon repons · {stats.lessons} leson · {words} mo</T>
      </Card>
      {rows.map((r, i) => (
        <FadeIn key={r.label} delay={160 + i * 50}><Card onPress={r.href ? () => router.push(r.href as never) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: r.href || r.icon === 'twofe' ? 1 : 0.6 }}>
          <IconTile name={r.icon} bg={r.bg} size={44} />
          <View style={{ flex: 1 }}><T v="h3">{r.label}</T><T v="small" color={colors.muted}>{r.sub}</T></View>
          <Icon name="pwochen" size={20} />
        </Card></FadeIn>
      ))}
      <Card onPress={() => router.push('/settings')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
        <IconTile name="paramet" bg={colors.blueSoft} size={44} />
        <View style={{ flex: 1 }}><T v="h3">{t('settings')}</T><T v="small" color={colors.muted}>{t('sound')} · {t('app_lang')} · {t('text_size')}</T></View>
        <Icon name="pwochen" size={20} />
      </Card>
    </Screen>
  );
}

/** Counter tile: icon on top, big number, one-line label. Same chunky edge as the app's cards. */
function StatTile({ n, k, icon, label, bg, edge, fg, pulse }: { n: number; k: string; icon: 'seri' | 'kob' | 'twofe'; label: string; bg: string; edge: string; fg: string; pulse?: boolean }) {
  const v = useCountUp(n, k);
  const ic = <Icon name={icon} size={30} />;
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 18, borderWidth: 2, borderColor: edge, borderBottomWidth: 5, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 2 }}>
      {pulse ? <Pulse>{ic}</Pulse> : ic}
      <T v="h1" color={fg} style={{ fontVariant: ['tabular-nums'] }}>{v}</T>
      <T v="label" color={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} center style={{ textTransform: "uppercase" }}>{label}</T>
    </View>
  );
}
