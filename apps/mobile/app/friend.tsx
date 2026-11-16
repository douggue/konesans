/**
 * "Batay ak yon zanmi" — duel a friend you know, with a 4-digit code.
 * - Envite yon zanmi: the server makes a code (10 min) and a private match with this kid's age band; the code is
 *   shown big and can be sent (share sheet / WhatsApp). The phone asks the server every 1.5 s whether the friend
 *   used it, then goes into the duel (app/duel.tsx?match=…). "Anile" frees the code.
 * - Mwen gen yon kòd: type the 4 digits on a big keypad → into the same duel, with the host's age band.
 * Only with the parent's online permission (Paramèt → Espas Paran, same as online duels), explained kindly if not.
 * No Robo here: a friend match waits for the friend.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Share, Linking, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { AgeBand } from '@konesans/core';
import { Screen, T, Card, Row, TopBar, Button, IconTile, PressScale, Mascot, FadeIn, Pop, Pulse, Shake, Icon, Chevron, EmptyState, ErrorState, Loader, Dots } from '@/ui';
import { colors, fonts } from '@/lib/theme';
import { useStore, useAvatar } from '@/lib/store';
import { useT, type StrKey } from '@/lib/i18n';
import { tap, sfx } from '@/lib/audio';
import { serverConfigured } from '@/lib/remote';
import { createFriendDuel, joinFriendCode, friendDuelStatus, cancelFriendDuel, friendError, setProfile, type FriendError, type FriendInvite } from '@/lib/online';

const AGE_KEY = { '6-8': 'age_6_8', '9-11': 'age_9_11', '12-14': 'age_12_14' } as const;
const ERR_KEY: Record<FriendError, StrKey> = {
  not_allowed: 'fr_parent_title', host_not_allowed: 'fr_err_friend_parent', bad_code: 'fr_err_bad', expired: 'fr_err_expired',
  own_code: 'fr_err_own', limit: 'fr_err_limit', offline: 'fr_err_offline', server: 'fr_err_server',
};
const FRIEND_RED = '#D21034';
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));
const toDuel = (matchId: string, age: AgeBand) => router.replace(`/duel?match=${encodeURIComponent(matchId)}&age=${age}` as never);

export default function Friend() {
  const t = useT();
  const { lost } = useLocalSearchParams<{ lost?: string }>();
  const allowed = useStore((s) => s.kidSettings.randomDuelsAllowed);
  const [mode, setMode] = useState<'menu' | 'host' | 'join'>('menu');
  if (!serverConfigured()) return <Blocked body={t('fr_no_server')} />;
  if (!allowed) return <Blocked title={t('fr_parent_title')} body={t('fr_parent_body', { x: t('online_duels') })} settings />;
  if (mode === 'host') return <Host onBack={() => setMode('menu')} />;
  if (mode === 'join') return <Join onBack={() => setMode('menu')} />;
  return (
    <Screen>
      <TopBar close title={t('fr_title')} onBack={goBack} />
      <FadeIn><Row gap={12}>
        <Mascot size={84} mood="happy" />
        <T v="body" color={colors.muted} style={{ flex: 1 }}>{t('fr_intro')}</T>
      </Row></FadeIn>
      {lost ? <T v="small" center color={colors.red}>{t('fr_lost')}</T> : null}
      <FadeIn delay={80}><Card onPress={() => setMode('host')} soft={colors.redSoft} edge={FRIEND_RED} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 96 }}>
        <IconTile name="fanmi" bg="#FFFFFF" size={56} />
        <View style={{ flex: 1, gap: 2 }}><T v="h2">{t('fr_invite')}</T><T v="small" color={colors.muted}>{t('fr_invite_sub')}</T></View>
        <Chevron />
      </Card></FadeIn>
      <FadeIn delay={140}><Card onPress={() => setMode('join')} soft={colors.blueSoft} edge={colors.blue} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 96 }}>
        <IconTile name="kesyon" bg="#FFFFFF" size={56} />
        <View style={{ flex: 1, gap: 2 }}><T v="h2">{t('fr_have_code')}</T><T v="small" color={colors.muted}>{t('fr_have_code_sub')}</T></View>
        <Chevron />
      </Card></FadeIn>
    </Screen>
  );
}

/** No server / no parent permission: say why kindly, offer Robo (and the way to Paramèt). */
function Blocked({ title, body, settings }: { title?: string; body: string; settings?: boolean }) {
  const t = useT();
  return (
    <Screen scroll={false}>
      <TopBar close title={t('fr_title')} onBack={goBack} />
      <EmptyState mood="think" badge={settings ? 'paran' : 'sanentenet'} title={title ?? t('fr_title')} sub={body}
        action={settings ? { title: t('fr_open_settings'), icon: 'paramet', onPress: () => router.push('/settings') } : { title: t('fr_play_robo'), icon: 'robo', onPress: () => router.replace('/duel') }}
        secondary={settings ? { title: t('fr_play_robo'), icon: 'robo', onPress: () => router.replace('/duel') } : undefined} />
    </Screen>
  );
}

