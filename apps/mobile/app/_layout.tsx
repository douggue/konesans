import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { MascotArt, MascotRig, reduceMotion, Button, type MascotMood } from '@/ui';
import { startContentSync, syncContent, useMaintenance } from '@/lib/remote';
import { tr } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

const TAB = { animation: 'fade' as const, animationDuration: 180 };
const MODAL = { animation: 'slide_from_bottom' as const, gestureEnabled: false };
const PUSH = { animation: 'slide_from_right' as const, gestureEnabled: true, fullScreenGestureEnabled: true };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Baloo2_700Bold, Baloo2_800ExtraBold, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const hydrated = useStore((s) => s.hydrated);
  const ready = fontsLoaded && hydrated;
  const [intro, setIntro] = useState(true);
  const maint = useMaintenance();
  const lang = useStore((s) => s.profile.lang);
  useEffect(() => { startContentSync(); }, []);
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.blue }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style={intro ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, ...PUSH }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="home" options={TAB} />
        <Stack.Screen name="categories" options={TAB} />
        <Stack.Screen name="course/index" options={TAB} />
        <Stack.Screen name="coding/index" options={TAB} />
        <Stack.Screen name="profile" options={TAB} />
        <Stack.Screen name="quiz/[category]" options={MODAL} />
        <Stack.Screen name="duel" options={MODAL} />
        <Stack.Screen name="math" options={MODAL} />
        <Stack.Screen name="course/[lang]/[lesson]" options={MODAL} />
        <Stack.Screen name="coding/[level]" options={MODAL} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="quests" options={PUSH} />
        <Stack.Screen name="ranks" options={PUSH} />
        <Stack.Screen name="cards" options={PUSH} />
        <Stack.Screen name="vwayaj" options={PUSH} />
        <Stack.Screen name="vwayaj/[dep]" options={MODAL} />
      </Stack>
      {maint && !intro && <Maintenance text={(lang === 'fr' && maint.fr) || maint.ht || maint.fr} lang={lang} />}
      {intro && <Intro onDone={() => setIntro(false)} />}
    </SafeAreaProvider>
  );
}

/** The admin turned on maintenance mode (Paramèt app la). */
function Maintenance({ text, lang }: { text: string; lang: 'ht' | 'fr' }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }]}>
      <MascotArt size={140} mood="think" />
      <Animated.Text style={{ includeFontPadding: false, fontFamily: 'Baloo2_800ExtraBold', fontSize: 30, lineHeight: 36, color: '#FFFFFF', textAlign: 'center' }}>{tr('maint_title', lang)}</Animated.Text>
      <Animated.Text style={{ includeFontPadding: false, fontFamily: 'Nunito_700Bold', fontSize: 17, lineHeight: 24, color: '#E6ECFB', textAlign: 'center' }}>{text}</Animated.Text>
      <Button title={tr('maint_retry', lang)} variant="secondary" color={colors.blue} onPress={() => { syncContent(true).catch(() => {}); }} />
    </View>
  );
}

