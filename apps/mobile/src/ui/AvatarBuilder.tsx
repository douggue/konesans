/**
 * Avatar builder (onboarding step + /avatar screen). Live preview bobs; every change pops.
 * Items gated by rank / streak / trophies (core progress/ranks.ts) show a lock and "Debloke nan <rank>";
 * tapping one explains how to get it. Items unlocked since the kid last looked get a "Nouvo" tag.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { router, usePathname } from 'expo-router';
import { RANKS, xpForLevel, unlockFor, isItemOpen, type AvatarConfig, type UnlockDef, type UnlockKind } from '@konesans/core';
import { T, Row, Button, PressScale, Bounce, Icon, Sheet } from './index';
import { Avatar, AvatarArt, SKINS, HAIR_COLORS, SHIRTS, BGS, HAIRS, EXTRAS, FRAMES, randomAvatar } from './avatar';
import { RankBadge, withItem } from './RankUp';
import { colors, radius } from '@/lib/theme';
import { useStore, useUnlockCtx } from '@/lib/store';
import { useT, useL, type StrKey } from '@/lib/i18n';
import { tap, sfx } from '@/lib/audio';

type Tab = 'skin' | 'hair' | 'hairColor' | 'shirt' | 'extra' | 'bg' | 'frame';
const TABS: { id: Tab; label: StrKey }[] = [
  { id: 'skin', label: 'av_skin' }, { id: 'hair', label: 'av_hair' }, { id: 'hairColor', label: 'av_hair_color' },
  { id: 'shirt', label: 'av_clothes' }, { id: 'extra', label: 'av_extra' }, { id: 'bg', label: 'av_bg' }, { id: 'frame', label: 'pf_av_frame' },
];
const BASE_LABEL: Record<string, StrKey> = {
  afro: 'hair_afro', braids: 'hair_braids', short: 'hair_short', puffs: 'hair_puffs', bun: 'pf_hair_bun', mohawk: 'pf_hair_mohawk', locs: 'pf_hair_locs',
  none: 'ex_none', glasses: 'ex_glasses', cap: 'ex_cap', mask: 'ex_mask', uniform: 'ex_uniform',
  headphones: 'pf_ex_headphones', strawhat: 'pf_ex_strawhat', shades: 'pf_ex_shades', crown: 'pf_ex_crown', flower: 'pf_ex_flower',
};

/** Swatch for a shirt colour; the special shirts get their pattern. */
function ShirtSwatch({ i }: { i: number }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40">
      <Rect x="1" y="1" width="38" height="38" rx="11" fill={SHIRTS[i]} />
      {i === 6 && <Path d="M1 12h38M1 20h38M1 28h38" stroke="#4D7CFE" strokeWidth={4} />}
      {i === 7 && <Rect x="1" y="20" width="38" height="19" fill="#D21034" />}
      {i === 8 && <Path d="M20 9l3.2 6.5 7.2 1-5.2 5.1 1.2 7.1L20 25.3l-6.4 3.4 1.2-7.1-5.2-5.1 7.2-1z" fill="#FFFFFF" stroke="#14213D" strokeWidth={1.5} strokeLinejoin="round" />}
      <Rect x="1" y="1" width="38" height="38" rx="11" fill="none" stroke="#14213D" strokeWidth={2} />
    </Svg>
  );
}

type Item = { key: string; on: boolean; pick: () => void; kind?: UnlockKind; value?: string | number; swatch?: string; shirt?: number; preview?: AvatarConfig; badge?: AvatarConfig; label?: string };

