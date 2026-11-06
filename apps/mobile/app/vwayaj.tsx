import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Path, Polyline, Polygon, Rect } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { DEPARTMENTS, DEPARTMENT_ORDER, departmentStatus, currentDepartment, departmentsDone, nextEvent, type DepartmentId, type DepartmentStatus } from '@konesans/core';
import { Screen, T, Row, TopBar, Button, Mascot, PressScale, FadeIn, Pop, Burst, Pulse, SlideSwap, useReduceMotion, springy, type MascotMood } from '@/ui';
import { colors, fonts } from '@/lib/theme';
import { useT, useL } from '@/lib/i18n';
import { useVwayaj, vwayajToday, awardVwayajBadges } from '@/lib/vwayaj';
import { tap, sfx, music } from '@/lib/audio';

/** Node layout of design/project/Map.dc.html (a 350 × 432 card): three rows snaking down, Nòdès alone at the bottom. */
const MAP_W = 350, MAP_H = 432;
const POS: Record<DepartmentId, [number, number]> = {
  lwes: [60, 52], sides: [175, 52], sid: [290, 52],
  grandans: [290, 160], nip: [175, 160], sant: [60, 160],
  latibonit: [60, 268], nodwes: [175, 268], no: [290, 268],
  nodes: [175, 376],
};
const NODE = {
  done: { bg: '#17803F', edge: '#0F5A2C' },
  current: { bg: colors.blue, edge: '#14307D' },
  locked: { bg: '#DCE1EE', edge: '#C3CADB' },
} as const;
const MOOD: Record<DepartmentStatus, MascotMood> = { done: 'proud', current: 'wave', locked: 'sleepy' };

export default function Vwayaj() {
  const t = useT(); const l = useL();
  const v = useVwayaj();
  const cur = currentDepartment(v);
  const sel: DepartmentId = v.selected ?? cur ?? 'nodes';
  const dep = DEPARTMENTS.find((d) => d.id === sel)!;
  const status = departmentStatus(v, sel);
  const [fact, setFact] = useState(0);
  const [w, setW] = useState(MAP_W);
  const fresh = useRef(v.justUnlocked).current; // the node to pop on this visit
  const ev = nextEvent(vwayajToday());

  useFocusEffect(useCallback(() => { music(null); awardVwayajBadges(); }, []));
  useEffect(() => {
    if (!fresh) return;
    const id = setTimeout(() => sfx('pop'), 650);
    const id2 = setTimeout(() => useVwayaj.getState().clearJustUnlocked(), 1500);
    return () => { clearTimeout(id); clearTimeout(id2); };
  }, []);
  useEffect(() => { setFact(0); }, [sel]);

  const pick = (id: DepartmentId) => { tap(); sfx('tap'); useVwayaj.getState().select(id); };
  const sx = w / MAP_W;
  const pt = (id: DepartmentId) => `${POS[id][0] * sx},${POS[id][1]}`;
  const doneUpTo = DEPARTMENT_ORDER.findIndex((id) => !v.done[id]); // -1 = all done
  const trail = DEPARTMENT_ORDER.slice(0, doneUpTo < 0 ? DEPARTMENT_ORDER.length : doneUpTo + 1);
  const prevName = (() => { const i = DEPARTMENT_ORDER.indexOf(sel); return i > 0 ? l(DEPARTMENTS[i - 1].name) : ''; })();
  const evLabel = ev.today ? `${t('vw_event_today')} · ${l(ev.event.date).toUpperCase()}`
    : `${t('vw_event')} · ${l(ev.event.date).toUpperCase()} · ${ev.inDays === 1 ? t('vw_event_tomorrow') : t('vw_event_in', { n: ev.inDays })}`;

  return (
    <Screen>
      <TopBar title={t('vw_title')} sub={t('vw_done_count', { n: departmentsDone(v) })} onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />

      {/* event banner */}
      <FadeIn delay={40}><View style={{ backgroundColor: colors.ink, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <EventTile live={ev.today} />
        <View style={{ flex: 1 }}>
          <T v="label" color={colors.yellowDark} style={{ letterSpacing: 0.7 }}>{evLabel}</T>
          <T v="bold" color="#FFFFFF" style={{ lineHeight: 19 }}>{l(ev.event.tagline)}</T>
        </View>
      </View></FadeIn>

      {/* the map */}
      <FadeIn delay={90}><View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: MAP_H, backgroundColor: '#E6F2EC', borderRadius: 24, borderWidth: 1, borderColor: '#CFE3D7', overflow: 'hidden' }}>
        <Svg width={w} height={MAP_H} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Polyline points={DEPARTMENT_ORDER.map(pt).join(' ')} fill="none" stroke="#9FC4AE" strokeWidth={6} strokeDasharray="2 12" strokeLinecap="round" strokeLinejoin="round" />
          {trail.length > 1 && <Polyline points={trail.map(pt).join(' ')} fill="none" stroke="#17803F" strokeOpacity={0.55} strokeWidth={6} strokeDasharray="2 12" strokeLinecap="round" strokeLinejoin="round" />}
        </Svg>
        {DEPARTMENTS.map((d, i) => (
          <MapNode key={d.id} name={l(d.name)} x={POS[d.id][0] * sx} y={POS[d.id][1]} status={departmentStatus(v, d.id)} selected={d.id === sel}
            isNew={d.id === fresh} delay={120 + i * 45}
            a11y={`${l(d.name)}, ${t(`vw_st_${departmentStatus(v, d.id)}` as 'vw_st_done')}`} onPress={() => pick(d.id)} />
        ))}
      </View></FadeIn>

      {/* selected department */}
      <SlideSwap id={sel}>
        <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line, borderBottomWidth: 5, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, gap: 8 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <T v="h1" style={{ fontSize: 22, flexShrink: 1 }}>{l(dep.name)}</T>
            <T v="bold" color={colors.muted} style={{ fontSize: 13 }}>{t('vw_chef', { x: l(dep.chefLieu) })}</T>
          </Row>
          <PressScale accessibilityLabel={t('vw_next_fact')} scaleTo={0.98} onPress={() => { tap(); setFact((f) => (f + 1) % dep.facts.length); }}>
            <Row gap={10} center={false}>
              <View style={{ width: 56, height: 56, marginTop: -4 }}><Mascot size={56} mood={MOOD[status]} /></View>
              <View style={{ flex: 1, gap: 4 }}>
                <SlideSwap id={`${sel}-${fact}`}><T v="body" color="#3B4560" style={{ fontSize: 14, lineHeight: 20 }}>{l(dep.facts[fact % dep.facts.length])}</T></SlideSwap>
                <Row gap={4}>
                  {dep.facts.map((_, i) => <View key={i} style={{ width: i === fact ? 14 : 6, height: 6, borderRadius: 3, backgroundColor: i === fact ? colors.blueLight : colors.line }} />)}
                </Row>
              </View>
            </Row>
          </PressScale>
          {status === 'locked' ? (
            <View style={{ minHeight: 48, borderRadius: 14, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 12 }}>
              <LockGlyph size={18} />
              <T v="bold" color={colors.muted}>{t('vw_locked_hint', { x: prevName })}</T>
            </View>
          ) : (
            <>
              {status === 'done' && v.done[sel] ? (
                <T v="small" color="#12632F">{t('vw_best', { n: v.done[sel]!.best })}</T>
              ) : (
                <T v="small" color={colors.muted}>{t('vw_pass_hint')}</T>
              )}
              <Button title={status === 'done' ? t('vw_again') : t('vw_play', { x: l(dep.name) })} color={status === 'done' ? colors.green : colors.blue}
                onPress={() => router.push(`/vwayaj/${sel}` as never)} />
            </>
          )}
        </View>
      </SlideSwap>
      {!cur && <FadeIn delay={300}><T v="bold" center color="#12632F">{t('vw_all_done')}</T></FadeIn>}
    </Screen>
  );
}