// ─── Launch intro ────────────────────────────────────────────────────────────
// Continues the native splash (expo-splash-screen: #1F47B5, splash-logo.png at imageWidth 180, centred):
// frame 0 is the same bird at the same place and size, so the hand-off is invisible. Then (~2 s, tap to skip):
// crouch → hop up with a wing flap → land with a squash in the lock-up spot → wave, while "Konesans" pops in
// letter by letter, a flag ribbon draws under it and sparkles twinkle → the whole card zooms through and fades.
const INTRO_BIRD = 180; // = imageWidth of the native splash; MascotArt fills an S×S box like the PNG fills its square
const WORD = 'Konesans';
const LIFT = 70; // how far the bird rises from the splash position to the lock-up
function Intro({ onDone }: { onDone: () => void }) {
  const win = useWindowDimensions();
  const [box, setBox] = useState({ w: win.width, h: win.height });
  const [pose, setPose] = useState<MascotMood>('happy');
  const v = useRef({
    squash: new Animated.Value(1), lift: new Animated.Value(0), y: new Animated.Value(0), wingL: new Animated.Value(0), wingR: new Animated.Value(0),
    glow: new Animated.Value(0), ribbon: new Animated.Value(0), spark: new Animated.Value(0), out: new Animated.Value(0),
    letters: WORD.split('').map(() => new Animated.Value(0)),
  }).current;
  const done = useRef(false);
  const seq = useRef<Animated.CompositeAnimation | null>(null);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };
  const exit = (ms = 420) => Animated.timing(v.out, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
  useEffect(() => {
    if (reduceMotion()) { Animated.sequence([Animated.delay(250), Animated.timing(v.out, { toValue: 1, duration: 200, useNativeDriver: true })]).start(finish); return; }
    const T = (x: Animated.Value, toValue: number, duration: number, easing: (n: number) => number = Easing.inOut(Easing.sin)) => Animated.timing(x, { toValue, duration, easing, useNativeDriver: true });
    const timers = [setTimeout(() => setPose('cheer'), 380), setTimeout(() => setPose('wave'), 960)];
    seq.current = Animated.sequence([
      Animated.delay(180), // the native splash finishes fading over this frame
      T(v.squash, 0.84, 200, Easing.out(Easing.quad)), // crouch
      Animated.parallel([ // hop up, stretched, wings flapping, glow opens behind
        T(v.y, -LIFT, 420, Easing.out(Easing.cubic)),
        Animated.sequence([T(v.lift, -32, 300, Easing.out(Easing.quad)), T(v.lift, 0, 200, Easing.in(Easing.quad))]),
        Animated.sequence([T(v.squash, 1.12, 140, Easing.out(Easing.quad)), T(v.squash, 1, 190)]),
        Animated.sequence([T(v.wingL, -28, 110), T(v.wingL, 8, 110), T(v.wingL, -24, 110), T(v.wingL, 0, 170)]), // cheer pose: wings raised, negative = outward
        Animated.sequence([T(v.wingR, -28, 110), T(v.wingR, 8, 110), T(v.wingR, -24, 110), T(v.wingR, 0, 170)]),
        T(v.glow, 1, 520, Easing.out(Easing.cubic)),
      ]),
      T(v.squash, 0.88, 90, Easing.out(Easing.quad)), // land
      Animated.parallel([ // settle, wave, ribbon, sparkles
        T(v.squash, 1, 280, Easing.out(Easing.back(2.2))),
        Animated.sequence([T(v.wingR, -26, 130), T(v.wingR, 8, 150), T(v.wingR, -26, 150), T(v.wingR, 0, 130)]),
        T(v.ribbon, 1, 420, Easing.out(Easing.cubic)),
        T(v.spark, 1, 640, Easing.linear),
      ]),
      exit(),
    ]);
    // the wordmark pops in letter by letter alongside (not blocking the timeline)
    const word = Animated.sequence([Animated.delay(540), Animated.stagger(40, v.letters.map((l) => T(l, 1, 400, Easing.bezier(0.34, 1.56, 0.64, 1))))]);
    word.start();
    seq.current.start(finish);
    return () => { timers.forEach(clearTimeout); seq.current?.stop(); word.stop(); };
  }, []);
  const skip = () => { if (done.current) return; seq.current?.stop(); exit(240).start(finish); };
  const birdTop = box.h / 2 - INTRO_BIRD / 2;
  const wordTop = box.h / 2 - LIFT + INTRO_BIRD / 2 + 2;
  const sparkle = (x: number, y: number, s: number, delay: number) => {
    const p = v.spark.interpolate({ inputRange: [delay, delay + 0.25, delay + 0.5], outputRange: [0, 1, 0], extrapolate: 'clamp' });
    return <Animated.View key={`${x},${y}`} style={{ position: 'absolute', left: box.w / 2 + x - 12, top: birdTop - LIFT + y - 12, opacity: p, transform: [{ scale: Animated.multiply(p, s) }, { rotate: v.spark.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}><SvgXml xml={SPARKLE} width={24} height={24} /></Animated.View>;
  };
  return (
    <Animated.View onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.blue, opacity: v.out.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1, 0] }) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Konesans" onPress={skip} style={StyleSheet.absoluteFill}>
        {/* exit: the bird and wordmark zoom through and fade first, then the blue lifts off the app */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.out.interpolate({ inputRange: [0, 0.55], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ scale: v.out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }] }]}>
          <Animated.View style={{ position: 'absolute', left: box.w / 2 - 150, top: box.h / 2 - LIFT - 150, width: 300, height: 300, borderRadius: 150, backgroundColor: '#2A55CC', opacity: v.glow, transform: [{ scale: v.glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }} />
          <Animated.View style={{ position: 'absolute', left: box.w / 2 - 105, top: box.h / 2 - LIFT - 105, width: 210, height: 210, borderRadius: 105, backgroundColor: '#3361DA', opacity: v.glow, transform: [{ scale: v.glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }} />
          <Animated.View style={{ position: 'absolute', left: box.w / 2 - INTRO_BIRD / 2, top: birdTop, transform: [{ translateY: v.y }] }}>
            <MascotRig size={INTRO_BIRD} mood={pose} v={{ squash: v.squash, wingL: v.wingL, wingR: v.wingR, lift: v.lift }} />
          </Animated.View>
          {sparkle(-92, 30, 1, 0)}{sparkle(96, 6, 0.8, 0.15)}{sparkle(86, 118, 0.6, 0.3)}{sparkle(-80, 130, 0.55, 0.45)}
          <View style={{ position: 'absolute', left: 0, right: 0, top: wordTop, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row' }}>
              {WORD.split('').map((ch, i) => (
                <Animated.Text key={i} style={{ includeFontPadding: false, fontFamily: 'Baloo2_800ExtraBold', fontSize: 48, lineHeight: 56, color: '#FFFFFF', textShadowColor: 'rgba(20,33,61,0.35)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0,
                  opacity: v.letters[i].interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
                  transform: [{ translateY: v.letters[i].interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }, { scale: v.letters[i].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>{ch}</Animated.Text>
              ))}
            </View>
            {/* Haiti flag ribbon: blue over red, edged in white so it reads on the brand blue */}
            <Animated.View style={{ marginTop: 8, width: 104, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: '#FFFFFF', overflow: 'hidden', opacity: v.ribbon, transform: [{ scaleX: v.ribbon }] }}>
              <View style={{ flex: 1, backgroundColor: '#14307D' }} />
              <View style={{ flex: 1, backgroundColor: colors.red }} />
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
const SPARKLE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 1.5C13 8 16 11 22.5 12C16 13 13 16 12 22.5C11 16 8 13 1.5 12C8 11 11 8 12 1.5Z" fill="#FFD43B" stroke="#14213D" stroke-width="1.6" stroke-linejoin="round"/></svg>';
