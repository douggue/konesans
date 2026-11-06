import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { MascotArt, reduceMotion, Button } from '@/ui';
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
      <Animated.Text style={{ fontFamily: 'Baloo2_800ExtraBold', fontSize: 30, lineHeight: 36, color: '#FFFFFF', textAlign: 'center' }}>{tr('maint_title', lang)}</Animated.Text>
      <Animated.Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 17, lineHeight: 24, color: '#E6ECFB', textAlign: 'center' }}>{text}</Animated.Text>
      <Button title={tr('maint_retry', lang)} variant="secondary" color={colors.blue} onPress={() => { syncContent(true).catch(() => {}); }} />
    </View>
  );
}

/** ~1.2 s brand intro that continues the native splash: Ti Zwazo pops and hops, the wordmark fades in, then everything fades away. */
function Intro({ onDone }: { onDone: () => void }) {
  const pop = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion()) { Animated.timing(out, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDone); return; }
    Animated.sequence([
      Animated.timing(pop, { toValue: 1, duration: 420, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true }),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(hop, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(word, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(160),
      Animated.timing(out, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', opacity: out }]}>
      <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }, { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }] }}>
        <MascotArt size={150} mood="cheer" />
      </Animated.View>
      <Animated.Text style={{ marginTop: 10, fontFamily: 'Baloo2_800ExtraBold', fontSize: 40, lineHeight: 46, color: '#FFFFFF', opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>Konesans</Animated.Text>
      <Animated.View style={{ flexDirection: 'row', gap: 6, marginTop: 8, opacity: word }}>
        <View style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
        <View style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: colors.red }} />
      </Animated.View>
    </Animated.View>
  );
}
