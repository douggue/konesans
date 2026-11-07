/**
 * Home: keeps the kid's progress saved online (starts the cloud sync, src/lib/cloud.ts), and — once Google sign-in is
 * configured (SERVER.googleWebClientId) — after the kid has played on 3 different days on an account with no Google
 * link, a friendly "save with Google" offer (closable, offered again at most once a week). home.tsx shows it in one line.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { T, Button, PressScale, IconTile, FadeIn, Icon } from '@/ui';
import { colors } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { tap } from '@/lib/audio';
import { startCloudSync, useCloud } from '@/lib/cloud';
import { googleEnabled } from '@/lib/google';

const PLAY_DAYS = 3;
const WEEK = 7 * 86_400_000;

export function AccountHomeCard() {
  const t = useT();
  useEffect(() => { startCloudSync(); }, []);
  const days = useCloud((s) => s.playDays?.length ?? 0);
  const linked = useCloud((s) => s.google);
  const closedAt = useCloud((s) => s.offerClosedAt ?? 0);
  if (!googleEnabled() || linked || days < PLAY_DAYS || Date.now() - closedAt < WEEK) return null;
  return (
    <FadeIn delay={60}><View style={{ backgroundColor: colors.greenSoft, borderRadius: 20, borderWidth: 2, borderColor: '#B9E3C6', borderBottomWidth: 5, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconTile name="pwoteje" bg="#FFFFFF" size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h3" color="#12632F">{t('gg_offer_title')}</T>
          <T v="small" color="#12632F">{t('gg_offer_sub')}</T>
        </View>
        <PressScale role="button" accessibilityLabel={t('gg_later')} scaleTo={0.9} onPress={() => { tap(); useCloud.setState({ offerClosedAt: Date.now() }); }} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Icon name="femen" size={20} />
        </PressScale>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button small title={t('gg_offer_yes')} color={colors.green} style={{ flex: 1 }} onPress={() => router.push('/account?google=1' as never)} />
        <Button small variant="ghost" title={t('gg_later')} color="#12632F" onPress={() => useCloud.setState({ offerClosedAt: Date.now() })} />
      </View>
    </View></FadeIn>
  );
}