/** Red flag tile of the event banner; waves on the day itself. */
function EventTile({ live }: { live: boolean }) {
  const tile = (
    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 22V4" /><Path d="M4 4h13l-2 4 2 4H4" />
      </Svg>
    </View>
  );
  return live ? <Pulse amount={0.08}>{tile}</Pulse> : tile;
}

function LockGlyph({ size = 22, color = colors.muted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={5} y={11} width={14} height={10} rx={2} /><Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

/** One department on the map: done = green ✓, current = blue star (pulsing halo), locked = grey lock; gold ring = selected. */
function MapNode({ name, x, y, status, selected, isNew, delay, a11y, onPress }: { name: string; x: number; y: number; status: DepartmentStatus; selected: boolean; isNew: boolean; delay: number; a11y: string; onPress: () => void }) {
  const size = status === 'current' ? 64 : 56;
  const c = NODE[status];
  const glyph = status === 'done' ? (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Polyline points="20 6 9 17 4 12" /></Svg>
  ) : status === 'current' ? (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill={colors.yellowDark} stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round"><Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Svg>
  ) : <LockGlyph />;
  const disc = (
    <View style={{ width: size, height: size + 5 }}>
      <View style={{ position: 'absolute', top: 5, width: size, height: size, borderRadius: size / 2, backgroundColor: c.edge }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>{glyph}</View>
    </View>
  );
  const body = (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: size, height: size + 5, alignItems: 'center' }}>
        {status === 'current' && <Halo size={size} />}
        {selected && <View pointerEvents="none" style={{ position: 'absolute', left: -5, top: -5, width: size + 10, height: size + 10, borderRadius: (size + 10) / 2, borderWidth: 5, borderColor: colors.yellowDark }} />}
        {status === 'current' ? <Pulse amount={0.05} duration={1600}>{disc}</Pulse> : disc}
        {isNew && <Burst trigger="new" count={14} radius={70} shapes="stars" />}
      </View>
      <T v="small" center style={{ fontFamily: fonts.bodyHeavy, lineHeight: 14 }} numberOfLines={1}>{name}</T>
    </View>
  );
  return (
    <View style={{ position: 'absolute', left: x - 45, top: y - size / 2, width: 90, alignItems: 'center' }}>
      <PressScale role="button" accessibilityLabel={a11y} accessibilityState={{ selected }} scaleTo={0.9} debounceMs={0} onPress={onPress}>
        {isNew ? <NewPop delay={500}>{body}</NewPop> : <Pop delay={delay} from={0.6}>{body}</Pop>}
      </PressScale>
    </View>
  );
}

/** Expanding, fading blue ring behind the current node. */
function Halo({ size }: { size: number }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start(); return () => a.stop();
  }, [reduce]);
  if (reduce) return null;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: colors.blueLight,
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
    }} />
  );
}

/** The node that was just unlocked: drops its lock and springs in big. */
function NewPop({ children, delay }: { children: React.ReactNode; delay: number }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => { if (!reduce) Animated.timing(v, { toValue: 1, duration: 700, delay, easing: springy, useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={{ opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '0deg'] }) }] }}>
      {children}
    </Animated.View>
  );
}
