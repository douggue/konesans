/**
 * "Finding a player" sequence for duels (~3.2 s, tap to skip):
 *  1. radar rings pulse out of the kid's avatar, "N ap chèche yon jwè" with rotating dots
 *  2. the kid's card slides in from the left, the opponent's from the right
 *  3. a big "VS" slams down and the screen shakes, then onDone().
 * Online, `opponent` is null while the server is still looking: the radar keeps going until a player is found
 * (`hint` shows under it after a few seconds).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, Pressable, StyleSheet } from 'react-native';
import type { AvatarConfig } from '@konesans/core';
import { T } from './index';
import { Avatar } from './avatar';
import { reduceMotion } from './motion';
import { colors } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { tap, sfx, music } from '@/lib/audio';

export function Matchmaking({ me, opponent, onDone, hint }: { me: { name: string; avatar: AvatarConfig; sub?: string }; opponent: { name: string; avatar: AvatarConfig; sub?: string } | null; onDone: () => void; hint?: string }) {
  const t = useT();
  const [phase, setPhase] = useState<'search' | 'found'>('search');
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; onDone(); };
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const slide = useRef(new Animated.Value(0)).current;
  const vs = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const [dots, setDots] = useState(1);
  const [waited, setWaited] = useState(false); // minimum radar time passed
  const [longWait, setLongWait] = useState(false);
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);

  // 1. radar while searching (at least 1.7 s so it never just flashes)
  useEffect(() => {
    music('duel_search');
    const minId = setTimeout(() => setWaited(true), reduceMotion() ? 300 : 1700);
    const longId = setTimeout(() => setLongWait(true), 3500);
    if (reduceMotion()) return () => { clearTimeout(minId); clearTimeout(longId); };
    loopsRef.current = rings.map((r) => Animated.loop(Animated.sequence([
      Animated.timing(r, { toValue: 1, duration: 1350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    const starts = loopsRef.current.map((l, i) => setTimeout(() => l.start(), i * 450));
    const dotId = setInterval(() => setDots((d) => (d % 3) + 1), 380);
    return () => { starts.forEach(clearTimeout); loopsRef.current.forEach((l) => l.stop()); clearInterval(dotId); clearTimeout(minId); clearTimeout(longId); };
  }, []);

  // 2. an opponent is known → cards slide in, VS slams, then onDone
  const ready = waited && !!opponent;
  useEffect(() => {
    if (!ready) return;
    loopsRef.current.forEach((l) => l.stop());
    setPhase('found'); tap(); sfx('found');
    if (reduceMotion()) { slide.setValue(1); vs.setValue(1); const id = setTimeout(finish, 1200); return () => clearTimeout(id); }
    Animated.sequence([
      Animated.spring(slide, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 9 }),
      Animated.timing(vs, { toValue: 1, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 360, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
    const vsId = setTimeout(() => sfx('vs'), 620); // as the VS badge lands
    const s1 = setTimeout(() => tap('success'), 900);
    const end = setTimeout(finish, 1600);
    return () => { clearTimeout(vsId); clearTimeout(s1); clearTimeout(end); };
  }, [ready]);

  const shakeX = shake.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -10, 9, -6, 3, 0] });
  return (
    <Pressable accessibilityLabel={t('tap_skip')} onPress={() => phase === 'found' && finish()} style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, transform: [{ translateX: shakeX }] }}>
        {phase === 'search' ? (
          <>
            <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
              {rings.map((r, i) => (
                <Animated.View key={i} style={[StyleSheet.absoluteFill, { borderRadius: 130, borderWidth: 4, borderColor: colors.blueLight, opacity: r.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.7, 0] }), transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.05] }) }] }]} />
              ))}
              <Avatar a={me.avatar} size={120} live />
            </View>
            <T v="h1" center>{t('finding').replace(/…$/, '')}{'.'.repeat(dots)}<T v="h1" color="transparent">{'.'.repeat(3 - dots)}</T></T>
            <T v="small" center color={colors.muted}>{me.name}{me.sub ? ` · ${me.sub}` : ''}</T>
            {hint && longWait ? <T v="small" center color={colors.muted} style={{ paddingHorizontal: 24 }}>{hint}</T> : null}
          </>
        ) : (
          <>
            <T v="label" color={colors.green}>{t('found').toUpperCase()}</T>
            <View style={{ width: '100%', gap: 8 }}>
              <Animated.View style={{ transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-360, 0] }) }] }}>
                <PlayerCard p={me} color={colors.blue} />
              </Animated.View>
              <Animated.View style={{ alignSelf: 'center', zIndex: 2, opacity: vs, transform: [{ scale: vs.interpolate({ inputRange: [0, 1], outputRange: [3.2, 1] }) }, { rotate: vs.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '-6deg'] }) }] }}>
                <View style={{ backgroundColor: colors.yellow, borderWidth: 3, borderColor: colors.ink, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 2, borderBottomWidth: 6 }}>
                  <T style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: 44, lineHeight: 52 }} color={colors.ink}>VS</T>
                </View>
              </Animated.View>
              <Animated.View style={{ transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [360, 0] }) }] }}>
                {opponent && <PlayerCard p={opponent} color={colors.red} right />}
              </Animated.View>
            </View>
            <Animated.View style={{ opacity: vs }}><T v="small" color={colors.muted}>{t('tap_skip')}</T></Animated.View>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

function PlayerCard({ p, color, right }: { p: { name: string; avatar: AvatarConfig; sub?: string }; color: string; right?: boolean }) {
  return (
    <View style={{ flexDirection: right ? 'row-reverse' : 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: color, borderBottomWidth: 6, borderRadius: 22, padding: 14 }}>
      <Avatar a={p.avatar} size={78} live />
      <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start' }}>
        <T v="h1" color={color} numberOfLines={1}>{p.name}</T>
        {p.sub ? <T v="small" color={colors.muted}>{p.sub}</T> : null}
      </View>
    </View>
  );
}
