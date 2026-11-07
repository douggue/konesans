/**
 * "Mwen gen yon kòd": a kid types their recovery code on a new phone and gets their progress back (src/lib/cloud.ts).
 * Steps: type the code → "Se ou?" (whose progress it is) → if this phone already has progress, choose which one to
 * keep (the code's is the default) → done.
 */
import React, { useState } from 'react';
import { View, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import type { AvatarConfig, SavePreview } from '@konesans/core';
import { Screen, T, Card, TopBar, Button, Mascot, Avatar, avatarFromSeed, FadeIn, Pop, PressScale } from '@/ui';
import { colors, fonts } from '@/lib/theme';
import { useT, type StrKey } from '@/lib/i18n';
import { tap, sfx } from '@/lib/audio';
import { useStore } from '@/lib/store';
import { previewCode, recoverWithCode, localProgress, RecoverFailure, type RecoverError } from '@/lib/cloud';

type Step = 'enter' | 'confirm' | 'choose' | 'working' | 'done' | 'kept';
const ERR: Record<RecoverError, StrKey> = { format: 'rc_format', bad_code: 'rc_bad', rate_limited: 'rc_limit', same_account: 'rc_same', offline: 'rc_offline', server: 'rc_err' };

function Who({ p, selected, onPress, label }: { p: SavePreview | null; selected?: boolean; onPress?: () => void; label?: string }) {
  const t = useT();
  const a = (p?.avatar as AvatarConfig | undefined) ?? avatarFromSeed(p?.username || 'kont');
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Avatar a={a} size={64} />
      <View style={{ flex: 1, gap: 2 }}>
        {label ? <T v="label" color={colors.muted}>{label}</T> : null}
        <T v="h2">{p?.username || '–'}</T>
        <T v="small" color={colors.muted}>{p ? t('rc_stats', { x: p.xp, c: p.cards, b: p.badges }) : t('rc_empty')}</T>
      </View>
    </View>
  );
  if (!onPress) return <Card>{body}</Card>;
  return (
    <PressScale role="button" scaleTo={0.97} onPress={() => { tap(); onPress(); }} style={{ backgroundColor: selected ? colors.blueSoft : colors.card, borderRadius: 20, borderWidth: selected ? 3 : 2, borderColor: selected ? colors.blue : colors.lineStrong, borderBottomWidth: selected ? 3 : 5, padding: 14 }}>
      {body}
    </PressScale>
  );
}

export default function Recover() {
  const t = useT();
  const [step, setStep] = useState<Step>('enter');
  const [input, setInput] = useState('');
  const [err, setErr] = useState<StrKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{ code: string; preview: SavePreview | null } | null>(null);
  const [local, setLocal] = useState<SavePreview | null>(null);
  const [keep, setKeep] = useState<'code' | 'phone'>('code');
  const [name, setName] = useState('');

  const check = async () => {
    setErr(null); setBusy(true);
    try { setFound(await previewCode(input)); setStep('confirm'); sfx('correct'); }
    catch (e) { setErr(ERR[e instanceof RecoverFailure ? e.kind : 'server']); }
    finally { setBusy(false); }
  };
  const restore = async () => {
    if (!found) return;
    setStep('working'); setErr(null);
    try {
      const p = await recoverWithCode(found.code);
      setName(p?.username || found.preview?.username || '');
      if (!useStore.getState().onboarded) useStore.getState().finishOnboarding();
      setStep('done'); sfx('level');
    } catch (e) { setErr(ERR[e instanceof RecoverFailure ? e.kind : 'server']); setStep('enter'); }
  };
  const yes = () => {
    const l = localProgress();
    if (l) { setLocal(l); setKeep('code'); setStep('choose'); } else restore();
  };

  return (
    <Screen>
      <TopBar title={t('rc_title')} onBack={() => (step === 'confirm' || step === 'choose' ? setStep('enter') : router.back())} />

      {step === 'enter' && (
        <FadeIn style={{ gap: 14 }}>
          <View style={{ alignItems: 'center' }}><Mascot size={96} mood="think" /></View>
          <T v="body" center color={colors.muted}>{t('rc_intro')}</T>
          <TextInput value={input} onChangeText={(v) => { setInput(v); setErr(null); }} autoCapitalize="characters" autoCorrect={false} autoComplete="off" maxLength={24}
            placeholder={t('rc_ph')} placeholderTextColor="#B9C2D6" onSubmitEditing={check} returnKeyType="go" testID="code-input"
            style={{ minHeight: 64, borderWidth: 3, borderColor: err ? colors.red : colors.blue, borderRadius: 18, paddingHorizontal: 16, fontFamily: fonts.display, fontSize: 30, letterSpacing: 2, textAlign: 'center', color: colors.ink, backgroundColor: colors.card }} />
          {err ? <T v="bold" center color={colors.red}>{t(err)}</T> : null}
          {busy ? <ActivityIndicator color={colors.blue} style={{ minHeight: 54 }} /> : <Button title={t('check')} disabled={input.trim().length < 6} onPress={check} />}
        </FadeIn>
      )}

      {step === 'confirm' && found && (
        <FadeIn style={{ gap: 14 }}>
          <T v="h1" center>{t('rc_is_you')}</T>
          <Pop><Who p={found.preview} /></Pop>
          <Button title={t('rc_yes')} color={colors.green} onPress={yes} />
          <Button variant="ghost" title={t('rc_no')} onPress={() => { setFound(null); setStep('enter'); }} />
        </FadeIn>
      )}

      {step === 'choose' && found && (
        <FadeIn style={{ gap: 12 }}>
          <T v="h2" center>{t('rc_choose')}</T>
          <Who p={found.preview} label={t('rc_keep_code')} selected={keep === 'code'} onPress={() => setKeep('code')} />
          <Who p={local} label={t('rc_keep_phone')} selected={keep === 'phone'} onPress={() => setKeep('phone')} />
          <T v="small" center color={colors.muted}>{t('rc_keep_hint')}</T>
          <Button title={t('continue')} onPress={() => (keep === 'code' ? restore() : setStep('kept'))} />
        </FadeIn>
      )}

      {step === 'working' && (
        <View style={{ alignItems: 'center', gap: 14, paddingVertical: 40 }}>
          <Mascot size={110} mood="think" />
          <ActivityIndicator color={colors.blue} />
          <T v="bold" color={colors.muted}>{t('rc_working')}</T>
        </View>
      )}

      {(step === 'done' || step === 'kept') && (
        <FadeIn style={{ alignItems: 'center', gap: 14, paddingVertical: 20 }}>
          <Pop><Mascot size={130} mood="cheer" /></Pop>
          <T v="display" center>{step === 'done' ? t('rc_done', { x: name }) : t('rc_kept')}</T>
          {step === 'done' ? <T v="body" center color={colors.muted}>{t('rc_done_sub')}</T> : null}
          <Button title={t('rc_go')} color={colors.green} style={{ alignSelf: 'stretch' }} onPress={() => router.replace('/home')} />
        </FadeIn>
      )}
    </Screen>
  );
}
