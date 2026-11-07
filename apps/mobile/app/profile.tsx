/** Mwen — profile tab (design/project/Profile.dc.html): avatar, level + rank, counters, and the kid's own spaces. */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { BADGES, daysToFreeze } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Progress, IconTile, Icon, Avatar, PressScale, FadeIn, Pulse, Pop, useCountUp } from '@/ui';
import { RankBadge, RankUpListener, useRankName } from '@/ui/RankUp';
import type { IconName } from '@/ui/icons';
import { tap } from '@/lib/audio';
import { colors } from '@/lib/theme';
import { useStore, useLevel, useAvatar, useRank } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { useCards } from '@/lib/cards';

const INK = '#14213D';

export default function Profile() {
  const t = useT(); const rn = useRankName();
  const { profile, progress, stats } = useStore();
  const lvl = useLevel();
  const kidStreakOn = useStore((s) => s.kidSettings.streakEnabled);
  const rank = useRank();
  const avatar = useAvatar();
  const unlocked = useStore((s) => s.unlocked ?? []);
  const seen = useStore((s) => s.seenUnlocks ?? []);
  useEffect(() => { useStore.getState().syncUnlocks(); }, []);
  const fresh = unlocked.filter((id) => !seen.includes(id)).length;
  const badges = Object.keys(progress.badges).length;
  const cards = useCards((s) => s.owned.length); // the Kat Ewo collection (progress.heroCards is an old, unused field)
  const freezeIn = daysToFreeze(progress);
  const ageKey = profile.age === '6-8' ? 'age_6_8' : profile.age === '9-11' ? 'age_9_11' : 'age_12_14';

  const rows: { icon: IconName; bg: string; label: string; sub: string; href: string; dot?: boolean }[] = [
    { icon: 'avata', bg: '#E7F5FF', label: t('pf_av'), sub: fresh ? t('pf_av_new', { n: fresh }) : t('pf_av_sub'), href: '/avatar', dot: fresh > 0 },
    { icon: 'kob', bg: colors.yellowSoft, label: t('ec_shop'), sub: t('ec_shop_spend'), href: '/avatar?tab=shop' },
    { icon: 'twofe', bg: colors.yellowSoft, label: t('trophies'), sub: t('pf_trophies_sub', { n: badges, m: BADGES.length }), href: '/trophies' },
    { icon: 'ewo', bg: colors.orangeSoft, label: t('pf_cards'), sub: cards ? t('pf_cards_sub', { n: cards }) : t('pf_cards_sub0'), href: '/cards' },
    { icon: 'pwoteje', bg: colors.greenSoft, label: t('ac_row'), sub: t('ac_row_sub'), href: '/account' },
    { icon: 'paramet', bg: colors.blueSoft, label: t('settings'), sub: t('pf_settings_sub'), href: '/settings' },
  ];

  return (
    <Screen pad={20} bottom={<BottomNav />}>
      {/* Header: avatar + name + level line + XP bar */}
      <FadeIn><Row gap={14}>
        <PressScale accessibilityLabel={t('av_edit')} scaleTo={0.92} onPress={() => { tap(); router.push('/avatar'); }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.blueSoft }}>
            <Avatar a={avatar} size={84} live />
          </View>
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: 9, backgroundColor: colors.yellow, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 20h9" /><Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>
          </View>
          {fresh > 0 && <View style={{ position: 'absolute', left: -2, top: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.red, borderWidth: 2, borderColor: '#FFFFFF' }} />}
        </PressScale>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h1" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 26, lineHeight: 29 }}>{profile.username}</T>
          <T v="bold" color={colors.muted} style={{ fontSize: 13, lineHeight: 17 }} numberOfLines={1}>{t('level')} {lvl.level} · {t(ageKey)} · <T v="bold" color={rank.rank.edge === '#000000' ? INK : rank.rank.edge} style={{ fontSize: 13, lineHeight: 17 }}>{rn(rank.rank)}</T></T>
          <Row gap={8} style={{ marginTop: 2 }}>
            <Progress style={{ flex: 1 }} value={lvl.next ? lvl.into / lvl.next : 0} color={colors.blueLight} />
            <T v="small" color={colors.muted} style={{ fontVariant: ['tabular-nums'] }}>{fmt(lvl.into)} / {fmt(lvl.next)}</T>
          </Row>
        </View>
      </Row></FadeIn>

      {/* Counters */}
      <FadeIn delay={60}><Row gap={10} style={{ alignItems: 'stretch' }}>
        <StatTile n={progress.streak.count} k="p-streak" icon="seri" label={t('streak_short')} bg="#FFE8DC" edge="#F7C9B2" fg="#A63A0A" pulse={progress.streak.count > 0} freeze={progress.streak.freezeAvailable && kidStreakOn} />
        <StatTile n={progress.coins} k="p-coins" icon="kob" label={t('coins')} bg={colors.yellowSoft} edge="#F5DE96" fg="#5C4600" a11y={t('ec_shop_spend')} onPress={() => { tap(); router.push({ pathname: '/avatar', params: { tab: 'shop' } } as never); }} />
        <StatTile n={stats.duelWins} k="p-wins" icon="twofe" label={t('wins')} bg={colors.greenSoft} edge="#B9E3C6" fg="#12632F" />
      </Row></FadeIn>
      {kidStreakOn && <FadeIn delay={90}><T v="small" center color={colors.muted}>{freezeIn === 0 ? `🧊 ${t('ec_freeze_have')}` : t('ec_freeze_in', { n: freezeIn })}</T></FadeIn>}

      {/* Rank card */}
      <FadeIn delay={120}>
        <PressScale role="button" accessibilityLabel={`${t('pf_ranks')}: ${rn(rank.rank)}`} scaleTo={0.97} onPress={() => { tap(); router.push('/ranks' as never); }}
          style={({ pressed }) => [{ backgroundColor: rank.rank.soft, borderRadius: 20, borderWidth: 2, borderColor: rank.rank.color, borderBottomWidth: 5, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { borderBottomWidth: 3, transform: [{ translateY: 2 }] }]}>
          <Pop delay={200} rotate={-15}><RankBadge rank={rank.rank} size={56} /></Pop>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="label" color={colors.muted}>{t('pf_rank')}</T>
            <T v="h2" style={{ lineHeight: 23 }}>{rn(rank.rank)}</T>
            <Progress value={rank.progress} color={rank.rank.color} height={8} track="rgba(20,33,61,0.10)" />
            <T v="small" color={colors.muted}>{rank.next ? t('pf_next_rank', { x: fmt(rank.xpToNext), r: rn(rank.next) }) : t('pf_top_rank')}</T>
          </View>
          {rank.next && <RankBadge rank={rank.next} size={30} dim />}
          <Icon name="pwochen" size={20} />
        </PressScale>
      </FadeIn>

      {/* Rows */}
      <View style={{ gap: 8 }}>
        {rows.map((r, i) => (
          <FadeIn key={r.href} delay={180 + i * 50}><Card onPress={() => router.push(r.href as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 60, borderRadius: 18 }}>
            <IconTile name={r.icon} bg={r.bg} size={44} />
            <View style={{ flex: 1 }}>
              <T v="h3">{r.label}</T>
              <T v="small" color={r.dot ? colors.red : colors.muted}>{r.sub}</T>
            </View>
            {r.dot && <Pulse><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red }} /></Pulse>}
            <Icon name="pwochen" size={20} />
          </Card></FadeIn>
        ))}
      </View>
      <RankUpListener />
    </Screen>
  );
}

