import React, { useEffect, useRef, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Animated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { useSession } from '@/session';
import { login, rpc, ApiError, errText } from '@/api';
import { T, Field, Button, ErrorBox, Row, haptic } from '@/ui';
import { colors, raised } from '@/theme';

export default function Login() {
  const s = useSession();
  const [apiUrl, setApiUrl] = useState(s.apiUrl);
  const [serverKey, setServerKey] = useState(s.serverKey);
  const [email, setEmail] = useState(s.email);
  const [password, setPassword] = useState('');
  const [showServer, setShowServer] = useState(!s.apiUrl || s.apiUrl.includes('CHANGE-ME'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pop = useRef(new Animated.Value(0.6)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => { Animated.spring(pop, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 10, bounciness: 14 }).start(); }, [pop]);

  const doShake = () => {
    haptic('warn');
    Animated.sequence([10, -10, 6, -6, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: Platform.OS !== 'web' }))).start();
  };

  const submit = async () => {
    setError(null);
    if (!apiUrl.trim() || apiUrl.includes('CHANGE-ME')) { setShowServer(true); setError('Mete adrès sèvè a (egz. https://api.konesans.ht).'); doShake(); return; }
    if (!email.trim() || !password) { setError('Mete imèl ak modpas ou.'); doShake(); return; }
    setBusy(true);
    try {
      const url = apiUrl.trim().replace(/\/+$/, '');
      const t = await login(url, serverKey.trim(), email, password);
      await s.setServer(url, serverKey.trim(), email.trim());
      await s.setTokens(t.token, t.refresh);
      try {
        await rpc('admin_me');
      } catch (e) {
        if (e instanceof ApiError && e.kind === 'forbidden') { await s.logout(); throw e; }
      }
      haptic('ok');
      s.showToast('Byenveni!');
    } catch (e) {
      setError(errText(e));
      doShake();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ alignItems: 'center', gap: 6, transform: [{ scale: pop }] }}>
            <Image source={require('../assets/icon.png')} style={{ width: 96, height: 96, borderRadius: 26 }} />
            <T v="display" color="#FFFFFF">Konesans Admin</T>
            <T color="#C9D3F2" center>Jere kesyon yo, kategori yo ak app la depi telefòn ou.</T>
          </Animated.View>

          <Animated.View style={[raised(colors.line), { padding: 18, gap: 12, transform: [{ translateX: shake }] }]}>
            <T v="h1">Konekte</T>
            <Field label="Imèl" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" placeholder="ou@egzanp.com" />
            <Field label="Modpas" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" placeholder="••••••••" onSubmitEditing={submit} returnKeyType="go" />

            <Pressable onPress={() => setShowServer((v) => !v)} accessibilityRole="button">
              <Row gap={6}>
                <T v="small" color={colors.blue}>{showServer ? '▾' : '▸'} Sèvè</T>
                {!showServer ? <T v="small" color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>{apiUrl}</T> : null}
              </Row>
            </Pressable>
            {showServer ? (
              <View style={{ gap: 12 }}>
                <Field label="Adrès sèvè a" value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://api.konesans.ht" />
                <Field label="Kle sèvè a" value={serverKey} onChangeText={setServerKey} autoCapitalize="none" autoCorrect={false} placeholder="konesans-server-key" />
              </View>
            ) : null}

            {error ? <ErrorBox text={error} /> : null}
            <Button title="Konekte" onPress={submit} busy={busy} big />
          </Animated.View>
          <T v="small" color="#9AA6C8" center>Se sèlman kont administratè yo ki ka antre.</T>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
