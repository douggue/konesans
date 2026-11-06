/** Ran yo — every rank from Ti Grenn to Lejand, what each unlocks, and where the kid is now. */
import React from 'react';
import { View } from 'react-native';
import { RANKS, UNLOCKS, rankUnlocks } from '@konesans/core';
import { Screen, T, Row, TopBar, Progress, Icon, Mascot, FadeIn, Pop, Bob } from '@/ui';
import { RankBadge, UnlockChip, RankUpListener } from '@/ui/RankUp';
import { colors } from '@/lib/theme';
import { useStore, useLevel, useRank } from '@/lib/store';
import { useT, useL } from '@/lib/i18n';

const INK = '#14213D';
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function Ranks() {
  const t = useT(); const l = useL();
  const xp = useStore((s) => s.progress.xp);
  const streak = useStore((s) => s.progress.streak.count);
  const badges = useStore((s) => Object.keys(s.progress.badges).length);
  const owned = useStore((s) => s.unlocked ?? []);
  const lvl = useLevel();
  const cur = useRank();
  const bonus = UNLOCKS.filter((u) => !('rank' in u.req));

  return (
    <Screen>
      <FadeIn><TopBar title={t('pf_ranks')} sub={t('pf_ranks_sub', { l: lvl.level, xp: fmt(xp) })} /></FadeIn>

      {/* Where I am */}
      <FadeIn delay={60}>
        <View style={{ backgroundColor: cur.rank.color, borderRadius: 24, borderWidth: 3, borderColor: INK, borderBottomWidth: 8, padding: 18, gap: 12, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: '#FFFFFF', opacity: 0.12 }} />
          <Row gap={14}>
            <Pop rotate={-20}><RankBadge rank={cur.rank} size={86} /></Pop>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label" color="#FFFFFF" style={{ opacity: 0.85 }}>{t('pf_rank')}</T>
              <T v="display" color="#FFFFFF" style={{ fontSize: 30, lineHeight: 34 }}>{l(cur.rank.name)}</T>
              <T v="bold" color="#FFFFFF" style={{ opacity: 0.9 }}>{t('pf_rank_level', { n: lvl.level })}</T>
            </View>
            <Bob><Mascot size={70} mood={cur.next ? 'proud' : 'cool'} /></Bob>
          </Row>
          <Progress value={cur.progress} color={colors.yellow} track="rgba(255,255,255,0.3)" height={12} />
          <T v="bold" color="#FFFFFF">{cur.next ? t('pf_next_rank', { x: fmt(cur.xpToNext), r: l(cur.next.name) }) : t('pf_top_rank')}</T>
        </View>
      </FadeIn>
      <T v="body" color={colors.muted}>{t('pf_ranks_intro')}</T>

      {/* The ladder */}
      <View style={{ gap: 0 }}>
        {RANKS.map((r, i) => {
          const done = i < cur.index, here = i === cur.index, ahead = i > cur.index;
          const items = rankUnlocks(i);
          return (
            <FadeIn key={r.id} delay={120 + i * 45}>
              <Row gap={12} center={false} style={{ alignItems: 'stretch' }}>
                {/* rail */}
                <View style={{ width: 52, alignItems: 'center' }}>
                  <View style={{ width: 4, height: 8, backgroundColor: i === 0 ? 'transparent' : done || here ? r.color : colors.line }} />
                  <RankBadge rank={r} size={here ? 52 : 44} dim={ahead} />
                  <View style={{ width: 4, flex: 1, minHeight: 10, backgroundColor: i === RANKS.length - 1 ? 'transparent' : done ? RANKS[i + 1].color : colors.line }} />
                </View>
                <View style={{ flex: 1, marginTop: 8, marginBottom: 10, backgroundColor: here ? r.soft : colors.card, borderRadius: 18, borderWidth: here ? 3 : 2, borderColor: here ? r.color : colors.line, borderBottomWidth: 5, padding: 12, gap: 8, opacity: ahead ? 0.92 : 1 }}>
                  <Row gap={8}>
                    <View style={{ flex: 1 }}>
                      <T v="h3" color={ahead ? colors.muted : colors.ink}>{l(r.name)}</T>
                      <T v="small" color={colors.muted}>{t('pf_rank_level', { n: r.level })}</T>
                    </View>
                    {here && <View style={{ backgroundColor: r.color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, borderWidth: 2, borderColor: INK }}><T v="label" color="#FFFFFF">{t('pf_you_here')}</T></View>}
                    {done && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="bon" size={20} /><T v="label" color={colors.green}>{t('pf_rank_done')}</T></View>}
                    {ahead && <Icon name="femen_kle" size={22} />}
                  </Row>
                  {items.length > 0
                    ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{items.map((u) => <UnlockChip key={u.id} u={u} size={44} dim={ahead && !owned.includes(u.id)} />)}</View>
                    : <T v="small" color={colors.muted}>{t('pf_rank_free')}</T>}
                </View>
              </Row>
            </FadeIn>
          );
        })}
      </View>

      {/* Streak / trophy gifts */}
      <FadeIn delay={600}><T v="h2">{t('pf_bonus')}</T></FadeIn>
      <View style={{ gap: 8 }}>
        {bonus.map((u, i) => {
          const have = owned.includes(u.id);
          const need = 'streak' in u.req ? u.req.streak : 'badges' in u.req ? u.req.badges : 0;
          const now = 'streak' in u.req ? streak : badges;
          return (
            <FadeIn key={u.id} delay={640 + i * 50}>
              <Row gap={12} style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 2, borderColor: have ? colors.greenLight : colors.line, borderBottomWidth: 5, padding: 12 }}>
                <UnlockChip u={u} size={48} dim={!have} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Row gap={6}><Icon name={'streak' in u.req ? 'seri' : 'twofe'} size={22} /><T v="h3">{'streak' in u.req ? t('pf_req_streak', { n: need }) : t('pf_req_badges', { n: need })}</T></Row>
                  <Row gap={8}><Progress style={{ flex: 1 }} value={have ? 1 : Math.min(1, now / need)} color={have ? colors.green : colors.orange} height={8} /><T v="small" color={colors.muted}>{have ? need : Math.min(now, need)} / {need}</T></Row>
                </View>
                {have ? <Icon name="bon" size={24} /> : <Icon name="femen_kle" size={22} />}
              </Row>
            </FadeIn>
          );
        })}
      </View>
      <RankUpListener />
    </Screen>
  );
}