export function AvatarBuilder({ value, onChange, size = 170 }: { value: AvatarConfig; onChange: (a: AvatarConfig) => void; size?: number }) {
  const t = useT(); const l = useL();
  const path = usePathname();
  const [tab, setTab] = useState<Tab>('skin');
  const [bump, setBump] = useState(0);
  const [why, setWhy] = useState<UnlockDef | null>(null);
  const owned = useStore((s) => s.unlocked ?? []);
  const ctx = useUnlockCtx();
  const streak = ctx.streak, badges = ctx.badges;
  // what counts as "new" is fixed for this visit; tabs the kid opened are marked seen when leaving
  const seenAtStart = useRef<string[] | null>(null);
  if (seenAtStart.current === null) { useStore.getState().syncUnlocks(); seenAtStart.current = useStore.getState().seenUnlocks ?? []; }
  const visited = useRef(new Set<Tab>(['skin']));
  useEffect(() => () => {
    const s = useStore.getState();
    const ids = (s.unlocked ?? []).filter((id) => visited.current.has(id.split(':')[0] as Tab));
    if (ids.length) s.markUnlocksSeen(ids);
  }, []);

  const set = (p: Partial<AvatarConfig>) => { tap(); setBump((b) => b + 1); onChange({ ...value, ...p }); };
  const isOpen = (kind: UnlockKind, v: string | number) => isItemOpen(kind, v, owned, ctx);
  const isNew = (kind: UnlockKind, v: string | number) => { const d = unlockFor(kind, v); return !!d && owned.includes(d.id) && !seenAtStart.current!.includes(d.id); };
  const tabHasNew = (x: Tab) => x !== 'skin' && owned.some((id) => id.startsWith(x + ':') && !seenAtStart.current!.includes(id)) && !(visited.current.has(x) && x !== tab);

  const items: Item[] =
    tab === 'skin' ? SKINS.map((c, i) => ({ key: c, swatch: c, on: value.skin === i, pick: () => set({ skin: i }) }))
    : tab === 'hair' ? HAIRS.map((h) => ({ key: h, kind: 'hair' as const, value: h, preview: withItem(value, { kind: 'hair', value: h }), label: t(BASE_LABEL[h]), on: value.hair === h, pick: () => set(withItem(value, { kind: 'hair', value: h })) }))
    : tab === 'hairColor' ? HAIR_COLORS.map((c, i) => ({ key: c + i, kind: 'hairColor' as const, value: i, swatch: c, on: value.hairColor === i, pick: () => set({ hairColor: i }) }))
    : tab === 'shirt' ? SHIRTS.map((c, i) => ({ key: c + i, kind: 'shirt' as const, value: i, shirt: i, on: value.shirt === i && value.extra !== 'uniform', pick: () => set({ shirt: i, extra: value.extra === 'uniform' ? 'none' : value.extra }) }))
    : tab === 'extra' ? EXTRAS.map((x) => ({ key: x, kind: 'extra' as const, value: x, preview: { ...value, extra: x }, label: t(BASE_LABEL[x]), on: value.extra === x, pick: () => set({ extra: x }) }))
    : tab === 'bg' ? BGS.map((c, i) => ({ key: c + i, kind: 'bg' as const, value: i, badge: { ...value, bg: i, frame: 0 }, on: value.bg === i, pick: () => set({ bg: i }) }))
    : FRAMES.map((f) => ({ key: 'f' + f, kind: 'frame' as const, value: f, badge: { ...value, frame: f }, on: (value.frame ?? 0) === f, pick: () => set({ frame: f }) }));

  const reqText = (d: UnlockDef) => 'rank' in d.req ? t('pf_unlock_rank', { r: l(RANKS[d.req.rank].name) }) : 'streak' in d.req ? t('pf_unlock_streak', { n: d.req.streak }) : t('pf_unlock_badges', { n: d.req.badges });
  const howText = (d: UnlockDef) => {
    if ('rank' in d.req) { const r = RANKS[d.req.rank]; return t('pf_how_rank', { n: r.level, r: l(r.name), x: Math.max(0, xpForLevel(r.level) - ctx.xp) }); }
    if ('streak' in d.req) return t('pf_how_streak', { n: d.req.streak, s: streak });
    return t('pf_how_badges', { n: d.req.badges, b: badges });
  };
  const inOnboarding = path.startsWith('/onboarding');

  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center' }}>
        <Bounce trigger={bump || null} amount={0.06}>
          <Avatar a={value} size={size} live />
        </Bounce>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2, paddingTop: 6 }}>
        {TABS.map((x) => {
          const on = tab === x.id;
          return (
            <PressScale key={x.id} role="tab" accessibilityState={{ selected: on }} scaleTo={0.92} onPress={() => { tap(); visited.current.add(x.id); setTab(x.id); }}
              style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? colors.ink : colors.card, borderWidth: 2, borderColor: on ? colors.ink : colors.lineStrong }}>
              <T v="bold" color={on ? '#fff' : colors.ink}>{t(x.label)}</T>
              {tabHasNew(x.id) && <View style={{ position: 'absolute', right: -2, top: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.red, borderWidth: 2, borderColor: '#FFFFFF' }} />}
            </PressScale>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map((it) => {
          const open = !it.kind || isOpen(it.kind, it.value!);
          const def = it.kind ? unlockFor(it.kind, it.value!) : undefined;
          const fresh = it.kind ? isNew(it.kind, it.value!) : false;
          return (
            <PressScale key={it.key} role="button" accessibilityLabel={open ? it.label ?? it.key : `${it.label ?? ''} ${def ? reqText(def) : ''}`} accessibilityState={{ selected: it.on, disabled: !open }} scaleTo={0.9}
              onPress={open ? it.pick : () => { tap('error'); sfx('tap'); setWhy(def ?? null); }}
              style={{ width: '22%', minHeight: 74, borderRadius: radius.md, backgroundColor: open ? colors.card : colors.bg, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 2, borderWidth: it.on ? 3 : 2, borderColor: it.on ? colors.blue : colors.lineStrong, borderBottomWidth: it.on ? 3 : 5, borderStyle: open ? 'solid' : 'dashed' }}>
              <View style={{ opacity: open ? 1 : 0.4 }}>
                {it.swatch ? <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: colors.ink, backgroundColor: it.swatch }} />
                  : it.shirt !== undefined ? <ShirtSwatch i={it.shirt} />
                  : it.badge ? <Avatar a={it.badge} size={46} />
                  : it.preview ? <AvatarArt a={it.preview} size={46} /> : null}
              </View>
              {!open && <View style={{ position: 'absolute', top: 4, right: 4 }}><Icon name="femen_kle" size={20} /></View>}
              {!open && def ? <T v="small" center numberOfLines={2} color={colors.muted} style={{ fontSize: 10, lineHeight: 12 }}>{reqText(def)}</T>
                : it.label ? <T v="small" center numberOfLines={1}>{it.label}</T> : null}
              {fresh && <View style={{ position: 'absolute', top: -8, right: -6, backgroundColor: colors.red, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 2, borderColor: '#FFFFFF' }}><T v="small" color="#FFFFFF" style={{ fontSize: 10, lineHeight: 13 }}>{t('new_badge')}</T></View>}
            </PressScale>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'center' }}>
        <Button small variant="secondary" icon="chanje" title={t('av_random')} onPress={() => { setBump((b) => b + 1); onChange({ ...randomAvatar(), frame: value.frame }); }} />
      </Row>
      <Sheet open={!!why} title={t('pf_locked')}>
        {why && <View style={{ alignItems: 'center', gap: 10 }}>
          <Row gap={14} style={{ justifyContent: 'center' }}>
            <View>
              <Avatar a={withItem(value, why)} size={92} />
              <View style={{ position: 'absolute', right: -6, bottom: -6, backgroundColor: colors.card, borderRadius: 14, padding: 3, borderWidth: 2, borderColor: colors.line }}><Icon name="femen_kle" size={24} /></View>
            </View>
            {'rank' in why.req && <RankBadge rank={RANKS[why.req.rank]} size={72} />}
          </Row>
          <T v="h2" center>{reqText(why)}</T>
          <T v="body" center color={colors.muted}>{howText(why)}</T>
        </View>}
        {why && 'rank' in why.req && !inOnboarding && <Button title={t('pf_see_ranks')} color="#7048E8" onPress={() => { setWhy(null); router.push('/ranks' as never); }} />}
        <Button title={t('pf_ok')} variant="secondary" onPress={() => setWhy(null)} />
      </Sheet>
    </View>
  );
}
