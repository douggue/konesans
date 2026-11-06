import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, SplashScreen, router, useSegments } from 'expo-router';
import { useFonts, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '@/session';
import { ToastHost } from '@/ui';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const TAB_ROUTES = ['index', 'questions', 'categories', 'settings', 'more'];

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Baloo2_700Bold, Baloo2_800ExtraBold, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const ready = useSession((s) => s.ready);
  const token = useSession((s) => s.token);
  const segments = useSegments();

  useEffect(() => { useSession.getState().hydrate(); }, []);
  const loaded = fontsLoaded && ready;
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);

  // Auth gate: no session → login; session on login screen → dashboard.
  useEffect(() => {
    if (!loaded) return;
    const onLogin = segments[0] === 'login';
    if (!token && !onLogin) router.replace('/login');
    else if (token && onLogin) router.replace('/');
  }, [loaded, token, segments]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" /></View>;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        {TAB_ROUTES.map((name) => <Stack.Screen key={name} name={name} options={{ animation: 'fade', animationDuration: 160 }} />)}
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="question/[id]" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <ToastHost />
    </SafeAreaProvider>
  );
}
