import React, { useState } from 'react';
import { router } from 'expo-router';
import { Screen, TopBar, Button } from '@/ui';
import { AvatarBuilder } from '@/ui/AvatarBuilder';
import { colors } from '@/lib/theme';
import { useStore, useAvatar } from '@/lib/store';
import { useT } from '@/lib/i18n';

/** Edit the avatar from Profile. */
export default function AvatarScreen() {
  const t = useT();
  const current = useAvatar();
  const setAvatar = useStore((s) => s.setAvatar);
  const [a, setA] = useState(current);
  return (
    <Screen>
      <TopBar title={t('av_title')} onBack={() => router.back()} />
      <AvatarBuilder value={a} onChange={setA} />
      <Button title={t('av_save')} color={colors.green} onPress={() => { setAvatar(a); router.canGoBack() ? router.back() : router.replace('/profile'); }} />
    </Screen>
  );
}
