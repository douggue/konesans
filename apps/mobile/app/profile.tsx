/** Mwen — profile tab (design/project/Profile.dc.html): avatar, level + rank, counters, and the kid's own spaces. */
import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { BADGES, daysToFreeze, localDay } from '@konesans/core';
import { Screen, T, Card, Row, BottomNav, Progress, IconTile, Icon, Avatar, PressScale, FadeIn, Pulse, Pop, useCountUp, DEEP_GREEN } from '@/ui';
import { useBadgeGoals } from '@/lib/badgeGoals';
import { RankBadge, RankUpListener, useRankName } from '@/ui/RankUp';
import type { IconName } from '@/ui/icons';
import { tap } from '@/lib/audio';
import { colors } from '@/lib/theme';
import { useStore, useLevel, useAvatar, useRank } from '@/lib/store';
import { useT, type StrKey } from '@/lib/i18n';
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

  const rows: { icon: IconName; bg: string; label: string; sub: string; href: string; dot?: boolean; /** a long label may take 2 lines */ lines?: number }[] = [
    { icon: 'avata', bg: '#E7F5FF', label: t('pf_av'), sub: fresh ? t('pf_av_new', { n: fresh }) : t('pf_av_sub'), href: '/avatar', dot: fresh > 0 },
    { icon: 'kob', bg: colors.yellowSoft, label: t('ec_shop'), sub: t('ec_shop_spend'), href: '/avatar?tab=shop' },
    { icon: 'twofe', bg: colors.yellowSoft, label: t('trophies'), sub: t('pf_trophies_sub', { n: badges, m: BADGES.length }), href: '/trophies' },
    { icon: 'ewo', bg: colors.orangeSoft, label: t('pf_cards'), sub: cards ? t('pf_cards_sub', { n: cards }) : t('pf_cards_sub0'), href: '/cards' },
    { icon: 'pwoteje', bg: colors.greenSoft, label: t('ac_row'), sub: t('ac_row_sub'), href: '/account', lines: 2 },
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
          <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 2 }}>
            <Chip icon="kob" text={t('pf_coins_chip', { n: fmt(progress.coins) })} bg={colors.yellowSoft} fg="#5C4600" a11y={t('ec_shop_spend')} onPress={() => { tap(); router.push({ pathname: '/avatar', params: { tab: 'shop' } } as never); }} />
            <Chip icon="twofe" text={t('pf_wins_chip', { n: stats.duelWins })} bg={colors.greenSoft} fg="#12632F" />
          </Row>
        </View>
      </Row></FadeIn>

      {/* Stat tiles: streak · best streak · XP · rank */}
      <FadeIn delay={60}><View style={{ gap: 10 }}>
        <Row gap={10} style={{ alignItems: 'stretch' }}>
          <StatTile n={progress.streak.count} k="p-streak" icon="seri" label={t('pf_streak_days')} bg="#FFE8DC" edge="#F7C9B2" fg="#A63A0A" pulse={progress.streak.count > 0} freeze={progress.streak.freezeAvailable && kidStreakOn} />
          <StatTile n={Math.max(stats.bestStreak ?? 0, progress.streak.count)} k="p-best" icon="badj" label={t('pf_best_streak')} bg={colors.purpleSoft} edge="#D3C6FB" fg="#4B2FA8" />
        </Row>
        <Row gap={10} style={{ alignItems: 'stretch' }}>
          <StatTile n={progress.xp} k="p-xp" icon="pwen" label={t('pf_total_xp')} bg={colors.yellowSoft} edge="#F5DE96" fg="#5C4600" fmtN={fmt} />
          {/* Ran: tap → the ranks ladder (the old rank card's progress bar lives on, small) */}
          <PressScale role="button" accessibilityLabel={`${t('pf_ranks')}: ${rn(rank.rank)}`} scaleTo={0.95} onPress={() => { tap(); router.push('/ranks' as never); }}
            style={({ pressed }) => [{ flex: 1, backgroundColor: rank.rank.soft, borderRadius: 18, borderWidth: 2, borderColor: rank.rank.color, borderBottomWidth: 5, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center', gap: 2 }, pressed && { borderBottomWidth: 3, transform: [{ translateY: 2 }] }]}>
            <View style={{ position: 'absolute', right: 6, top: 6 }}><Icon name="pwochen" size={16} /></View>
            <Pop delay={200} rotate={-15}><RankBadge rank={rank.rank} size={34} /></Pop>
            <T v="h2" center>{rn(rank.rank)}</T>
            <Progress style={{ width: '80%' }} value={rank.progress} color={rank.rank.color} height={6} track="rgba(20,33,61,0.10)" />
            <T v="label" center color={colors.ink} style={{ textTransform: 'uppercase', marginTop: 2 }}>{t('pf_rank_tile')}</T>
          </PressScale>
        </Row>
        <T v="small" center color={colors.muted}>{rank.next ? t('pf_next_rank', { x: fmt(rank.xpToNext), r: rn(rank.next) }) : t('pf_top_rank')}</T>
      </View></FadeIn>

      {/* This week's streak */}
      {kidStreakOn && <FadeIn delay={110}><WeekCard count={progress.streak.count} lastDay={progress.streak.lastDay} freezeNote={freezeIn === 0 ? `🧊 ${t('ec_freeze_have')}` : t('ec_freeze_in', { n: freezeIn })} /></FadeIn>}

      {/* Trophies carousel */}
      <FadeIn delay={150}><TrophyCarousel /></FadeIn>

      {/* Rows */}
      <View style={{ gap: 8 }}>
        {rows.map((r, i) => (
          <FadeIn key={r.href} delay={180 + i * 50}><Card onPress={() => router.push(r.href as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 60, borderRadius: 18 }}>
            <IconTile name={r.icon} bg={r.bg} size={44} />
            <View style={{ flex: 1 }}>
              {/* one line: a short last word ("Avata m", "Twofe m") never wraps alone; the long account label wraps to 2 */}
              <T v="h3" numberOfLines={r.lines ?? 1} adjustsFontSizeToFit={!r.lines} minimumFontScale={0.75}>{r.label}</T>
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
function StatTile({ n, k, icon, label, bg, edge, fg, pulse, freeze, onPress, a11y, fmtN }: { n: number; k: string; icon: IconName; label: string; fmtN?: (n: number) => string; bg: string; edge: string; fg: string; pulse?: boolean; /** the kid holds a streak freeze */ freeze?: boolean; onPress?: () => void; a11y?: string }) {
  const v = useCountUp(n, k);
  const ic = <Icon name={icon} size={34} />;
  const Box = (onPress ? PressScale : View) as React.ComponentType<any>;
  return (
    <Box {...(onPress ? { role: 'button', accessibilityLabel: `${n} ${label}. ${a11y ?? ''}`, onPress, scaleTo: 0.94 } : {})} style={{ flex: 1, backgroundColor: bg, borderRadius: 18, borderWidth: 2, borderColor: edge, borderBottomWidth: 5, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 2 }}>
      {freeze && <View style={{ position: 'absolute', right: 6, top: 6 }}><T v="small">🧊</T></View>}
      {onPress && <View style={{ position: 'absolute', right: 6, top: 6 }}><Icon name="pwochen" size={16} /></View>}
      {pulse ? <Pulse>{ic}</Pulse> : ic}
      <T v="h1" color={fg} style={{ fontVariant: ['tabular-nums'] }}>{fmtN ? fmtN(v) : v}</T>
      <T v="label" color={fg} center style={{ textTransform: 'uppercase' }}>{label}</T>
    </Box>
  );
}

function Chip({ icon, text, bg, fg, onPress, a11y }: { icon: IconName; text: string; bg: string; fg: string; onPress?: () => void; a11y?: string }) {
  const body = <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, minHeight: 28 }}><Icon name={icon} size={16} /><T v="small" color={fg}>{text}</T>{onPress ? <Icon name="pwochen" size={12} /> : null}</View>;
  return onPress ? <PressScale role="button" accessibilityLabel={`${text}. ${a11y ?? ''}`} scaleTo={0.94} onPress={onPress} style={{ minHeight: 44, justifyContent: 'center' }}>{body}</PressScale> : body;
}

const dayMs = 86_400_000;
const dayNum = (d: string) => Math.round(Date.parse(d + 'T00:00:00Z') / dayMs);

/** "N jou seri" + this week's day circles (Mon→Sun). A day is lit when it is inside the current streak. */
function WeekCard({ count, lastDay, freezeNote }: { count: number; lastDay: string | null; freezeNote: string }) {
  const t = useT();
  const today = dayNum(localDay(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Port-au-Prince'));
  const dow = (new Date(today * dayMs).getUTCDay() + 6) % 7; // 0 = Monday
  const monday = today - dow;
  const last = lastDay ? dayNum(lastDay) : null;
  // a streak whose last day is before yesterday is already broken: nothing lit
  const alive = last !== null && today - last <= 1 && count > 0;
  const lit = (d: number) => alive && d <= last! && d > last! - count;
  const letters = t('pf_week').split(',');
  const names = t('pf_week_a11y').split(',');
  const title = count === 1 ? t('pf_streak_title_1') : t('pf_streak_title', { n: count });
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 22, borderWidth: 2, borderColor: colors.line, borderBottomWidth: 5, padding: 16, gap: 12 }}>
      <Row gap={14}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFE8DC', alignItems: 'center', justifyContent: 'center' }}>
          {count > 0 ? <Pulse amount={0.1}><Icon name="seri" size={44} /></Pulse> : <View style={{ opacity: 0.45 }}><Icon name="seri" size={44} /></View>}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h1" color={count > 0 ? '#A63A0A' : colors.ink}>{title}</T>
          <T v="small" color={colors.muted}>{count > 0 ? t('pf_streak_keep') : t('pf_streak_none')}</T>
        </View>
      </Row>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {letters.map((L, i) => {
          const d = monday + i; const on = lit(d); const isToday = d === today; const future = d > today;
          return (
            <View key={i} accessible accessibilityLabel={`${names[i]}: ${on ? t('pf_day_done') : t('pf_day_todo')}`} style={{ alignItems: 'center', gap: 4 }}>
              <Pop delay={200 + i * 60} from={0.6}>
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.orange : future ? colors.bg : colors.card, borderWidth: 2, borderColor: on ? '#D9731F' : isToday ? colors.orange : colors.line, borderBottomWidth: on ? 4 : 2 }}>
                  <T v="bold" color={on ? colors.ink : isToday ? '#A63A0A' : colors.muted}>{on ? '✓' : L}</T>
                </View>
              </Pop>
              {isToday ? <View style={{ width: 16, height: 4, borderRadius: 2, backgroundColor: colors.orange }} /> : <View style={{ height: 4 }} />}
            </View>
          );
        })}
      </View>
      <T v="small" center color={colors.muted}>{freezeNote}</T>
    </View>
  );
}

const TIER_RING: Record<string, string> = { bronz: '#E0915F', ajan: '#A9B4C8', lo: colors.yellowDark };

/** Trophies as a horizontal carousel: progress rings fill toward each one; earned ones are full and coloured. */
function TrophyCarousel() {
  const t = useT();
  const { progress, profile } = useStore();
  const goal = useBadgeGoals();
  const fr = profile.lang === 'fr';
  const earned = BADGES.filter((b) => progress.badges[b.id]).length;
  // earned first, then the closest to done
  const list = [...BADGES].sort((a, b) => {
    const pa = progress.badges[a.id] ? 2 : goal[a.id] ? Math.min(1, goal[a.id]![0] / goal[a.id]![1]) : -1;
    const pb = progress.badges[b.id] ? 2 : goal[b.id] ? Math.min(1, goal[b.id]![0] / goal[b.id]![1]) : -1;
    return pb - pa;
  });
  const R = 34, SW = 7, S = (R + SW) * 2;
  return (
    <View style={{ gap: 8 }}>
      <Row>
        <T v="h2" style={{ flex: 1 }}>{t('trophies')} <T v="h3" color={colors.muted}>{earned} / {BADGES.length}</T></T>
        <PressScale role="button" accessibilityLabel={`${t('pf_see_all')}: ${t('trophies')}`} onPress={() => { tap(); router.push('/trophies'); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
          <T v="h3" color={colors.blue}>{t('pf_see_all')}</T>
        </PressScale>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {list.map((b, i) => {
          const on = !!progress.badges[b.id];
          const g = goal[b.id];
          const p = on ? 1 : g ? Math.min(1, g[0] / g[1]) : 0;
          const ring = TIER_RING[b.tier];
          const name = fr ? b.nameFr : b.name;
          const circ = 2 * Math.PI * R;
          return (
            <FadeIn key={b.id} delay={200 + i * 50} x={20} from={0}>
              <PressScale role="button" accessibilityLabel={`${name}. ${on ? t(`tier_${b.tier}` as StrKey) : g ? `${Math.min(g[0], g[1])} / ${g[1]}` : t('locked')}`} scaleTo={0.94} onPress={() => { tap(); router.push('/trophies'); }} style={{ width: 96, alignItems: 'center', gap: 4 }}>
                <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg width={S} height={S} style={{ position: 'absolute' }}>
                    <Circle cx={S / 2} cy={S / 2} r={R} stroke={colors.line} strokeWidth={SW} fill={on ? colors.card : colors.bg} />
                    {p > 0 && <Circle cx={S / 2} cy={S / 2} r={R} stroke={on ? ring : DEEP_GREEN} strokeWidth={SW} fill="none" strokeLinecap="round" strokeDasharray={`${p * circ} ${circ}`} transform={`rotate(-90 ${S / 2} ${S / 2})`} />}
                  </Svg>
                  <View style={{ opacity: on ? 1 : 0.35 }}><Icon name="twofe" size={38} /></View>
                  {!on && <View style={{ position: 'absolute', right: 6, bottom: 4, backgroundColor: colors.card, borderRadius: 12, padding: 2 }}><Icon name="femen_kle" size={18} /></View>}
                </View>
                <T v="small" center color={on ? colors.ink : colors.muted}>{name}</T>
              </PressScale>
            </FadeIn>
          );
        })}
      </ScrollView>
    </View>
  );
}