/** The 4 digits, big, each in its own box (empty boxes while typing). */
function CodeBoxes({ code, color = colors.ink, big }: { code: string; color?: string; big?: boolean }) {
  const w = big ? 64 : 58;
  return (
    <Row gap={10} style={{ justifyContent: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: w, height: w * 1.2, borderRadius: 16, borderWidth: 3, borderBottomWidth: 6, borderColor: code[i] ? color : colors.lineStrong, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <T v="display" color={color} style={{ fontSize: big ? 44 : 38, lineHeight: big ? 52 : 46, fontFamily: fonts.display, fontVariant: ['tabular-nums'] }}>{code[i] ?? ''}</T>
        </View>
      ))}
    </Row>
  );
}

function Host({ onBack }: { onBack: () => void }) {
  const t = useT();
  const profile = useStore((s) => s.profile);
  const avatar = useAvatar();
  const [inv, setInv] = useState<FriendInvite | null>(null);
  const [err, setErr] = useState<FriendError | null>(null);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(Date.now());
  const done = useRef(false); // went into the duel: don't cancel the code
  const make = async () => {
    setErr(null); setExpired(false); setInv(null);
    try {
      await setProfile(profile.username, avatar).catch(() => {}); // the friend sees our name + avatar
      setInv(await createFriendDuel(profile.age)); sfx('ping');
    } catch (e) { setErr(friendError(e)); }
  };
  useEffect(() => { make(); }, []);
  // ask the server whether the friend used the code (and tick the countdown)
  useEffect(() => {
    if (!inv || expired) return;
    let alive = true; let busy = false;
    const id = setInterval(async () => {
      setNow(Date.now());
      if (busy) return; busy = true;
      try {
        const st = await friendDuelStatus(inv.code);
        if (!alive) return;
        if (st.state === 'joined') { done.current = true; sfx('correct'); toDuel(st.matchId ?? inv.matchId, inv.age); }
        else if (st.state === 'expired' || Date.now() > inv.expiresAt) setExpired(true);
      } catch { /* offline for a moment: keep asking */ } finally { busy = false; }
    }, 1500);
    return () => { alive = false; clearInterval(id); };
  }, [inv?.code, expired]);
  // leaving the screen (✕, back) frees the code
  const invRef = useRef(inv); invRef.current = inv;
  useEffect(() => () => { const i = invRef.current; if (i && !done.current) cancelFriendDuel(i.code).catch(() => {}); }, []);
  const cancel = () => { tap(); const i = inv; if (i) cancelFriendDuel(i.code).catch(() => {}); setInv(null); done.current = true; onBack(); };
  const msg = inv ? t('fr_share_msg', { code: inv.code }) : '';
  const share = async () => { tap(); try { await Share.share({ message: msg }); } catch { /* no share sheet (web) */ } };
  const whatsapp = () => { tap(); Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`).catch(() => {}); };
  const mins = inv ? Math.min(10, Math.max(1, Math.ceil((inv.expiresAt - now) / 60_000))) : 10;

  return (
    <Screen>
      <TopBar close title={t('fr_invite')} onBack={cancel} />
      {!inv && !err ? (
        <Loader fill={false} label={t('fr_making')} mood="happy" />
      ) : err ? (
        <ErrorState fill={false} kind={err === 'offline' ? 'offline' : 'server'} sub={t(ERR_KEY[err] === 'fr_parent_title' ? 'fr_err_server' : ERR_KEY[err])} onRetry={make} />
      ) : inv ? (
        <>
          <Pop><Card style={{ alignItems: 'center', gap: 14, paddingVertical: 22 }}>
            <T v="label" color={colors.muted}>{t('fr_your_code')}</T>
            <CodeBoxes code={inv.code} color={expired ? colors.muted : FRIEND_RED} big />
            <T v="small" center color={colors.muted}>{t('fr_give_code')}</T>
          </Card></Pop>
          <View style={{ backgroundColor: colors.yellowSoft, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 }}>
            <T v="small" center color="#5C4600">{t('fr_host_age_note', { age: t(AGE_KEY[inv.age]) })}</T>
          </View>
          {expired ? (
            <FadeIn style={{ gap: 10 }}>
              <T v="bold" center color={colors.red}>{t('fr_expired')}</T>
              <Button title={t('fr_new_code')} onPress={make} />
            </FadeIn>
          ) : (
            <>
              <Row gap={10}>
                <View style={{ flex: 1 }}><Button title={t('fr_share')} icon="pataje" onPress={share} /></View>
                <PressScale accessibilityLabel={t('fr_share')} onPress={whatsapp} style={{ width: 58, height: 58, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: '#128C7E' }}>
                  <Icon name="whatsapp" size={32} />
                </PressScale>
              </Row>
              <Row gap={10} style={{ justifyContent: 'center', paddingVertical: 6 }}>
                <Pulse amount={0.15}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green }} /></Pulse>
                <T v="bold" color={colors.ink}>{t('fr_waiting')}</T>
              </Row>
              <T v="small" center color={colors.muted}>{t('fr_expires', { m: mins })}</T>
            </>
          )}
          <Button variant="ghost" color={colors.muted} title={t('fr_cancel')} onPress={cancel} />
        </>
      ) : null}
    </Screen>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'] as const;

function Join({ onBack }: { onBack: () => void }) {
  const t = useT();
  const profile = useStore((s) => s.profile);
  const avatar = useAvatar();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<FriendError | null>(null);
  const [shake, setShake] = useState(0);
  const go = async () => {
    if (code.length !== 4 || busy) return;
    setBusy(true); setErr(null);
    try {
      await setProfile(profile.username, avatar).catch(() => {});
      const r = await joinFriendCode(code);
      sfx('correct');
      toDuel(r.matchId, r.age);
    } catch (e) {
      const k = friendError(e); setErr(k); setShake((x) => x + 1); sfx('wrong');
      if (k === 'bad_code' || k === 'expired') setCode('');
    } finally { setBusy(false); }
  };
  const press = (k: (typeof KEYS)[number]) => {
    tap(); setErr(null);
    if (k === 'del') setCode((c) => c.slice(0, -1));
    else if (k === 'ok') go();
    else setCode((c) => (c.length < 4 ? c + k : c));
  };
  // web / hardware keyboard: digits, backspace, enter
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const on = (e: KeyboardEvent) => { if (/^[0-9]$/.test(e.key)) press(e.key as never); else if (e.key === 'Backspace') press('del'); else if (e.key === 'Enter') press('ok'); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  return (
    <Screen>
      <TopBar close title={t('fr_have_code')} onBack={onBack} />
      <T v="h2" center>{t('fr_enter')}</T>
      <Shake trigger={shake || null}><CodeBoxes code={code} color={colors.blue} /></Shake>
      <View style={{ minHeight: 40, justifyContent: 'center' }}>
        {err ? <T v="small" center color={colors.red}>{err === 'not_allowed' ? t('fr_parent_body', { x: t('online_duels') }) : t(ERR_KEY[err])}</T> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {KEYS.map((k) => (
          <PressScale key={k} debounceMs={0} role="button" accessibilityLabel={k === 'del' ? t('pg_erase') : k === 'ok' ? t('fr_join') : k}
            disabled={busy || (k === 'ok' && code.length !== 4)} onPress={() => press(k)}
            style={{ width: '30%', height: 62, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 5,
              backgroundColor: k === 'ok' ? (code.length === 4 ? colors.green : colors.line) : colors.card, borderColor: k === 'ok' ? (code.length === 4 ? '#1E7A33' : colors.lineStrong) : colors.lineStrong }}>
            {k === 'ok' ? (busy ? <Dots color="#FFFFFF" size={8} /> : <T v="h2" color={code.length === 4 ? '#FFFFFF' : colors.muted}>{'✓' /* i18n-ok */}</T>)
              : <T v="h1" color={colors.ink}>{k === 'del' ? '⌫' /* i18n-ok */ : k}</T>}
          </PressScale>
        ))}
      </View>
      <Button title={t('fr_join')} color={colors.green} loading={busy} disabled={code.length !== 4} onPress={go} />
    </Screen>
  );
}
