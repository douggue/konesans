/** Kat Ewo — the kid's collection of Haitian hero cards (mockup design/project/Heroes.dc.html). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { HERO_CARDS, cardById, cardProgress, type HeroCard } from '@konesans/core';
import { Screen, T, TopBar, Button, Mascot, FadeIn, Pop, Bounce, Shake, reduceMotion } from '@/ui';
import { MiniCard, HeroFront } from '@/ui/CardReveal';
import { colors, fonts } from '@/lib/theme';
import { useT, useL, type StrKey } from '@/lib/i18n';
import { useCards, CARD_READ_XP } from '@/lib/cards';
import { sfx, tap } from '@/lib/audio';

type Tab = 'all' | 'rev' | 'women' | 'after';
const TABS: { id: Tab; key: StrKey; keep: (c: HeroCard) => boolean }[] = [
  { id: 'all', key: 'kt_tab_all', keep: () => true },
  { id: 'rev', key: 'kt_tab_rev', keep: (c) => c.era === 'rev' },
  { id: 'women', key: 'kt_tab_women', keep: (c) => c.woman },
  { id: 'after', key: 'kt_tab_after', keep: (c) => c.era === 'apre' },
];
const FEATURE_H = 270;

export default function Cards() {
  const t = useT();
  const params = useLocalSearchParams<{ sel?: string }>();
  const owned = useCards((s) => s.owned);
  const fresh = useCards((s) => s.fresh);
  const have = useMemo(() => new Set(owned), [owned]);
  const [tab, setTab] = useState<Tab>('all');
  const [sel, setSel] = useState<string | null>(null);
  const [lockedTap, setLockedTap] = useState(0);
  // pick the card from the link (?sel=) or the newest one, also once the saved collection has loaded
  useEffect(() => {
    if (sel && have.has(sel)) return;
    setSel(params.sel && have.has(params.sel) ? params.sel : owned[owned.length - 1] ?? null);
  }, [owned]);
  useEffect(() => { if (sel) useCards.getState().markSeen(sel); }, [sel]);

  // owned cards first (in collection order), then the locked ones
  const list = useMemo(() => {
    const f = TABS.find((x) => x.id === tab)!.keep;
    const cards = HERO_CARDS.filter(f);
    return [...cards.filter((c) => have.has(c.id)), ...cards.filter((c) => !have.has(c.id))];
  }, [tab, have]);
  const rows: HeroCard[][] = [];
  for (let i = 0; i < list.length; i += 3) rows.push(list.slice(i, i + 3));
  const prog = cardProgress(owned);
  const selected = sel ? cardById(sel) : undefined;

  return (
    <Screen scroll={false}>
      <TopBar title={t('kt_title')} sub={t('ec_cards_sub')} right={
        <View accessible accessibilityLabel={t('kt_count_label', { n: prog.owned, total: prog.total })} style={{ backgroundColor: colors.yellowSoft, borderColor: colors.yellowDark, borderWidth: 2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
          <T style={{ fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19 }} color="#5C4600">{prog.owned} / {prog.total}</T>
        </View>
      } />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
      <View role="group" accessibilityLabel={t('kt_tabs_label')} style={{ flexDirection: 'row', gap: 8 }}>
        {TABS.map((x) => {
          const on = x.id === tab;
          return (
            <Pressable key={x.id} role="button" accessibilityState={{ selected: on }} onPress={() => { tap(); setTab(x.id); }}
              style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 13, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.ink : colors.card, borderColor: on ? colors.ink : colors.lineStrong }, pressed && { transform: [{ scale: 0.95 }] }]}>
              <T style={{ fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 18 }} color={on ? '#FFFFFF' : colors.ink} numberOfLines={1}>{t(x.key)}</T>
            </Pressable>
          );
        })}
      </View>
      </ScrollView>

      <ScrollView style={{ flex: 1, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
        {rows.map((row, r) => (
          <View key={`${tab}-${r}`} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map((c, i) => {
              const on = have.has(c.id);
              return (
                <MiniCard key={c.id} card={c} owned={on} index={r * 3 + i} selected={on && c.id === sel} fresh={fresh.includes(c.id)}
                  label={on ? c.name : t('kt_locked')}
                  onPress={() => { if (on) { tap(); sfx('tap'); setSel(c.id); } else { tap('error'); setLockedTap((n) => n + 1); } }} />
              );
            })}
            {row.length < 3 && Array.from({ length: 3 - row.length }, (_, k) => <View key={k} style={{ flex: 1 }} />)}
          </View>
        ))}
      </ScrollView>

      {lockedTap > 0 && <LockedHint key={lockedTap} />}
      <Shake trigger={lockedTap || null} amount={4}>
        {selected ? <Featured key={selected.id} card={selected} /> : <EmptyFeature />}
      </Shake>
    </Screen>
  );
}

function LockedHint() {
  const t = useT();
  const [show, setShow] = useState(true);
  useEffect(() => { const id = setTimeout(() => setShow(false), 2600); return () => clearTimeout(id); }, []);
  if (!show) return null;
  return <FadeIn from={6} duration={220}><T v="small" center color={colors.muted}>{t('ec_cards_locked_hint')}</T></FadeIn>;
}

function EmptyFeature() {
  const t = useT();
  return (
    <View style={{ minHeight: FEATURE_H, borderRadius: 24, borderWidth: 3, borderBottomWidth: 7, borderColor: colors.lineStrong, backgroundColor: colors.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 88, alignSelf: 'stretch', borderRadius: 16, backgroundColor: '#DCE1EE', alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 62 }} color="#8A93A8">?</T>
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <T v="h2">{t('kt_empty_title')}</T>
        <T v="body" color={colors.muted}>{t('ec_cards_empty_sub')}</T>
        <Button small lines={2} style={{ paddingHorizontal: 12, paddingVertical: 6 }} title={t('ec_cards_go')} onPress={() => router.push('/quests' as never)} />
      </View>
    </View>
  );
}

/** The big card at the bottom: tap flips it in 3D to read the facts on the back. */
function Featured({ card }: { card: HeroCard }) {
  const t = useT(); const l = useL();
  const read = useCards((s) => s.read.includes(card.id));
  const [flipped, setFlipped] = useState(false);
  const [gotXp, setGotXp] = useState(false);
  const f = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion()) { f.setValue(flipped ? 1 : 0); return; }
    Animated.timing(f, { toValue: flipped ? 1 : 0, duration: 750, easing: Easing.bezier(0.3, 1.35, 0.45, 1), useNativeDriver: true }).start();
  }, [flipped]);
  function toggle() {
    tap();
    const next = !flipped;
    setFlipped(next);
    if (next && useCards.getState().markRead(card.id)) { setGotXp(true); setTimeout(() => sfx('coin'), 450); }
  }
  const half = (from: number, to: number) => f.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [from, from, to, to] });
  return (
    <Pop from={0.85}>
      <Pressable role="button" accessibilityState={{ expanded: flipped }} accessibilityLabel={flipped ? t('kt_flip_to_front', { name: card.name }) : t('kt_flip_to_back', { name: card.name })} onPress={toggle} style={{ height: FEATURE_H }}>
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backfaceVisibility: 'hidden', opacity: half(1, 0), transform: [{ perspective: 1000 }, { rotateY: f.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <HeroFront card={card} hint={t('kt_tap_flip')} />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backfaceVisibility: 'hidden', opacity: half(0, 1), transform: [{ perspective: 1000 }, { rotateY: f.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }] }}>
          <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 24, borderWidth: 3, borderBottomWidth: 7, borderColor: colors.ink, paddingHorizontal: 16, paddingVertical: 13, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T v="label" color={colors.muted} style={{ flex: 1 }}>{t('kt_did_you_know')}</T>
              <View style={{ backgroundColor: card.color, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 1 }}>
                <T style={{ fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 17 }} color="#FFFFFF">{l(card.years)}</T>
              </View>
            </View>
            <T style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 23 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{card.name}</T>
            {card.facts.map((fact, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: card.color, marginTop: 6 }} />
                <T style={{ flex: 1, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 18 }} color="#3B4560">{l(fact)}</T>
              </View>
            ))}
            <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingRight: 46 }}>
              {gotXp
                ? <Bounce trigger={gotXp ? 1 : null} amount={0.15}><T style={{ fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 17 }} color={colors.green}>{t('kt_read_xp', { n: CARD_READ_XP })} ✓</T></Bounce>
                : <T style={{ fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 17 }} color={read ? colors.muted : colors.blue}>{read ? t('kt_read_done') : t('kt_read_xp', { n: CARD_READ_XP })}</T>}
            </View>
            <View style={{ position: 'absolute', right: 8, bottom: 4 }}><Mascot size={50} mood="proud" live={false} /></View>
          </View>
        </Animated.View>
      </Pressable>
    </Pop>
  );
}
