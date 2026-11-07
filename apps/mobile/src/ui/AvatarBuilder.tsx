/**
 * Avatar builder (onboarding step + /avatar screen). Live preview bobs; every change pops.
 * Items gated by rank / streak / trophies (core progress/ranks.ts) show a centred lock and a short label
 * (rank name, "7 jou", "3 <trophy>"); tapping any locked item explains how to get it. Items unlocked since the kid last looked get a "Nouvo" tag.
 * With `shop` (the /avatar screen), the Boutik: items sold for coins (core progress/shop.ts) show their price; a
 * "Boutik" tab lists them all; buying asks first (confirm sheet), plays the coin sound and puts the item on.
 * Without `shop` (onboarding) the shop items are hidden.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { RANKS, SHOP_ITEMS, xpForLevel, unlockFor, isItemOpen, shopItemFor, type AvatarConfig, type UnlockDef, type UnlockKind, type ShopItem } from '@konesans/core';
import { T, Row, Button, PressScale, Bounce, Icon, Sheet, CountPill, Pill, Burst } from './index';
import { Avatar, AvatarArt, SKINS, HAIR_COLORS, SHIRTS, BGS, HAIRS, EXTRAS, FRAMES, randomAvatar } from './avatar';
import { RankBadge, withItem, useRankName, useUnlockLabel } from './RankUp';
import { colors, radius } from '@/lib/theme';
import { useStore, useUnlockCtx } from '@/lib/store';
import { useT, type StrKey } from '@/lib/i18n';
import { tap, sfx } from '@/lib/audio';

export type Tab = 'shop' | 'skin' | 'hair' | 'hairColor' | 'shirt' | 'extra' | 'bg' | 'frame';
const TABS: { id: Tab; label: StrKey }[] = [
  { id: 'shop', label: 'ec_shop' },
  { id: 'skin', label: 'av_skin' }, { id: 'hair', label: 'av_hair' }, { id: 'hairColor', label: 'av_hair_color' },
  { id: 'shirt', label: 'av_clothes' }, { id: 'extra', label: 'av_extra' }, { id: 'bg', label: 'av_bg' }, { id: 'frame', label: 'pf_av_frame' },
];
const BASE_LABEL: Record<string, StrKey> = {
  afro: 'hair_afro', braids: 'hair_braids', short: 'hair_short', puffs: 'hair_puffs', bun: 'pf_hair_bun', mohawk: 'pf_hair_mohawk', locs: 'pf_hair_locs',
  none: 'ex_none', glasses: 'ex_glasses', cap: 'ex_cap', mask: 'ex_mask', uniform: 'ex_uniform',
  headphones: 'pf_ex_headphones', strawhat: 'pf_ex_strawhat', shades: 'pf_ex_shades', crown: 'pf_ex_crown', flower: 'pf_ex_flower',
  bowtie: 'pf_ex_bowtie', catears: 'pf_ex_catears', headwrap: 'pf_ex_headwrap',
};

/** Swatch for a shirt colour; the special shirts get their pattern. */
function ShirtSwatch({ i }: { i: number }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40">
      <Rect x="1" y="1" width="38" height="38" rx="11" fill={SHIRTS[i]} />
      {i === 6 && <Path d="M1 12h38M1 20h38M1 28h38" stroke="#4D7CFE" strokeWidth={4} />}
      {i === 7 && <Rect x="1" y="20" width="38" height="19" fill="#D21034" />}
      {i === 8 && <Path d="M20 9l3.2 6.5 7.2 1-5.2 5.1 1.2 7.1L20 25.3l-6.4 3.4 1.2-7.1-5.2-5.1 7.2-1z" fill="#FFFFFF" stroke="#14213D" strokeWidth={1.5} strokeLinejoin="round" />}
      {i === 9 && <><Path d="M1 13h38M1 27h38" stroke="#D21034" strokeWidth={5} opacity={0.85} /><Path d="M13 1v38M27 1v38" stroke="#2F9E44" strokeWidth={5} opacity={0.75} /></>}
      {i === 10 && <>{[[10, 12, '#FFD43B'], [28, 10, '#FF5A6E'], [18, 24, '#51CF66'], [31, 28, '#FFD43B'], [9, 32, '#4D7CFE']].map(([x, y, c], k) => <Path key={k} d={`M${x} ${Number(y) - 4}l4 4-4 4-4-4z`} fill={String(c)} stroke="#14213D" strokeWidth={1} />)}</>}
      {i === 11 && <><Path d="M9 1v38M31 1v38" stroke="#FFFFFF" strokeWidth={5} /><Path d="M18 14l4-2v16" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></>}
      <Rect x="1" y="1" width="38" height="38" rx="11" fill="none" stroke="#14213D" strokeWidth={2} />
    </Svg>
  );
}

