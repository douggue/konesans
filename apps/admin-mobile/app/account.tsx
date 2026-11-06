import React, { useState } from 'react';
import { View } from 'react-native';
import { api, errText } from '@/api';
import { useLoad } from '@/lib';
import { useSession } from '@/session';
import { Screen, Header, T, Card, Field, Button, Sheet, haptic } from '@/ui';
import { colors } from '@/theme';

/** Same as the web admin's "Kont mwen": who is logged in, change password, log out. */
export default function Account() {
  const toast = useSession((s) => s.showToast);
  const logout = useSession((s) => s.logout);
  const apiUrl = useSession((s) => s.apiUrl);
  const me = useLoad(() => api.me());
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [nw2, setNw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const change = async () => {
    if (nw.length < 8) { toast('Nouvo modpas la dwe gen omwen 8 karaktè', 'err'); return; }
    if (nw !== nw2) { toast('De nouvo modpas yo pa menm', 'err'); return; }
    setBusy(true);
    try { await api.changePassword(cur, nw); setCur(''); setNw(''); setNw2(''); haptic('ok'); toast('Modpas la chanje ✓'); }
    catch (e) { toast(errText(e), 'err'); } finally { setBusy(false); }
  };

  return (
    <Screen header={<Header back title="Kont mwen" />}>
      <Card style={{ gap: 4 }}>
        <T v="h2">{me.data?.email ?? '…'}</T>
        <T v="small" color={colors.muted}>Administratè yo: {(me.data?.admins ?? []).join(', ') || '…'}</T>
        <T v="small" color={colors.muted}>Sèvè: {apiUrl}</T>
      </Card>
      <Card style={{ gap: 10 }}>
        <T v="h3">Chanje modpas</T>
        <Field label="Modpas kounye a" value={cur} onChangeText={setCur} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
        <Field label="Nouvo modpas (omwen 8 karaktè)" value={nw} onChangeText={setNw} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
        <Field label="Repete nouvo modpas la" value={nw2} onChangeText={setNw2} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
        <Button title="Chanje modpas la" busy={busy} disabled={!cur || !nw || !nw2} onPress={change} />
      </Card>
      <View><Button title="Dekonekte" kind="danger" onPress={() => setConfirmLogout(true)} /></View>
      <Sheet open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Dekonekte?">
        <Button title="Wi, dekonekte" kind="danger" onPress={() => { setConfirmLogout(false); logout(); }} />
        <Button title="Anile" kind="ghost" onPress={() => setConfirmLogout(false)} />
      </Sheet>
    </Screen>
  );
}