/** 1 240 — thin space thousands like the mockup. */
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Counter tile: icon on top, big number, one-line label. Same chunky edge as the app's cards. */
function StatTile({ n, k, icon, label, bg, edge, fg, pulse, freeze, onPress, a11y }: { n: number; k: string; icon: 'seri' | 'kob' | 'twofe'; label: string; bg: string; edge: string; fg: string; pulse?: boolean; /** the kid holds a streak freeze */ freeze?: boolean; onPress?: () => void; a11y?: string }) {
  const v = useCountUp(n, k);
  const ic = <Icon name={icon} size={30} />;
  const Box = (onPress ? PressScale : View) as React.ComponentType<any>;
  return (
    <Box {...(onPress ? { role: 'button', accessibilityLabel: `${n} ${label}. ${a11y ?? ''}`, onPress, scaleTo: 0.94 } : {})} style={{ flex: 1, backgroundColor: bg, borderRadius: 18, borderWidth: 2, borderColor: edge, borderBottomWidth: 5, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 2 }}>
      {freeze && <View style={{ position: 'absolute', right: 6, top: 6 }}><T v="small">🧊</T></View>}
      {onPress && <View style={{ position: 'absolute', right: 6, top: 6 }}><Icon name="pwochen" size={16} /></View>}
      {pulse ? <Pulse>{ic}</Pulse> : ic}
      <T v="h1" color={fg} style={{ fontVariant: ['tabular-nums'] }}>{v}</T>
      <T v="label" color={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} center style={{ textTransform: "uppercase" }}>{label}</T>
    </Box>
  );
}