type Item = { key: string; on: boolean; pick: () => void; kind?: UnlockKind; value?: string | number; swatch?: string; shirt?: number; preview?: AvatarConfig; badge?: AvatarConfig; label?: string };

export function AvatarBuilder({ value, onChange, size = 170, shop = false, initialTab }: { value: AvatarConfig; onChange: (a: AvatarConfig) => void; size?: number; /** show the Boutik (coins → items) */ shop?: boolean; initialTab?: Tab }) {
  const t = useT(); const rn = useRankName(); const itemName = useUnlockLabel();
  const [tab, setTab] = useState<Tab>(shop && initialTab ? initialTab : 'skin');
  const [bump, setBump] = useState(0);
  const [why, setWhy] = useState<UnlockDef | null>(null);
  const [buying, setBuying] = useState<ShopItem | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);
  const unlocked = useStore((s) => s.unlocked);
  const bought = useStore((s) => s.bought);
  const coins = useStore((s) => s.progress.coins);
  const owned = React.useMemo(() => [...(unlocked ?? []), ...(bought ?? [])], [unlocked, bought]);
  const ctx = useUnlockCtx();
  const streak = ctx.streak, badges = ctx.badges;
  // what counts as "new" is fixed for this visit; tabs the kid opened are marked seen when leaving
  const seenAtStart = useRef<string[] | null>(null);
  if (seenAtStart.current === null) { useStore.getState().syncUnlocks(); seenAtStart.current = useStore.getState().seenUnlocks ?? []; }
  const visited = useRef(new Set<Tab>(['skin', tab]));
  useEffect(() => () => {
    const s = useStore.getState();
    const ids = (s.unlocked ?? []).filter((id) => visited.current.has(id.split(':')[0] as Tab));
    if (ids.length) s.markUnlocksSeen(ids);
  }, []);

  const set = (p: Partial<AvatarConfig>) => { tap(); setBump((b) => b + 1); onChange({ ...value, ...p }); };
  const isOpen = (kind: UnlockKind, v: string | number) => isItemOpen(kind, v, owned, ctx);
  const isNew = (kind: UnlockKind, v: string | number) => { const d = unlockFor(kind, v); return !!d && owned.includes(d.id) && !seenAtStart.current!.includes(d.id); };
  const tabHasNew = (x: Tab) => x !== 'skin' && owned.some((id) => id.startsWith(x + ':') && !seenAtStart.current!.includes(id)) && !(visited.current.has(x) && x !== tab);

  const sold = (kind: UnlockKind, v: string | number) => !!shopItemFor(kind, v);
  /** onboarding: shop items are not shown at all */
  const shown = (list: Item[]): Item[] => (shop ? list : list.filter((x) => !x.kind || !sold(x.kind, x.value!)));
  const shopItems: Item[] = SHOP_ITEMS.map((it) => {
    const on = it.kind === 'frame' ? (value.frame ?? 0) === it.value : (value as unknown as Record<string, unknown>)[it.kind] === it.value;
    const base = { key: it.id, kind: it.kind, value: it.value, label: itemName(it), on, pick: () => set(withItem(value, it)) };
    if (it.kind === 'hairColor') return { ...base, swatch: HAIR_COLORS[it.value as number] };
    if (it.kind === 'shirt') return { ...base, shirt: it.value as number };
    if (it.kind === 'extra') return { ...base, preview: { ...value, extra: it.value as AvatarConfig['extra'] } };
    if (it.kind === 'bg') return { ...base, badge: { ...value, bg: it.value as number, frame: 0 } };
    return { ...base, badge: { ...value, frame: it.value as number } };
  });
  const items: Item[] = tab === 'shop' ? shopItems : shown(
    tab === 'skin' ? SKINS.map((c, i) => ({ key: c, swatch: c, on: value.skin === i, pick: () => set({ skin: i }) }))
    : tab === 'hair' ? HAIRS.map((h) => ({ key: h, kind: 'hair' as const, value: h, preview: withItem(value, { kind: 'hair', value: h }), label: t(BASE_LABEL[h]), on: value.hair === h, pick: () => set(withItem(value, { kind: 'hair', value: h })) }))
    : tab === 'hairColor' ? HAIR_COLORS.map((c, i) => ({ key: c + i, kind: 'hairColor' as const, value: i, swatch: c, on: value.hairColor === i, pick: () => set({ hairColor: i }) }))
    : tab === 'shirt' ? SHIRTS.map((c, i) => ({ key: c + i, kind: 'shirt' as const, value: i, shirt: i, on: value.shirt === i && value.extra !== 'uniform', pick: () => set({ shirt: i, extra: value.extra === 'uniform' ? 'none' : value.extra }) }))
    : tab === 'extra' ? EXTRAS.map((x) => ({ key: x, kind: 'extra' as const, value: x, preview: { ...value, extra: x }, label: t(BASE_LABEL[x]), on: value.extra === x, pick: () => set({ extra: x }) }))
    : tab === 'bg' ? BGS.map((c, i) => ({ key: c + i, kind: 'bg' as const, value: i, badge: { ...value, bg: i, frame: 0 }, on: value.bg === i, pick: () => set({ bg: i }) }))
    : FRAMES.map((f) => ({ key: 'f' + f, kind: 'frame' as const, value: f, badge: { ...value, frame: f }, on: (value.frame ?? 0) === f, pick: () => set({ frame: f }) })));
  const tabs = shop ? TABS : TABS.filter((x) => x.id !== 'shop');

  function buy(it: ShopItem) {
    if (!useStore.getState().buyItem(it.id)) { tap('error'); return; }
    tap('success'); sfx('coin'); setTimeout(() => sfx('coin'), 260);
    setJustBought(it.id);
    setBuying(null);
    setBump((b) => b + 1);
    onChange(withItem(value, it)); // put it on right away
  }

  const reqText = (d: UnlockDef) => 'rank' in d.req ? t('pf_unlock_rank', { r: rn(RANKS[d.req.rank]) }) : 'streak' in d.req ? t('pf_unlock_streak', { n: d.req.streak }) : t('pf_unlock_badges', { n: d.req.badges });
  const howText = (d: UnlockDef) => {
    if ('rank' in d.req) { const r = RANKS[d.req.rank]; return t('pf_how_rank', { n: r.level, r: rn(r), x: Math.max(0, xpForLevel(r.level) - ctx.xp) }); }
    if ('streak' in d.req) return t('pf_how_streak', { n: d.req.streak, s: streak });
    return t('pf_how_badges', { n: d.req.badges, b: badges });
  };
  /** Short label under a locked tile: rank name, "7 jou" or "3 <trophy>" (the sheet explains the rest). */
  const shortReq = (d: UnlockDef) => {
    const small = { fontSize: 11, lineHeight: 13 };
    if ('rank' in d.req) return <T v="small" center color={colors.muted} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={small}>{rn(RANKS[d.req.rank])}</T>;
    if ('streak' in d.req) return <T v="small" center color={colors.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={small}>{`${d.req.streak} ${t('days')}`}</T>;
    return <Row gap={2} style={{ justifyContent: 'center' }}><T v="small" color={colors.muted} style={small}>{String(d.req.badges)}</T><Icon name="twofe" size={16} /></Row>;
  };
  const GAP = 10;
  const [gridW, setGridW] = useState(0);
  const tileW = gridW ? Math.floor((gridW - GAP * 3) / 4) : '22%';

  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center' }}>
        <Bounce trigger={bump || null} amount={0.06}>
          <Avatar a={value} size={size} live />
        </Bounce>
        <Burst trigger={justBought} count={14} radius={size * 0.7} />
        {shop && <View style={{ position: 'absolute', right: 0, top: 0 }}><CountPill value={coins} k="coins" icon="kob" color="#5C4600" bg={colors.yellowSoft} /></View>}
      </View>
      {/* tabs wrap onto a second line instead of scrolling off the edge (360 px, big text) */}
      <View role="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 2, paddingTop: 6 }}>
        {tabs.map((x) => {
          const on = tab === x.id;
          return (
            <PressScale key={x.id} role="tab" accessibilityState={{ selected: on }} scaleTo={0.92} onPress={() => { tap(); visited.current.add(x.id); setTab(x.id); }}
              style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: on ? colors.ink : x.id === 'shop' ? colors.yellowSoft : colors.card, borderWidth: 2, borderColor: on ? colors.ink : x.id === 'shop' ? colors.yellowDark : colors.lineStrong }}>
              {x.id === 'shop' && <Icon name="kob" size={18} />}
              <T v="bold" color={on ? '#fff' : colors.ink}>{t(x.label)}</T>
              {tabHasNew(x.id) && <View style={{ position: 'absolute', right: -2, top: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.red, borderWidth: 2, borderColor: '#FFFFFF' }} />}
            </PressScale>
          );
        })}
      </View>
      {tab === 'shop' && <View style={{ gap: 2 }}>
        <T v="h3">{t('ec_shop_sub')}</T>
        <T v="small" color={colors.muted}>{t('ec_shop_how')}</T>
      </View>}
      <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
        {items.map((it) => {
          const open = !it.kind || isOpen(it.kind, it.value!);
          const forSale = it.kind ? shopItemFor(it.kind, it.value!) : undefined;
          const def = it.kind && !forSale ? unlockFor(it.kind, it.value!) : undefined;
          if (forSale) {
            const mine = owned.includes(forSale.id);
            return (
              <PressScale key={it.key} role="button" accessibilityLabel={`${it.label ?? ''}, ${mine ? t('ec_owned') : t('ec_price_a11y', { n: forSale.price })}`} accessibilityState={{ selected: it.on }} scaleTo={0.9}
                onPress={mine ? it.pick : () => { tap(); sfx('tap'); setBuying(forSale); }}
                style={{ width: tileW, minHeight: 92, borderRadius: radius.md, backgroundColor: mine ? colors.card : '#FFFBEA', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 3, borderWidth: it.on ? 3 : 2, borderColor: it.on ? colors.blue : mine ? colors.lineStrong : colors.yellowDark, borderBottomWidth: it.on ? 3 : 5 }}>
                <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                  {it.swatch ? <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: colors.ink, backgroundColor: it.swatch }} />
                    : it.shirt !== undefined ? <ShirtSwatch i={it.shirt} />
                    : it.badge ? <Avatar a={it.badge} size={46} />
                    : it.preview ? <AvatarArt a={it.preview} size={46} /> : null}
                </View>
                <View style={{ minHeight: 26, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
                  {mine
                    ? <T v="small" center color="#12632F" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 11, lineHeight: 13 }}>{`✓ ${t('ec_owned')}`}</T>
                    : <Row gap={2} style={{ justifyContent: 'center' }}><Icon name="kob" size={16} /><T v="bold" color="#5C4600" style={{ fontSize: 13, lineHeight: 16, fontVariant: ['tabular-nums'] }}>{forSale.price}</T></Row>}
                </View>
                {justBought === forSale.id && <View style={{ position: 'absolute', top: -8, right: -6, backgroundColor: colors.green, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 2, borderColor: '#FFFFFF' }}><T v="small" color="#FFFFFF" style={{ fontSize: 10, lineHeight: 13 }}>{t('new_badge')}</T></View>}
              </PressScale>
            );
          }
          const fresh = it.kind ? isNew(it.kind, it.value!) : false;
          // no accessibilityState.disabled on locked items: Pressable treats it as disabled and the explanation would never open
          return (
            <PressScale key={it.key} role="button" accessibilityLabel={open ? it.label ?? it.key : `${it.label ?? ''} ${def ? reqText(def) : t('pf_locked')}`} accessibilityState={{ selected: it.on }} scaleTo={0.9}
              onPress={open ? it.pick : () => { tap('error'); sfx('tap'); setWhy(def ?? null); }}
              style={{ width: tileW, minHeight: 84, borderRadius: radius.md, backgroundColor: open ? colors.card : colors.bg, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 3, borderWidth: it.on ? 3 : 2, borderColor: it.on ? colors.blue : colors.lineStrong, borderBottomWidth: it.on ? 3 : 5, borderStyle: open ? 'solid' : 'dashed' }}>
              <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ opacity: open ? 1 : 0.35 }}>
                  {it.swatch ? <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: colors.ink, backgroundColor: it.swatch }} />
                    : it.shirt !== undefined ? <ShirtSwatch i={it.shirt} />
                    : it.badge ? <Avatar a={it.badge} size={46} />
                    : it.preview ? <AvatarArt a={it.preview} size={46} /> : null}
                </View>
                {!open && <View style={{ position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}><Icon name="femen_kle" size={20} /></View>}
              </View>
              {!open && def ? <View style={{ minHeight: 26, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>{shortReq(def)}</View>
                : it.label ? <View style={{ minHeight: 26, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}><T v="small" center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 11, lineHeight: 13 }}>{it.label}</T></View> : null}
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
        {why && <Button title={t('pf_see_ranks')} color="#7048E8" onPress={() => { setWhy(null); router.push('/ranks' as never); }} />}
        <Button title={t('pf_ok')} variant="secondary" onPress={() => setWhy(null)} />
      </Sheet>
      <Sheet open={!!buying} title={t('ec_buy_title')} onClose={() => setBuying(null)}>
        {buying && <View style={{ alignItems: 'center', gap: 8 }}>
          <Avatar a={withItem(value, buying)} size={110} live />
          <T v="h2" center>{itemName(buying)}</T>
          <Row gap={8} style={{ justifyContent: 'center' }}>
            <Pill text={t('ec_price_a11y', { n: buying.price })} icon="kob" color="#5C4600" bg={colors.yellowSoft} />
            <Pill text={t('ec_buy_have', { n: coins })} color={colors.muted} bg={colors.bg} />
          </Row>
          {coins < buying.price && <T v="body" center color={colors.muted}>{t('ec_buy_missing', { n: buying.price - coins })}</T>}
        </View>}
        {buying && coins >= buying.price && <Button title={t('ec_buy_btn', { n: buying.price })} color={colors.green} icon="kob" onPress={() => buy(buying)} />}
        <Button title={buying && coins >= buying.price ? t('ec_buy_later') : t('pf_ok')} variant="secondary" onPress={() => setBuying(null)} />
      </Sheet>
    </View>
  );
}
