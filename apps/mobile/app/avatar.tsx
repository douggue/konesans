import React, { useRef, useState } from 'react';
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { Screen, TopBar, Button, Sheet, T } from '@/ui';
import { AvatarBuilder, type Tab } from '@/ui/AvatarBuilder';
import { colors } from '@/lib/theme';
import { useStore, useAvatar } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';

const same = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Edit the avatar from Profile (also opens straight on the Boutik: /avatar?tab=shop).
 * Leaving with unsaved changes — ←, Android back or the browser's back — asks "Sove chanjman yo?" first.
 */
export default function AvatarScreen() {
  const t = useT();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const current = useAvatar();
  const setAvatar = useStore((s) => s.setAvatar);
  const [a, setA] = useState(current);
  const [asking, setAsking] = useState(false);
  const navigation = useNavigation();
  const dirty = !same(a, current);
  const pending = useRef<null | (() => void)>(null);
  const [leaving, setLeaving] = useState(false);

  // any way of leaving (header ←, hardware back, browser back, gesture): ask when there are changes
  usePreventRemove(dirty && !leaving, ({ data }) => {
    pending.current = () => navigation.dispatch(data.action as never);
    setAsking(true);
  });
  const exit = () => {
    setLeaving(true);
    const go = pending.current; pending.current = null;
    // after the guard is lifted (next render)
    setTimeout(() => { if (go) go(); else if (router.canGoBack()) router.back(); else router.replace('/profile'); }, 0);
  };
  const save = () => { setAvatar(a); exit(); };

  return (
    <Screen>
      <TopBar title={t('av_title')} onBack={() => router.back()} />
      <AvatarBuilder value={a} onChange={setA} shop initialTab={tab === 'shop' ? ('shop' as Tab) : undefined} />
      <Button title={t('av_save')} color={colors.green} onPress={save} />
      <Sheet open={asking} title={t('ec_av_leave_title')} onClose={() => { pending.current = null; setAsking(false); }}>
        <T v="body" center color={colors.muted}>{t('ec_av_leave_sub')}</T>
        <Button title={t('ec_av_leave_save')} color={colors.green} onPress={() => { tap('success'); setAsking(false); save(); }} />
        <Button title={t('ec_av_leave_discard')} variant="secondary" color={colors.red} onPress={() => { tap(); setAsking(false); exit(); }} />
      </Sheet>
    </Screen>
  );
}
